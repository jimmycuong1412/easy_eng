-- Test Fixtures: Seed Data for Testing
-- This file provides consistent test data for integration and E2E tests

-- Clean up existing test data
DELETE FROM bookings WHERE student_id LIKE 'test-%';
DELETE FROM classes WHERE teacher_id LIKE 'test-%';
DELETE FROM cookie_transactions WHERE user_id LIKE 'test-%';
DELETE FROM profiles WHERE id LIKE 'test-%';
DELETE FROM auth.users WHERE id LIKE 'test-%';

-- Test Users (using auth.users for authentication)
-- Note: In real tests, use Supabase Admin API to create test users

-- Test Student Profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  cookie_balance,
  created_at
) VALUES (
  'test-student-001',
  'test-student@example.com',
  'Test Student',
  'student',
  100, -- Starting Cookie balance for testing
  NOW()
);

-- Test Teacher Profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  cookie_balance,
  bio,
  specialties,
  hourly_rate,
  rating,
  total_reviews,
  created_at
) VALUES (
  'test-teacher-001',
  'test-teacher@example.com',
  'Test Teacher',
  'teacher',
  0,
  'Experienced English teacher specializing in business communication',
  ARRAY['Business English', 'IELTS', 'Conversation'],
  25.00,
  4.8,
  156,
  NOW()
);

-- Test Admin Profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  created_at
) VALUES (
  'test-admin-001',
  'test-admin@example.com',
  'Test Admin',
  'admin',
  NOW()
);

-- Test Classes
INSERT INTO classes (
  id,
  teacher_id,
  title,
  description,
  price,
  duration_minutes,
  max_students,
  current_students,
  start_time,
  end_time,
  status,
  created_at
) VALUES
(
  'test-class-001',
  'test-teacher-001',
  'Business English Conversation',
  'Improve your business communication skills through practical conversations',
  25.00,
  60,
  5,
  0,
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '2 days 1 hour',
  'scheduled',
  NOW()
),
(
  'test-class-002',
  'test-teacher-001',
  'IELTS Speaking Practice',
  'Prepare for IELTS speaking test with expert guidance',
  30.00,
  90,
  3,
  1,
  NOW() + INTERVAL '3 days',
  NOW() + INTERVAL '3 days 90 minutes',
  'scheduled',
  NOW()
),
(
  'test-class-003',
  'test-teacher-001',
  'English Grammar Fundamentals',
  'Master essential English grammar rules',
  20.00,
  60,
  10,
  8,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day 1 hour',
  'scheduled',
  NOW()
);

-- Test Bookings
INSERT INTO bookings (
  id,
  student_id,
  class_id,
  status,
  original_price,
  cookies_used,
  discount_amount,
  final_price,
  payment_method,
  payment_status,
  created_at
) VALUES
(
  'test-booking-001',
  'test-student-001',
  'test-class-002',
  'confirmed',
  30.00,
  20,
  10.00, -- 20 Cookies @ $0.50 = $10 discount
  20.00,
  'vnpay',
  'completed',
  NOW()
),
(
  'test-booking-002',
  'test-student-001',
  'test-class-003',
  'pending',
  20.00,
  0,
  0.00,
  20.00,
  'momo',
  'pending',
  NOW()
);

-- Test Cookie Transactions
INSERT INTO cookie_transactions (
  id,
  user_id,
  amount,
  transaction_type,
  description,
  reference_type,
  reference_id,
  balance_after,
  created_at
) VALUES
(
  'test-tx-001',
  'test-student-001',
  100,
  'earned',
  'Welcome bonus',
  'system',
  NULL,
  100,
  NOW() - INTERVAL '7 days'
),
(
  'test-tx-002',
  'test-student-001',
  10,
  'earned',
  'Completed first lesson',
  'class',
  'test-class-001',
  110,
  NOW() - INTERVAL '5 days'
),
(
  'test-tx-003',
  'test-student-001',
  -20,
  'spent',
  'Applied discount to booking',
  'booking',
  'test-booking-001',
  90,
  NOW() - INTERVAL '2 days'
);

-- Test Reviews (if reviews table exists)
-- INSERT INTO reviews (...) VALUES (...);

-- Verify test data
SELECT 'Test data seeded successfully' as status,
       (SELECT COUNT(*) FROM profiles WHERE id LIKE 'test-%') as test_profiles,
       (SELECT COUNT(*) FROM classes WHERE id LIKE 'test-%') as test_classes,
       (SELECT COUNT(*) FROM bookings WHERE id LIKE 'test-%') as test_bookings,
       (SELECT COUNT(*) FROM cookie_transactions WHERE id LIKE 'test-%') as test_transactions;
