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

- [x] T000 [P] Install Jest 29+ and React Testing Library in frontend/package.json ✅
- [x] T001a [P] Create Jest configuration with 80% coverage threshold in frontend/jest.config.js ✅
- [x] T001b [P] Create test setup file in frontend/src/test/setup.ts ✅
- [x] T001c [P] Install Playwright and configure E2E testing in frontend/playwright.config.ts ✅
- [x] T001d [P] Create test utilities and helpers in frontend/src/test/utils.tsx ✅
- [x] T001e [P] Create mock Supabase client for testing in frontend/src/test/mocks/supabase.ts ✅

### Backend API Testing Setup

- [x] T001f [P] Install Vitest + Supertest for API testing in backend/package.json ✅
- [x] T001g [P] Create Vitest configuration with 80% coverage in backend/vitest.config.ts ✅
- [x] T001h [P] Create API test helpers in backend/src/test/helpers.ts ✅
- [x] T001i [P] Create mock Supabase client for backend tests in backend/src/test/mocks/supabase.ts ✅
- [x] T001j [P] Setup test database fixtures in backend/src/test/fixtures/ ✅

### CI/CD Integration

- [x] T001k [P] Create GitHub Actions test workflow in .github/workflows/test.yml ✅
- [x] T001l [P] Create GitHub Actions coverage workflow in .github/workflows/coverage.yml ✅
- [x] T001m [P] Configure pre-commit hooks for testing in .husky/pre-commit ✅
- [x] T001n Create test documentation in docs/testing-guide.md ✅
- [x] T001o [P] Create Docker build workflow in .github/workflows/docker-build.yml ✅
- [x] T001p [P] Create container integration tests in tests/integration/containers.test.ts ✅

**Checkpoint**: Test infrastructure ready - TDD can begin for all user stories

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and containerized architecture setup

### Project Structure & Containerization

- [x] T001 Create containerized project structure: frontend/, backend/, shared/, docker/ ✅
- [x] T001a [P] Create root docker-compose.yml for development environment ✅
- [x] T001b [P] Create frontend/Dockerfile with Node 20 Alpine and Next.js optimization ✅
- [x] T001c [P] Create backend/Dockerfile with Node 20 Alpine and Express setup ✅
- [x] T001d [P] Create .dockerignore files for frontend and backend ✅
- [x] T001e [P] Create docker-compose.prod.yml for production deployment ✅
- [x] T001f [P] Setup shared TypeScript types in shared/types/ (symlinked to both services) ✅

### Frontend Container Setup

- [x] T002 Initialize Next.js 14+ project with App Router in frontend/ ✅
- [x] T003 [P] Configure TypeScript, ESLint, and Prettier in frontend/ ✅
- [x] T004 [P] Install and configure Tailwind CSS + shadcn/ui in frontend/tailwind.config.js ✅
- [x] T006 [P] Configure dark blue theme design tokens in frontend/app/globals.css ✅
- [x] T007 [P] Install Framer Motion and configure animation system in frontend/lib/animations.ts ✅
- [x] T008 [P] Create API client for backend communication in frontend/lib/api-client.ts ✅
- [x] T009 [P] Configure environment variables in frontend/.env.example ✅

### Backend API Container Setup

- [x] T010 [P] Initialize Express.js + TypeScript project in backend/ ✅
- [x] T011 [P] Configure TypeScript, ESLint, and Prettier in backend/ ✅
- [x] T012 [P] Setup Express middleware (CORS, helmet, compression) in backend/src/middleware/ ✅
- [x] T013 [P] Create Supabase client wrapper in backend/src/lib/supabase.ts ✅
- [x] T014 [P] Setup request validation with Zod in backend/src/middleware/validation.ts ✅
- [x] T015 [P] Create error handling middleware in backend/src/middleware/error-handler.ts ✅
- [x] T016 [P] Setup Winston logger in backend/src/lib/logger.ts ✅
- [x] T017 [P] Configure environment variables in backend/.env.example ✅

### Database Setup

- [x] T018 [P] Setup Supabase CLI and initialize project in supabase/ ✅
- [x] T019 [P] Create database connection pool configuration in backend/src/lib/db.ts ✅
- [x] T020 [P] Setup database migration strategy in supabase/migrations/ ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Foundation

- [x] T021 [P] Create users table with role-based fields in supabase/migrations/001_users.sql ✅
- [x] T022 [P] Create profiles table extending auth.users in supabase/migrations/002_profiles.sql ✅
- [x] T023 [P] Setup Row Level Security (RLS) policies for users and profiles in supabase/migrations/003_rls_policies.sql ✅

### Backend API - Authentication Foundation

- [x] T024 [P] Create auth service in backend/src/services/auth.service.ts ✅
- [x] T025 [P] Create JWT validation middleware in backend/src/middleware/auth.middleware.ts ✅
- [x] T026 [P] Create role-based access control (RBAC) middleware in backend/src/middleware/rbac.middleware.ts ✅
- [x] T027 [P] Create auth routes (login, register, logout) in backend/src/routes/auth.routes.ts ✅
- [x] T028 [P] Create auth controller in backend/src/controllers/auth.controller.ts ✅

### Frontend - Authentication Integration

