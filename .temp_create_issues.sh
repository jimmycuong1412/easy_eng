#!/bin/bash

# TASK-002
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-002: Configure Supabase Project" --body "**Priority**: P0 | **Estimate**: 3h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Set up Supabase project with PostgreSQL database and initial configuration.

**Acceptance Criteria**:
- [ ] Supabase project created at supabase.com
- [ ] Local development with \`supabase init\` and \`supabase start\`
- [ ] Environment variables documented
- [ ] Database connection verified
- [ ] Supabase CLI installed and linked

**Commands**:
\`\`\`bash
npm install -g supabase
supabase init
supabase start
supabase link --project-ref <project-id>
\`\`\`

**Files to Create**:
\`\`\`
supabase/
├── config.toml
├── .gitignore
└── migrations/
    └── .gitkeep
\`\`\`

---
_From: specs/001-english-learning-platform/tasks.md_"

# TASK-003
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-003: Create Database Schema - Users & Auth" --body "**Priority**: P0 | **Estimate**: 6h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Design and implement user authentication schema with RBAC.

**Acceptance Criteria**:
- [ ] \`users\` table with profile fields
- [ ] \`user_roles\` enum (student, teacher, admin)
- [ ] Row Level Security (RLS) policies
- [ ] Timezone field (default: Asia/Ho_Chi_Minh)
- [ ] Profile completion tracking
- [ ] Referral code generation

**Migration File**: \`001_users.sql\`

**Tests**:
- [ ] User signup creates profile
- [ ] RLS prevents cross-user access
- [ ] Referral code is unique

---
_From: specs/001-english-learning-platform/tasks.md_"

# TASK-004
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-004: Create Database Schema - Classes & Bookings" --body "**Priority**: P0 | **Estimate**: 6h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Implement class scheduling and booking tables.

**Acceptance Criteria**:
- [ ] \`classes\` table with capacity, price, duration (25 min)
- [ ] \`bookings\` table with Cookie discount tracking
- [ ] Constraints: no overbooking, \$5 minimum price
- [ ] RLS policies for student/teacher access
- [ ] Indexes for performance

**Migration File**: \`002_classes.sql\`

---
_From: specs/001-english-learning-platform/tasks.md_"

# TASK-005
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-005: Create Database Schema - Cookie System" --body "**Priority**: P0 | **Estimate**: 4h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Implement Cookie virtual currency with transaction ledger.

**Acceptance Criteria**:
- [ ] \`cookie_balances\` table with atomic updates
- [ ] \`cookie_transactions\` audit log
- [ ] \`cookie_earning_rules\` configuration
- [ ] Prevent negative balance constraint
- [ ] Transaction types: earned, spent, refunded

**Migration File**: \`003_cookies.sql\`

---
_From: specs/001-english-learning-platform/tasks.md_"

# TASK-006
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-006: Create Database Schema - Career Avatar System" --body "**Priority**: P0 | **Estimate**: 6h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Implement career paths, characters, and progression.

**Migration File**: \`004_career_avatars.sql\`

**Acceptance Criteria**:
- [ ] \`career_paths\` with 6 archetypes
- [ ] \`student_characters\` with XP/Gold/Level
- [ ] \`marketplace_items\` catalog
- [ ] \`student_inventory\` owned items
- [ ] \`progression_transactions\` audit log
- [ ] Level calculation: \`floor(xp / 500) + 1\`

---
_From: specs/001-english-learning-platform/tasks.md_"

# TASK-007
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-007: Create Database Schema - Video Sessions" --body "**Priority**: P0 | **Estimate**: 3h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Track CometChat video session metadata.

**Migration File**: \`005_video_sessions.sql\`

**Acceptance Criteria**:
- [ ] \`class_sessions\` table
- [ ] CometChat group ID mapping
- [ ] Session status tracking (scheduled, live, ended)
- [ ] Participant attendance logging

---
_From: specs/001-english-learning-platform/tasks.md_"

# TASK-008
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-008: Create Database Schema - Quizzes" --body "**Priority**: P1 | **Estimate**: 4h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Built-in quiz system for classes.

**Migration File**: \`006_quizzes.sql\`

**Acceptance Criteria**:
- [ ] \`quizzes\` linked to classes
- [ ] \`quiz_questions\` with multiple types
- [ ] \`quiz_attempts\` with scoring
- [ ] 70% pass threshold enforcement
- [ ] 1 retake allowed per quiz

---
_From: specs/001-english-learning-platform/tasks.md_"

# TASK-009
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-009: Setup shadcn/ui Component Library" --body "**Priority**: P0 | **Estimate**: 4h | **Assignee**: Frontend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Initialize shadcn/ui with dark theme customization.

**Acceptance Criteria**:
- [ ] \`npx shadcn-ui@latest init\` with custom theme
- [ ] Dark blue color palette configured
- [ ] Core components installed: Button, Card, Input, Modal, Toast
- [ ] Animation variants integrated with Framer Motion

**Commands**:
\`\`\`bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input dialog toast
\`\`\`

---
_From: specs/001-english-learning-platform/tasks.md_"

# TASK-010
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-010: Configure CI/CD Pipeline" --body "**Priority**: P0 | **Estimate**: 4h | **Assignee**: DevOps | **Phase**: 0 | **Sprint**: 1

**Description**: GitHub Actions for testing, linting, and deployment.

**Acceptance Criteria**:
- [ ] Lint on PR
- [ ] Unit tests on PR
- [ ] E2E tests on merge to main
- [ ] Auto-deploy to Vercel on main
- [ ] Supabase migrations on release

**File**: \`.github/workflows/ci.yml\`

---
_From: specs/001-english-learning-platform/tasks.md_"

# TASK-011
gh issue create --repo jimmycuong1412/easy_eng --title "TASK-011: Seed Initial Data" --body "**Priority**: P1 | **Estimate**: 3h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Create seed data for development and testing.

**Acceptance Criteria**:
- [ ] 6 career paths with themes
- [ ] 20+ marketplace items
- [ ] Cookie earning rules
- [ ] Test users (student, teacher, admin)
- [ ] Sample classes

**File**: \`supabase/seed.sql\`

---
_From: specs/001-english-learning-platform/tasks.md_"

echo "Created issues for Phase 0 (TASK-001 to TASK-011)"
