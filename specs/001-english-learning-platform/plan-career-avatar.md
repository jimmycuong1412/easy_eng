# Implementation Plan: Career Path Avatar Progression System

**Branch**: `001-english-learning-platform` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**User Story**: US-3 (Updated) - Career Path Avatar Progression System
**Priority**: P2 → P1 (Elevated due to engagement impact)

---

## Summary

Transform the original "Cookie Earning System" into a comprehensive **Career Path Avatar Progression System** featuring 8-bit pixel art characters that evolve based on student classroom performance. Students select a dream career archetype, earn XP and Gold through class participation, level up their character with visual evolutions, and purchase cosmetic items in a marketplace.

**Core Value Proposition**: Gamified motivation system that directly ties learning engagement to visible character progression, creating emotional investment in educational outcomes.

---

## Technical Context

| Aspect | Decision |
|--------|----------|
| **Art Style** | 8-bit pixel art (16x16 to 64x64 sprites), retro RPG aesthetic |
| **Rendering** | Canvas/WebGL via PixiJS or Phaser for character viewer |
| **Asset Format** | PNG spritesheets with JSON metadata |
| **State Management** | Zustand or Redux for character/inventory state |
| **Backend Platform** | **Supabase** (PostgreSQL database, Auth, Realtime, Storage, Edge Functions) |
| **Database** | Supabase PostgreSQL with Row Level Security (RLS) policies |
| **Real-time** | Supabase Realtime for instant XP/Gold updates and leaderboard sync |
| **Storage** | Supabase Storage for sprite assets and character images |
| **Auth** | Supabase Auth integrated with existing user system |
| **Edge Functions** | Supabase Edge Functions (Deno) for XP/Gold calculation and fraud prevention |
| **Performance Target** | 60fps character animations, <100ms XP update reflection |

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality** | ✅ PASS | TypeScript strict mode; component-based sprite system |
| **II. Testing (NON-NEGOTIABLE)** | ✅ PASS | XP calculation tests, transaction integrity tests, visual regression |
| **III. UX Consistency** | ✅ PASS | Unified 8-bit theme; accessible color contrasts; keyboard navigation |
| **IV. Performance** | ✅ PASS | Sprite caching, lazy loading, <100ms state updates |
| **V. RBAC** | ✅ PASS | Student-only feature; parental controls for purchases |
| **VI. Virtual Currency Integrity** | ✅ PASS | Dual currency (XP + Gold) with atomic transactions, audit logs |
| **VII. UI Excellence** | ✅ PASS | Delightful animations, celebration effects, progression feedback |

**Gate Status**: ✅ PASS

---

## Data Model

### New Entities

```typescript
// Career Path Definition
interface CareerPath {
  id: string;                    // 'doctor' | 'engineer' | 'warrior' | 'business' | 'artist' | 'scientist'
  name: string;                  // Display name
  description: string;           // Career description
  theme: {
    primaryColor: string;        // Hex color
    secondaryColor: string;
    iconUrl: string;             // Career icon
  };
  baseCharacterSprite: string;   // Spritesheet URL
  levelEvolutions: LevelEvolution[];
}

interface LevelEvolution {
  levelRange: [number, number];  // e.g., [1, 5]
  spritesheetUrl: string;
  animations: string[];          // Available animations at this level
  description: string;           // "Basic outfit, starter tools"
}

// Student Character
interface StudentCharacter {
  id: string;
  studentId: string;             // FK to Student
  careerPathId: string;          // FK to CareerPath
  
  // Progression
  currentXP: number;             // Total accumulated XP
  currentLevel: number;          // Derived: floor(currentXP / 500) + 1
  goldBalance: number;           // Spendable currency
  
  // Customization
  equippedItems: {
    hat?: string;                // Item IDs
    outfit?: string;
    background?: string;
    pet?: string;
    emote?: string;
  };
  
  // Streaks
  currentDailyStreak: number;
  lastLoginDate: Date;
  currentWeeklyStreak: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Marketplace Item
interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: 'hat' | 'outfit' | 'background' | 'emote' | 'pet';
  goldPrice: number;
  spriteUrl: string;
  previewUrl: string;
  careerPathCompatibility: string[] | 'all';  // Career paths that can use this
  levelRequirement?: number;
  isLimitedEdition: boolean;
  availableUntil?: Date;
}

// Owned Items
interface StudentInventory {
  id: string;
  studentId: string;
  itemId: string;
  purchasedAt: Date;
  goldSpent: number;
}

// Transaction Ledger (extends existing Cookie transactions)
interface ProgressionTransaction {
  id: string;
  studentId: string;
  transactionType: 'xp_earned' | 'gold_earned' | 'gold_spent' | 'level_up';
  amount: number;
  reason: string;                // 'class_completion', 'quiz_bonus', 'daily_login', etc.
  relatedEntityType?: string;    // 'class', 'marketplace_item'
  relatedEntityId?: string;
  balanceAfter: number;          // Audit trail
  createdAt: Date;
}
```

