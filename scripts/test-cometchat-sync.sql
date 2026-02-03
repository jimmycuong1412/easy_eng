-- ============================================================================
-- Test CometChat User Sync
-- ============================================================================
-- This script creates a test user to verify CometChat sync is working
-- Run in Supabase SQL Editor
-- ============================================================================

-- Create a test user profile
INSERT INTO public.profiles (id, email, display_name, role, avatar_url, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'test-sync-' || floor(random() * 10000)::text || '@example.com',
  'Test CometChat Sync User',
  'student',
  NULL,
  NOW(),
  NOW()
)
RETURNING
  id,
  email,
  display_name,
  role,
  '✅ Test user created!' as status,
  'Now check Edge Function logs: npx supabase functions logs cometchat-user-sync --tail' as next_step;

-- Verify the user was created
SELECT
  '✅ Verification' as check_name,
  COUNT(*) || ' test users created in last 5 minutes' as result
FROM public.profiles
WHERE email LIKE 'test-sync-%@example.com'
  AND created_at > NOW() - INTERVAL '5 minutes';

-- Show instructions
SELECT
  '═════════════════════════════════════════' as separator,
  'NEXT: Check CometChat Logs' as title;

SELECT
  '1. Open terminal and run:' as step,
  'npx supabase functions logs cometchat-user-sync --tail' as command;

SELECT
  '2. Expected log output:' as step,
  'Webhook received: type=INSERT, table=profiles, userId=...' as expected;

SELECT
  '3. Success message:' as step,
  'Successfully synced profile ... to CometChat' as expected;

SELECT
  '4. Verify in CometChat Dashboard:' as step,
  'https://app.cometchat.com/ - Check Users section' as url;
