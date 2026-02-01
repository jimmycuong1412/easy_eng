-- RLS Policy Tests: Cross-Role Permission Violations
-- Purpose: Verify users cannot access or modify data across role boundaries
-- Constitution Compliance: Principle VII (Role-Based Access Control)

BEGIN;

-- Setup test data
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'teacher@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, role, display_name, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student', 'Test Student', 'student@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'teacher', 'Test Teacher', 'teacher@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin', 'Test Admin', 'admin@test.com')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name;

-- Create test classes
INSERT INTO classes (id, teacher_id, title, description, price, max_students, scheduled_at, duration_minutes, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Teacher Class', 'Test', 20.00, 5, NOW() + INTERVAL '1 day', 60, 'published')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Create test gem transactions
INSERT INTO gem_transactions (student_id, amount, transaction_type, reason) VALUES
  ('11111111-1111-1111-1111-111111111111', 100, 'earned', 'Test reward');

SELECT plan(25); -- Total number of tests

-- =====================================================
-- STUDENT → TEACHER Cross-Role Violations
-- =====================================================
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

SELECT throws_ok(
  $$INSERT INTO classes (teacher_id, title, description, price, max_students, scheduled_at, duration_minutes)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Fake Class', 'Illegal', 10.00, 5,
            NOW() + INTERVAL '1 day', 60)$$,
  'Student CANNOT create classes (teacher action)'
);

SELECT throws_ok(
  $$UPDATE classes SET price = 1.00 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'Student CANNOT update teacher classes'
);

SELECT throws_ok(
  $$DELETE FROM classes WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'Student CANNOT delete teacher classes'
);

-- =====================================================
-- STUDENT → ADMIN Cross-Role Violations
-- =====================================================
SELECT throws_ok(
  $$INSERT INTO gem_transactions (student_id, amount, transaction_type, reason, related_admin_id)
    VALUES ('11111111-1111-1111-1111-111111111111', 999, 'admin_adjustment', 'Fraud',
            '11111111-1111-1111-1111-111111111111')$$,
  'Student CANNOT create admin gem adjustments'
);

SELECT throws_ok(
  $$UPDATE gem_earning_rules SET gem_reward = 9999 WHERE activity_type = 'lesson_completion'$$,
  'Student CANNOT modify gem earning rules (admin action)'
);

SELECT throws_ok(
  $$INSERT INTO gem_earning_rules (activity_type, gem_reward)
    VALUES ('fake_activity', 500)$$,
  'Student CANNOT create gem earning rules (admin action)'
);

SELECT throws_ok(
  $$UPDATE profiles SET role = 'admin' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'Student CANNOT escalate to admin role'
);

SELECT is_empty(
  'SELECT id FROM admin_audit_log',
  'Student CANNOT read admin audit logs'
);

-- =====================================================
-- TEACHER → STUDENT Cross-Role Violations
-- =====================================================
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

SELECT is_empty(
  'SELECT id FROM gem_transactions WHERE student_id = ''11111111-1111-1111-1111-111111111111''',
  'Teacher CANNOT read student gem transactions'
);

SELECT throws_ok(
  $$INSERT INTO gem_transactions (student_id, amount, transaction_type, reason)
    VALUES ('11111111-1111-1111-1111-111111111111', 50, 'earned', 'Teacher fraud')$$,
  'Teacher CANNOT create gem transactions for students'
);

SELECT throws_ok(
  $$UPDATE gem_transactions SET amount = 999
    WHERE student_id = '11111111-1111-1111-1111-111111111111'$$,
  'Teacher CANNOT update student gem transactions'
);

SELECT throws_ok(
  $$INSERT INTO bookings (student_id, class_id, payment_status, gems_used)
    VALUES ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'confirmed', 0)$$,
  'Teacher CANNOT create bookings on behalf of students'
);