### Supabase Database Schema

> All tables use Supabase PostgreSQL with Row Level Security (RLS) enabled.
> Migrations managed via Supabase CLI (`supabase migration new`).

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Career Paths (seed data)
CREATE TABLE career_paths (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  theme JSONB NOT NULL,
  base_character_sprite VARCHAR(500) NOT NULL,
  level_evolutions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student Characters (1:1 with students)
CREATE TABLE student_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  career_path_id VARCHAR(50) NOT NULL REFERENCES career_paths(id),
  current_xp INTEGER NOT NULL DEFAULT 0,
  gold_balance INTEGER NOT NULL DEFAULT 0,
  equipped_items JSONB DEFAULT '{}',
  current_daily_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  current_weekly_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id)
);

-- Marketplace Items
CREATE TABLE marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL,
  gold_price INTEGER NOT NULL,
  sprite_url VARCHAR(500) NOT NULL,
  preview_url VARCHAR(500),
  career_path_compatibility JSONB DEFAULT '"all"',
  level_requirement INTEGER DEFAULT 1,
  is_limited_edition BOOLEAN DEFAULT FALSE,
  available_until TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student Inventory
CREATE TABLE student_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES marketplace_items(id),
  purchased_at TIMESTAMP DEFAULT NOW(),
  gold_spent INTEGER NOT NULL,
  UNIQUE(student_id, item_id)
);

-- Progression Transactions (audit log)
CREATE TABLE progression_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  transaction_type VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_student_characters_student ON student_characters(student_id);
CREATE INDEX idx_student_characters_career ON student_characters(career_path_id);
CREATE INDEX idx_marketplace_items_category ON marketplace_items(category);
CREATE INDEX idx_student_inventory_student ON student_inventory(student_id);
CREATE INDEX idx_progression_transactions_student ON progression_transactions(student_id);
CREATE INDEX idx_progression_transactions_created ON progression_transactions(created_at);

-- Leaderboard view
CREATE MATERIALIZED VIEW career_leaderboard AS
SELECT 
  sc.career_path_id,
  sc.student_id,
  s.display_name,
  sc.current_xp,
  FLOOR(sc.current_xp / 500) + 1 AS level,
  ROW_NUMBER() OVER (PARTITION BY sc.career_path_id ORDER BY sc.current_xp DESC) AS rank
FROM student_characters sc
JOIN students s ON sc.student_id = s.id
WHERE s.is_active = TRUE;

-- Supabase pg_cron for leaderboard refresh (every 5 minutes)
SELECT cron.schedule(
  'refresh-career-leaderboard',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY career_leaderboard$$
);
```

### Supabase Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE student_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;

-- Student Characters: Students can only view/edit their own character
CREATE POLICY "Students can view own character"
  ON student_characters FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can update own character"
  ON student_characters FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own character"
  ON student_characters FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Student Inventory: Students can only view their own inventory
CREATE POLICY "Students can view own inventory"
  ON student_inventory FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own inventory"
  ON student_inventory FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Progression Transactions: Students can view own transactions
CREATE POLICY "Students can view own transactions"
  ON progression_transactions FOR SELECT
  USING (auth.uid() = student_id);

-- Marketplace Items: Everyone can view active items
CREATE POLICY "Anyone can view active marketplace items"
  ON marketplace_items FOR SELECT
  USING (is_active = TRUE);

-- Career Paths: Everyone can view
CREATE POLICY "Anyone can view career paths"
  ON career_paths FOR SELECT
  USING (TRUE);

-- Admins can manage all (via service role key in Edge Functions)
```

