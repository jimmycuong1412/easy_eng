# Implementation Tasks: Modern English Learning Platform

**Generated**: 2026-01-22 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Overview

| Metric | Value |
|--------|-------|
| **Total Phases** | 6 |
| **Total Sprints** | 12 (2-week sprints) |
| **Total Tasks** | 87 |
| **Estimated Duration** | 24 weeks |
| **Team Size (Recommended)** | 2-3 developers |

---

## Phase 0: Project Setup & Infrastructure (Sprint 1)

### Sprint 1 Goals
- Development environment ready
- CI/CD pipeline configured
- Database schema deployed
- Design system initialized

---

### TASK-001: Initialize Next.js 14 Project
**Priority**: P0 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Create Next.js 14+ project with App Router, TypeScript, and Tailwind CSS.

**Acceptance Criteria**:
- [ ] `npx create-next-app@latest` with App Router enabled
- [ ] TypeScript strict mode configured in `tsconfig.json`
- [ ] Tailwind CSS with dark blue theme variables
- [ ] ESLint + Prettier configured
- [ ] `.env.local.example` with required variables
- [ ] `README.md` with setup instructions

**Files to Create**:
```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── tailwind.config.ts
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
└── package.json
```

**Dependencies**:
```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "framer-motion": "^10.0.0",
  "@supabase/supabase-js": "^2.0.0",
  "zustand": "^4.0.0"
}
```

---

### TASK-002: Configure Supabase Project
**Priority**: P0 | **Estimate**: 3h | **Assignee**: Backend Dev

**Description**: Set up Supabase project with PostgreSQL database and initial configuration.

**Acceptance Criteria**:
- [ ] Supabase project created at supabase.com
- [ ] Local development with `supabase init` and `supabase start`
- [ ] Environment variables documented
- [ ] Database connection verified
- [ ] Supabase CLI installed and linked

**Commands**:
```bash
npm install -g supabase
supabase init
supabase start
supabase link --project-ref <project-id>
```

**Files to Create**:
```
supabase/
├── config.toml
├── .gitignore
└── migrations/
    └── .gitkeep
```

---

### TASK-003: Create Database Schema - Users & Auth
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Backend Dev

**Description**: Design and implement user authentication schema with RBAC.

**Acceptance Criteria**:
- [ ] `users` table with profile fields
- [ ] `user_roles` enum (student, teacher, admin)
- [ ] Row Level Security (RLS) policies
- [ ] Timezone field (default: Asia/Ho_Chi_Minh)
- [ ] Profile completion tracking
- [ ] Referral code generation

**Migration File**: `001_users.sql`
```sql
-- User roles enum
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'student',
  timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);
```

**Tests**:
- [ ] User signup creates profile
- [ ] RLS prevents cross-user access
- [ ] Referral code is unique

---

### TASK-004: Create Database Schema - Classes & Bookings
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Backend Dev

**Description**: Implement class scheduling and booking tables.

**Acceptance Criteria**:
- [ ] `classes` table with capacity, price, duration (25 min)
- [ ] `bookings` table with Cookie discount tracking
- [ ] Constraints: no overbooking, $5 minimum price
- [ ] RLS policies for student/teacher access
- [ ] Indexes for performance

**Migration File**: `002_classes.sql`
```sql
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  topic TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 25,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd >= 5.00),
  price_vnd INTEGER GENERATED ALWAYS AS (price_usd * 25000) STORED,
  enrolled_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, ended, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  original_price DECIMAL(10,2) NOT NULL,
  cookies_used INTEGER DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
  booking_status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, attended, no_show
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id)
);

-- Prevent overbooking trigger
CREATE OR REPLACE FUNCTION check_class_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT enrolled_count FROM classes WHERE id = NEW.class_id) >= 
     (SELECT capacity FROM classes WHERE id = NEW.class_id) THEN
    RAISE EXCEPTION 'Class is full';
  END IF;
  UPDATE classes SET enrolled_count = enrolled_count + 1 WHERE id = NEW.class_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_capacity_check
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_class_capacity();
```

---

### TASK-005: Create Database Schema - Cookie System
**Priority**: P0 | **Estimate**: 4h | **Assignee**: Backend Dev

**Description**: Implement Cookie virtual currency with transaction ledger.

**Acceptance Criteria**:
- [ ] `cookie_balances` table with atomic updates
- [ ] `cookie_transactions` audit log
- [ ] `cookie_earning_rules` configuration
- [ ] Prevent negative balance constraint
- [ ] Transaction types: earned, spent, refunded

