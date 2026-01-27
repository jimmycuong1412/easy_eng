-- Migration: Create test admin user
-- Created: 2026-01-26
-- Description: Sets up a test admin user for development

-- Note: This script creates admin profile data only.
-- You must create the auth user in Supabase Auth first via the dashboard.

-- Step 1: Create the test admin user profile
-- Replace the UUID with your actual Supabase auth user ID after creating the auth user
INSERT INTO profiles (
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
  '1edd8815-b62c-4e59-bb87-ee463e6e62b5', -- Replace with actual UUID
  'admin@easyeng.com',
  'Admin User',
  'admin',
  'Asia/Ho_Chi_Minh',
  'vi',
  'VND',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Step 2: Verify the profile was created
SELECT id, email, full_name, role FROM profiles WHERE email = 'admin@easyeng.com';