- [x] T029 [P] Create auth context and hooks in frontend/hooks/useAuth.ts ✅
- [x] T030 [P] Create API client auth methods in frontend/lib/api-client.ts ✅
- [x] T031 [P] Implement client-side route protection in frontend/middleware.ts ✅
- [x] T032 [P] Create login page in frontend/app/auth/login/page.tsx ✅
- [x] T033 [P] Create registration page in frontend/app/auth/register/page.tsx ✅

### UI Foundation

- [x] T034 [P] Create base layout component with navigation in frontend/components/layout/MainLayout.tsx ✅
- [x] T035 [P] Create role-based navigation component in frontend/components/layout/RoleBasedNav.tsx ✅
- [x] T036 [P] Implement common UI components (Button, Card, Input, Modal) in frontend/components/ui/ ✅
- [x] T037 [P] Create notification system component in frontend/components/common/NotificationCenter.tsx ✅
- [x] T038 [P] Setup Zustand stores for auth and notifications in frontend/stores/ ✅
- [x] T039 [P] Create loading states and skeletons in frontend/components/common/LoadingStates.tsx ✅

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Student Class Booking with Gems Discount (Priority: P1) 🎯 MVP

**Goal**: Enable students to browse classes, view Gems balance, apply discounts, and book classes

**Independent Test**: Student can log in, see Gems balance, browse classes, apply Gems for discount, and complete booking

### Test Suite for US1 (Test-First Approach - CRITICAL)

**⚠️ CONSTITUTION REQUIREMENT**: Write and verify these tests FAIL before implementing US1

- [x] T023A [P] [US1] [TEST] Write unit tests for Gems calculation utilities in frontend/src/utils/__tests__/gemCalculator.test.ts
- [x] T023B [P] [US1] [TEST] Write unit tests for Gems Discount validation (50% cap, $5 floor) in frontend/src/utils/__tests__/discountValidation.test.ts
- [x] T023C [P] [US1] [TEST] Write integration tests for atomic Gems transactions in backend/src/__tests__/Gems-atomicity.test.ts ✅
- [x] T023D [P] [US1] [TEST] Write integration tests for negative balance prevention in backend/src/__tests__/Gems-negative-balance.test.ts ✅
- [x] T023E [P] [US1] [TEST] Write integration tests for booking flow with rollback in frontend/tests/integration/booking-rollback.test.tsx
- [x] T023F [P] [US1] [TEST] Write E2E test for complete booking with Gems Discount in frontend/tests/e2e/booking-flow.spec.ts
- [x] T023G [US1] [TEST] Verify all US1 tests FAIL (Red phase of TDD) ✅

**Checkpoint**: All tests written and failing - proceed with implementation

### Database Schema for US1

- [x] T023 [P] [US1] Create classes table in supabase/migrations/004_classes.sql
- [x] T024 [P] [US1] Create bookings table with Gems Discount fields in supabase/migrations/005_bookings.sql
- [x] T025 [P] [US1] Create gem_transactions table in supabase/migrations/006_gem_transactions.sql
- [x] T026 [P] [US1] Create student_Gems view for balance calculation in supabase/migrations/007_gem_views.sql
- [x] T027 [US1] Setup RLS policies for classes, bookings, and Gems in supabase/migrations/008_booking_rls.sql

### Gems System Core (US1)

- [x] T028 [P] [US1] Define Gems constants (conversion rate, caps, rules) in shared/constants/Gems.ts
- [x] T029 [P] [US1] Create Gems calculation utilities in frontend/src/utils/gemCalculator.ts
- [x] T030 [US1] Implement Gems transaction logger in backend/src/services/Gems-transaction.service.ts ✅
- [x] T031 [US1] Create Gems balance hook in frontend/src/hooks/useGemBalance.ts

### Gems Transaction Integrity Testing (CRITICAL - Constitution Principle VI)

- [ ] T031A [P] [US1] [CURRENCY] [TEST] Write atomic transaction tests in backend/src/__tests__/Gems-atomic-transactions.test.ts
- [ ] T031B [P] [US1] [CURRENCY] [TEST] Write rollback scenario tests in backend/src/__tests__/Gems-rollback.test.ts
- [ ] T031C [P] [US1] [CURRENCY] [TEST] Write concurrent booking conflict tests in frontend/tests/integration/Gems-concurrency.test.ts
- [ ] T031D [P] [US1] [CURRENCY] [TEST] Write double-spending prevention tests in frontend/tests/integration/Gems-double-spend.test.ts
- [ ] T031E [P] [US1] [CURRENCY] [TEST] Write Gems audit log completeness tests in backend/src/__tests__/Gems-audit-log.test.ts
- [x] T031F [US1] [CURRENCY] Add database constraint to prevent negative balances in supabase/migrations/006a_gem_constraints.sql ✅

**Checkpoint**: Gems transaction integrity validated and enforced

### Class Browsing (US1)

- [x] T032 [P] [US1] Create class catalog component in frontend/src/components/booking/ClassCatalog.tsx
- [x] T033 [P] [US1] Create class card component with pricing in frontend/src/components/booking/ClassCard.tsx
- [x] T034 [P] [US1] Create class filters component in frontend/src/components/booking/ClassFilters.tsx
- [x] T035 [US1] Implement class search/filter logic in frontend/src/hooks/useClassSearch.ts
- [x] T036 [US1] Create class detail page in frontend/src/app/student/classes/[id]/page.tsx

