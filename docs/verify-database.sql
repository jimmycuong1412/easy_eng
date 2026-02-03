-- ============================================================================
-- Database Verification Script
-- ============================================================================
-- Purpose: Check which tables and migrations exist in your Supabase database
-- Usage: Copy and paste this into Supabase Dashboard > SQL Editor > Run
-- Project: evrcwtsexlamacawofxo
-- ============================================================================

-- ============================================================================
-- 1. CHECK APPLIED MIGRATIONS
-- ============================================================================

SELECT
    '🔍 APPLIED MIGRATIONS' as check_name,
    '════════════════════════════════════════' as separator;

SELECT
    version as migration_version,
    name as migration_name,
    inserted_at as applied_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- ============================================================================
-- 2. LIST ALL PUBLIC TABLES
-- ============================================================================

SELECT
    '🔍 PUBLIC TABLES' as check_name,
    '════════════════════════════════════════' as separator;

SELECT
    tablename,
    CASE
        WHEN tablename IN (
            'profiles', 'classes', 'bookings', 'gem_transactions',
            'class_sessions', 'session_participants', 'payments'
        ) THEN '🎯 Critical'
        WHEN tablename IN (
            'activity_rules', 'activity_tracking', 'attendance_streaks',
            'referral_codes', 'reviews', 'teacher_availability',
            'teacher_earnings', 'notifications', 'quizzes',
            'quiz_questions', 'quiz_attempts', 'cancellation_policies'
        ) THEN '📋 Supporting'
        ELSE '🔧 System'
    END as priority,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY
    CASE
        WHEN tablename IN ('profiles', 'classes', 'bookings') THEN 1
        WHEN tablename LIKE '%transactions%' THEN 2
        WHEN tablename LIKE '%session%' THEN 3
        ELSE 4
    END,
    tablename;

-- ============================================================================
-- 3. CHECK CRITICAL TABLES (MVP)
-- ============================================================================

SELECT
    '🔍 CRITICAL TABLES CHECK' as check_name,
    '════════════════════════════════════════' as separator;

WITH critical_tables AS (
    SELECT unnest(ARRAY[
        'profiles',
        'classes',
        'bookings',
        'gem_transactions',
        'class_sessions',
        'session_participants',
        'payments'
    ]) as table_name
)
SELECT
    ct.table_name,
    CASE
        WHEN pt.tablename IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    COALESCE(
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = 'public'
         AND table_name = ct.table_name),
        0
    ) as column_count
FROM critical_tables ct
LEFT JOIN pg_tables pt ON pt.tablename = ct.table_name AND pt.schemaname = 'public'
ORDER BY
    CASE WHEN pt.tablename IS NULL THEN 0 ELSE 1 END,
    ct.table_name;

-- ============================================================================
-- 4. CHECK ROW LEVEL SECURITY STATUS
-- ============================================================================

SELECT
    '🔍 RLS STATUS' as check_name,
    '════════════════════════════════════════' as separator;

SELECT
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '⚠️ DISABLED'
    END as rls_status,
    (SELECT COUNT(*)
     FROM pg_policies
     WHERE schemaname = 'public'
     AND tablename = pt.tablename) as policy_count
FROM pg_tables pt
WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
ORDER BY
    CASE WHEN rowsecurity THEN 1 ELSE 0 END,
    tablename;

-- ============================================================================
-- 5. CHECK DATABASE VIEWS
-- ============================================================================

SELECT
    '🔍 DATABASE VIEWS' as check_name,
    '════════════════════════════════════════' as separator;

SELECT
    viewname,
    CASE
        WHEN viewname LIKE '%analytics%' THEN '📊 Analytics'
        WHEN viewname LIKE '%summary%' THEN '📈 Summary'
        ELSE '🔧 Other'
    END as view_type
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================================================
-- 6. CHECK FUNCTIONS (Edge Function Triggers)
-- ============================================================================

SELECT
    '🔍 DATABASE FUNCTIONS' as check_name,
    '════════════════════════════════════════' as separator;

SELECT
    proname as function_name,
    pg_get_function_result(oid) as return_type,
    CASE
        WHEN proname LIKE '%trigger%' THEN '⚡ Trigger'
        WHEN proname LIKE '%sync%' THEN '🔄 Sync'
        WHEN proname LIKE '%notify%' THEN '🔔 Notify'
        WHEN proname LIKE '%calculate%' THEN '🧮 Calculate'
        ELSE '🔧 Utility'
    END as function_type
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname NOT LIKE 'pg_%'
ORDER BY function_type, proname
LIMIT 50;

-- ============================================================================
-- 7. CHECK TRIGGERS
-- ============================================================================

SELECT
    '🔍 DATABASE TRIGGERS' as check_name,
    '════════════════════════════════════════' as separator;