-- =====================================================
-- TEACHER → ADMIN Cross-Role Violations
-- =====================================================
SELECT throws_ok(
  $$INSERT INTO gem_transactions (student_id, amount, transaction_type, reason, related_admin_id)
    VALUES ('11111111-1111-1111-1111-111111111111', 500, 'admin_adjustment', 'Teacher pretending to be admin',
            '22222222-2222-2222-2222-222222222222')$$,
  'Teacher CANNOT create admin gem adjustments'
);

SELECT throws_ok(
  $$UPDATE gem_earning_rules SET gem_reward = 500 WHERE activity_type = 'lesson_completion'$$,
  'Teacher CANNOT modify gem earning rules (admin action)'
);

SELECT throws_ok(
  $$UPDATE profiles SET role = 'student' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'Teacher CANNOT change user roles (admin action)'
);

SELECT throws_ok(
  $$UPDATE profiles SET role = 'admin' WHERE id = '22222222-2222-2222-2222-222222222222'$$,
  'Teacher CANNOT escalate to admin role'
);

SELECT is_empty(
  'SELECT id FROM admin_audit_log',
  'Teacher CANNOT read admin audit logs'
);

-- =====================================================
-- TEACHER → OTHER TEACHER Cross-Role Violations
-- =====================================================
-- Create second teacher
INSERT INTO auth.users (id, email) VALUES
  ('55555555-5555-5555-5555-555555555555', 'teacher2@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, role, display_name, email) VALUES
  ('55555555-5555-5555-5555-555555555555', 'teacher', 'Test Teacher 2', 'teacher2@test.com')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO classes (id, teacher_id, title, description, price, max_students, scheduled_at, duration_minutes, status) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Teacher 2 Class', 'Test', 25.00, 5, NOW() + INTERVAL '2 days', 60, 'published')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

SELECT is_empty(
  'SELECT id FROM classes WHERE id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  'Teacher CANNOT read other teachers classes'
);

SELECT throws_ok(
  $$UPDATE classes SET price = 1.00 WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  'Teacher CANNOT update other teachers classes'
);

SELECT throws_ok(
  $$DELETE FROM classes WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  'Teacher CANNOT delete other teachers classes'
);

-- =====================================================
-- ROLE IMPERSONATION ATTEMPTS
-- =====================================================
-- Student trying to impersonate teacher by setting teacher_id
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

SELECT throws_ok(
  $$INSERT INTO classes (teacher_id, title, description, price, max_students, scheduled_at, duration_minutes)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Impersonation Class', 'Fake', 20.00, 5,
            NOW() + INTERVAL '1 day', 60)$$,
  'Student CANNOT create classes using another users teacher_id'
);

-- Teacher trying to impersonate admin
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

SELECT throws_ok(
  $$INSERT INTO gem_transactions (student_id, amount, transaction_type, reason, related_admin_id)
    VALUES ('11111111-1111-1111-1111-111111111111', 500, 'admin_adjustment', 'Fake admin',
            '33333333-3333-3333-3333-333333333333')$$,
  'Teacher CANNOT impersonate admin for gem adjustments'
);

-- =====================================================
-- DATA LEAKAGE PREVENTION
-- =====================================================
-- Verify students cannot see other students' data
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

INSERT INTO auth.users (id, email) VALUES
  ('66666666-6666-6666-6666-666666666666', 'student2@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, role, display_name, email) VALUES
  ('66666666-6666-6666-6666-666666666666', 'student', 'Test Student 2', 'student2@test.com')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO gem_transactions (student_id, amount, transaction_type, reason) VALUES
  ('66666666-6666-6666-6666-666666666666', 200, 'earned', 'Other student reward');

SELECT is_empty(
  'SELECT id FROM gem_transactions WHERE student_id = ''66666666-6666-6666-6666-666666666666''',
  'Student CANNOT see other students gem transactions'
);

SELECT is_empty(
  'SELECT id FROM profiles WHERE id = ''66666666-6666-6666-6666-666666666666''',
  'Student CANNOT see other students profiles'
);

SELECT * FROM finish();

ROLLBACK;