### Booking Flow (US1)

- [x] T037 [P] [US1] Create Gems Discount slider component in frontend/src/components/booking/GemDiscountSlider.tsx
- [x] T038 [P] [US1] Create booking summary component in frontend/src/components/booking/BookingSummary.tsx
- [x] T039 [US1] Implement booking validation (capacity, price floor) in backend/src/services/booking-validation.service.ts
- [x] T040 [US1] Create process-booking API endpoint with atomic transactions in backend/src/routes/bookings.routes.ts
- [x] T041 [US1] Implement payment integration in backend/src/services/payment.service.ts
- [x] T042 [US1] Create booking confirmation page in frontend/src/app/student/bookings/confirm/page.tsx

### Student Dashboard (US1)

- [x] T043 [P] [US1] Create Gems balance widget in frontend/src/components/dashboard/GemBalanceWidget.tsx
- [x] T044 [P] [US1] Create upcoming classes widget in frontend/src/components/dashboard/UpcomingClassesWidget.tsx
- [x] T045 [US1] Create student dashboard page in frontend/src/app/student/dashboard/page.tsx
- [x] T046 [US1] Create booking history page in frontend/src/app/student/bookings/page.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - students can browse, book, and use Gems

---

## Phase 4: User Story 2 - Multi-Role Dashboard Access (Priority: P1)

**Goal**: Implement role-specific dashboards for Students, Teachers, and Administrators with proper access controls

**Independent Test**: Users with different roles can log in and see only their role-appropriate dashboard and features

### Role Management

- [x] T047 [P] [US2] Add role management functions to profiles in supabase/migrations/009_role_management.sql ✅
- [x] T048 [P] [US2] Create role-checking utilities in frontend/src/utils/roleCheck.ts ✅
- [x] T049 [US2] Implement server-side role enforcement in frontend/src/middleware.ts ✅

### Teacher Dashboard

- [x] T050 [P] [US2] Create teacher schedule widget in frontend/src/components/dashboard/TeacherScheduleWidget.tsx ✅
- [x] T051 [P] [US2] Create student roster widget in frontend/src/components/dashboard/StudentRosterWidget.tsx ✅
- [x] T052 [P] [US2] Create teacher earnings widget in frontend/src/components/dashboard/TeacherEarningsWidget.tsx ✅
- [x] T053 [US2] Create teacher dashboard page in frontend/src/app/teacher/dashboard/page.tsx ✅
- [x] T054 [US2] Create teacher class list page in frontend/src/app/teacher/classes/page.tsx ✅

### Admin Dashboard

- [x] T055 [P] [US2] Create user analytics widget in frontend/src/components/dashboard/UserAnalyticsWidget.tsx ✅
- [x] T056 [P] [US2] Create booking analytics widget in frontend/src/components/dashboard/BookingAnalyticsWidget.tsx ✅
- [x] T057 [P] [US2] Create Gems analytics widget in frontend/src/components/dashboard/GemAnalyticsWidget.tsx ✅
- [x] T058 [P] [US2] Create revenue analytics widget in frontend/src/components/dashboard/RevenueWidget.tsx ✅
- [x] T059 [US2] Create admin dashboard page in frontend/src/app/admin/dashboard/page.tsx ✅
- [x] T060 [US2] Create user management page in frontend/src/app/admin/users/page.tsx ✅

### Admin Gems Management (P1 Fix - F2)

- [x] T061 [P] [US2] Create Gems adjustment modal in frontend/src/components/admin/GemAdjustmentModal.tsx ✅
- [x] T062 [US2] Create admin Gems adjustment endpoint in backend/src/routes/admin/gems.routes.ts ✅
- [x] T063 [US2] Create Gems adjustment audit log in backend/src/services/gems-audit.service.ts ✅

- [x] T060A [P] [US2] [ADMIN] Create Gems rules editor page in frontend/src/app/[locale]/admin/gems-rules/page.tsx ✅
- [x] T060B [P] [US2] [ADMIN] Create Gems rule editor component in frontend/src/components/admin/GemRuleEditor.tsx ✅
- [x] T060C [P] [US2] [ADMIN] Create update-Gems-rule API endpoint in backend/src/routes/admin/gems-rules.routes.ts ✅
- [x] T060D [P] [US2] [ADMIN] Add audit logging for Gems rule changes in supabase/migrations/044_gem_rule_audit.sql ✅
- [x] T060E [US2] [ADMIN] Create Gems rule validation in frontend/src/utils/GemRuleValidation.ts ✅

### Access Control Enforcement