**Migration File**: `003_cookies.sql`
```sql
CREATE TABLE public.cookie_balances (
  student_id UUID PRIMARY KEY REFERENCES public.profiles(id),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER DEFAULT 0,
  lifetime_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE cookie_transaction_type AS ENUM ('earned', 'spent', 'refunded');

CREATE TABLE public.cookie_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  type cookie_transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'referral', 'first_booking', 'class_completion', etc.
  related_entity_type TEXT, -- 'booking', 'referral', 'class'
  related_entity_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cookie_transactions_student ON cookie_transactions(student_id);
CREATE INDEX idx_cookie_transactions_created ON cookie_transactions(created_at);
```

---

### TASK-006: Create Database Schema - Career Avatar System
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Backend Dev

**Description**: Implement career paths, characters, and progression.

**Migration File**: `004_career_avatars.sql`

**Acceptance Criteria**:
- [ ] `career_paths` with 6 archetypes
- [ ] `student_characters` with XP/Gold/Level
- [ ] `marketplace_items` catalog
- [ ] `student_inventory` owned items
- [ ] `progression_transactions` audit log
- [ ] Level calculation: `floor(xp / 500) + 1`

---

### TASK-007: Create Database Schema - Video Sessions
**Priority**: P0 | **Estimate**: 3h | **Assignee**: Backend Dev

**Description**: Track CometChat video session metadata.

**Migration File**: `005_video_sessions.sql`

**Acceptance Criteria**:
- [ ] `class_sessions` table
- [ ] CometChat group ID mapping
- [ ] Session status tracking (scheduled, live, ended)
- [ ] Participant attendance logging

---

### TASK-008: Create Database Schema - Quizzes
**Priority**: P1 | **Estimate**: 4h | **Assignee**: Backend Dev

**Description**: Built-in quiz system for classes.

**Migration File**: `006_quizzes.sql`

**Acceptance Criteria**:
- [ ] `quizzes` linked to classes
- [ ] `quiz_questions` with multiple types
- [ ] `quiz_attempts` with scoring
- [ ] 70% pass threshold enforcement
- [ ] 1 retake allowed per quiz

---

### TASK-009: Setup shadcn/ui Component Library
**Priority**: P0 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Initialize shadcn/ui with dark theme customization.

**Acceptance Criteria**:
- [ ] `npx shadcn-ui@latest init` with custom theme
- [ ] Dark blue color palette configured
- [ ] Core components installed: Button, Card, Input, Modal, Toast
- [ ] Animation variants integrated with Framer Motion

