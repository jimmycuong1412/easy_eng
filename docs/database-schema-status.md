# Database Schema Status Report

**Generated**: 2026-02-03
**Supabase Project**: `evrcwtsexlamacawofxo`
**Migration Files**: 39 files found

---

## 📊 Migration Files Overview

### ✅ All Migration Files Present (39 files)

| # | Migration File | Purpose | Phase |
|---|----------------|---------|-------|
| 1 | `001_users.sql` | Users table with role fields | Phase 2 |
| 2 | `002_profiles.sql` | User profiles extending auth.users | Phase 2 |
| 3 | `003_rls_policies.sql` | Row Level Security policies | Phase 2 |
| 4 | `004_classes.sql` | Classes table | Phase 3 |
| 5 | `005_bookings.sql` | Bookings with Gems discount | Phase 3 |
| 6 | `006_gem_transactions.sql` | Gem transaction log | Phase 3 |
| 6a | `006a_cookie_constraints.sql` | Cookie system constraints | - |
| 6b | `006a_gem_constraints.sql` | Gem balance constraints | Phase 3 |
| 7 | `007_booking_rls.sql` | Booking RLS policies | Phase 3 |
| 9 | `009_role_management.sql` | Role management functions | Phase 4 |
| 10 | `010_cross_role_rls.sql` | Cross-role RLS policies | Phase 4 |
| 11 | `011_activity_rules.sql` | Gem earning activity rules | Phase 5 |
| 12 | `012_activity_tracking.sql` | Activity tracking table | Phase 5 |
| 13 | `013_lesson_completion_trigger.sql` | Lesson completion rewards | Phase 5 |
| 14 | `014_attendance_streaks.sql` | Attendance streak tracking | Phase 5 |
| 15 | `015_referral_codes.sql` | Referral system | Phase 5 |
| 16 | `016_reviews.sql` | Review system with rewards | Phase 5 |
| 17 | `017_storage_buckets.sql` | Supabase Storage buckets | Phase 6 |
| 18 | `018_capacity_triggers.sql` | Class capacity enforcement | Phase 6 |
| 19 | `019_teacher_availability.sql` | Teacher availability table | Phase 6 |
| 20 | `020_analytics_views.sql` | Analytics database views | Phase 7 |
| 21 | `021_class_sessions.sql` | Video class sessions | Phase 8 |
| 21b | `021b_cometchat_user_sync_trigger.sql` | CometChat user sync trigger | Phase 8 |
| 22 | `022_class_completion.sql` | Class completion tracking | Phase 8 |
| 23 | `023_gem_expiration.sql` | Gem expiration tracking | Phase 9 |
| 24 | `024_fraud_detection.sql` | Fraud detection rules | Phase 9 |
| 25 | `025_transaction_audit.sql` | Transaction audit log | Phase 9 |
| 33 | `033_notifications.sql` | Notification system | Phase 11 |
| 34 | `034_quizzes.sql` | Quiz system | Phase 12 |
| 35 | `035_quiz_questions.sql` | Quiz questions | Phase 12 |
| 36 | `036_quiz_attempts.sql` | Quiz attempt tracking | Phase 12 |
| 37 | `037_quiz_rls.sql` | Quiz RLS policies | Phase 12 |
| 39 | `039_payments.sql` | Payment transactions | Phase 13 |
| 40 | `040_teacher_earnings.sql` | Teacher earnings tracking | Phase 14 |
| 41 | `041_earnings_views.sql` | Earnings analytics views | Phase 14 |
| 42 | `042_payout_requests.sql` | Payout request system | Phase 14 |
| 43 | `043_cancellation_policies.sql` | Cancellation and refund | Phase 15 |
| 44 | `044_gem_rule_audit.sql` | Gem rule change audit | Phase 4 |

---

## 📋 Tables Expected (Based on Migrations)

### Core Tables (Phase 2-3)
1. ✅ `users` - User accounts with roles
2. ✅ `profiles` - Extended user profiles
3. ✅ `classes` - Class catalog
4. ✅ `bookings` - Class bookings with Gems
5. ✅ `gem_transactions` - Gem transaction log

### Gem System (Phase 3, 5, 9)
6. ✅ `activity_rules` - Gem earning rules
7. ✅ `activity_tracking` - User activity log
8. ✅ `attendance_streaks` - Streak tracking
9. ✅ `referral_codes` - Referral system
10. ✅ `reviews` - Class reviews
11. ✅ `gem_expiration` - Expiration tracking
12. ✅ `fraud_detection_rules` - Fraud prevention
13. ✅ `transaction_audit` - Audit log

### Teacher System (Phase 6)
14. ✅ `teacher_availability` - Teacher schedules
15. ✅ `teacher_earnings` - Earnings tracking
16. ✅ `payout_requests` - Payout management

### Video System (Phase 8)
17. ✅ `class_sessions` - Video session metadata
18. ✅ `session_participants` - Participant tracking
19. ✅ `session_events` - Session event log
20. ✅ `system_settings` - System configuration

### Notification System (Phase 11)
21. ✅ `notifications` - Notification queue
22. ✅ `notification_preferences` - User preferences

### Quiz System (Phase 12)
23. ✅ `quizzes` - Quiz metadata
24. ✅ `quiz_questions` - Quiz questions
25. ✅ `quiz_attempts` - Student attempts

### Payment System (Phase 13, 15)
26. ✅ `payments` - Payment transactions
27. ✅ `cancellation_policies` - Refund policies
28. ✅ `cancellations` - Cancellation records