- [x] T061 [P] [US2] Create protected route wrapper component in frontend/src/components/auth/ProtectedRoute.tsx ✅
- [x] T062 [US2] Add role-based redirects to all dashboard routes in frontend/src/app/*/layout.tsx ✅
- [x] T063 [US2] Implement RLS policies preventing cross-role data access in supabase/migrations/010_cross_role_rls.sql ✅

### RBAC Security Testing (CRITICAL - Constitution Principle V)

**⚠️ SECURITY GATE**: These tests MUST pass before production deployment

- [x] T063A [P] [US2] [SECURITY] [TEST] Write RLS policy tests for student-only data access in supabase/tests/rls/student-access.test.sql ✅
- [x] T063B [P] [US2] [SECURITY] [TEST] Write RLS policy tests for teacher-only data access in supabase/tests/rls/teacher-access.test.sql ✅
- [x] T063C [P] [US2] [SECURITY] [TEST] Write RLS policy tests for admin-only data access in supabase/tests/rls/admin-access.test.sql ✅
- [x] T063D [P] [US2] [SECURITY] [TEST] Write cross-role permission violation tests in supabase/tests/rls/cross-role-violations.test.sql ✅
- [x] T063E [P] [US2] [SECURITY] [TEST] Create E2E test for role escalation prevention in frontend/tests/e2e/security/role-escalation.spec.ts ✅
- [x] T063F [US2] [SECURITY] [TEST] Create E2E test for unauthorized dashboard access in frontend/tests/e2e/security/unauthorized-access.spec.ts ✅

**Checkpoint**: All three roles should have functioning dashboards with proper isolation AND security validated

---

## Phase 5: User Story 3 - Gem Earning System (Priority: P2)

**Goal**: Enable students to earn Gems through platform activities (lessons, streaks, referrals, profile completion, reviews)

**Independent Test**: Student performs qualifying activities and sees Gem balance increase with notifications

### Gem Earning Rules

- [x] T064 [P] [US3] Create activity_rules table in supabase/migrations/011_activity_rules.sql ✅
- [x] T065 [P] [US3] Seed initial Gem earning rules (10/lesson, 50/streak, 100/referral, etc.) in supabase/seed.sql ✅
- [x] T066 [US3] Create activity tracking table in supabase/migrations/012_activity_tracking.sql ✅

### Lesson Completion Rewards

- [x] T067 [P] [US3] Create lesson completion trigger in supabase/migrations/013_lesson_completion_trigger.sql ✅
- [x] T068 [US3] Implement award-lesson-gems Edge Function in supabase/functions/award-lesson-gems/index.ts ✅

### Attendance Streak Rewards

- [x] T069 [P] [US3] Create attendance_streaks table in supabase/migrations/014_attendance_streaks.sql ✅
- [x] T070 [US3] Implement streak calculation Edge Function in supabase/functions/calculate-streak/index.ts ✅
- [x] T071 [US3] Create daily streak check Edge Function in supabase/functions/daily-streak-check/index.ts ✅

### Referral System

- [x] T072 [P] [US3] Create referral_codes table in supabase/migrations/015_referral_codes.sql ✅
- [x] T073 [P] [US3] Generate unique referral code on student signup in supabase/functions/generate-referral-code/index.ts ✅
- [x] T074 [P] [US3] Create referral link component in frontend/src/components/student/ReferralLink.tsx ✅
- [x] T075 [US3] Implement referral validation and reward in supabase/functions/process-referral/index.ts ✅

### Profile and Review Rewards

- [x] T076 [P] [US3] Create profile completion check in frontend/src/utils/profileCompleteness.ts ✅
- [x] T077 [P] [US3] Create reviews table in supabase/migrations/016_reviews.sql ✅
- [x] T078 [US3] Implement profile completion reward in supabase/functions/award-profile-gems/index.ts ✅
- [x] T079 [US3] Implement first review reward in supabase/functions/award-review-gems/index.ts ✅
- [x] T080 [US3] Create review form component in frontend/src/components/booking/ReviewForm.tsx ✅

### Gem Earning Notifications

- [x] T081 [P] [US3] Create Gem earned notification component in frontend/src/components/common/GemEarnedToast.tsx ✅
- [x] T082 [US3] Setup real-time Gem transaction listener in frontend/src/hooks/useGemNotifications.ts ✅
- [x] T083 [US3] Create Gem history page in frontend/src/app/[locale]/student/gems/history/page.tsx ✅

**Checkpoint**: Students should earn Gems from all activities with proper notifications

---

## Phase 6: User Story 4 - Teacher Class Management (Priority: P2)

**Goal**: Enable teachers to create, update, manage schedules, view enrolled students, and update class materials

**Independent Test**: Teacher can create a class, set details, and see enrolled students

### Class Creation

- [x] T084 [P] [US4] Create class creation form component in frontend/src/components/teacher/CreateClassForm.tsx ✅
- [x] T085 [P] [US4] Create class editor component in frontend/src/components/teacher/ClassEditor.tsx ✅
- [x] T086 [US4] Implement class validation (time, capacity, price) in supabase/functions/validate-class/index.ts ✅
- [x] T087 [US4] Create class creation page in frontend/src/app/[locale]/teacher/classes/new/page.tsx ✅

### Class Management

- [x] T088 [P] [US4] Create class detail view for teachers in frontend/src/app/[locale]/teacher/classes/[id]/page.tsx ✅
- [x] T089 [P] [US4] Create enrolled students list component in frontend/src/components/teacher/EnrolledStudentsList.tsx ✅
- [x] T090 [P] [US4] Create class materials uploader in frontend/src/components/teacher/ClassMaterialsUploader.tsx ✅
- [x] T091 [US4] Setup Supabase Storage bucket for class materials in supabase/migrations/017_storage_buckets.sql ✅
- [x] T092 [US4] Implement capacity enforcement in supabase/migrations/018_capacity_triggers.sql ✅

### Teacher Schedule

- [x] T093 [P] [US4] Create teacher availability component in frontend/src/components/teacher/AvailabilityCalendar.tsx ✅
- [x] T094 [P] [US4] Create teacher_availability table in supabase/migrations/019_teacher_availability.sql ✅
- [x] T095 [US4] Create teacher schedule page exists at frontend/src/app/[locale]/teacher/schedule/page.tsx ✅
- [x] T096 [US4] Implement schedule conflict detection in frontend/src/utils/scheduleConflicts.ts ✅

**Checkpoint**: Teachers can fully manage their classes independently ✅

---

## Phase 7: User Story 5 - Admin Platform Analytics (Priority: P3)

**Goal**: Provide administrators with comprehensive platform metrics and insights

**Independent Test**: Admin can view accurate, up-to-date analytics dashboards

### Analytics Database Views

- [ ] T097 [P] [US5] Create user growth analytics view in supabase/migrations/020_analytics_views.sql
- [ ] T098 [P] [US5] Create booking analytics view in supabase/migrations/020_analytics_views.sql
- [ ] T099 [P] [US5] Create Gem circulation analytics view in supabase/migrations/020_analytics_views.sql
- [ ] T100 [P] [US5] Create revenue analytics view in supabase/migrations/020_analytics_views.sql

### Analytics API Functions

- [ ] T101 [P] [US5] Create get-user-analytics Edge Function in supabase/functions/get-user-analytics/index.ts
- [ ] T102 [P] [US5] Create get-booking-analytics Edge Function in supabase/functions/get-booking-analytics/index.ts
- [ ] T103 [P] [US5] Create get-gem-analytics Edge Function in supabase/functions/get-gem-analytics/index.ts
- [ ] T104 [P] [US5] Create get-revenue-analytics Edge Function in supabase/functions/get-revenue-analytics/index.ts

### Analytics UI Components

- [ ] T105 [P] [US5] Create user growth chart component in frontend/src/components/admin/UserGrowthChart.tsx
- [ ] T106 [P] [US5] Create booking trends chart in frontend/src/components/admin/BookingTrendsChart.tsx
- [ ] T107 [P] [US5] Create Gem circulation chart in frontend/src/components/admin/GemCirculationChart.tsx
- [ ] T108 [P] [US5] Create revenue chart in frontend/src/components/admin/RevenueChart.tsx
- [ ] T109 [US5] Create comprehensive analytics page in frontend/src/app/admin/analytics/page.tsx

### Time Period Filters

- [ ] T110 [P] [US5] Create date range picker component in frontend/src/components/admin/DateRangePicker.tsx
- [ ] T111 [US5] Implement time period filtering logic in frontend/src/hooks/useAnalyticsFilters.ts

### Database Reconciliation (P1 Fix - F3)

- [ ] T111A [P] [US5] [ADMIN] Create Gem balance reconciliation script in supabase/functions/reconcile-gem-balances/index.ts
- [ ] T111B [P] [US5] [ADMIN] Create booking-payment reconciliation report in frontend/src/app/admin/reconciliation/page.tsx
- [ ] T111C [P] [US5] [ADMIN] Create discrepancy detection Edge Function in supabase/functions/detect-discrepancies/index.ts
- [ ] T111D [P] [US5] [ADMIN] Schedule daily reconciliation cron job in .github/workflows/reconcile-gems.yml
- [ ] T111E [US5] [ADMIN] Create reconciliation report viewer in frontend/src/components/admin/ReconciliationReport.tsx

**Checkpoint**: Admin has full visibility into platform metrics AND data integrity monitoring

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

## Phase 9: Gem System Advanced Features (Priority: P2)

**Goal**: Implement Gem expiration, fraud prevention, and transaction rollback

**Independent Test**: System enforces Gem caps, expires old Gems, and handles transaction failures gracefully

### Gem Caps and Expiration

- [ ] T130 [P] Implement Gem balance cap (1000) in supabase/functions/award-gems/index.ts
- [ ] T131 [P] Create Gem expiration tracking in supabase/migrations/023_gem_expiration.sql
- [ ] T132 Create daily Gem expiration job in supabase/functions/expire-gems/index.ts
- [ ] T133 Create Gem expiration notification in supabase/functions/notify-gem-expiration/index.ts

### Fraud Prevention

- [ ] T134 [P] Create fraud detection rules in supabase/migrations/024_fraud_detection.sql
- [ ] T135 [P] Implement referral abuse detection in supabase/functions/detect-referral-fraud/index.ts
- [ ] T136 Create suspicious activity flagging in supabase/functions/flag-suspicious-activity/index.ts

### Transaction Rollback

- [ ] T137 [P] Implement atomic booking with rollback in supabase/functions/process-booking/index.ts (enhance T040)
- [ ] T138 Create transaction audit log in supabase/migrations/025_transaction_audit.sql
- [ ] T139 Create failed transaction recovery in supabase/functions/recover-failed-transaction/index.ts

### Transaction Rollback Testing (P1 Fix - F4)

- [ ] T139A [P] [CURRENCY] [TEST] Write E2E test for payment failure rollback in frontend/tests/e2e/rollback/payment-failure.spec.ts
- [ ] T139B [P] [CURRENCY] [TEST] Write E2E test for booking capacity rollback in frontend/tests/e2e/rollback/capacity-conflict.spec.ts
- [ ] T139C [P] [CURRENCY] [TEST] Write integration test for Gem deduction rollback in supabase/functions/__tests__/gem-rollback-scenarios.test.ts
- [ ] T139D [P] [CURRENCY] [TEST] Write stress test for concurrent rollbacks in supabase/functions/__tests__/concurrent-rollback.test.ts
- [ ] T139E [CURRENCY] Create rollback monitoring dashboard in frontend/src/app/admin/monitoring/rollbacks/page.tsx
- [ ] T139F [CURRENCY] Document rollback scenarios in docs/operations/rollback-handling.md

**Checkpoint**: Gem system is robust, fraud-resistant, AND rollback-tested

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
- [ ] T167 [P] Create Gem earning email in supabase/functions/send-gem-notification/index.ts
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

- [x] T191 [P] Configure VNPay integration in backend/src/services/payment-gateways/vnpay.service.ts ✅
- [x] T192 [P] Configure MoMo integration in backend/src/services/payment-gateways/momo.service.ts ✅
- [x] T193 [P] Configure ZaloPay integration in backend/src/services/payment-gateways/zalopay.service.ts ✅
- [x] T194 [P] Configure Stripe integration in backend/src/services/payment-gateways/stripe.service.ts ✅

### Payment Processing

- [x] T195 [P] Create payments table in supabase/migrations/039_payments.sql ✅
- [x] T196 [P] Create payment method selector in frontend/src/components/booking/PaymentMethodSelector.tsx ✅
- [x] T197 Create unified payment processor in backend/src/services/payment.unified.service.ts ✅
- [x] T198 Create payment webhook handler in backend/src/routes/payment-webhook.routes.ts ✅

### Payment Flows

- [x] T199 [P] Create payment page in frontend/src/app/[locale]/student/bookings/payment/page.tsx ✅
- [x] T200 Create payment success page in frontend/src/app/[locale]/student/bookings/success/page.tsx ✅
- [x] T201 Create payment failure handling in frontend/src/app/[locale]/student/bookings/failed/page.tsx ✅
- [x] T202 Implement refund processing in backend/src/services/refund.service.ts ✅

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
- [ ] T212 Implement proportional Gem refund in supabase/functions/refund-gems/index.ts

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

## Phase 17: Performance Testing & Validation (P1 Fix - C8)

**Purpose**: Validate all NFR performance requirements before production (NFR-007, SC-002, SC-006)

### Load Testing Setup

- [ ] T246 [P] [PERF] Install k6 load testing framework in tests/performance/
- [ ] T247 [P] [PERF] Configure load test environment in tests/performance/k6.config.js
- [ ] T248 [P] [PERF] Create test data generation script in tests/performance/generate-test-data.ts

### API Performance Tests

- [ ] T249 [P] [PERF] Create booking API load test (500 bookings/min validation) in tests/performance/booking-load.test.js
- [ ] T250 [P] [PERF] Create class search performance test (<500ms response) in tests/performance/class-search.test.js
- [ ] T251 [P] [PERF] Create dashboard load test (p95 <200ms) in tests/performance/dashboard-load.test.js
- [ ] T252 [P] [PERF] Create Gem transaction performance test in tests/performance/gem-transaction.test.js

### Concurrency Tests

- [ ] T253 [P] [PERF] Create concurrent user simulation (1000+ users) in tests/performance/concurrent-users.test.js
- [ ] T254 [P] [PERF] Create concurrent booking conflict test in tests/performance/concurrent-bookings.test.js

### Frontend Performance

- [ ] T255 [P] [PERF] Configure Lighthouse CI in .github/workflows/lighthouse.yml
- [ ] T256 [P] [PERF] Create page load performance budgets (<3s target) in frontend/lighthouse-budget.json
- [ ] T257 [P] [PERF] Create Core Web Vitals monitoring in frontend/src/lib/vitals.ts
- [ ] T258 [PERF] Create bundle size monitoring in frontend/package.json scripts

### Database Performance

- [ ] T259 [P] [PERF] Run EXPLAIN ANALYZE on critical queries in tests/performance/query-analysis.sql
- [ ] T260 [P] [PERF] Create database indexing recommendations report in docs/performance/indexing.md
- [ ] T261 [PERF] Validate backup/restore time meets 6-hour requirement in tests/performance/backup-validation.sh

### Monitoring Setup

- [ ] T262 [P] [PERF] Configure performance monitoring dashboard (Grafana/Datadog)
- [ ] T263 [PERF] Setup performance regression alerts in .github/workflows/perf-regression.yml

**Checkpoint**: All performance NFRs validated and documented - ready for production scale

---

## Phase 18: Supabase MCP Integration (Developer Tooling)

**Purpose**: Enable AI-assisted database management through Model Context Protocol

**Goal**: Configure Supabase MCP server integration to allow developers to query, explore, and manage the database using natural language through AI assistants (Claude Code, Cursor, Windsurf)

**Independent Test**: Developer can authenticate with MCP server, query database via natural language, generate TypeScript types, and create migrations through AI assistance

**⚠️ NOTE**: This phase is **configuration and documentation only** - zero application code changes. Can be worked on independently at any time after database schema exists.

### MCP Configuration Setup

- [x] T264 [P] [MCP] Identify Supabase development project reference ID from dashboard ✅
- [x] T265 [P] [MCP] Create MCP server configuration template in .claude/mcp-servers.example.json ✅
- [x] T266 [P] [MCP] Create MCP server configuration template for Cursor in .cursor/mcp-config.example.json ✅
- [x] T267 [P] [MCP] Create MCP server configuration template for Windsurf in .windsurf/mcp.example.json ✅
- [x] T268 [P] [MCP] Update .gitignore to exclude sensitive MCP configuration files (.claude/mcp-servers.json, .cursor/mcp-config.json, .windsurf/mcp.json) ✅
- [x] T269 [MCP] Document project reference ID location in docs/supabase-mcp-setup.md ✅

### Documentation & Security Policies

- [x] T270 [P] [MCP] Create comprehensive MCP setup guide in docs/supabase-mcp-setup.md ✅
- [x] T271 [P] [MCP] Create MCP security policy document in docs/supabase-mcp-security.md ✅
- [x] T272 [P] [MCP] Create MCP usage examples and common workflows in docs/supabase-mcp-examples.md ✅
- [x] T273 [P] [MCP] Document MCP tool definitions (query_database, describe_table, etc.) in docs/supabase-mcp-tools.md ✅
- [x] T274 [MCP] Create MCP troubleshooting guide in docs/supabase-mcp-troubleshooting.md ✅

### Team Onboarding

- [x] T275 [P] [MCP] Create team member access checklist in docs/supabase-mcp-access-checklist.md ✅
- [ ] T276 [P] [MCP] Document OAuth 2.1 authentication flow with screenshots in docs/supabase-mcp-auth.md
- [x] T277 [P] [MCP] Create quick reference card for common MCP queries in docs/supabase-mcp-quick-ref.md ✅
- [ ] T278 [MCP] Schedule team training session (record date and attendees in docs/supabase-mcp-training-log.md)

### Testing & Validation

- [ ] T279 [P] [MCP] Test MCP connection with natural language query ("Show all tables")
- [ ] T280 [P] [MCP] Test schema exploration with describe_table tool
- [ ] T281 [P] [MCP] Test TypeScript type generation for database schema
- [ ] T282 [P] [MCP] Test migration generation from natural language description
- [ ] T283 [P] [MCP] Verify manual approval prompts for write operations (execute_sql, generate_migration)
- [ ] T284 [P] [MCP] Test read-only mode configuration (optional)
- [ ] T285 [MCP] Validate that production database project ref is NOT configured (security check)

### Best Practices & Guidelines

- [x] T286 [P] [MCP] Document when to use MCP vs. Supabase CLI in docs/supabase-mcp-vs-cli.md ✅
- [ ] T287 [P] [MCP] Create code review checklist for MCP-generated migrations in docs/mcp-migration-review.md
- [ ] T288 [P] [MCP] Document MCP usage patterns for common tasks in docs/supabase-mcp-patterns.md
- [ ] T289 [MCP] Establish audit process for MCP-generated schema changes in docs/supabase-mcp-audit.md

### Monitoring & Maintenance

- [ ] T290 [P] [MCP] Document MCP server status monitoring process in docs/supabase-mcp-monitoring.md
- [ ] T291 [P] [MCP] Create incident response plan for MCP authentication failures in docs/supabase-mcp-incidents.md
- [ ] T292 [MCP] Establish quarterly MCP access review process in docs/supabase-mcp-access-review.md

**Checkpoint**: Supabase MCP fully configured, documented, and team onboarded - AI-assisted database development enabled

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Class Booking - Can start after Foundational ✅ MVP START
  - US2 (Phase 4): Multi-Role Dashboards - Can start after Foundational
  - US3 (Phase 5): Gem Earning - Depends on US1 (Gem system)
  - US4 (Phase 6): Teacher Management - Can start after Foundational
  - US5 (Phase 7): Admin Analytics - Can start after Foundational
- **Supporting Features (Phase 8-15)**: Can be worked on in parallel with user stories or after core user stories
  - Phase 8 (Video): Can start after US1, US4 (classes and bookings exist)
  - Phase 9 (Gem Advanced): Depends on US1, US3 (Gem system)
  - Phase 10 (Gamification): Can start after US1 (students exist)
  - Phase 11 (Notifications): Can integrate throughout, after Foundational
  - Phase 12 (Quizzes): Depends on US4 (teachers need to create quizzes)
  - Phase 13 (Payment): Should start with US1 (booking requires payment)
  - Phase 14 (Teacher Revenue): Depends on US1, Phase 13 (bookings and payments)
  - Phase 15 (Cancellation): Depends on US1, Phase 13 (bookings and payments)
- **Polish (Phase 16)**: Depends on all desired features being complete
- **Performance Testing (Phase 17)**: Can start after core features implemented
- **Developer Tooling (Phase 18)**: Supabase MCP Integration - Independent, can start anytime after database schema exists (Phase 2 complete)

### User Story Dependencies

- **User Story 1 (P1)**: Class Booking - No dependencies on other stories ✅ MVP START
- **User Story 2 (P1)**: Multi-Role Dashboards - Independent (can be worked alongside US1)
- **User Story 3 (P2)**: Gem Earning - Depends on US1 (Gem transaction system exists)
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
- **User Story 1**: Schema tasks (T023-T026), Gem utilities (T028-T029), UI components can run in parallel within their groups
- **User Story 2**: Teacher widgets (T050-T052), Admin widgets (T055-T058) can run in parallel
- **User Story 3**: All earning mechanism Edge Functions can run in parallel
- **Cross-phase**: After Foundational is complete, multiple user stories can be worked on by different team members in parallel

---

## Parallel Example: User Story 1 (Class Booking)

```bash
# Launch all database schema tasks together:
Task T023: "Create classes table in supabase/migrations/004_classes.sql"
Task T024: "Create bookings table in supabase/migrations/005_bookings.sql"
Task T025: "Create gem_transactions table in supabase/migrations/006_gem_transactions.sql"
Task T026: "Create student_gems view in supabase/migrations/007_gem_views.sql"

# Launch all Gem utility tasks together:
Task T028: "Define Gem constants in shared/constants/gems.ts"
Task T029: "Create Gem calculator in frontend/src/utils/gemCalculator.ts"

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
3. ✅ Complete Phase 3: User Story 1 (Class Booking with Gems)
4. ✅ Complete Phase 4: User Story 2 (Multi-Role Dashboards)
5. ✅ Complete Phase 13: Payment Integration (Required for bookings)
6. **STOP and VALIDATE**: Test both user stories independently
7. Deploy MVP with core booking functionality

**MVP Scope**: Students can browse classes, use Gems for discounts, and book. Different roles have appropriate dashboards. Payments work.

**MVP Task Count**: ~80 tasks (Setup + Foundational + US1 + US2 + Payment)

### Incremental Delivery (After MVP)

1. Add Phase 5: Gem Earning System → Drives engagement
2. Add Phase 6: Teacher Management → Teacher independence
3. Add Phase 8: Video Integration → Live classes enabled
4. Add Phase 9: Gem Advanced Features → Robust system
5. Add Phase 10: Gamification → Enhanced engagement
6. Add Phase 7: User Story 5 (Admin Analytics) → Business insights
7. Each addition is independently tested and deployed

### Parallel Team Strategy

With multiple developers after Foundational phase:

- **Developer A**: User Story 1 (Class Booking) + Payment Integration
- **Developer B**: User Story 2 (Multi-Role Dashboards)
- **Developer C**: User Story 3 (Gem Earning)
- **Developer D**: User Story 4 (Teacher Management)

Stories integrate at checkpoints but remain independently functional.

---

## Task Summary

- **Total Tasks**: 274
- **Phase 0 (Test Infrastructure)**: 16 tasks
- **Phase 1 (Setup)**: 20 tasks
- **Phase 2 (Foundational)**: 13 tasks
- **Phase 3 (US1 - Booking)**: 24 tasks
- **Phase 4 (US2 - Dashboards)**: 17 tasks
- **Phase 5 (US3 - Gem Earning)**: 20 tasks
- **Phase 6 (US4 - Teacher Management)**: 13 tasks
- **Phase 7 (US5 - Admin Analytics)**: 15 tasks
- **Phase 8 (Video)**: 18 tasks
- **Phase 9 (Gem Advanced)**: 10 tasks
- **Phase 10 (Gamification)**: 24 tasks
- **Phase 11 (Notifications)**: 13 tasks
- **Phase 12 (Quizzes)**: 14 tasks
- **Phase 13 (Payment)**: 12 tasks
- **Phase 14 (Revenue)**: 7 tasks
- **Phase 15 (Cancellation)**: 5 tasks
- **Phase 16 (Polish)**: 31 tasks
- **Phase 17 (Performance Testing)**: 18 tasks
- **Phase 18 (Supabase MCP Integration)**: 29 tasks

**Parallel Opportunities**: 175+ tasks marked [P] can run in parallel with other tasks in their phase

---

## Notes

- All tasks use strict checkbox format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- [P] markers indicate tasks that can run in parallel (different files, no dependencies)
- [Story] labels (US1, US2, etc.) map tasks to user stories from spec.md for traceability
- Each user story is independently completable and testable
- Tests are NOT included in this implementation plan (not explicitly requested in spec)
- Gem calculations follow strict business rules (1 Gem = $0.50, $5 min price, 50% max discount)
- Stop at any checkpoint to validate story independently
- Dark blue theme (#0A1628) should be applied consistently across all UI components
- Video integration uses CometChat Free tier (100 MAU limit for development)
- Payment integration prioritizes Vietnam gateways (VNPay, MoMo, ZaloPay) with Stripe fallback
- All database operations use Supabase RLS for security
- All monetary calculations enforce 70/30 teacher/platform split
- Supabase MCP integration (Phase 18) is configuration-only - enables AI-assisted database development without code changes
- MCP tasks can be completed independently at any time after database schema exists

---

**Document Version**: 2.1
**Generated By**: /speckit.tasks command
**Last Updated**: 2026-01-31 (Added Phase 18: Supabase MCP Integration)