**Commands**:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input dialog toast
```

---

### TASK-010: Configure CI/CD Pipeline
**Priority**: P0 | **Estimate**: 4h | **Assignee**: DevOps

**Description**: GitHub Actions for testing, linting, and deployment.

**Acceptance Criteria**:
- [ ] Lint on PR
- [ ] Unit tests on PR
- [ ] E2E tests on merge to main
- [ ] Auto-deploy to Vercel on main
- [ ] Supabase migrations on release

**File**: `.github/workflows/ci.yml`

---

### TASK-011: Seed Initial Data
**Priority**: P1 | **Estimate**: 3h | **Assignee**: Backend Dev

**Description**: Create seed data for development and testing.

**Acceptance Criteria**:
- [ ] 6 career paths with themes
- [ ] 20+ marketplace items
- [ ] Cookie earning rules
- [ ] Test users (student, teacher, admin)
- [ ] Sample classes

**File**: `supabase/seed.sql`

---

## Phase 1: Authentication & Core UI (Sprints 2-3)

### Sprint 2 Goals
- User registration/login working
- Basic layout and navigation
- Role-based routing

### Sprint 3 Goals
- Profile management
- Design system components complete
- Responsive mobile layout

---

### TASK-012: Implement Supabase Auth Integration
**Priority**: P0 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Email/password authentication with Supabase Auth.

**Acceptance Criteria**:
- [ ] Sign up with email verification
- [ ] Sign in with email/password
- [ ] Password reset flow
- [ ] Session persistence
- [ ] Auth state in Zustand store
- [ ] Protected route middleware

**Files**:
```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── forgot-password/page.tsx
lib/
├── supabase.ts
hooks/
├── useAuth.ts
stores/
├── authStore.ts
```

**Tests**:
- [ ] User can register with valid email
- [ ] User cannot register with existing email
- [ ] User can login with correct credentials
- [ ] Session persists on page refresh

---

### TASK-013: Create App Layout with Navigation
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: Main application layout with sidebar and top bar.

**Acceptance Criteria**:
- [ ] Dark blue gradient background
- [ ] Responsive sidebar (collapsible on mobile)
- [ ] Top bar with logo, search, notifications, avatar
- [ ] Role-based navigation items
- [ ] Smooth page transitions (Framer Motion)

**Components**:
```
components/layout/
├── AppLayout.tsx
├── Sidebar.tsx
├── TopBar.tsx
├── NavItem.tsx
└── MobileNav.tsx
```

---

### TASK-014: Implement Role-Based Routing
**Priority**: P0 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Protect routes based on user role.

**Acceptance Criteria**:
- [ ] Students cannot access `/teacher/*` routes
- [ ] Teachers cannot access `/admin/*` routes
- [ ] Unauthorized access shows 403 page
- [ ] Redirect unauthenticated users to login

**Middleware**: `middleware.ts`

---

### TASK-015: Create Student Dashboard Page
**Priority**: P0 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Main student landing page with widgets.

**Acceptance Criteria**:
- [ ] Character preview widget (8-bit avatar)
- [ ] Cookie balance display (orange themed)
- [ ] XP progress bar (cyan themed)
- [ ] Upcoming classes list
- [ ] Quick action buttons
- [ ] Real-time updates via Supabase Realtime

**Route**: `app/(dashboard)/student/page.tsx`

**Widgets**:
- `CharacterWidget.tsx`
- `CookieBalanceCard.tsx`
- `XPProgressCard.tsx`
- `UpcomingClassesList.tsx`

---

### TASK-016: Create Teacher Dashboard Page
**Priority**: P1 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: Teacher's class management dashboard.

**Acceptance Criteria**:
- [ ] Today's schedule
- [ ] Class roster for each class
- [ ] Create new class button
- [ ] Earnings summary
- [ ] Student roster access

**Route**: `app/(dashboard)/teacher/page.tsx`

---

### TASK-017: Create Admin Dashboard Page
**Priority**: P2 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: Admin analytics and management dashboard.

**Acceptance Criteria**:
- [ ] User count metrics
- [ ] Booking statistics
- [ ] Cookie circulation
- [ ] Revenue overview
- [ ] User management link

**Route**: `app/(dashboard)/admin/page.tsx`

---

### TASK-018: Profile Settings Page
**Priority**: P1 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: User profile management.

**Acceptance Criteria**:
- [ ] Edit name, avatar
- [ ] Timezone selection
- [ ] Language preference (VI/EN)
- [ ] Career path change (once/month)
- [ ] Referral code display
- [ ] Password change

**Route**: `app/settings/profile/page.tsx`

---

### TASK-019: Design System Documentation
**Priority**: P1 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Document all design tokens and components.

**Acceptance Criteria**:
- [ ] Color palette with hex values
- [ ] Typography scale
- [ ] Spacing system
- [ ] Animation tokens
- [ ] Component gallery (Storybook optional)

**File**: `docs/design-system.md`

---

## Phase 2: Cookie & Booking System (Sprints 4-5)

### Sprint 4 Goals
- Class browsing and search
- Booking flow with Cookie discount
- Payment integration (VNPay)

### Sprint 5 Goals
- Cookie earning mechanics
- Booking history
- Cancellation/refund flow

---

### TASK-020: Class Catalog Page
**Priority**: P0 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Browse and search available classes.

**Acceptance Criteria**:
- [ ] Grid/list view toggle
- [ ] Filters: date, time, topic, teacher, price
- [ ] Search by keyword
- [ ] Class cards with teacher, time, price, spots
- [ ] Pagination or infinite scroll
- [ ] Mobile responsive

**Route**: `app/classes/page.tsx`

**Components**:
- `ClassCard.tsx`
- `ClassFilters.tsx`
- `ClassSearch.tsx`

---

### TASK-021: Class Detail Page
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: Individual class view with booking CTA.

**Acceptance Criteria**:
- [ ] Class info (topic, description, teacher)
- [ ] Teacher profile preview
- [ ] Schedule with timezone display
- [ ] Price with Cookie discount preview
- [ ] "Book Now" button
- [ ] Spots remaining indicator

**Route**: `app/classes/[classId]/page.tsx`

---

### TASK-022: Booking Flow - Cookie Discount Calculator
**Priority**: P0 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Interactive Cookie discount application.

**Acceptance Criteria**:
- [ ] Cookie balance display
- [ ] Slider to apply Cookies (0 to max)
- [ ] Real-time price calculation
- [ ] Max 50% discount cap
- [ ] $5 minimum price enforcement
- [ ] Discount breakdown display

**Component**: `CookieDiscountCalculator.tsx`

**Tests**:
- [ ] 100 Cookies on $50 class = $25 (50 Cookies used)
- [ ] Cannot use more Cookies than balance
- [ ] Cannot reduce below $5

---

### TASK-023: Payment Integration - VNPay
**Priority**: P0 | **Estimate**: 12h | **Assignee**: Backend Dev

**Description**: Integrate VNPay for Vietnam payments.

**Acceptance Criteria**:
- [ ] VNPay sandbox account
- [ ] Payment initiation Edge Function
- [ ] IPN webhook handler
- [ ] Payment status tracking
- [ ] Receipt generation
- [ ] Error handling

**Edge Functions**:
- `process-payment/` - Initiate VNPay transaction
- `payment-webhook/` - Handle IPN callback

**Tests**:
- [ ] Successful payment creates booking
- [ ] Failed payment refunds Cookies
- [ ] IPN signature validation

---

### TASK-024: Booking Confirmation Page
**Priority**: P0 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Post-payment confirmation screen.

**Acceptance Criteria**:
- [ ] Success/failure state
- [ ] Booking details summary
- [ ] Price breakdown (original, discount, final)
- [ ] Calendar add button
- [ ] "View My Bookings" link

**Route**: `app/booking/confirmation/page.tsx`

---

### TASK-025: My Bookings Page
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: Student's booking history.

**Acceptance Criteria**:
- [ ] Upcoming vs Past tabs
- [ ] Booking cards with status
- [ ] "Join Class" button for live classes
- [ ] Cancel booking option (with policy)
- [ ] Price breakdown per booking

**Route**: `app/student/bookings/page.tsx`

---

### TASK-026: Cookie Earning - Referral System
**Priority**: P1 | **Estimate**: 8h | **Assignee**: Full Stack

**Description**: Referral coupon system for Cookie earning.

**Acceptance Criteria**:
- [ ] Unique referral code per user
- [ ] Shareable referral link
- [ ] 50 Cookies on referred friend's first booking
- [ ] Fraud detection (same IP, rapid signups)
- [ ] Referral tracking dashboard

**Edge Function**: `process-referral/`

---

### TASK-027: Cookie Earning - Activity Rewards
**Priority**: P1 | **Estimate**: 6h | **Assignee**: Backend Dev

**Description**: Award Cookies for platform activities.

**Acceptance Criteria**:
- [ ] First booking: 20 Cookies
- [ ] Class completion: 5 Cookies
- [ ] Leave review: 10 Cookies
- [ ] Profile completion: 15 Cookies
- [ ] Automatic triggers via database functions

---

### TASK-028: Cancellation & Refund Flow
**Priority**: P1 | **Estimate**: 8h | **Assignee**: Full Stack

**Description**: Handle booking cancellations.

**Acceptance Criteria**:
- [ ] >24h: Full refund (money + Cookies)
- [ ] 2-24h: 50% refund
- [ ] <2h: No refund
- [ ] Teacher cancel: Full refund + compensation
- [ ] Refund to original payment method

**Edge Function**: `process-cancellation/`

---

## Phase 3: Career Avatar & Gamification (Sprints 6-7)

### Sprint 6 Goals
- Career path selection onboarding
- Character viewer with sprites
- XP/Gold reward system

### Sprint 7 Goals
- Marketplace implementation
- Leaderboards
- Streak tracking

---

### TASK-029: Career Path Selection Onboarding
**Priority**: P0 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: New student career path selection flow.

**Acceptance Criteria**:
- [ ] 6 career cards (Doctor, Engineer, Warrior, Business, Artist, Scientist)
- [ ] Pixel art character preview per career
- [ ] Career description and theme colors
- [ ] Selection confirmation
- [ ] Redirect to dashboard after selection

**Route**: `app/onboarding/career/page.tsx`

---

### TASK-030: Generate AI Character Sprites
**Priority**: P0 | **Estimate**: 12h | **Assignee**: Designer/Dev

**Description**: Create 8-bit character sprites using AI.

**Acceptance Criteria**:
- [ ] 6 careers × 4 evolution stages = 24 base sprites
- [ ] Consistent style across all careers
- [ ] PNG format with transparency
- [ ] JSON metadata for animations
- [ ] Upload to Supabase Storage

**Prompt Template**:
```
8-bit pixel art character, [career] profession, [level] stage,
facing forward, vibrant colors, transparent background,
RPG game style, 64x64 pixels
```

---

### TASK-031: Character Viewer Component
**Priority**: P0 | **Estimate**: 10h | **Assignee**: Frontend Dev

**Description**: Interactive 8-bit character display with equipment.

**Acceptance Criteria**:
- [ ] Render character sprite based on career + level
- [ ] Display equipped items (hat, outfit, pet)
- [ ] Idle animation loop (4 frames)
- [ ] Level indicator
- [ ] XP progress bar to next level
- [ ] 60fps rendering (Canvas or PixiJS)

**Component**: `CharacterViewer.tsx`

---

### TASK-032: XP & Gold Reward Edge Function
**Priority**: P0 | **Estimate**: 8h | **Assignee**: Backend Dev

**Description**: Award XP and Gold on class completion.

**Acceptance Criteria**:
- [ ] Trigger when class ends
- [ ] Calculate XP: 50 base + 25 bonus (90%+ quiz)
- [ ] Calculate Gold: 10/20/30 based on score tier
- [ ] Level up detection: `floor(xp / 500) + 1`
- [ ] Transaction logging
- [ ] Real-time notification to frontend

**Edge Function**: `award-class-rewards/`

**Tests**:
- [ ] 90% quiz score → 75 XP + 30 Gold
- [ ] 80% quiz score → 50 XP + 20 Gold
- [ ] Level up triggers at 500 XP

---

### TASK-033: Daily Login Bonus
**Priority**: P1 | **Estimate**: 4h | **Assignee**: Backend Dev

**Description**: Award 5 Gold on first daily login.

**Acceptance Criteria**:
- [ ] Track last login date per user
- [ ] Award 5 Gold once per day
- [ ] 7-day streak: +50 Gold bonus
- [ ] Streak reset on missed day
- [ ] Notification on bonus earned

**Edge Function**: `daily-login-bonus/`

---

### TASK-034: Marketplace Page
**Priority**: P1 | **Estimate**: 10h | **Assignee**: Frontend Dev

**Description**: Item shop for cosmetic purchases.

**Acceptance Criteria**:
- [ ] Category tabs: Hats, Outfits, Backgrounds, Emotes, Pets
- [ ] Item grid with Gold prices
- [ ] Preview on character (live)
- [ ] Purchase confirmation modal
- [ ] Insufficient Gold handling
- [ ] Purchase success animation

**Route**: `app/marketplace/page.tsx`

---

### TASK-035: Marketplace Purchase Flow
**Priority**: P1 | **Estimate**: 6h | **Assignee**: Full Stack

**Description**: Gold spending for marketplace items.

**Acceptance Criteria**:
- [ ] Balance check before purchase
- [ ] Atomic transaction (Gold deduct + item add)
- [ ] Transaction logging
- [ ] Item added to inventory
- [ ] Celebration animation on purchase

---

### TASK-036: Character Customization Page
**Priority**: P1 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Equip/unequip owned items.

**Acceptance Criteria**:
- [ ] Inventory display by category
- [ ] Drag-and-drop or click to equip
- [ ] Live character preview
- [ ] Save equipped state
- [ ] Unequip option

**Route**: `app/character/customize/page.tsx`

---

### TASK-037: Leaderboard Page
**Priority**: P2 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: Career-specific XP rankings.

**Acceptance Criteria**:
- [ ] Tabs per career path
- [ ] Top 100 students by XP
- [ ] Current user highlighted
- [ ] Character preview per rank
- [ ] Weekly/All-time toggle

**Route**: `app/leaderboard/page.tsx`

---

### TASK-038: Level Up Celebration Animation
**Priority**: P2 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Full-screen celebration on level up.

**Acceptance Criteria**:
- [ ] Confetti particles
- [ ] Character glow effect
- [ ] "LEVEL UP!" text animation
- [ ] New unlocks display
- [ ] Sound effect (optional)

**Component**: `LevelUpCelebration.tsx`

---

## Phase 4: Video Classes with CometChat (Sprints 8-9)

### Sprint 8 Goals
- CometChat integration
- Teacher can start class
- Student can join class

### Sprint 9 Goals
- In-call features (chat, screen share)
- Attendance tracking
- Post-class rewards

---

### TASK-039: CometChat Account Setup
**Priority**: P0 | **Estimate**: 2h | **Assignee**: DevOps

**Description**: Create CometChat app and configure credentials.

**Acceptance Criteria**:
- [ ] CometChat account created
- [ ] App created (Build/Free plan)
- [ ] App ID, Auth Key, REST API Key noted
- [ ] Video calling enabled
- [ ] Environment variables configured

---

### TASK-040: CometChat User Sync Edge Function
**Priority**: P0 | **Estimate**: 4h | **Assignee**: Backend Dev

**Description**: Sync Supabase users to CometChat on signup.

**Acceptance Criteria**:
- [ ] Trigger on auth.users insert
- [ ] Create CometChat user with UID = Supabase ID
- [ ] Sync name, avatar, role metadata
- [ ] Handle failures gracefully

**Edge Function**: `cometchat-user-sync/`

---

### TASK-041: CometChat Client Initialization
**Priority**: P0 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Initialize CometChat SDK in Next.js.

**Acceptance Criteria**:
- [ ] Install `@cometchat/chat-sdk-javascript`
- [ ] Install `@cometchat/chat-uikit-react`
- [ ] Init on app load
- [ ] Login user on auth
- [ ] Handle connection states

**File**: `lib/cometchat.ts`

---

### TASK-042: Video Classroom Page
**Priority**: P0 | **Estimate**: 12h | **Assignee**: Frontend Dev

**Description**: Main video call interface for classes.

**Acceptance Criteria**:
- [ ] Teacher video spotlight (large)
- [ ] Student video grid (small thumbnails)
- [ ] Call controls: mute, camera, screen share, leave
- [ ] In-call chat panel
- [ ] Participant list
- [ ] Class timer

**Route**: `app/class/[classId]/live/page.tsx`

**Components**:
```
components/video/
├── ClassRoom.tsx
├── CallControls.tsx
├── ParticipantList.tsx
├── InCallChat.tsx
└── WaitingRoom.tsx
```

---

### TASK-043: Teacher "Start Class" Flow
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Full Stack

**Description**: Teacher initiates video session.

**Acceptance Criteria**:
- [ ] "Start Class" button visible 15 min before
- [ ] Create CometChat group for class (if not exists)
- [ ] Update session status to "live"
- [ ] Redirect to video room
- [ ] Initiate group call as teacher

---

### TASK-044: Student "Join Class" Flow
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Full Stack

**Description**: Student joins live class.

**Acceptance Criteria**:
- [ ] "Join Class" button when class is live
- [ ] Verify booking exists
- [ ] Redirect to video room
- [ ] Join CometChat group call
- [ ] Handle "not booked" error

---

### TASK-045: Screen Sharing Feature
**Priority**: P1 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Teacher screen share during class.

**Acceptance Criteria**:
- [ ] Screen share button (teacher only)
- [ ] All students see shared screen
- [ ] Stop sharing option
- [ ] Handle browser permissions

---

### TASK-046: In-Call Chat
**Priority**: P1 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Text chat during video call.

**Acceptance Criteria**:
- [ ] Chat panel in sidebar
- [ ] Real-time message delivery
- [ ] Scroll to latest message
- [ ] Timestamps

---

### TASK-047: Attendance Tracking
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Backend Dev

**Description**: Track who attended the class.

**Acceptance Criteria**:
- [ ] Log join/leave events
- [ ] Calculate attendance duration
- [ ] Mark booking as "attended" or "no_show"
- [ ] Minimum attendance: 15 min of 25 min class

---

### TASK-048: Post-Class Rewards Trigger
**Priority**: P0 | **Estimate**: 4h | **Assignee**: Backend Dev

**Description**: Award XP/Gold when class ends.

**Acceptance Criteria**:
- [ ] Webhook from CometChat or manual trigger
- [ ] Award rewards to attended students
- [ ] Update class session status to "ended"
- [ ] Send notification to students

---

### TASK-049: Class Ended Summary Page
**Priority**: P1 | **Estimate**: 4h | **Assignee**: Frontend Dev

**Description**: Post-class summary with rewards.

**Acceptance Criteria**:
- [ ] Class duration display
- [ ] XP earned animation
- [ ] Gold earned animation
- [ ] Quiz link (if available)
- [ ] "Back to Dashboard" button

**Route**: `app/class/[classId]/summary/page.tsx`

---

## Phase 5: Teacher & Quiz Features (Sprints 10-11)

### Sprint 10 Goals
- Teacher class creation
- Class management
- Teacher earnings

### Sprint 11 Goals
- Quiz builder
- Quiz taking flow
- Review system

---

### TASK-050: Teacher Class Creation Page
**Priority**: P0 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Form to create new classes.

**Acceptance Criteria**:
- [ ] Topic, description fields
- [ ] Date/time picker (with timezone)
- [ ] Duration (25 min default)
- [ ] Capacity (1-20)
- [ ] Price ($5+ minimum)
- [ ] Validation and submission

**Route**: `app/teacher/classes/create/page.tsx`

---

### TASK-051: Teacher Class Management Page
**Priority**: P1 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: View and manage created classes.

**Acceptance Criteria**:
- [ ] List of teacher's classes
- [ ] Filter by status (upcoming, past)
- [ ] Edit class details
- [ ] Cancel class (with student notification)
- [ ] View enrolled students

**Route**: `app/teacher/classes/page.tsx`

---

### TASK-052: Teacher Earnings Dashboard
**Priority**: P1 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: Track teacher revenue.

**Acceptance Criteria**:
- [ ] Total earnings (70% of bookings)
- [ ] Earnings by period (weekly, monthly)
- [ ] Per-class breakdown
- [ ] Payout history
- [ ] Next payout estimate

**Route**: `app/teacher/earnings/page.tsx`

---

### TASK-053: Quiz Builder Page
**Priority**: P1 | **Estimate**: 10h | **Assignee**: Frontend Dev

**Description**: Teacher creates quizzes for classes.

**Acceptance Criteria**:
- [ ] Add questions (5-10)
- [ ] Question types: multiple choice, fill-blank
- [ ] Set correct answers
- [ ] Preview quiz
- [ ] Link to class

**Route**: `app/teacher/quizzes/create/page.tsx`

---

### TASK-054: Quiz Taking Page
**Priority**: P1 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Student takes post-class quiz.

**Acceptance Criteria**:
- [ ] Timer (10 min max)
- [ ] Question navigation
- [ ] Submit answers
- [ ] Instant scoring
- [ ] Results display with correct answers
- [ ] 1 retake allowed

**Route**: `app/quiz/[quizId]/page.tsx`

---

### TASK-055: Quiz Scoring Edge Function
**Priority**: P1 | **Estimate**: 4h | **Assignee**: Backend Dev

**Description**: Calculate quiz score and trigger rewards.

**Acceptance Criteria**:
- [ ] Score calculation
- [ ] Pass/fail determination (70%)
- [ ] Store attempt in database
- [ ] Trigger XP bonus for 90%+
- [ ] Update Gold tier based on score

**Edge Function**: `score-quiz/`

---

### TASK-056: Class Review System
**Priority**: P2 | **Estimate**: 6h | **Assignee**: Full Stack

**Description**: Students review completed classes.

**Acceptance Criteria**:
- [ ] 1-5 star rating
- [ ] Text review (optional)
- [ ] One review per class per student
- [ ] Award 10 Cookies for first review
- [ ] Display reviews on teacher profile

---

## Phase 6: Notifications & Polish (Sprint 12)

### Sprint 12 Goals
- Notification system complete
- Performance optimization
- Bug fixes and polish
- Production deployment

---

### TASK-057: In-App Notification System
**Priority**: P0 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Real-time in-app notifications.

**Acceptance Criteria**:
- [ ] Notification bell in header
- [ ] Unread count badge
- [ ] Dropdown notification list
- [ ] Mark as read
- [ ] Notification types: booking, cookies, xp, class reminder
- [ ] Supabase Realtime subscription

**Components**:
```
components/notifications/
├── NotificationBell.tsx
├── NotificationList.tsx
└── NotificationItem.tsx
```

---

### TASK-058: Browser Push Notifications
**Priority**: P1 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: Web push notifications for class reminders.

**Acceptance Criteria**:
- [ ] Permission request on first login
- [ ] Service worker registration
- [ ] Push 15 min before class
- [ ] Push when class goes live
- [ ] Notification click opens class

---

### TASK-059: Email Notification Templates
**Priority**: P1 | **Estimate**: 6h | **Assignee**: Backend Dev

**Description**: Transactional email templates.

**Acceptance Criteria**:
- [ ] Welcome email
- [ ] Booking confirmation
- [ ] Class reminder (1 hour before)
- [ ] Receipt email
- [ ] Password reset
- [ ] Use Supabase Auth emails or Resend

---

### TASK-060: Performance Optimization
**Priority**: P1 | **Estimate**: 8h | **Assignee**: Full Stack

**Description**: Optimize for <3s page load.

**Acceptance Criteria**:
- [ ] Image optimization (next/image)
- [ ] Lazy loading components
- [ ] Database query optimization
- [ ] API response caching
- [ ] Bundle size analysis
- [ ] Lighthouse score >90

---

### TASK-061: Accessibility Audit
**Priority**: P1 | **Estimate**: 6h | **Assignee**: Frontend Dev

**Description**: Ensure WCAG 2.1 AA compliance.

**Acceptance Criteria**:
- [ ] Color contrast ratios
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Focus indicators
- [ ] Alt text for images
- [ ] aXe audit passing

---

### TASK-062: E2E Test Suite
**Priority**: P1 | **Estimate**: 12h | **Assignee**: QA/Dev

**Description**: Playwright E2E tests for critical flows.

**Test Scenarios**:
- [ ] User registration flow
- [ ] Class booking with Cookies
- [ ] Career path selection
- [ ] Video class join
- [ ] Marketplace purchase
- [ ] Quiz completion

**File**: `tests/e2e/`

---

### TASK-063: Production Deployment
**Priority**: P0 | **Estimate**: 8h | **Assignee**: DevOps

**Description**: Deploy to production environment.

**Acceptance Criteria**:
- [ ] Vercel production deployment
- [ ] Supabase production project
- [ ] Environment variables configured
- [ ] Custom domain setup
- [ ] SSL certificate
- [ ] Monitoring (Vercel Analytics)

---

### TASK-064: Admin User Management Page
**Priority**: P2 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Admin can manage users.

**Acceptance Criteria**:
- [ ] User list with search
- [ ] Filter by role
- [ ] View user details
- [ ] Suspend/unsuspend account
- [ ] Adjust Cookie balance
- [ ] Change user role

**Route**: `app/admin/users/page.tsx`

---

### TASK-065: Admin Analytics Dashboard
**Priority**: P2 | **Estimate**: 8h | **Assignee**: Frontend Dev

**Description**: Platform-wide analytics.

**Acceptance Criteria**:
- [ ] User growth chart
- [ ] Booking trends
- [ ] Cookie circulation
- [ ] Revenue metrics
- [ ] Teacher performance
- [ ] Export to CSV

**Route**: `app/admin/analytics/page.tsx`

---

## Task Summary by Priority

| Priority | Count | Description |
|----------|-------|-------------|
| **P0** | 35 | Critical path - must complete |
| **P1** | 24 | Important - should complete |
| **P2** | 8 | Nice to have - complete if time |

---

## Sprint Allocation

| Sprint | Phase | Tasks | Focus |
|--------|-------|-------|-------|
| 1 | 0 | TASK-001 to TASK-011 | Setup & Schema |
| 2 | 1 | TASK-012 to TASK-015 | Auth & Layout |
| 3 | 1 | TASK-016 to TASK-019 | Dashboards |
| 4 | 2 | TASK-020 to TASK-024 | Booking Flow |
| 5 | 2 | TASK-025 to TASK-028 | Cookies & Refunds |
| 6 | 3 | TASK-029 to TASK-033 | Avatar System |
| 7 | 3 | TASK-034 to TASK-038 | Marketplace |
| 8 | 4 | TASK-039 to TASK-044 | Video Classes |
| 9 | 4 | TASK-045 to TASK-049 | Video Features |
| 10 | 5 | TASK-050 to TASK-052 | Teacher Tools |
| 11 | 5 | TASK-053 to TASK-056 | Quizzes |
| 12 | 6 | TASK-057 to TASK-065 | Polish & Deploy |

---

## Dependencies Graph

```
TASK-001 (Next.js Setup)
    └── TASK-009 (shadcn/ui)
    └── TASK-012 (Auth)
         └── TASK-013 (Layout)
              └── TASK-015 (Student Dashboard)
              └── TASK-016 (Teacher Dashboard)
              └── TASK-017 (Admin Dashboard)

TASK-002 (Supabase Setup)
    └── TASK-003 (Users Schema)
    └── TASK-004 (Classes Schema)
         └── TASK-020 (Class Catalog)
         └── TASK-050 (Class Creation)
    └── TASK-005 (Cookies Schema)
         └── TASK-022 (Cookie Calculator)
         └── TASK-026 (Referral System)
    └── TASK-006 (Avatar Schema)
         └── TASK-029 (Career Selection)
         └── TASK-031 (Character Viewer)

TASK-039 (CometChat Setup)
    └── TASK-040 (User Sync)
    └── TASK-041 (Client Init)
         └── TASK-042 (Video Room)
              └── TASK-043 (Start Class)
              └── TASK-044 (Join Class)
```

---

**Document Version**: 1.0  
**Generated By**: AI Task Generator  
**Last Updated**: 2026-01-22
