-- Migration: Create test data with real user IDs
-- Created: 2026-01-27
-- Description: Creates test bookings, cookie balances, and teacher profiles using real user IDs

-- ============================================================================
-- IMPORTANT: User IDs from your Supabase database
-- ============================================================================
-- Student: Jimmy (jimmycuong1413@gmail.com) - ID: 70311902-706f-416c-9520-192a6cc96072
-- Teacher: (jimmycuong1414@gmail.com) - ID: 7a46e4e2-782c-471a-ba1b-cea449e75028
-- ============================================================================

-- Step 1: Create Teacher Profile
-- This creates a teacher profile for the teacher user
INSERT INTO public.teacher_profiles (
  user_id,
  bio,
  experience_years,
  hourly_rate,
  avg_rating,
  total_reviews,
  specialties,
  verified,
  created_at,
  updated_at
) VALUES (
  '7a46e4e2-782c-471a-ba1b-cea449e75028', -- Teacher user ID
  'Experienced English teacher with 5 years of teaching experience. Specialized in conversational English and IELTS preparation.',
  5,
  200000.00, -- 200,000 VND per hour
  4.85,
  42,
  ARRAY['IELTS', 'Conversational', 'Business English'],
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  bio = EXCLUDED.bio,
  experience_years = EXCLUDED.experience_years,
  hourly_rate = EXCLUDED.hourly_rate,
  avg_rating = EXCLUDED.avg_rating,
  total_reviews = EXCLUDED.total_reviews,
  specialties = EXCLUDED.specialties,
  verified = EXCLUDED.verified,
  updated_at = NOW();

-- Step 2: Create Cookie Balance for Student
INSERT INTO public.cookie_balances (
  user_id,
  balance,
  lifetime_earned,
  lifetime_spent,
  created_at,
  updated_at
) VALUES (
  '70311902-706f-416c-9520-192a6cc96072', -- Jimmy (student)
  500, -- Current balance
  1000, -- Total earned
  500, -- Total spent
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  balance = EXCLUDED.balance,
  lifetime_earned = EXCLUDED.lifetime_earned,
  lifetime_spent = EXCLUDED.lifetime_spent,
  updated_at = NOW();

-- Step 3: Create Cookie Transactions for Student
INSERT INTO public.cookie_transactions (user_id, amount, type, source, description, created_at) VALUES
-- Earning cookies
('70311902-706f-416c-9520-192a6cc96072', 100, 'earn', 'booking_completed', 'Earned from completing class', NOW() - INTERVAL '5 days'),
('70311902-706f-416c-9520-192a6cc96072', 150, 'earn', 'bonus', 'Welcome bonus', NOW() - INTERVAL '10 days'),
('70311902-706f-416c-9520-192a6cc96072', 50, 'earn', 'referral', 'Friend referral bonus', NOW() - INTERVAL '8 days'),
-- Spending cookies
('70311902-706f-416c-9520-192a6cc96072', -50, 'spend', 'booking_discount', 'Discount on booking', NOW() - INTERVAL '3 days'),
('70311902-706f-416c-9520-192a6cc96072', -100, 'spend', 'booking_discount', 'Discount on booking', NOW() - INTERVAL '1 day');

-- Step 4: Create Test Bookings
INSERT INTO public.bookings (
  student_id,
  teacher_id,
  scheduled_at,
  status,
  price,
  notes,
  meeting_url,
  created_at,
  updated_at
) VALUES
-- Completed booking (2 days ago)
(
  '70311902-706f-416c-9520-192a6cc96072', -- Jimmy (student)
  '7a46e4e2-782c-471a-ba1b-cea449e75028', -- Teacher
  NOW() - INTERVAL '2 days',
  'completed',
  200000.00,
  'IELTS Speaking Practice',
  NULL,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
-- Completed booking (1 day ago)
(
  '70311902-706f-416c-9520-192a6cc96072', -- Jimmy (student)
  '7a46e4e2-782c-471a-ba1b-cea449e75028', -- Teacher
  NOW() - INTERVAL '1 day',
  'completed',
  200000.00,
  'Business English Conversation',
  NULL,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
-- Upcoming confirmed booking (tomorrow)
(
  '70311902-706f-416c-9520-192a6cc96072', -- Jimmy (student)
  '7a46e4e2-782c-471a-ba1b-cea449e75028', -- Teacher
  NOW() + INTERVAL '1 day',
  'confirmed',
  200000.00,
  'Grammar Focus Session',
  'cometchat://session/12345',
  NOW(),
  NOW()
),
-- Upcoming confirmed booking (3 days from now)
(
  '70311902-706f-416c-9520-192a6cc96072', -- Jimmy (student)
  '7a46e4e2-782c-471a-ba1b-cea449e75028', -- Teacher
  NOW() + INTERVAL '3 days',
  'confirmed',
  200000.00,
  'IELTS Writing Practice',
  'cometchat://session/12346',
  NOW(),
  NOW()
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify teacher profile was created
SELECT
  tp.id,
  p.full_name,
  p.email,
  tp.bio,
  tp.experience_years,
  tp.hourly_rate,
  tp.avg_rating,
  tp.verified
FROM public.teacher_profiles tp
JOIN public.profiles p ON tp.user_id = p.id
WHERE tp.user_id = '7a46e4e2-782c-471a-ba1b-cea449e75028';

-- Verify cookie balance was created
SELECT
  cb.user_id,
  p.full_name,
  cb.balance,
  cb.lifetime_earned,
  cb.lifetime_spent
FROM public.cookie_balances cb
JOIN public.profiles p ON cb.user_id = p.id
WHERE cb.user_id = '70311902-706f-416c-9520-192a6cc96072';

-- Verify cookie transactions
SELECT
  ct.amount,
  ct.type,
  ct.source,
  ct.description,
  ct.created_at
FROM public.cookie_transactions ct
WHERE ct.user_id = '70311902-706f-416c-9520-192a6cc96072'
ORDER BY ct.created_at DESC;

-- Verify bookings were created
SELECT
  b.id,
  ps.full_name as student_name,
  pt.full_name as teacher_name,
  b.scheduled_at,
  b.status,
  b.price,
  b.notes
FROM public.bookings b
JOIN public.profiles ps ON b.student_id = ps.id
JOIN public.profiles pt ON b.teacher_id = pt.id
WHERE b.student_id = '70311902-706f-416c-9520-192a6cc96072'
ORDER BY b.scheduled_at DESC;

-- Summary counts
SELECT
  'Teacher Profiles' as table_name,
  COUNT(*) as count
FROM public.teacher_profiles
UNION ALL
SELECT
  'Cookie Balances' as table_name,
  COUNT(*) as count
FROM public.cookie_balances
UNION ALL
SELECT
  'Cookie Transactions' as table_name,
  COUNT(*) as count
FROM public.cookie_transactions
UNION ALL
SELECT
  'Bookings' as table_name,
  COUNT(*) as count
FROM public.bookings;