### Supabase Realtime Subscriptions

```typescript
// Enable realtime for character updates
// In Supabase Dashboard: Database > Replication > Enable for tables

// Client-side subscription for XP/Gold updates
const characterSubscription = supabase
  .channel('character-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'student_characters',
      filter: `student_id=eq.${userId}`
    },
    (payload) => {
      // Trigger XP gain animation, level up celebration, etc.
      handleCharacterUpdate(payload.new);
    }
  )
  .subscribe();

// Leaderboard realtime (subscribe to materialized view refresh)
const leaderboardSubscription = supabase
  .channel('leaderboard')
  .on('broadcast', { event: 'leaderboard-update' }, (payload) => {
    refreshLeaderboard();
  })
  .subscribe();
```

### Supabase Edge Functions

```typescript
// supabase/functions/award-class-rewards/index.ts
// Triggered after class completion - calculates and awards XP/Gold

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ClassRewardRequest {
  studentId: string;
  classId: string;
  quizScore?: number;
  attended: boolean;
}

serve(async (req) => {
  const { studentId, classId, quizScore, attended } = await req.json() as ClassRewardRequest;
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Service role bypasses RLS
  );

  if (!attended) {
    return new Response(JSON.stringify({ xp: 0, gold: 0 }), { status: 200 });
  }

  // Calculate rewards
  const baseXP = 50;
  const quizBonus = (quizScore && quizScore >= 90) ? 25 : 0;
  const totalXP = baseXP + quizBonus;
  
  const gold = !quizScore ? 10 : quizScore >= 90 ? 30 : quizScore >= 75 ? 20 : 10;

  // Atomic transaction to update character and log transactions
  const { data, error } = await supabase.rpc('award_class_rewards', {
    p_student_id: studentId,
    p_class_id: classId,
    p_xp_amount: totalXP,
    p_gold_amount: gold,
    p_reason: 'class_completion'
  });

  if (error) throw error;

  return new Response(JSON.stringify({ 
    xpEarned: totalXP, 
    goldEarned: gold,
    newLevel: data.new_level,
    leveledUp: data.leveled_up
  }), { status: 200 });
});
```

### Supabase Storage Buckets

```sql
-- Create storage buckets for sprites
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('character-sprites', 'character-sprites', true),
  ('marketplace-items', 'marketplace-items', true),
  ('career-icons', 'career-icons', true);

-- Storage policies (public read, admin write)
CREATE POLICY "Public sprite access"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('character-sprites', 'marketplace-items', 'career-icons'));
```

---

## API Contracts

### Character Management

```yaml
# GET /api/v1/characters/me
# Get current student's character
Response 200:
  character:
    id: string
    careerPath: CareerPath
    currentXP: number
    currentLevel: number
    goldBalance: number
    equippedItems: Record<string, Item>
    dailyStreak: number
    weeklyStreak: number
    nextLevelXP: number        # XP needed for next level
    levelProgress: number      # 0-100 percentage

# POST /api/v1/characters
# Create character (during onboarding)
Request:
  careerPathId: string
Response 201:
  character: StudentCharacter

# PATCH /api/v1/characters/me/career
# Change career path (limited: once per month)
Request:
  newCareerPathId: string
Response 200:
  character: StudentCharacter
  warning?: string             # "Items incompatible with new path have been unequipped"
```

### Career Paths

```yaml
# GET /api/v1/career-paths
# List all available career paths
Response 200:
  careerPaths:
    - id: string
      name: string
      description: string
      theme: Theme
      previewSprite: string    # Preview image URL
```

### XP & Gold Rewards

