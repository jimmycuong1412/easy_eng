-- Migration: Insert profiles for existing auth users
-- Created: 2026-01-27
-- Description: Manually creates profiles for users that were created before the trigger was set up

-- ============================================================================
-- IMPORTANT: This script creates profiles for users that already exist in auth.users
-- but don't have profiles yet (because they were created before the trigger was set up)
-- ============================================================================

-- Step 1: Insert profile for Jimmy (Student)
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  timezone,
  locale,
  currency,
  created_at,
  updated_at
) VALUES (
  '70311902-706f-416c-9520-192a6cc96072',
  'jimmycuong1413@gmail.com',
  'Jimmy',
  'student',
  'Asia/Ho_Chi_Minh',
  'vi',
  'VND',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Step 2: Insert profile for Teacher
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  timezone,
  locale,
  currency,
  created_at,
  updated_at
) VALUES (
  '7a46e4e2-782c-471a-ba1b-cea449e75028',
  'jimmycuong1414@gmail.com',
  'Teacher',
  'teacher',
  'Asia/Ho_Chi_Minh',
  'vi',
  'VND',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Step 3: Verify profiles were created
SELECT
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
WHERE id IN (
  '70311902-706f-416c-9520-192a6cc96072',
  '7a46e4e2-782c-471a-ba1b-cea449e75028'
)
ORDER BY created_at;

-- Step 4: Summary
SELECT
  'Profiles created successfully!' as status,
  COUNT(*) as profile_count
FROM public.profiles
WHERE id IN (
  '70311902-706f-416c-9520-192a6cc96072',
  '7a46e4e2-782c-471a-ba1b-cea449e75028'
);
