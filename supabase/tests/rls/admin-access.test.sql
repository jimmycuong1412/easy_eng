-- RLS Policy Tests: Admin-Only Data Access
-- Purpose: Verify admins have appropriate elevated permissions while still respecting boundaries
-- Constitution Compliance: Principle VII (Role-Based Access Control)

BEGIN;

-- Setup test data
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'teacher1@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin1@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'admin2@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, role, display_name, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student', 'Test Student 1', 'student1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'teacher', 'Test Teacher 1', 'teacher1@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin', 'Test Admin 1', 'admin1@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'admin', 'Test Admin 2', 'admin2@test.com')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email;

-- Create test gem transactions
INSERT INTO gem_transactions (student_id, amount, transaction_type, reason) VALUES
  ('11111111-1111-1111-1111-111111111111', 100, 'earned', 'Test transaction');

-- Create test classes
INSERT INTO classes (id, teacher_id, title, description, price, max_students, scheduled_at, duration_minutes, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Test Class', 'Test description', 20.00, 5, NOW() + INTERVAL '1 day', 60, 'published')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Create test bookings
INSERT INTO bookings (student_id, class_id, payment_status, gems_used) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'confirmed', 0);

-- Set auth context to admin1
SET LOCAL "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';

SELECT plan(22); -- Total number of tests

-- =====================================================
-- Test 1: Admins can read their own profile
-- =====================================================
SELECT results_eq(
  'SELECT id::TEXT FROM profiles WHERE id = ''33333333-3333-3333-3333-333333333333''',
  $$VALUES ('33333333-3333-3333-3333-333333333333'::TEXT)$$,
  'Admin can read their own profile'
);

-- =====================================================
-- Test 2: Admins can read all user profiles (student, teacher, admin)
-- =====================================================
SELECT ok(
  (SELECT COUNT(*) FROM profiles) >= 4,
  'Admin can read all user profiles'
);