### Analytics (Phase 7)
29. ✅ `user_analytics_view` - User growth view
30. ✅ `booking_analytics_view` - Booking trends
31. ✅ `gem_analytics_view` - Gem circulation
32. ✅ `revenue_analytics_view` - Revenue reports
33. ✅ `earnings_summary_view` - Teacher earnings

### Storage
34. ✅ `storage.buckets` - File storage buckets
35. ✅ `storage.objects` - Uploaded files

---

## 🔍 Migration Status Check

To verify which migrations have been applied to your Supabase database, you need to:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/evrcwtsexlamacawofxo
2. Navigate to: **SQL Editor**
3. Run this query:

```sql
-- Check applied migrations
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version;
```

This will show you which migration files have been applied.

### Option 2: Using Supabase CLI

First, link your project:

```bash
cd /f/Git/easy_eng
npx supabase link --project-ref evrcwtsexlamacawofxo
```

Then check the status:

```bash
# View current migration status
npx supabase db diff

# Or pull remote schema to compare
npx supabase db pull
```

### Option 3: Check Tables Directly

Run this SQL query in Supabase Dashboard to see all tables:

```sql
-- List all tables in public schema
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected output should include approximately 35+ tables.

---

## ✅ What Should Exist

Based on the completed phases (1-8, 11-15), these tables MUST exist:

### Critical Tables (MVP)
- [x] `profiles` (users)
- [x] `classes` (class catalog)
- [x] `bookings` (bookings with Gems)
- [x] `gem_transactions` (Gem ledger)
- [x] `payments` (payment processing)

### Video Class Tables (Phase 8)
- [x] `class_sessions` (CometChat sessions)
- [x] `session_participants` (attendance)
- [x] `session_events` (session logs)
- [x] `system_settings` (webhook config)

### Supporting Tables
- [x] `activity_rules` (Gem earning rules)
- [x] `activity_tracking` (user activities)
- [x] `attendance_streaks` (streak tracking)
- [x] `referral_codes` (referrals)
- [x] `reviews` (class reviews)
- [x] `teacher_availability` (schedules)
- [x] `teacher_earnings` (revenue)
- [x] `payout_requests` (payouts)
- [x] `notifications` (notification queue)
- [x] `quizzes` (quiz system)
- [x] `quiz_questions` (questions)
- [x] `quiz_attempts` (student attempts)
- [x] `cancellation_policies` (refund rules)

---

## 🚀 Next Steps

### 1. Verify Current Database State

Run this comprehensive check in Supabase SQL Editor:

```sql
-- Comprehensive database check
SELECT
    'Tables' as type,
    COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT
    'Views' as type,
    COUNT(*) as count
FROM pg_views
WHERE schemaname = 'public'

UNION ALL

SELECT
    'Functions' as type,
    COUNT(*) as count
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')

UNION ALL

SELECT
    'Triggers' as type,
    COUNT(*) as count
FROM pg_trigger
WHERE tgname NOT LIKE 'pg_%';
```

### 2. Apply Missing Migrations

If migrations are missing, apply them:

```bash
# Link project
npx supabase link --project-ref evrcwtsexlamacawofxo

# Push all migrations
npx supabase db push
```

### 3. Verify Key Tables

Run these checks to ensure critical tables exist:

```sql
-- Check if critical tables exist
SELECT
    tablename,
    CASE WHEN tablename IN (
        'profiles', 'classes', 'bookings', 'gem_transactions',
        'class_sessions', 'session_participants', 'payments'
    ) THEN '✅ Critical' ELSE '📋 Supporting' END as priority
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'profiles', 'classes', 'bookings', 'gem_transactions',
        'class_sessions', 'session_participants', 'payments',
        'activity_rules', 'teacher_availability', 'notifications',
        'quizzes', 'quiz_questions', 'cancellation_policies'
    )
ORDER BY priority DESC, tablename;
```

### 4. Check RLS Policies

Ensure Row Level Security is enabled:

```sql
-- Check RLS status on critical tables
SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '⚠️ Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 📊 Expected Counts

Based on the migrations, you should have approximately:

- **Tables**: 35-40 tables
- **Views**: 10-15 views (analytics)
- **Functions**: 30-40 functions (Edge Function triggers)
- **Triggers**: 15-20 triggers (automation)
- **RLS Policies**: 50+ policies (security)

---

## ⚠️ Troubleshooting

### If Tables Are Missing

1. **Check migration status**:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations;
   ```

2. **Apply migrations manually**:
   ```bash
   npx supabase db push
   ```

3. **Or apply via SQL Editor**:
   - Copy migration file contents
   - Paste into SQL Editor
   - Execute

### If Tables Exist But Have Wrong Schema

1. **Generate schema diff**:
   ```bash
   npx supabase db diff --linked > schema_diff.sql
   ```

2. **Review differences** and apply corrections

### If RLS Policies Are Missing

1. **Check policy status**:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

2. **Re-apply RLS migration**:
   - Run `003_rls_policies.sql`
   - Run `007_booking_rls.sql`
   - Run `010_cross_role_rls.sql`
   - Run `037_quiz_rls.sql`

---

## 📝 Summary

**Migration Files**: ✅ All 39 files present in repository
**Database Status**: ⏳ Needs verification via Supabase Dashboard
**Next Action**: Run database verification queries above

**Recommendation**: Use Supabase Dashboard SQL Editor to run the verification queries, then we can identify exactly which tables need to be created.

---

**Project Reference**: `evrcwtsexlamacawofxo`
**Supabase Dashboard**: https://supabase.com/dashboard/project/evrcwtsexlamacawofxo
**SQL Editor**: https://supabase.com/dashboard/project/evrcwtsexlamacawofxo/sql/new