SELECT
    t.tgname as trigger_name,
    c.relname as table_name,
    CASE
        WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
        WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as trigger_timing,
    CASE
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'OTHER'
    END as trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND t.tgname NOT LIKE 'pg_%'
    AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- 8. CHECK STORAGE BUCKETS
-- ============================================================================

SELECT
    '🔍 STORAGE BUCKETS' as check_name,
    '════════════════════════════════════════' as separator;

SELECT
    id as bucket_id,
    name as bucket_name,
    public as is_public,
    created_at
FROM storage.buckets
ORDER BY created_at DESC;

-- ============================================================================
-- 9. DATABASE STATISTICS
-- ============================================================================

SELECT
    '🔍 DATABASE STATISTICS' as check_name,
    '════════════════════════════════════════' as separator;

SELECT
    'Tables' as type,
    COUNT(*) as count,
    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as total_size
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT
    'Views' as type,
    COUNT(*) as count,
    '0 bytes' as total_size
FROM pg_views
WHERE schemaname = 'public'

UNION ALL

SELECT
    'Functions' as type,
    COUNT(*) as count,
    'N/A' as total_size
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')

UNION ALL

SELECT
    'Triggers' as type,
    COUNT(*) as count,
    'N/A' as total_size
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND t.tgname NOT LIKE 'pg_%'
    AND NOT t.tgisinternal

UNION ALL

SELECT
    'RLS Policies' as type,
    COUNT(*) as count,
    'N/A' as total_size
FROM pg_policies
WHERE schemaname = 'public';

-- ============================================================================
-- 10. MISSING TABLES DETECTION
-- ============================================================================

SELECT
    '🔍 MISSING TABLES' as check_name,
    '════════════════════════════════════════' as separator;

WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'classes', 'bookings', 'gem_transactions',
        'activity_rules', 'activity_tracking', 'attendance_streaks',
        'referral_codes', 'reviews', 'teacher_availability',
        'teacher_earnings', 'payout_requests', 'class_sessions',
        'session_participants', 'session_events', 'system_settings',
        'notifications', 'notification_preferences', 'quizzes',
        'quiz_questions', 'quiz_attempts', 'payments',
        'cancellation_policies', 'cancellations'
    ]) as table_name
)
SELECT
    et.table_name as missing_table,
    '❌ NOT FOUND' as status,
    CASE
        WHEN et.table_name IN ('profiles', 'classes', 'bookings', 'gem_transactions') THEN '🚨 CRITICAL'
        WHEN et.table_name IN ('class_sessions', 'session_participants', 'payments') THEN '⚠️ HIGH'
        ELSE '📋 MEDIUM'
    END as priority
FROM expected_tables et
LEFT JOIN pg_tables pt ON pt.tablename = et.table_name AND pt.schemaname = 'public'
WHERE pt.tablename IS NULL
ORDER BY
    CASE
        WHEN et.table_name IN ('profiles', 'classes', 'bookings') THEN 1
        WHEN et.table_name LIKE '%session%' THEN 2
        ELSE 3
    END,
    et.table_name;

-- ============================================================================
-- 11. SYSTEM SETTINGS CHECK (Phase 8 - CometChat)
-- ============================================================================

SELECT
    '🔍 SYSTEM SETTINGS (CometChat Webhook)' as check_name,
    '════════════════════════════════════════' as separator;

-- Check if system_settings table exists and has webhook URL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_settings' AND schemaname = 'public') THEN
        PERFORM 1;
        RAISE NOTICE 'system_settings table exists ✅';
    ELSE
        RAISE WARNING 'system_settings table MISSING ❌ (Required for Phase 8)';
    END IF;
END $$;

-- If table exists, show webhook URL
SELECT
    key,
    CASE
        WHEN value LIKE '%YOUR_PROJECT_REF%' THEN '⚠️ NOT CONFIGURED'
        WHEN value LIKE '%supabase.co%' THEN '✅ CONFIGURED'
        ELSE '❓ UNKNOWN'
    END as config_status,
    LEFT(value, 50) || '...' as value_preview
FROM system_settings
WHERE key = 'cometchat_webhook_url'
LIMIT 1;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT
    '📊 VERIFICATION COMPLETE' as message,
    '════════════════════════════════════════' as separator;

SELECT
    'Review the results above to identify:' as instructions
UNION ALL SELECT '  1. Which migrations have been applied'
UNION ALL SELECT '  2. Which tables exist in your database'
UNION ALL SELECT '  3. Which critical tables are missing (if any)'
UNION ALL SELECT '  4. RLS policy status'
UNION ALL SELECT '  5. Database statistics'
UNION ALL SELECT ''
UNION ALL SELECT 'Next steps:'
UNION ALL SELECT '  - If tables are missing, run: npx supabase db push'
UNION ALL SELECT '  - If RLS is disabled, re-apply RLS migrations'
UNION ALL SELECT '  - If webhook URL not configured, update system_settings';

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================
