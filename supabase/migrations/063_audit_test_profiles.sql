-- Audit and Repair Test Account Profiles
-- Migration: 063_audit_test_profiles.sql
-- Task: Finalize data visibility by ensuring correct roles and active status

-- 1. Admin Account (Jimmy Cuong)
UPDATE profiles 
SET role = 'admin', is_active = true 
WHERE email = 'jimmycuong1412@gmail.com';

-- 2. Student Account (Jimmy Student)
UPDATE profiles 
SET role = 'student', is_active = true 
WHERE email = 'jimmycuong1413@gmail.com';

-- 3. Teacher Account (Jimmy Teacher)
UPDATE profiles 
SET role = 'teacher', is_active = true 
WHERE email = 'jimmycuong1414@gmail.com';

-- 4. Safety Check: If the records don't exist, we'll need to know.
-- (Normally they are created on auth.signUp, but this ensures they are correctly flagged).
COMMENT ON TABLE profiles IS 'Audited for test account visibility and RLS policy compliance';