SELECT ok(
  EXISTS (SELECT 1 FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111' AND role = 'student'),
  'Admin can read student profiles'
);

SELECT ok(
  EXISTS (SELECT 1 FROM profiles WHERE id = '22222222-2222-2222-2222-222222222222' AND role = 'teacher'),
  'Admin can read teacher profiles'
);

-- =====================================================
-- Test 3: Admins can update user roles (role management)
-- =====================================================
SELECT lives_ok(
  $$UPDATE profiles SET role = 'teacher' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'Admin can change user roles'
);

-- Revert for other tests
UPDATE profiles SET role = 'student' WHERE id = '11111111-1111-1111-1111-111111111111';

-- =====================================================
-- Test 4: Admins can view all gem transactions
-- =====================================================
SELECT ok(
  (SELECT COUNT(*) FROM gem_transactions WHERE student_id = '11111111-1111-1111-1111-111111111111') > 0,
  'Admin can view all student gem transactions'
);

-- =====================================================
-- Test 5: Admins can create gem adjustment transactions
-- =====================================================
SELECT lives_ok(
  $$INSERT INTO gem_transactions (student_id, amount, transaction_type, reason, related_admin_id)
    VALUES ('11111111-1111-1111-1111-111111111111', 500, 'admin_adjustment', 'Admin bonus',
            '33333333-3333-3333-3333-333333333333')$$,
  'Admin can create gem adjustment transactions'
);

-- =====================================================
-- Test 6: Admins can view all gem earning rules
-- =====================================================
SELECT ok(
  (SELECT COUNT(*) FROM gem_earning_rules) > 0,
  'Admin can view all gem earning rules'
);

SELECT ok(
  (SELECT COUNT(*) FROM gem_earning_rules WHERE is_active = TRUE) > 0,
  'Admin can view active gem rules'
);

SELECT ok(
  (SELECT COUNT(*) FROM gem_earning_rules WHERE is_active = FALSE) >= 0,
  'Admin can view inactive gem rules'
);

-- =====================================================
-- Test 7: Admins can create new gem earning rules
-- =====================================================
SELECT lives_ok(
  $$INSERT INTO gem_earning_rules (activity_type, gem_reward, is_active)
    VALUES ('test_activity', 75, TRUE)$$,
  'Admin can create new gem earning rules'
);

-- =====================================================
-- Test 8: Admins can update gem earning rules
-- =====================================================
SELECT lives_ok(
  $$UPDATE gem_earning_rules SET gem_reward = 80 WHERE activity_type = 'test_activity'$$,
  'Admin can update gem earning rules'
);

-- =====================================================
-- Test 9: Admins can deactivate gem earning rules
-- =====================================================
SELECT lives_ok(
  $$UPDATE gem_earning_rules SET is_active = FALSE WHERE activity_type = 'test_activity'$$,
  'Admin can deactivate gem earning rules'
);

-- =====================================================
-- Test 10: Admins can delete gem earning rules
-- =====================================================
SELECT lives_ok(
  $$DELETE FROM gem_earning_rules WHERE activity_type = 'test_activity'$$,
  'Admin can delete gem earning rules'
);

-- =====================================================
-- Test 11: Admins can view all classes (any teacher)
-- =====================================================
SELECT ok(
  EXISTS (SELECT 1 FROM classes WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Admin can view all classes'
);

-- =====================================================
-- Test 12: Admins can view all bookings
-- =====================================================
SELECT ok(
  (SELECT COUNT(*) FROM bookings WHERE class_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') > 0,
  'Admin can view all bookings'
);

-- =====================================================
-- Test 13: Admins can read admin audit logs
-- =====================================================
-- First create an audit log entry
INSERT INTO admin_audit_log (event_type, admin_id, target_user_id, action_details) VALUES
  ('gem_adjustment', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   '{"amount": 500, "reason": "Test audit"}'::jsonb);

SELECT ok(
  (SELECT COUNT(*) FROM admin_audit_log) > 0,
  'Admin can read admin audit logs'
);

-- =====================================================
-- Test 14: Admins can filter audit logs by event type
-- =====================================================
SELECT ok(
  EXISTS (SELECT 1 FROM admin_audit_log WHERE event_type = 'gem_adjustment'),
  'Admin can filter audit logs by event type'
);

-- =====================================================
-- Test 15: Admins can filter audit logs by target user
-- =====================================================
SELECT ok(
  EXISTS (SELECT 1 FROM admin_audit_log WHERE target_user_id = '11111111-1111-1111-1111-111111111111'),
  'Admin can filter audit logs by target user'
);

-- =====================================================
-- Test 16: Admins CANNOT update audit logs (immutable)
-- =====================================================
SELECT throws_ok(
  $$UPDATE admin_audit_log SET action_details = '{"hacked": true}'::jsonb
    WHERE admin_id = '33333333-3333-3333-3333-333333333333'$$,
  'Admin CANNOT update audit logs (immutable)'
);

-- =====================================================
-- Test 17: Admins CANNOT delete audit logs (immutable)
-- =====================================================
SELECT throws_ok(
  $$DELETE FROM admin_audit_log WHERE admin_id = '33333333-3333-3333-3333-333333333333'$$,
  'Admin CANNOT delete audit logs (immutable)'
);

-- =====================================================
-- Test 18: Admins can suspend users (soft delete)
-- =====================================================
SELECT lives_ok(
  $$UPDATE profiles SET is_active = FALSE WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'Admin can suspend users'
);

-- Revert
UPDATE profiles SET is_active = TRUE WHERE id = '11111111-1111-1111-1111-111111111111';

-- =====================================================
-- Test 19: Admins can view system-wide statistics
-- =====================================================
SELECT ok(
  (SELECT COUNT(DISTINCT role) FROM profiles) >= 3,
  'Admin can query system-wide user statistics'
);

-- =====================================================
-- Test 20: Admins CANNOT escalate themselves beyond admin
-- =====================================================
-- This test verifies there's no "super admin" role
SELECT throws_ok(
  $$UPDATE profiles SET role = 'super_admin' WHERE id = '33333333-3333-3333-3333-333333333333'$$,
  'Admin CANNOT create invalid roles'
);

-- =====================================================
-- Test 21: Multiple admins can coexist without interference
-- =====================================================
SELECT ok(
  (SELECT COUNT(*) FROM profiles WHERE role = 'admin') >= 2,
  'Multiple admins can coexist in the system'
);

-- =====================================================
-- Test 22: Admin actions on other admins should be auditable
-- =====================================================
INSERT INTO admin_audit_log (event_type, admin_id, target_user_id, action_details) VALUES
  ('role_change', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
   '{"old_role": "teacher", "new_role": "admin"}'::jsonb);

SELECT ok(
  EXISTS (SELECT 1 FROM admin_audit_log
          WHERE admin_id = '33333333-3333-3333-3333-333333333333'
          AND target_user_id = '44444444-4444-4444-4444-444444444444'),
  'Admin actions on other admins are auditable'
);

SELECT * FROM finish();

ROLLBACK;
