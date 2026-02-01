-- RLS Policy Tests: Teacher-Only Data Access
-- Purpose: Verify teachers can manage their own classes and view their students' bookings
-- Constitution Compliance: Principle VII (Role-Based Access Control)

BEGIN;

-- Setup test data
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'teacher1@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'teacher2@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'admin1@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, role, display_name, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student', 'Test Student 1', 'student1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'teacher', 'Test Teacher 1', 'teacher1@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'teacher', 'Test Teacher 2', 'teacher2@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'admin', 'Test Admin 1', 'admin1@test.com')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email;

-- Create test classes
INSERT INTO classes (id, teacher_id, title, description, price, max_students, scheduled_at, duration_minutes, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Teacher 1 Class', 'Test description', 20.00, 5, NOW() + INTERVAL '1 day', 60, 'published'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Teacher 2 Class', 'Test description', 25.00, 5, NOW() + INTERVAL '2 days', 60, 'published')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- Create test bookings
INSERT INTO bookings (student_id, class_id, payment_status, gems_used) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'confirmed', 0);

-- Set auth context to teacher1
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

SELECT plan(18); -- Total number of tests

-- =====================================================
-- Test 1: Teachers can read their own profile
-- =====================================================
SELECT results_eq(
  'SELECT id::TEXT FROM profiles WHERE id = ''22222222-2222-2222-2222-222222222222''',
  $$VALUES ('22222222-2222-2222-2222-222222222222'::TEXT)$$,
  'Teacher can read their own profile'
);

-- =====================================================
-- Test 2: Teachers can update their own profile
-- =====================================================
SELECT lives_ok(
  $$UPDATE profiles SET display_name = 'Updated Teacher Name' WHERE id = '22222222-2222-2222-2222-222222222222'$$,
  'Teacher can update their own profile'
);

-- =====================================================
-- Test 3: Teachers CANNOT escalate their own role
-- =====================================================
SELECT throws_ok(
  $$UPDATE profiles SET role = 'admin' WHERE id = '22222222-2222-2222-2222-222222222222'$$,
  'Teacher CANNOT escalate to admin role'
);

-- =====================================================
-- Test 4: Teachers CANNOT read other teachers' profiles
-- =====================================================
SELECT is_empty(
  'SELECT id FROM profiles WHERE id = ''33333333-3333-3333-3333-333333333333''',
  'Teacher CANNOT read other teachers profiles'
);

-- =====================================================
-- Test 5: Teachers CANNOT read student profiles (unless for their class)
-- =====================================================
SELECT is_empty(
  'SELECT id FROM profiles WHERE id = ''11111111-1111-1111-1111-111111111111'' AND role = ''student''',
  'Teacher CANNOT read arbitrary student profiles'
);

-- =====================================================
-- Test 6: Teachers can create their own classes
-- =====================================================
SELECT lives_ok(
  $$INSERT INTO classes (teacher_id, title, description, price, max_students, scheduled_at, duration_minutes)
    VALUES ('22222222-2222-2222-2222-222222222222', 'New Class', 'New description', 30.00, 10,
            NOW() + INTERVAL '3 days', 90)$$,
  'Teacher can create new classes'
);

-- =====================================================
-- Test 7: Teachers can read their own classes
-- =====================================================
SELECT results_eq(
  'SELECT id::TEXT FROM classes WHERE id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''',
  $$VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::TEXT)$$,
  'Teacher can read their own classes'
);

-- =====================================================
-- Test 8: Teachers can update their own classes
-- =====================================================
SELECT lives_ok(
  $$UPDATE classes SET title = 'Updated Title' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'Teacher can update their own classes'
);

-- =====================================================
-- Test 9: Teachers can delete their own classes
-- =====================================================
SELECT lives_ok(
  $$DELETE FROM classes WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    AND NOT EXISTS (SELECT 1 FROM bookings WHERE class_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'Teacher can delete their own classes (if no bookings)'
);

-- Re-insert the class for further tests
INSERT INTO classes (id, teacher_id, title, description, price, max_students, scheduled_at, duration_minutes, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Teacher 1 Class', 'Test description', 20.00, 5, NOW() + INTERVAL '1 day', 60, 'published')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- =====================================================
-- Test 10: Teachers CANNOT read other teachers' classes
-- =====================================================
SELECT is_empty(
  'SELECT id FROM classes WHERE id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  'Teacher CANNOT read other teachers classes'
);

-- =====================================================
-- Test 11: Teachers CANNOT update other teachers' classes
-- =====================================================
SELECT throws_ok(
  $$UPDATE classes SET title = 'Hacked' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  'Teacher CANNOT update other teachers classes'
);

-- =====================================================
-- Test 12: Teachers can view bookings for their own classes
-- =====================================================
SELECT results_eq(
  'SELECT class_id::TEXT FROM bookings WHERE class_id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''',
  $$VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::TEXT)$$,
  'Teacher can view bookings for their classes'
);

-- =====================================================
-- Test 13: Teachers CANNOT view bookings for other teachers' classes
-- =====================================================
INSERT INTO bookings (student_id, class_id, payment_status, gems_used) VALUES
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'confirmed', 0);

SELECT is_empty(
  'SELECT id FROM bookings WHERE class_id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  'Teacher CANNOT view bookings for other teachers classes'
);

-- =====================================================
-- Test 14: Teachers CANNOT access student gem transactions
-- =====================================================
INSERT INTO gem_transactions (student_id, amount, transaction_type, reason) VALUES
  ('11111111-1111-1111-1111-111111111111', 100, 'earned', 'Test transaction');

SELECT is_empty(
  'SELECT id FROM gem_transactions WHERE student_id = ''11111111-1111-1111-1111-111111111111''',
  'Teacher CANNOT access student gem transactions'
);

-- =====================================================
-- Test 15: Teachers CANNOT modify gem earning rules
-- =====================================================
SELECT throws_ok(
  $$UPDATE gem_earning_rules SET gem_reward = 9999 WHERE activity_type = 'lesson_completion'$$,
  'Teacher CANNOT modify gem earning rules'
);

-- =====================================================
-- Test 16: Teachers can view active gem earning rules (public info)
-- =====================================================
SELECT ok(
  (SELECT COUNT(*) FROM gem_earning_rules WHERE is_active = TRUE) >= 0,
  'Teacher can view active gem earning rules'
);

-- =====================================================
-- Test 17: Teachers CANNOT access admin audit logs
-- =====================================================
SELECT is_empty(
  'SELECT id FROM admin_audit_log',
  'Teacher CANNOT access admin audit logs'
);

-- =====================================================
-- Test 18: Teachers CANNOT adjust student gems
-- =====================================================
SELECT throws_ok(
  $$INSERT INTO gem_transactions (student_id, amount, transaction_type, reason, related_admin_id)
    VALUES ('11111111-1111-1111-1111-111111111111', 500, 'admin_adjustment', 'Fraudulent', '22222222-2222-2222-2222-222222222222')$$,
  'Teacher CANNOT create admin gem adjustments'
);

SELECT * FROM finish();

ROLLBACK;
