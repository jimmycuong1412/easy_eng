-- RLS Policy Tests: Student-Only Data Access
-- Purpose: Verify students can only access their own data and cannot access other roles' data
-- Constitution Compliance: Principle VII (Role-Based Access Control)

BEGIN;

-- Setup test data
-- Create test users (mock auth.users entries)
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'student2@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'teacher1@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'admin1@test.com')
ON CONFLICT (id) DO NOTHING;

-- Create test profiles
INSERT INTO profiles (id, role, display_name, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student', 'Test Student 1', 'student1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'student', 'Test Student 2', 'student2@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'teacher', 'Test Teacher 1', 'teacher1@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'admin', 'Test Admin 1', 'admin1@test.com')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email;

-- Create test gem transactions
INSERT INTO gem_transactions (student_id, amount, transaction_type, reason) VALUES
  ('11111111-1111-1111-1111-111111111111', 100, 'earned', 'Test lesson completion'),
  ('22222222-2222-2222-2222-222222222222', 50, 'earned', 'Test quiz completion');

-- Create test classes
INSERT INTO classes (teacher_id, title, description, price, max_students, scheduled_at, duration_minutes) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Test Class 1', 'Test description', 20.00, 5, NOW() + INTERVAL '1 day', 60);

-- Create test bookings
INSERT INTO bookings (student_id, class_id, payment_status, gems_used) VALUES
  ('11111111-1111-1111-1111-111111111111',
   (SELECT id FROM classes WHERE teacher_id = '33333333-3333-3333-3333-333333333333' LIMIT 1),
   'confirmed', 0);

-- =====================================================
-- Test 1: Students can read their own profile
-- =====================================================
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

SELECT plan(20); -- Total number of tests

SELECT results_eq(
  'SELECT id::TEXT FROM profiles WHERE id = ''11111111-1111-1111-1111-111111111111''',
  $$VALUES ('11111111-1111-1111-1111-111111111111'::TEXT)$$,
  'Student can read their own profile'
);

-- =====================================================
-- Test 2: Students CANNOT read other students' profiles
-- =====================================================
SELECT is_empty(
  'SELECT id FROM profiles WHERE id = ''22222222-2222-2222-2222-222222222222''',
  'Student CANNOT read other students profiles'
);

-- =====================================================
-- Test 3: Students can update their own profile (allowed fields only)
-- =====================================================
SELECT lives_ok(
  $$UPDATE profiles SET display_name = 'Updated Name' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'Student can update their own display_name'
);

-- =====================================================
-- Test 4: Students CANNOT update their own role
-- =====================================================
SELECT throws_ok(
  $$UPDATE profiles SET role = 'admin' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'Student CANNOT escalate their own role'
);

-- =====================================================
-- Test 5: Students CANNOT update other students' profiles
-- =====================================================
SELECT throws_ok(
  $$UPDATE profiles SET display_name = 'Hacked' WHERE id = '22222222-2222-2222-2222-222222222222'$$,
  'Student CANNOT update other students profiles'
);

-- =====================================================
-- Test 6: Students can read their own gem transactions
-- =====================================================
SELECT results_eq(
  'SELECT student_id::TEXT FROM gem_transactions WHERE student_id = ''11111111-1111-1111-1111-111111111111''',
  $$VALUES ('11111111-1111-1111-1111-111111111111'::TEXT)$$,
  'Student can read their own gem transactions'
);

-- =====================================================
-- Test 7: Students CANNOT read other students' gem transactions
-- =====================================================
SELECT is_empty(
  'SELECT id FROM gem_transactions WHERE student_id = ''22222222-2222-2222-2222-222222222222''',
  'Student CANNOT read other students gem transactions'
);

-- =====================================================
-- Test 8: Students CANNOT insert gem transactions
-- =====================================================
SELECT throws_ok(
  $$INSERT INTO gem_transactions (student_id, amount, transaction_type, reason)
    VALUES ('11111111-1111-1111-1111-111111111111', 9999, 'earned', 'Hacking gems')$$,
  'Student CANNOT insert gem transactions'
);

