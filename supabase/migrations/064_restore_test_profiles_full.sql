-- Full Restoration of Test Profiles (INSERT ... SELECT for Auth ID Sync)
-- Migration: 064_restore_test_profiles_full.sql
-- Task: Resolve final data visibility issues by linking Auth IDs to Profiles

-- 1. Restore Student Profile
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT id, email, 'Jimmy Student', 'student', true
FROM auth.users WHERE email = 'jimmycuong1413@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'student', is_active = true, full_name = 'Jimmy Student';

-- 2. Restore Teacher Profile
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT id, email, 'Jimmy Teacher', 'teacher', true
FROM auth.users WHERE email = 'jimmycuong1414@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'teacher', is_active = true, full_name = 'Jimmy Teacher';

-- 3. Restore Admin Profile
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT id, email, 'Jimmy Admin', 'admin', true
FROM auth.users WHERE email = 'jimmycuong1412@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true, full_name = 'Jimmy Admin';

-- 4. Recovery Grant: Award Gems to Student if missing (Restores Dashboard balance visibility)
INSERT INTO public.gem_transactions (user_id, amount, transaction_type, description)
SELECT p.id, 900, 'admin_grant', 'Recovery Grant — Final restoration 064'
FROM public.profiles p WHERE p.email = 'jimmycuong1413@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.gem_transactions gt 
    WHERE gt.user_id = p.id 
    AND (gt.description LIKE '%restoration%' OR gt.description LIKE '%test gems%')
);

COMMENT ON TABLE public.profiles IS 'Full restoration: Profiles synced with Auth IDs for test account visibility';
