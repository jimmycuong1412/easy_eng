# Tasks: Modern English Learning Platform

**Input**: Design documents from `/specs/001-english-learning-platform/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 0: Test Infrastructure Setup (CRITICAL - Constitution Requirement)

**Purpose**: Establish test-first development environment per Constitution Principle II

**⚠️ CRITICAL**: This phase MUST be complete before ANY implementation code is written

### Frontend Testing Setup

- [ ] T000 [P] Install Jest 29+ and React Testing Library in frontend/package.json
- [ ] T001a [P] Create Jest configuration with 80% coverage threshold in frontend/jest.config.js
- [ ] T001b [P] Create test setup file in frontend/src/test/setup.ts
- [ ] T001c [P] Install Playwright and configure E2E testing in frontend/playwright.config.ts
- [ ] T001d [P] Create test utilities and helpers in frontend/src/test/utils.ts
- [ ] T001e [P] Create mock Supabase client for testing in frontend/src/test/mocks/supabase.ts

### Backend Testing Setup

- [ ] T001f [P] Install Vitest for Edge Functions testing in supabase/functions/
- [ ] T001g [P] Create Edge Function test helpers in supabase/functions/_shared/test-utils.ts
- [ ] T001h [P] Setup database test fixtures in supabase/tests/fixtures/

### CI/CD Integration

- [ ] T001i [P] Create GitHub Actions test workflow in .github/workflows/test.yml
- [ ] T001j [P] Create GitHub Actions coverage workflow in .github/workflows/coverage.yml
- [ ] T001k [P] Configure pre-commit hooks for testing in .husky/pre-commit
- [ ] T001l Create test documentation in docs/testing-guide.md

**Checkpoint**: Test infrastructure ready - TDD can begin for all user stories

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure with frontend/ and supabase/ directories
- [ ] T002 Initialize Next.js 14+ project with App Router in frontend/
- [ ] T003 [P] Configure TypeScript, ESLint, and Prettier in frontend/
- [ ] T004 [P] Install and configure Tailwind CSS + shadcn/ui in frontend/tailwind.config.js
- [ ] T005 [P] Setup Supabase CLI and initialize project in supabase/
- [ ] T006 [P] Configure dark blue theme design tokens in frontend/src/app/globals.css
- [ ] T007 [P] Install Framer Motion and configure animation system in frontend/src/lib/animations.ts
- [ ] T008 [P] Setup shared TypeScript types in shared/types/index.ts
- [ ] T009 [P] Configure test frameworks (Jest, React Testing Library, Playwright) in frontend/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Foundation

- [ ] T010 [P] Create users table with role-based fields in supabase/migrations/001_users.sql
- [ ] T011 [P] Create profiles table extending auth.users in supabase/migrations/002_profiles.sql
- [ ] T012 [P] Setup Row Level Security (RLS) policies for users and profiles in supabase/migrations/003_rls_policies.sql

### Authentication Foundation

- [ ] T013 [P] Configure Supabase Auth in frontend/src/lib/supabase.ts
- [ ] T014 [P] Create auth context and hooks in frontend/src/hooks/useAuth.ts
- [ ] T015 [P] Implement role-based access control middleware in frontend/src/middleware.ts
- [ ] T016 [P] Create login page in frontend/src/app/auth/login/page.tsx
- [ ] T017 [P] Create registration page in frontend/src/app/auth/register/page.tsx

### UI Foundation

- [ ] T018 [P] Create base layout component with navigation in frontend/src/components/layout/MainLayout.tsx
- [ ] T019 [P] Create role-based navigation component in frontend/src/components/layout/RoleBasedNav.tsx
- [ ] T020 [P] Implement common UI components (Button, Card, Input, Modal) in frontend/src/components/common/
- [ ] T021 [P] Create notification system component in frontend/src/components/common/NotificationCenter.tsx
- [ ] T022 [P] Setup Zustand stores for auth and notifications in frontend/src/stores/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Student Class Booking with Cookies Discount (Priority: P1) 🎯 MVP

**Goal**: Enable students to browse classes, view Cookie balance, apply discounts, and book classes

**Independent Test**: Student can log in, see Cookie balance, browse classes, apply Cookies for discount, and complete booking

### Test Suite for US1 (Test-First Approach - CRITICAL)

**⚠️ CONSTITUTION REQUIREMENT**: Write and verify these tests FAIL before implementing US1

- [ ] T023A [P] [US1] [TEST] Write unit tests for Cookie calculation utilities in frontend/src/utils/__tests__/cookieCalculator.test.ts
- [ ] T023B [P] [US1] [TEST] Write unit tests for Cookie discount validation (50% cap, 25% floor) in frontend/src/utils/__tests__/discountValidation.test.ts
- [ ] T023C [P] [US1] [TEST] Write integration tests for atomic Cookie transactions in supabase/functions/__tests__/cookie-atomicity.test.ts
- [ ] T023D [P] [US1] [TEST] Write integration tests for negative balance prevention in supabase/functions/__tests__/cookie-negative-balance.test.ts
- [ ] T023E [P] [US1] [TEST] Write integration tests for booking flow with rollback in frontend/tests/integration/booking-rollback.test.tsx
- [ ] T023F [P] [US1] [TEST] Write E2E test for complete booking with Cookie discount in frontend/tests/e2e/booking-flow.spec.ts
- [ ] T023G [US1] [TEST] Verify all US1 tests FAIL (Red phase of TDD)

**Checkpoint**: All tests written and failing - proceed with implementation

### Database Schema for US1

- [ ] T023 [P] [US1] Create classes table in supabase/migrations/004_classes.sql
- [ ] T024 [P] [US1] Create bookings table with Cookie discount fields in supabase/migrations/005_bookings.sql
- [ ] T025 [P] [US1] Create cookie_transactions table in supabase/migrations/006_cookie_transactions.sql
- [ ] T026 [P] [US1] Create student_cookies view for balance calculation in supabase/migrations/007_cookie_views.sql
- [ ] T027 [US1] Setup RLS policies for classes, bookings, and cookies in supabase/migrations/008_booking_rls.sql

### Cookie System Core (US1)

- [ ] T028 [P] [US1] Define Cookie constants (conversion rate, caps, rules) in shared/constants/cookies.ts
- [ ] T029 [P] [US1] Create Cookie calculation utilities in frontend/src/utils/cookieCalculator.ts
- [ ] T030 [US1] Implement Cookie transaction logger in supabase/functions/log-cookie-transaction/index.ts
- [ ] T031 [US1] Create Cookie balance hook in frontend/src/hooks/useCookieBalance.ts

### Cookie Transaction Integrity Testing (CRITICAL - Constitution Principle VI)

- [ ] T031A [P] [US1] [CURRENCY] [TEST] Write atomic transaction tests in supabase/tests/cookies/atomic-transactions.test.sql
- [ ] T031B [P] [US1] [CURRENCY] [TEST] Write rollback scenario tests in supabase/functions/__tests__/cookie-rollback.test.ts
- [ ] T031C [P] [US1] [CURRENCY] [TEST] Write concurrent booking conflict tests in frontend/tests/integration/cookie-concurrency.test.ts
- [ ] T031D [P] [US1] [CURRENCY] [TEST] Write double-spending prevention tests in frontend/tests/integration/cookie-double-spend.test.ts
- [ ] T031E [P] [US1] [CURRENCY] [TEST] Write Cookie audit log completeness tests in supabase/tests/cookies/audit-log.test.sql
- [ ] T031F [US1] [CURRENCY] Add database constraint to prevent negative balances in supabase/migrations/006a_cookie_constraints.sql

**Checkpoint**: Cookie transaction integrity validated and enforced

### Class Browsing (US1)

- [ ] T032 [P] [US1] Create class catalog component in frontend/src/components/booking/ClassCatalog.tsx
- [ ] T033 [P] [US1] Create class card component with pricing in frontend/src/components/booking/ClassCard.tsx
- [ ] T034 [P] [US1] Create class filters component in frontend/src/components/booking/ClassFilters.tsx
- [ ] T035 [US1] Implement class search/filter logic in frontend/src/hooks/useClassSearch.ts
- [ ] T036 [US1] Create class detail page in frontend/src/app/student/classes/[id]/page.tsx

### Booking Flow (US1)

- [ ] T037 [P] [US1] Create Cookie discount slider component in frontend/src/components/booking/CookieDiscountSlider.tsx
- [ ] T038 [P] [US1] Create booking summary component in frontend/src/components/booking/BookingSummary.tsx
- [ ] T039 [US1] Implement booking validation (capacity, price floor) in supabase/functions/validate-booking/index.ts
- [ ] T040 [US1] Create process-booking Edge Function with atomic transactions in supabase/functions/process-booking/index.ts
- [ ] T041 [US1] Implement payment integration in frontend/src/lib/payment.ts
- [ ] T042 [US1] Create booking confirmation page in frontend/src/app/student/bookings/confirm/page.tsx

### Student Dashboard (US1)

- [ ] T043 [P] [US1] Create Cookie balance widget in frontend/src/components/dashboard/CookieBalanceWidget.tsx
- [ ] T044 [P] [US1] Create upcoming classes widget in frontend/src/components/dashboard/UpcomingClassesWidget.tsx
- [ ] T045 [US1] Create student dashboard page in frontend/src/app/student/dashboard/page.tsx
- [ ] T046 [US1] Create booking history page in frontend/src/app/student/bookings/page.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - students can browse, book, and use Cookies

---

## Phase 4: User Story 2 - Multi-Role Dashboard Access (Priority: P1)

**Goal**: Implement role-specific dashboards for Students, Teachers, and Administrators with proper access controls

**Independent Test**: Users with different roles can log in and see only their role-appropriate dashboard and features

### Role Management

- [ ] T047 [P] [US2] Add role management functions to profiles in supabase/migrations/009_role_management.sql
- [ ] T048 [P] [US2] Create role-checking utilities in frontend/src/utils/roleCheck.ts
- [ ] T049 [US2] Implement server-side role enforcement in frontend/src/middleware.ts

### Teacher Dashboard

- [ ] T050 [P] [US2] Create teacher schedule widget in frontend/src/components/dashboard/TeacherScheduleWidget.tsx
- [ ] T051 [P] [US2] Create student roster widget in frontend/src/components/dashboard/StudentRosterWidget.tsx
- [ ] T052 [P] [US2] Create teacher earnings widget in frontend/src/components/dashboard/TeacherEarningsWidget.tsx
- [ ] T053 [US2] Create teacher dashboard page in frontend/src/app/teacher/dashboard/page.tsx
- [ ] T054 [US2] Create teacher class list page in frontend/src/app/teacher/classes/page.tsx

### Admin Dashboard

- [ ] T055 [P] [US2] Create user analytics widget in frontend/src/components/dashboard/UserAnalyticsWidget.tsx
- [ ] T056 [P] [US2] Create booking analytics widget in frontend/src/components/dashboard/BookingAnalyticsWidget.tsx
- [ ] T057 [P] [US2] Create Cookie analytics widget in frontend/src/components/dashboard/CookieAnalyticsWidget.tsx
- [ ] T058 [P] [US2] Create revenue analytics widget in frontend/src/components/dashboard/RevenueWidget.tsx
- [ ] T059 [US2] Create admin dashboard page in frontend/src/app/admin/dashboard/page.tsx
- [ ] T060 [US2] Create user management page in frontend/src/app/admin/users/page.tsx

### Access Control Enforcement

- [ ] T061 [P] [US2] Create protected route wrapper component in frontend/src/components/auth/ProtectedRoute.tsx
- [ ] T062 [US2] Add role-based redirects to all dashboard routes in frontend/src/app/*/layout.tsx
- [ ] T063 [US2] Implement RLS policies preventing cross-role data access in supabase/migrations/010_cross_role_rls.sql

### RBAC Security Testing (CRITICAL - Constitution Principle V)

**⚠️ SECURITY GATE**: These tests MUST pass before production deployment

- [ ] T063A [P] [US2] [SECURITY] [TEST] Write RLS policy tests for student-only data access in supabase/tests/rls/student-access.test.sql
- [ ] T063B [P] [US2] [SECURITY] [TEST] Write RLS policy tests for teacher-only data access in supabase/tests/rls/teacher-access.test.sql
- [ ] T063C [P] [US2] [SECURITY] [TEST] Write RLS policy tests for admin-only data access in supabase/tests/rls/admin-access.test.sql
- [ ] T063D [P] [US2] [SECURITY] [TEST] Write cross-role permission violation tests in supabase/tests/rls/cross-role-violations.test.sql
- [ ] T063E [P] [US2] [SECURITY] [TEST] Create E2E test for role escalation prevention in frontend/tests/e2e/security/role-escalation.spec.ts
- [ ] T063F [US2] [SECURITY] [TEST] Create E2E test for unauthorized dashboard access in frontend/tests/e2e/security/unauthorized-access.spec.ts

**Checkpoint**: All three roles should have functioning dashboards with proper isolation AND security validated

---

## Phase 5: User Story 3 - Cookie Earning System (Priority: P2)

**Goal**: Enable students to earn Cookies through platform activities (lessons, streaks, referrals, profile completion, reviews)

**Independent Test**: Student performs qualifying activities and sees Cookie balance increase with notifications

### Cookie Earning Rules

- [ ] T064 [P] [US3] Create activity_rules table in supabase/migrations/011_activity_rules.sql
- [ ] T065 [P] [US3] Seed initial Cookie earning rules (10/lesson, 50/streak, 100/referral, etc.) in supabase/seed.sql
- [ ] T066 [US3] Create activity tracking table in supabase/migrations/012_activity_tracking.sql

### Lesson Completion Rewards

- [ ] T067 [P] [US3] Create lesson completion trigger in supabase/migrations/013_lesson_completion_trigger.sql
- [ ] T068 [US3] Implement award-lesson-cookies Edge Function in supabase/functions/award-lesson-cookies/index.ts

### Attendance Streak Rewards

- [ ] T069 [P] [US3] Create attendance_streaks table in supabase/migrations/014_attendance_streaks.sql
- [ ] T070 [US3] Implement streak calculation Edge Function in supabase/functions/calculate-streak/index.ts
- [ ] T071 [US3] Create daily streak check Edge Function in supabase/functions/daily-streak-check/index.ts

### Referral System

- [ ] T072 [P] [US3] Create referral_codes table in supabase/migrations/015_referral_codes.sql
- [ ] T073 [P] [US3] Generate unique referral code on student signup in supabase/functions/generate-referral-code/index.ts
- [ ] T074 [P] [US3] Create referral link component in frontend/src/components/student/ReferralLink.tsx
- [ ] T075 [US3] Implement referral validation and reward in supabase/functions/process-referral/index.ts

### Profile and Review Rewards

- [ ] T076 [P] [US3] Create profile completion check in frontend/src/utils/profileCompleteness.ts
- [ ] T077 [P] [US3] Create reviews table in supabase/migrations/016_reviews.sql
- [ ] T078 [US3] Implement profile completion reward in supabase/functions/award-profile-cookies/index.ts
- [ ] T079 [US3] Implement first review reward in supabase/functions/award-review-cookies/index.ts
- [ ] T080 [US3] Create review form component in frontend/src/components/booking/ReviewForm.tsx

### Cookie Earning Notifications

- [ ] T081 [P] [US3] Create Cookie earned notification component in frontend/src/components/common/CookieEarnedToast.tsx
- [ ] T082 [US3] Setup real-time Cookie transaction listener in frontend/src/hooks/useCookieNotifications.ts
- [ ] T083 [US3] Create Cookie history page in frontend/src/app/student/cookies/history/page.tsx

**Checkpoint**: Students should earn Cookies from all activities with proper notifications

---

## Phase 6: User Story 4 - Teacher Class Management (Priority: P2)

**Goal**: Enable teachers to create, update, manage schedules, view enrolled students, and update class materials

**Independent Test**: Teacher can create a class, set details, and see enrolled students

### Class Creation

- [ ] T084 [P] [US4] Create class creation form component in frontend/src/components/teacher/CreateClassForm.tsx
- [ ] T085 [P] [US4] Create class editor component in frontend/src/components/teacher/ClassEditor.tsx
- [ ] T086 [US4] Implement class validation (time, capacity, price) in supabase/functions/validate-class/index.ts
- [ ] T087 [US4] Create class creation page in frontend/src/app/teacher/classes/new/page.tsx

### Class Management

- [ ] T088 [P] [US4] Create class detail view for teachers in frontend/src/app/teacher/classes/[id]/page.tsx
- [ ] T089 [P] [US4] Create enrolled students list component in frontend/src/components/teacher/EnrolledStudentsList.tsx
- [ ] T090 [P] [US4] Create class materials uploader in frontend/src/components/teacher/ClassMaterialsUploader.tsx
- [ ] T091 [US4] Setup Supabase Storage bucket for class materials in supabase/migrations/017_storage_buckets.sql
- [ ] T092 [US4] Implement capacity enforcement in supabase/migrations/018_capacity_triggers.sql

### Teacher Schedule

- [ ] T093 [P] [US4] Create teacher availability component in frontend/src/components/teacher/AvailabilityCalendar.tsx
- [ ] T094 [P] [US4] Create teacher_availability table in supabase/migrations/019_teacher_availability.sql
- [ ] T095 [US4] Create teacher schedule page in frontend/src/app/teacher/schedule/page.tsx
- [ ] T096 [US4] Implement schedule conflict detection in frontend/src/utils/scheduleConflicts.ts

**Checkpoint**: Teachers can fully manage their classes independently

---

## Phase 7: User Story 5 - Admin Platform Analytics (Priority: P3)

**Goal**: Provide administrators with comprehensive platform metrics and insights

**Independent Test**: Admin can view accurate, up-to-date analytics dashboards

### Analytics Database Views

- [ ] T097 [P] [US5] Create user growth analytics view in supabase/migrations/020_analytics_views.sql
- [ ] T098 [P] [US5] Create booking analytics view in supabase/migrations/020_analytics_views.sql
- [ ] T099 [P] [US5] Create Cookie circulation analytics view in supabase/migrations/020_analytics_views.sql
- [ ] T100 [P] [US5] Create revenue analytics view in supabase/migrations/020_analytics_views.sql

### Analytics API Functions

- [ ] T101 [P] [US5] Create get-user-analytics Edge Function in supabase/functions/get-user-analytics/index.ts
- [ ] T102 [P] [US5] Create get-booking-analytics Edge Function in supabase/functions/get-booking-analytics/index.ts
- [ ] T103 [P] [US5] Create get-cookie-analytics Edge Function in supabase/functions/get-cookie-analytics/index.ts
- [ ] T104 [P] [US5] Create get-revenue-analytics Edge Function in supabase/functions/get-revenue-analytics/index.ts

### Analytics UI Components

- [ ] T105 [P] [US5] Create user growth chart component in frontend/src/components/admin/UserGrowthChart.tsx
- [ ] T106 [P] [US5] Create booking trends chart in frontend/src/components/admin/BookingTrendsChart.tsx
- [ ] T107 [P] [US5] Create Cookie circulation chart in frontend/src/components/admin/CookieCirculationChart.tsx
- [ ] T108 [P] [US5] Create revenue chart in frontend/src/components/admin/RevenueChart.tsx
- [ ] T109 [US5] Create comprehensive analytics page in frontend/src/app/admin/analytics/page.tsx

### Time Period Filters

- [ ] T110 [P] [US5] Create date range picker component in frontend/src/components/admin/DateRangePicker.tsx
- [ ] T111 [US5] Implement time period filtering logic in frontend/src/hooks/useAnalyticsFilters.ts

**Checkpoint**: Admin has full visibility into platform metrics

---

## Phase 8: CometChat Video Integration (Priority: P2)

**Goal**: Enable live video classes between teachers and students using CometChat

**Independent Test**: Teacher can start a class, student can join, both can see/hear each other

### CometChat Setup

- [ ] T112 [P] Create CometChat configuration in frontend/src/lib/cometchat.ts
- [ ] T113 [P] Create CometChat types in shared/types/cometchat.types.ts
- [ ] T114 [P] Setup CometChat environment variables in frontend/.env.local

### User Sync

- [ ] T115 [P] Create class_sessions table in supabase/migrations/021_class_sessions.sql
- [ ] T116 [P] Create CometChat user sync Edge Function in supabase/functions/cometchat-user-sync/index.ts
- [ ] T117 Setup database webhook for user creation trigger in Supabase dashboard

### Video Classroom Components

- [ ] T118 [P] Create ClassRoom component in frontend/src/components/video/ClassRoom.tsx
- [ ] T119 [P] Create CallControls component in frontend/src/components/video/CallControls.tsx
- [ ] T120 [P] Create ParticipantList component in frontend/src/components/video/ParticipantList.tsx
- [ ] T121 [P] Create InCallChat component in frontend/src/components/video/InCallChat.tsx
- [ ] T122 [P] Create WaitingRoom component in frontend/src/components/video/WaitingRoom.tsx

### Video Flow Implementation

- [ ] T123 Create CometChat connection hook in frontend/src/hooks/useCometChat.ts
- [ ] T124 Create live class page in frontend/src/app/class/[classId]/live/page.tsx
- [ ] T125 Implement start class functionality for teachers in frontend/src/utils/classSession.ts
- [ ] T126 Implement join class functionality for students in frontend/src/utils/classSession.ts
- [ ] T127 Create CometChat webhook handler in supabase/functions/cometchat-webhook/index.ts

### Post-Class Rewards

- [ ] T128 Create award-class-rewards Edge Function in supabase/functions/award-class-rewards/index.ts
- [ ] T129 Implement class completion tracking in supabase/migrations/022_class_completion.sql

**Checkpoint**: Live video classes fully functional with rewards

---

## Phase 9: Cookie System Advanced Features (Priority: P2)

**Goal**: Implement Cookie expiration, fraud prevention, and transaction rollback

**Independent Test**: System enforces Cookie caps, expires old Cookies, and handles transaction failures gracefully

### Cookie Caps and Expiration

- [ ] T130 [P] Implement Cookie balance cap (1000) in supabase/functions/award-cookies/index.ts
- [ ] T131 [P] Create Cookie expiration tracking in supabase/migrations/023_cookie_expiration.sql
- [ ] T132 Create daily Cookie expiration job in supabase/functions/expire-cookies/index.ts
- [ ] T133 Create Cookie expiration notification in supabase/functions/notify-cookie-expiration/index.ts

### Fraud Prevention

- [ ] T134 [P] Create fraud detection rules in supabase/migrations/024_fraud_detection.sql
- [ ] T135 [P] Implement referral abuse detection in supabase/functions/detect-referral-fraud/index.ts
- [ ] T136 Create suspicious activity flagging in supabase/functions/flag-suspicious-activity/index.ts

### Transaction Rollback

- [ ] T137 [P] Implement atomic booking with rollback in supabase/functions/process-booking/index.ts (enhance T040)
- [ ] T138 Create transaction audit log in supabase/migrations/025_transaction_audit.sql
- [ ] T139 Create failed transaction recovery in supabase/functions/recover-failed-transaction/index.ts

**Checkpoint**: Cookie system is robust and fraud-resistant

---

## Phase 10: Character & Gamification System (Priority: P3)

**Goal**: Implement 8-bit character avatars, career paths, XP/leveling, and marketplace

**Independent Test**: Student can select career path, see character evolve, earn XP, and purchase items

### Career Path System

- [ ] T140 [P] Create career_paths table in supabase/migrations/026_career_paths.sql
- [ ] T141 [P] Create student_careers table linking students to careers in supabase/migrations/027_student_careers.sql
- [ ] T142 [P] Seed 6 career paths (Doctor, Engineer, Warrior, Business, Artist, Scientist) in supabase/seed.sql
- [ ] T143 [P] Create career selection component in frontend/src/components/character/CareerSelection.tsx
- [ ] T144 Create career onboarding page in frontend/src/app/student/onboarding/career/page.tsx

### XP and Leveling System

- [ ] T145 [P] Create xp_transactions table in supabase/migrations/028_xp_system.sql
- [ ] T146 [P] Create student_levels view in supabase/migrations/029_student_levels.sql
- [ ] T147 Create XP award Edge Function in supabase/functions/award-xp/index.ts
- [ ] T148 Create level-up detection and notification in supabase/functions/check-level-up/index.ts
- [ ] T149 [P] Create XP bar component in frontend/src/components/character/XPBar.tsx
- [ ] T150 [P] Create level badge component in frontend/src/components/character/LevelBadge.tsx

### Character Viewer

- [ ] T151 [P] Create character_sprites table in supabase/migrations/030_character_sprites.sql
- [ ] T152 [P] Setup sprite assets storage bucket in supabase/migrations/017_storage_buckets.sql (enhance)
- [ ] T153 [P] Create character viewer component in frontend/src/components/character/CharacterViewer.tsx
- [ ] T154 Create character page in frontend/src/app/student/character/page.tsx

### Marketplace System

- [ ] T155 [P] Create marketplace_items table in supabase/migrations/031_marketplace.sql
- [ ] T156 [P] Create student_inventory table in supabase/migrations/032_student_inventory.sql
- [ ] T157 [P] Seed marketplace items in supabase/seed.sql
- [ ] T158 [P] Create marketplace item card component in frontend/src/components/marketplace/ItemCard.tsx
- [ ] T159 [P] Create purchase confirmation modal in frontend/src/components/marketplace/PurchaseModal.tsx
- [ ] T160 Create marketplace page in frontend/src/app/student/marketplace/page.tsx
- [ ] T161 Create purchase item Edge Function in supabase/functions/purchase-item/index.ts

### Character Animation

- [ ] T162 [P] Create sprite animation utilities in frontend/src/utils/spriteAnimation.ts
- [ ] T163 Create character idle animation component in frontend/src/components/character/AnimatedCharacter.tsx

**Checkpoint**: Full gamification system with characters and marketplace

---

## Phase 11: Notification System (Priority: P2)

**Goal**: Implement email, in-app, and browser push notifications

**Independent Test**: Users receive notifications for key events across all channels

### Email Notifications

- [ ] T164 [P] Setup email service integration (SendGrid/Postmark) in supabase/functions/send-email/index.ts
- [ ] T165 [P] Create email templates in supabase/functions/email-templates/
- [ ] T166 [P] Create booking confirmation email in supabase/functions/send-booking-confirmation/index.ts
- [ ] T167 [P] Create Cookie earning email in supabase/functions/send-cookie-notification/index.ts
- [ ] T168 Create class reminder email in supabase/functions/send-class-reminder/index.ts

### In-App Notifications

- [ ] T169 [P] Create notifications table in supabase/migrations/033_notifications.sql
- [ ] T170 [P] Create notification creation Edge Function in supabase/functions/create-notification/index.ts
- [ ] T171 [P] Setup Supabase Realtime for notifications in frontend/src/hooks/useRealtimeNotifications.ts
- [ ] T172 [P] Create notification bell component in frontend/src/components/layout/NotificationBell.tsx
- [ ] T173 Create notification list component in frontend/src/components/common/NotificationList.tsx

### Browser Push Notifications

- [ ] T174 [P] Configure web push in frontend/public/service-worker.js
- [ ] T175 [P] Create push notification subscription in frontend/src/utils/pushNotifications.ts
- [ ] T176 Create class reminder push 15min before class in supabase/functions/send-push-reminder/index.ts

**Checkpoint**: Complete notification system across all channels

---

## Phase 12: Quiz System (Priority: P3)

**Goal**: Enable teachers to create quizzes with tiered Gold rewards based on performance

**Independent Test**: Teacher creates quiz, student completes it, system awards Gold based on score

### Quiz Schema

- [ ] T177 [P] Create quizzes table in supabase/migrations/034_quizzes.sql
- [ ] T178 [P] Create quiz_questions table in supabase/migrations/035_quiz_questions.sql
- [ ] T179 [P] Create quiz_attempts table in supabase/migrations/036_quiz_attempts.sql
- [ ] T180 Create quiz RLS policies in supabase/migrations/037_quiz_rls.sql

### Quiz Creation (Teacher)

- [ ] T181 [P] Create quiz creation form in frontend/src/components/teacher/QuizCreationForm.tsx
- [ ] T182 [P] Create question editor component in frontend/src/components/teacher/QuestionEditor.tsx
- [ ] T183 Create quiz management page in frontend/src/app/teacher/quizzes/page.tsx

### Quiz Taking (Student)

- [ ] T184 [P] Create quiz taking interface in frontend/src/components/student/QuizInterface.tsx
- [ ] T185 [P] Create quiz timer component in frontend/src/components/student/QuizTimer.tsx
- [ ] T186 [P] Create quiz results component in frontend/src/components/student/QuizResults.tsx
- [ ] T187 Create quiz page in frontend/src/app/student/quizzes/[id]/page.tsx

### Quiz Grading and Rewards

- [ ] T188 Create quiz grading Edge Function in supabase/functions/grade-quiz/index.ts
- [ ] T189 Create tiered Gold rewards (90%+=30, 75-89%=20, <75%=10) in supabase/functions/award-quiz-gold/index.ts
- [ ] T190 Implement quiz retake limit (1 retake) in supabase/migrations/038_quiz_retake_limit.sql

**Checkpoint**: Complete quiz system with tiered rewards

---

## Phase 13: Payment Integration (Priority: P1)

**Goal**: Integrate Vietnam payment gateways (VNPay, MoMo, ZaloPay) and Stripe

**Independent Test**: Student can complete booking payment via multiple payment methods

### Payment Gateway Setup

- [ ] T191 [P] Configure VNPay integration in supabase/functions/payment-vnpay/index.ts
- [ ] T192 [P] Configure MoMo integration in supabase/functions/payment-momo/index.ts
- [ ] T193 [P] Configure ZaloPay integration in supabase/functions/payment-zalopay/index.ts
- [ ] T194 [P] Configure Stripe integration in supabase/functions/payment-stripe/index.ts

### Payment Processing

- [ ] T195 [P] Create payments table in supabase/migrations/039_payments.sql
- [ ] T196 [P] Create payment method selector in frontend/src/components/booking/PaymentMethodSelector.tsx
- [ ] T197 Create unified payment processor in supabase/functions/process-payment/index.ts
- [ ] T198 Create payment webhook handler in supabase/functions/payment-webhook/index.ts

### Payment Flows

- [ ] T199 [P] Create payment page in frontend/src/app/student/bookings/payment/page.tsx
- [ ] T200 Create payment success page in frontend/src/app/student/bookings/success/page.tsx
- [ ] T201 Create payment failure handling in frontend/src/app/student/bookings/failed/page.tsx
- [ ] T202 Implement refund processing in supabase/functions/process-refund/index.ts

**Checkpoint**: Full payment processing with multiple gateways

---

## Phase 14: Teacher Revenue System (Priority: P2)

**Goal**: Track teacher earnings, calculate 70/30 split, and handle payouts

**Independent Test**: Teacher can view earnings breakdown and request payout

### Revenue Tracking

- [ ] T203 [P] Create teacher_earnings table in supabase/migrations/040_teacher_earnings.sql
- [ ] T204 [P] Create earnings calculation (70% of final price) in supabase/functions/calculate-teacher-earnings/index.ts
- [ ] T205 Create earnings aggregation view in supabase/migrations/041_earnings_views.sql

### Payout System

- [ ] T206 [P] Create payout_requests table in supabase/migrations/042_payout_requests.sql
- [ ] T207 [P] Create payout request form in frontend/src/components/teacher/PayoutRequestForm.tsx
- [ ] T208 Create payout processing Edge Function in supabase/functions/process-payout/index.ts
- [ ] T209 Create teacher earnings page in frontend/src/app/teacher/earnings/page.tsx

**Checkpoint**: Complete teacher revenue and payout system

---

## Phase 15: Cancellation and Refund System (Priority: P2)

**Goal**: Handle booking cancellations with time-based refund policies

**Independent Test**: Student cancels booking at different times, receives correct refund

### Cancellation Logic

- [ ] T210 [P] Create cancellation policies table in supabase/migrations/043_cancellation_policies.sql
- [ ] T211 Create cancellation processor with time checks in supabase/functions/process-cancellation/index.ts
- [ ] T212 Implement proportional Cookie refund in supabase/functions/refund-cookies/index.ts

### Cancellation UI

- [ ] T213 [P] Create cancellation modal in frontend/src/components/booking/CancellationModal.tsx
- [ ] T214 Create cancellation confirmation page in frontend/src/app/student/bookings/cancel/[id]/page.tsx

### Teacher Cancellation

- [ ] T215 Create teacher-initiated cancellation with full refund in supabase/functions/teacher-cancel-class/index.ts

**Checkpoint**: Complete cancellation and refund system

---

## Phase 16: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Accessibility

- [ ] T216 [P] Audit and fix WCAG 2.1 AA issues across all pages
- [ ] T217 [P] Add keyboard navigation support to all interactive components
- [ ] T218 [P] Add ARIA labels to all form inputs and buttons
- [ ] T219 Create accessibility page for screen reader testing

### Automated Accessibility Testing (CRITICAL - Constitution Principle III)

**⚠️ A11Y GATE**: Automated WCAG 2.1 Level AA validation MUST pass before production

- [ ] T219A [P] [A11Y] [TEST] Install axe-core and jest-axe in frontend/package.json
- [ ] T219B [P] [A11Y] [TEST] Configure axe-core in test setup in frontend/src/test/setup.ts
- [ ] T219C [P] [A11Y] [TEST] Install @axe-core/playwright for E2E testing in frontend/playwright.config.ts
- [ ] T219D [P] [A11Y] [TEST] Create accessibility test helpers in frontend/src/test/helpers/a11y.ts
- [ ] T219E [P] [A11Y] [TEST] Create E2E accessibility tests for all pages in frontend/tests/e2e/accessibility.spec.ts
- [ ] T219F [P] [A11Y] [TEST] Create GitHub Actions accessibility workflow in .github/workflows/accessibility.yml
- [ ] T219G [A11Y] [TEST] Validate zero accessibility violations in CI

**Checkpoint**: WCAG 2.1 AA compliance automated and enforced

### Performance Optimization

- [ ] T220 [P] Implement image optimization in frontend/next.config.js
- [ ] T221 [P] Add loading skeletons to all data-fetching components
- [ ] T222 [P] Implement code splitting for large components
- [ ] T223 [P] Optimize bundle size with webpack analyzer
- [ ] T224 Configure CDN caching for static assets

### Error Handling

- [ ] T225 [P] Create global error boundary in frontend/src/components/ErrorBoundary.tsx
- [ ] T226 [P] Add error logging to all Edge Functions
- [ ] T227 [P] Create error recovery UI components
- [ ] T228 Implement graceful degradation for offline scenarios

### Documentation

- [ ] T229 [P] Write API documentation for Edge Functions in docs/api/
- [ ] T230 [P] Write component library documentation in docs/components/
- [ ] T231 [P] Create deployment guide in docs/deployment.md
- [ ] T232 [P] Write user guide for students in docs/user-guide-student.md
- [ ] T233 [P] Write user guide for teachers in docs/user-guide-teacher.md
- [ ] T234 Create admin guide in docs/user-guide-admin.md

### Security Hardening

- [ ] T235 [P] Audit and fix RLS policies for security gaps
- [ ] T236 [P] Add rate limiting to all Edge Functions
- [ ] T237 [P] Implement CSRF protection
- [ ] T238 [P] Add input sanitization to all forms
- [ ] T239 Configure security headers in frontend/next.config.js

### SEO and Analytics

- [ ] T240 [P] Add meta tags and Open Graph tags in frontend/src/app/layout.tsx
- [ ] T241 [P] Configure Google Analytics or Plausible
- [ ] T242 Create sitemap.xml in frontend/public/

### Monitoring and Logging

- [ ] T243 [P] Setup Sentry for error tracking
- [ ] T244 [P] Configure Supabase logging and alerts
- [ ] T245 Create health check endpoints in supabase/functions/health-check/index.ts

**Checkpoint**: Production-ready application

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Class Booking - Can start after Foundational ✅ MVP START
  - US2 (Phase 4): Multi-Role Dashboards - Can start after Foundational
  - US3 (Phase 5): Cookie Earning - Depends on US1 (Cookie system)
  - US4 (Phase 6): Teacher Management - Can start after Foundational
  - US5 (Phase 7): Admin Analytics - Can start after Foundational
- **Supporting Features (Phase 8-15)**: Can be worked on in parallel with user stories or after core user stories
  - Phase 8 (Video): Can start after US1, US4 (classes and bookings exist)
  - Phase 9 (Cookie Advanced): Depends on US1, US3 (Cookie system)
  - Phase 10 (Gamification): Can start after US1 (students exist)
  - Phase 11 (Notifications): Can integrate throughout, after Foundational
  - Phase 12 (Quizzes): Depends on US4 (teachers need to create quizzes)
  - Phase 13 (Payment): Should start with US1 (booking requires payment)
  - Phase 14 (Teacher Revenue): Depends on US1, Phase 13 (bookings and payments)
  - Phase 15 (Cancellation): Depends on US1, Phase 13 (bookings and payments)
- **Polish (Phase 16)**: Depends on all desired features being complete

### User Story Dependencies

- **User Story 1 (P1)**: Class Booking - No dependencies on other stories ✅ MVP START
- **User Story 2 (P1)**: Multi-Role Dashboards - Independent (can be worked alongside US1)
- **User Story 3 (P2)**: Cookie Earning - Depends on US1 (Cookie transaction system exists)
- **User Story 4 (P2)**: Teacher Management - Independent
- **User Story 5 (P3)**: Admin Analytics - Can read from existing data, independent

### Within Each User Story

- Database schema before application code
- Models before services
- Services before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup Phase**: All [P] tasks (T003-T009) can run in parallel
- **Foundational Phase**: Database tasks (T010-T012), Auth tasks (T013-T017), UI tasks (T018-T022) can run in parallel within their groups
- **User Story 1**: Schema tasks (T023-T026), Cookie utilities (T028-T029), UI components can run in parallel within their groups
- **User Story 2**: Teacher widgets (T050-T052), Admin widgets (T055-T058) can run in parallel
- **User Story 3**: All earning mechanism Edge Functions can run in parallel
- **Cross-phase**: After Foundational is complete, multiple user stories can be worked on by different team members in parallel

---

## Parallel Example: User Story 1 (Class Booking)

```bash
# Launch all database schema tasks together:
Task T023: "Create classes table in supabase/migrations/004_classes.sql"
Task T024: "Create bookings table in supabase/migrations/005_bookings.sql"
Task T025: "Create cookie_transactions table in supabase/migrations/006_cookie_transactions.sql"
Task T026: "Create student_cookies view in supabase/migrations/007_cookie_views.sql"

