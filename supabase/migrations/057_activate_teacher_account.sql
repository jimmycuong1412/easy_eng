-- Activate the teacher account for testing
-- Migration: 057_activate_teacher_account.sql

UPDATE public.profiles
SET is_active = true
WHERE email = 'jimmycuong1414@gmail.com'
  AND role = 'teacher';

-- Optional: Ensure they have a bio so the card looks good
UPDATE public.profiles
SET bio = COALESCE(bio, 'Experimental teacher account for system testing.')
WHERE email = 'jimmycuong1414@gmail.com';