```yaml
# POST /api/v1/characters/me/rewards
# Award XP/Gold after class completion (called by backend after class ends)
# INTERNAL API - not exposed to frontend
Request:
  classId: string
  quizScore?: number           # 0-100
  assignmentCompleted: boolean
Response 200:
  rewards:
    xpEarned: number
    goldEarned: number
    bonuses: Bonus[]           # [{type: 'quiz_bonus', amount: 25}]
  character:
    newXP: number
    newLevel: number
    newGold: number
    leveledUp: boolean
    newUnlocks?: string[]      # New animations/items unlocked

# POST /api/v1/characters/me/daily-login
# Record daily login, award streak bonus
Response 200:
  goldEarned: number
  newDailyStreak: number
  weeklyBonusEarned?: number
```

### Marketplace

```yaml
# GET /api/v1/marketplace/items
# Browse marketplace items
Query:
  category?: string
  careerPath?: string          # Filter compatible items
  minLevel?: number
  maxPrice?: number
Response 200:
  items: MarketplaceItem[]
  pagination: Pagination

# GET /api/v1/marketplace/items/:id
Response 200:
  item: MarketplaceItem
  canPurchase: boolean
  reason?: string              # "Insufficient gold" | "Level too low"

# POST /api/v1/marketplace/purchase
# Purchase an item
Request:
  itemId: string
Response 200:
  item: MarketplaceItem
  transaction: ProgressionTransaction
  newGoldBalance: number
Response 400:
  error: 'INSUFFICIENT_GOLD' | 'LEVEL_TOO_LOW' | 'ALREADY_OWNED' | 'ITEM_UNAVAILABLE'

# GET /api/v1/inventory
# Get student's owned items
Response 200:
  items: InventoryItem[]
```

### Equipment

```yaml
# PATCH /api/v1/characters/me/equipment
# Equip/unequip items
Request:
  slot: 'hat' | 'outfit' | 'background' | 'emote' | 'pet'
  itemId: string | null        # null to unequip
Response 200:
  equippedItems: Record<string, Item>
  character: StudentCharacter
```

### Leaderboards

```yaml
# GET /api/v1/leaderboards
# Get leaderboard by career path
Query:
  careerPath?: string          # Filter by career, or 'all' for global
  limit?: number               # Default 50
Response 200:
  leaderboard:
    - rank: number
      studentId: string
      displayName: string
      careerPath: string
      level: number
      totalXP: number
      characterPreview: string # Sprite URL
  myRank?: number
  myPosition?: LeaderboardEntry
```

---

## Component Architecture

### Frontend Components

```
src/
├── components/
│   ├── character/
│   │   ├── CharacterViewer.tsx       # Main 8-bit character renderer (PixiJS)
│   │   ├── CharacterPreview.tsx      # Smaller preview for lists/cards
│   │   ├── LevelProgressBar.tsx      # XP progress visualization
│   │   ├── GoldDisplay.tsx           # Gold balance with coin animation
│   │   ├── XPGainAnimation.tsx       # Floating +XP numbers
│   │   ├── LevelUpCelebration.tsx    # Full-screen celebration modal
│   │   └── StreakIndicator.tsx       # Daily/weekly streak display
│   │
│   ├── career/
│   │   ├── CareerSelector.tsx        # Onboarding career path picker
│   │   ├── CareerCard.tsx            # Individual career option card
│   │   ├── CareerPathDetails.tsx     # Detailed career info modal
│   │   └── CareerChangeWarning.tsx   # Confirmation for career switch
│   │
│   ├── marketplace/
│   │   ├── MarketplaceGrid.tsx       # Item browsing grid
│   │   ├── MarketplaceItem.tsx       # Individual item card
│   │   ├── ItemPreview.tsx           # Item preview on character
│   │   ├── PurchaseModal.tsx         # Confirm purchase dialog
│   │   ├── PurchaseSuccess.tsx       # Celebration animation
│   │   └── InventoryGrid.tsx         # Owned items display
│   │
│   ├── leaderboard/
│   │   ├── LeaderboardTable.tsx      # Rankings table
│   │   ├── LeaderboardEntry.tsx      # Individual rank row
│   │   └── MyRankCard.tsx            # Current user's position
│   │
│   └── rewards/
│       ├── RewardNotification.tsx    # Toast for XP/Gold earned
│       ├── RewardBreakdown.tsx       # Detailed reward summary
│       └── BonusIndicator.tsx        # Streak/quiz bonus callout
│
├── pages/
│   ├── student/
│   │   ├── dashboard/
│   │   │   └── CharacterWidget.tsx   # Dashboard character preview
│   │   ├── character/
│   │   │   ├── index.tsx             # Full character view page
│   │   │   └── customize.tsx         # Equipment customization
│   │   ├── marketplace/
│   │   │   └── index.tsx             # Marketplace page
│   │   └── leaderboard/
│   │       └── index.tsx             # Leaderboards page
│   │
│   └── onboarding/
│       └── career-selection.tsx      # Career path selection flow
│
├── services/
│   ├── characterService.ts           # Character API calls
│   ├── marketplaceService.ts         # Marketplace API calls
│   └── leaderboardService.ts         # Leaderboard API calls
│
├── stores/
│   └── characterStore.ts             # Zustand store for character state
│
└── hooks/
    ├── useCharacter.ts               # Character data hook
    ├── useMarketplace.ts             # Marketplace browsing hook
    ├── useRewardAnimation.ts         # Trigger reward animations
    └── useLeaderboard.ts             # Leaderboard data hook
```