-- =====================================================
-- Test 9: Students CANNOT update gem transactions
-- =====================================================
SELECT throws_ok(
  $$UPDATE gem_transactions SET amount = 9999
    WHERE student_id = '11111111-1111-1111-1111-111111111111'$$,
  'Student CANNOT update gem transactions'
);

-- =====================================================
-- Test 10: Students CANNOT delete gem transactions
-- =====================================================
SELECT throws_ok(
  $$DELETE FROM gem_transactions WHERE student_id = '11111111-1111-1111-1111-111111111111'$$,
  'Student CANNOT delete gem transactions'
);

-- =====================================================
-- Test 11: Students can view public class listings
-- =====================================================
SELECT ok(
  (SELECT COUNT(*) FROM classes WHERE status = 'published') > 0,
  'Student can view published classes'
);

-- =====================================================
-- Test 12: Students CANNOT view draft classes
-- =====================================================
-- First insert a draft class
INSERT INTO classes (teacher_id, title, description, price, max_students, scheduled_at, duration_minutes, status) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Draft Class', 'Test draft', 20.00, 5, NOW() + INTERVAL '1 day', 60, 'draft');

SELECT is_empty(
  'SELECT id FROM classes WHERE status = ''draft''',
  'Student CANNOT view draft classes'
);

-- =====================================================
-- Test 13: Students can read their own bookings
-- =====================================================
SELECT results_eq(
  'SELECT student_id::TEXT FROM bookings WHERE student_id = ''11111111-1111-1111-1111-111111111111''',
  $$VALUES ('11111111-1111-1111-1111-111111111111'::TEXT)$$,
  'Student can read their own bookings'
);

-- =====================================================
-- Test 14: Students CANNOT read other students' bookings
-- =====================================================
-- Create a booking for student2
INSERT INTO bookings (student_id, class_id, payment_status, gems_used) VALUES
  ('22222222-2222-2222-2222-222222222222',
   (SELECT id FROM classes WHERE teacher_id = '33333333-3333-3333-3333-333333333333' LIMIT 1),
   'confirmed', 0);

SELECT is_empty(
  'SELECT id FROM bookings WHERE student_id = ''22222222-2222-2222-2222-222222222222''',
  'Student CANNOT read other students bookings'
);

-- =====================================================
-- Test 15: Students can create bookings for themselves
-- =====================================================
SELECT lives_ok(
  $$INSERT INTO bookings (student_id, class_id, payment_status, gems_used)
    VALUES ('11111111-1111-1111-1111-111111111111',
            (SELECT id FROM classes WHERE teacher_id = '33333333-3333-3333-3333-333333333333' LIMIT 1),
            'pending', 0)$$,
  'Student can create bookings for themselves'
);

-- =====================================================
-- Test 16: Students CANNOT create bookings for other students
-- =====================================================
SELECT throws_ok(
  $$INSERT INTO bookings (student_id, class_id, payment_status, gems_used)
    VALUES ('22222222-2222-2222-2222-222222222222',
            (SELECT id FROM classes WHERE teacher_id = '33333333-3333-3333-3333-333333333333' LIMIT 1),
            'confirmed', 0)$$,
  'Student CANNOT create bookings for other students'
);

-- =====================================================
-- Test 17: Students CANNOT access gem earning rules (admin only)
-- =====================================================
SELECT is_empty(
  'SELECT id FROM gem_earning_rules WHERE is_active = FALSE',
  'Student CANNOT view inactive gem earning rules'
);

-- =====================================================
-- Test 18: Students can view active gem earning rules
-- =====================================================
SELECT ok(
  (SELECT COUNT(*) FROM gem_earning_rules WHERE is_active = TRUE) > 0,
  'Student can view active gem earning rules'
);

-- =====================================================
-- Test 19: Students CANNOT modify gem earning rules
-- =====================================================
SELECT throws_ok(
  $$UPDATE gem_earning_rules SET gem_reward = 9999 WHERE activity_type = 'lesson_completion'$$,
  'Student CANNOT update gem earning rules'
);

-- =====================================================
-- Test 20: Students CANNOT access admin audit logs
-- =====================================================
SELECT is_empty(
  'SELECT id FROM admin_audit_log',
  'Student CANNOT access admin audit logs'
);

SELECT * FROM finish();

ROLLBACK;