# Launch all Cookie utility tasks together:
Task T028: "Define Cookie constants in shared/constants/cookies.ts"
Task T029: "Create Cookie calculator in frontend/src/utils/cookieCalculator.ts"

# Launch all browsing UI components together:
Task T032: "Create ClassCatalog component"
Task T033: "Create ClassCard component"
Task T034: "Create ClassFilters component"
```

---

## Implementation Strategy

### MVP First (Recommended: User Story 1 + User Story 2 + Payment)

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. ✅ Complete Phase 3: User Story 1 (Class Booking with Cookies)
4. ✅ Complete Phase 4: User Story 2 (Multi-Role Dashboards)
5. ✅ Complete Phase 13: Payment Integration (Required for bookings)
6. **STOP and VALIDATE**: Test both user stories independently
7. Deploy MVP with core booking functionality

**MVP Scope**: Students can browse classes, use Cookies for discounts, and book. Different roles have appropriate dashboards. Payments work.

**MVP Task Count**: ~80 tasks (Setup + Foundational + US1 + US2 + Payment)

### Incremental Delivery (After MVP)

1. Add Phase 5: Cookie Earning System → Drives engagement
2. Add Phase 6: Teacher Management → Teacher independence
3. Add Phase 8: Video Integration → Live classes enabled
4. Add Phase 9: Cookie Advanced Features → Robust system
5. Add Phase 10: Gamification → Enhanced engagement
6. Add Phase 7: User Story 5 (Admin Analytics) → Business insights
7. Each addition is independently tested and deployed

### Parallel Team Strategy

With multiple developers after Foundational phase:

- **Developer A**: User Story 1 (Class Booking) + Payment Integration
- **Developer B**: User Story 2 (Multi-Role Dashboards)
- **Developer C**: User Story 3 (Cookie Earning)
- **Developer D**: User Story 4 (Teacher Management)

Stories integrate at checkpoints but remain independently functional.

---

## Task Summary

- **Total Tasks**: 245
- **Phase 1 (Setup)**: 9 tasks
- **Phase 2 (Foundational)**: 13 tasks
- **Phase 3 (US1 - Booking)**: 24 tasks
- **Phase 4 (US2 - Dashboards)**: 17 tasks
- **Phase 5 (US3 - Cookie Earning)**: 20 tasks
- **Phase 6 (US4 - Teacher Management)**: 13 tasks
- **Phase 7 (US5 - Admin Analytics)**: 15 tasks
- **Phase 8 (Video)**: 18 tasks
- **Phase 9 (Cookie Advanced)**: 10 tasks
- **Phase 10 (Gamification)**: 24 tasks
- **Phase 11 (Notifications)**: 13 tasks
- **Phase 12 (Quizzes)**: 14 tasks
- **Phase 13 (Payment)**: 12 tasks
- **Phase 14 (Revenue)**: 7 tasks
- **Phase 15 (Cancellation)**: 5 tasks
- **Phase 16 (Polish)**: 31 tasks

**Parallel Opportunities**: 150+ tasks marked [P] can run in parallel with other tasks in their phase

---

## Notes

- All tasks use strict checkbox format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- [P] markers indicate tasks that can run in parallel (different files, no dependencies)
- [Story] labels (US1, US2, etc.) map tasks to user stories from spec.md for traceability
- Each user story is independently completable and testable
- Tests are NOT included in this implementation plan (not explicitly requested in spec)
- Cookie calculations follow strict business rules (1 Cookie = $0.50, 25% min price, 50% max discount)
- Stop at any checkpoint to validate story independently
- Dark blue theme (#0A1628) should be applied consistently across all UI components
- Video integration uses CometChat Free tier (100 MAU limit for development)
- Payment integration prioritizes Vietnam gateways (VNPay, MoMo, ZaloPay) with Stripe fallback
- All database operations use Supabase RLS for security
- All monetary calculations enforce 70/30 teacher/platform split

---

**Document Version**: 2.0
**Generated By**: /speckit.tasks command
**Last Updated**: 2026-01-28