### Backend Services

```
backend/src/
├── services/
│   ├── character/
│   │   ├── CharacterService.ts       # Character CRUD, progression
│   │   ├── XPCalculator.ts           # XP reward calculation logic
│   │   ├── GoldCalculator.ts         # Gold reward calculation logic
│   │   └── LevelService.ts           # Level progression logic
│   │
│   ├── marketplace/
│   │   ├── MarketplaceService.ts     # Item catalog management
│   │   ├── PurchaseService.ts        # Purchase transactions
│   │   └── InventoryService.ts       # Owned items management
│   │
│   └── leaderboard/
│       └── LeaderboardService.ts     # Leaderboard queries, caching
│
├── api/
│   ├── character/
│   │   ├── characterController.ts
│   │   └── characterRoutes.ts
│   ├── marketplace/
│   │   ├── marketplaceController.ts
│   │   └── marketplaceRoutes.ts
│   └── leaderboard/
│       ├── leaderboardController.ts
│       └── leaderboardRoutes.ts
│
└── events/
    ├── ClassCompletedHandler.ts      # Listens to class completion, awards XP/Gold
    └── DailyLoginHandler.ts          # Awards daily login bonus
```

---

## Reward Calculation Logic

### XP Calculation

```typescript
// XPCalculator.ts
interface ClassRewardInput {
  classId: string;
  attended: boolean;
  quizScore?: number;          // 0-100
  assignmentCompleted: boolean;
}

interface XPReward {
  baseXP: number;
  quizBonus: number;
  totalXP: number;
}

function calculateClassXP(input: ClassRewardInput): XPReward {
  if (!input.attended) {
    return { baseXP: 0, quizBonus: 0, totalXP: 0 };
  }

  const baseXP = 50;
  let quizBonus = 0;

  if (input.quizScore !== undefined && input.quizScore >= 90) {
    quizBonus = 25;
  }

  return {
    baseXP,
    quizBonus,
    totalXP: baseXP + quizBonus
  };
}

function calculateLevel(totalXP: number): number {
  return Math.floor(totalXP / 500) + 1;
}

function getXPForNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const xpForCurrentLevel = (currentLevel - 1) * 500;
  return currentLevel * 500 - currentXP;
}
```

### Gold Calculation

