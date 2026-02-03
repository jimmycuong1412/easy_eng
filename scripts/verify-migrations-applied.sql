-- ============================================================================
-- Verification Script - Check if Migrations Applied Successfully
-- ============================================================================
-- Run this in Supabase SQL Editor after applying migrations
-- ============================================================================

-- Check 1: Verify system_settings table exists
SELECT
    '✅ CHECK 1: system_settings table' as check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_settings')
        THEN 'PASS - Table exists'
        ELSE 'FAIL - Table missing'
    END as status;

-- Check 2: Verify CometChat webhook URL is configured
SELECT
    '✅ CHECK 2: CometChat webhook URL' as check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM system_settings WHERE key = 'cometchat_webhook_url')
        THEN 'PASS - URL configured: ' || (SELECT value FROM system_settings WHERE key = 'cometchat_webhook_url')
        ELSE 'FAIL - URL not configured'
    END as status;

-- Check 3: Verify gem_transaction_audit_log table exists
SELECT
    '✅ CHECK 3: gem_transaction_audit_log table' as check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'gem_transaction_audit_log')
        THEN 'PASS - Table exists with ' || (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'gem_transaction_audit_log') || ' columns'
        ELSE 'FAIL - Table missing'
    END as status;

-- Check 4: Verify idempotency_key column exists on gem_transactions
SELECT
    '✅ CHECK 4: gem_transactions.idempotency_key' as check_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'gem_transactions' AND column_name = 'idempotency_key'
        )
        THEN 'PASS - Column exists'
        ELSE 'FAIL - Column missing'
    END as status;

-- Check 5: Verify profiles_cometchat_sync trigger exists
SELECT
    '✅ CHECK 5: profiles_cometchat_sync trigger' as check_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_cometchat_sync')
        THEN 'PASS - Trigger exists on ' || (
            SELECT c.relname
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            WHERE t.tgname = 'profiles_cometchat_sync'
        ) || ' table'
        ELSE 'FAIL - Trigger missing'
    END as status;

-- Check 6: Verify notify_cometchat_user_sync function exists
SELECT
    '✅ CHECK 6: notify_cometchat_user_sync function' as check_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_proc
            WHERE proname = 'notify_cometchat_user_sync'
        )
        THEN 'PASS - Function exists'
        ELSE 'FAIL - Function missing'
    END as status;

-- Check 7: Verify process_gem_transaction function exists
SELECT
    '✅ CHECK 7: process_gem_transaction function' as check_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_proc
            WHERE proname = 'process_gem_transaction'
        )
        THEN 'PASS - Function exists'
        ELSE 'FAIL - Function missing'
    END as status;

-- Check 8: Verify RLS policies on system_settings
SELECT
    '✅ CHECK 8: system_settings RLS policies' as check_name,
    CASE
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'system_settings') >= 2
        THEN 'PASS - ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'system_settings') || ' policies found'
        ELSE 'FAIL - Expected 2 policies, found ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'system_settings')
    END as status;

-- Summary
SELECT
    '═════════════════════════════════════════' as separator,
    'VERIFICATION SUMMARY' as title;

SELECT
    'Total Checks' as metric,
    '8' as value;

SELECT
    'Tables Created' as metric,
    (
        SELECT COUNT(*)::text FROM pg_tables
        WHERE tablename IN ('system_settings', 'gem_transaction_audit_log')
    ) || ' / 2' as value;

SELECT
    'Triggers Created' as metric,
    (
        SELECT COUNT(*)::text FROM pg_trigger
        WHERE tgname = 'profiles_cometchat_sync'
    ) || ' / 1' as value;

SELECT
    'Functions Created' as metric,
    (
        SELECT COUNT(*)::text FROM pg_proc
        WHERE proname IN ('notify_cometchat_user_sync', 'process_gem_transaction', 'calculate_gem_balance')
    ) || ' / 3' as value;

-- Show webhook URL for verification
SELECT
    '═════════════════════════════════════════' as separator,
    'COMETCHAT WEBHOOK URL' as title;

SELECT
    key,
    value as webhook_url,
    description
FROM system_settings
WHERE key = 'cometchat_webhook_url';

-- Final status
SELECT
    '═════════════════════════════════════════' as separator;

SELECT
    CASE
        WHEN (
            SELECT COUNT(*) FROM (
                SELECT 1 WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_settings')
                UNION ALL
                SELECT 1 WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'gem_transaction_audit_log')
                UNION ALL
                SELECT 1 WHERE EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_cometchat_sync')
            ) checks
        ) = 3
        THEN '🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY! 🎉'
        ELSE '⚠️ Some migrations may have failed - review checks above'
    END as final_status;

SELECT
    '═════════════════════════════════════════' as separator;

SELECT
    'NEXT STEP: Deploy CometChat Edge Function' as action,
    'npx supabase functions deploy cometchat-user-sync' as command;