```typescript
// GoldCalculator.ts
interface GoldReward {
  classGold: number;
  dailyBonus: number;
  weeklyBonus: number;
  totalGold: number;
}

function calculateClassGold(quizScore?: number): number {
  // Performance tiers: 10-30 gold based on quiz score
  if (quizScore === undefined) return 10;
  if (quizScore >= 90) return 30;
  if (quizScore >= 75) return 20;
  return 10;
}

function calculateDailyLoginBonus(): number {
  return 5;
}

function calculateWeeklyStreakBonus(weeklyStreak: number): number {
  // Bonus awarded every 7th consecutive day
  return weeklyStreak > 0 && weeklyStreak % 7 === 0 ? 50 : 0;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Sprint 1-2)

**Goal**: Core data model and career selection

| Task | Estimate | Dependencies |
|------|----------|--------------|
| Database schema migration | 4h | - |
| Career path seed data | 2h | Schema |
| Character entity & repository | 6h | Schema |
| Character API endpoints (CRUD) | 8h | Entity |
| Career selector UI component | 8h | API |
| Onboarding flow integration | 6h | Selector |
| Unit tests for character service | 4h | Service |

**Deliverable**: Students can select career path during onboarding

### Phase 2: Progression System (Sprint 3-4)

**Goal**: XP/Gold earning and level progression

| Task | Estimate | Dependencies |
|------|----------|--------------|
| XP Calculator service | 4h | - |
| Gold Calculator service | 4h | - |
| Class completion event handler | 6h | Calculators |
| Daily login tracking | 4h | Character service |
| Streak calculation logic | 4h | Login tracking |
| Progression transaction logging | 4h | - |
| Level progress UI components | 8h | API |
| XP gain animation component | 6h | UI |
| Level up celebration modal | 6h | UI |
| Integration tests | 6h | All |

**Deliverable**: Students earn XP/Gold from classes, see level progression

### Phase 3: Character Visualization (Sprint 5-6)

**Goal**: 8-bit character rendering and evolution

| Task | Estimate | Dependencies |
|------|----------|--------------|
| Sprite asset creation (6 careers × 4 evolutions) | 24h | Design |
| PixiJS character viewer setup | 8h | Assets |
| Character animation system | 12h | Viewer |
| Level-based sprite switching | 6h | Animations |
| Dashboard character widget | 6h | Viewer |
| Full character view page | 8h | Widget |
| Mobile responsive character viewer | 6h | Viewer |
| Performance optimization (caching, lazy load) | 4h | All |

**Deliverable**: Students see their 8-bit character evolve with levels

### Phase 4: Marketplace (Sprint 7-8)

**Goal**: Gold-based cosmetic purchases

| Task | Estimate | Dependencies |
|------|----------|--------------|
| Marketplace item entity & seeding | 6h | - |
| Purchase service with transactions | 8h | Entity |
| Inventory service | 4h | Purchase |
| Marketplace API endpoints | 8h | Services |
| Marketplace browse UI | 10h | API |
| Item preview on character | 8h | Character viewer |
| Purchase flow & confirmation | 6h | API |
| Equipment system | 6h | Inventory |
| Parental purchase controls | 6h | Purchase |
| Transaction history view | 4h | Logging |

**Deliverable**: Students can buy and equip cosmetic items

### Phase 5: Social & Polish (Sprint 9-10)

**Goal**: Leaderboards and final polish

| Task | Estimate | Dependencies |
|------|----------|--------------|
| Leaderboard materialized view | 4h | Character data |
| Leaderboard API & caching | 6h | View |
| Leaderboard UI components | 8h | API |
| Notification system for rewards | 6h | Events |
| Sound effects integration | 4h | Animations |
| A/B testing setup | 4h | Analytics |
| Performance benchmarking | 4h | All |
| E2E test suite | 8h | All |
| Documentation | 4h | - |

**Deliverable**: Full feature complete with leaderboards

---

## Asset Requirements

### Sprite Specifications

| Asset Type | Dimensions | Frames | Format |
|------------|------------|--------|--------|
| Character base | 32×32 px | 1 | PNG |
| Idle animation | 32×32 px | 4 | Spritesheet |
| Walk animation | 32×32 px | 6 | Spritesheet |
| Skill animation | 64×64 px | 8 | Spritesheet |
| Level up effect | 64×64 px | 12 | Spritesheet |
| Hat items | 16×16 px | 1 | PNG |
| Outfit overlays | 32×32 px | 1 | PNG |
| Backgrounds | 128×128 px | 1 | PNG |
| Pets | 16×16 px | 4 | Spritesheet |

### Career Theme Colors

| Career | Primary | Secondary | Accent |
|--------|---------|-----------|--------|
| Doctor | #4CAF50 | #81C784 | #FFFFFF |
| Engineer | #2196F3 | #64B5F6 | #FFC107 |
| Warrior | #F44336 | #E57373 | #FFD700 |
| Business | #9C27B0 | #BA68C8 | #4CAF50 |
| Artist | #FF9800 | #FFB74D | #E91E63 |
| Scientist | #00BCD4 | #4DD0E1 | #8BC34A |

---

## Success Metrics Tracking

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Class attendance rate | TBD | +30% | Weekly active classes / enrolled classes |
| Assignment completion | TBD | +25% | Completed assignments / assigned |
| Career selection adoption | 0% | 80% in week 1 | Students with career selected / total students |
| Daily active users | TBD | +20% | DAU via analytics |
| Marketplace engagement | N/A | 40% make purchase in month 1 | Purchases / active students |
| Time in character view | N/A | >2 min/session | Session duration analytics |

---

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Asset creation delays | High | Medium | Start with placeholder sprites; prioritize 2 careers first |
| Performance issues with PixiJS | Medium | Low | Fallback to CSS sprite animations |
| Gold economy imbalance | High | Medium | Admin tools to adjust prices; A/B test reward values |
| Low adoption of career selection | Medium | Low | Make it engaging in onboarding; show benefits clearly |
| Parental concerns about purchases | Medium | Medium | Clear controls; spending limits; no real money |

---

## Integration Points

### With Existing Systems

1. **Authentication**: Character tied to student account
2. **Class Completion Events**: Trigger XP/Gold awards
3. **Booking System**: Show character preview in booking confirmation
4. **Notifications**: Reward notifications via existing system
5. **Analytics**: Track progression events for business metrics

### WebSocket Events

```typescript
// Real-time updates to frontend
interface RewardEvent {
  type: 'XP_EARNED' | 'GOLD_EARNED' | 'LEVEL_UP';
  studentId: string;
  data: {
    amount: number;
    reason: string;
    newTotal: number;
    newLevel?: number;
  };
}
```

---

## Testing Strategy

### Unit Tests
- XP calculation for all scenarios
- Gold calculation with performance tiers
- Level progression edge cases (level 1, boundary cases)
- Streak calculation (daily, weekly, reset conditions)

### Integration Tests
- Class completion → XP/Gold awarded
- Purchase flow → Gold deducted, item added to inventory
- Equipment change → Character state updated

### E2E Tests
- Complete onboarding with career selection
- Earn XP from class and see level up
- Purchase item and equip it
- View leaderboard position

### Visual Regression
- Character viewer at all evolution stages
- Marketplace item previews
- Level up celebration animation

---

## Parental Controls Specification

```typescript
interface ParentalControls {
  purchasesEnabled: boolean;           // Allow marketplace purchases
  dailyGoldSpendLimit?: number;        // Max gold per day
  weeklyGoldSpendLimit?: number;       // Max gold per week
  requireApprovalAbove?: number;       // Require approval for items over X gold
  notifyOnPurchase: boolean;           // Send email to parent on purchase
}
```

---

## Open Questions

1. **Career change policy**: Once per month? Or allow free changes with item unequip?
2. **XP reset on career change**: Keep XP or reset to level 1?
3. **Limited edition items**: How often? Seasonal themes?
4. **Referral integration**: Do referrals earn Gold? (ties to original Cookie system)
5. **Teacher rewards**: Should teachers have their own progression system?

---

**Document Version**: 1.0
**Created**: 2026-01-22
**Author**: AI Planning Agent
**Status**: Ready for Review

---

## Next Steps

1. [ ] Review plan with stakeholders
2. [ ] Clarify open questions
3. [ ] Commission sprite assets from designer
4. [ ] Run `/speckit.tasks` to generate implementation tasks
5. [ ] Create feature branch and begin Phase 1
