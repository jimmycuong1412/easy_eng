-- Seed Data for English Learning Platform
-- Purpose: Initialize gem earning rules and test data

-- =====================================================
-- Gem Earning Rules (if not already seeded in 044)
-- =====================================================

-- Insert initial gem earning rules (idempotent)
INSERT INTO gem_earning_rules (activity_type, gem_reward, is_active, rate_limit, conditions) VALUES
  ('lesson_completion', 50, TRUE, '{"max_per_day": 3}'::JSONB, NULL),
  ('attendance_streak', 100, TRUE, '{"max_per_week": 1}'::JSONB, '{"min_streak": 3}'::JSONB),
  ('referral', 200, TRUE, '{"max_per_month": 5}'::JSONB, NULL),
  ('profile_completion', 100, TRUE, NULL, NULL),
  ('first_review', 50, TRUE, NULL, NULL),
  ('daily_login', 10, TRUE, '{"max_per_day": 1}'::JSONB, NULL),
  ('quiz_completion', 30, TRUE, '{"max_per_day": 5}'::JSONB, NULL),
  ('manual_award', 0, TRUE, NULL, NULL) -- Admin sets amount manually
ON CONFLICT (activity_type) DO UPDATE SET
  gem_reward = EXCLUDED.gem_reward,
  is_active = EXCLUDED.is_active,
  rate_limit = EXCLUDED.rate_limit,
  conditions = EXCLUDED.conditions,
  updated_at = NOW();

-- =====================================================
-- Test Data (Development/Staging Only)
-- =====================================================

-- Note: This section should only run in development/staging environments
-- Production should use real user data

-- Uncomment below for development seeding

/*
-- Create test users (if not exists)
INSERT INTO auth.users (id, email) VALUES
  ('test-student-1', 'student1@test.com'),
  ('test-student-2', 'student2@test.com'),
  ('test-teacher-1', 'teacher1@test.com'),
  ('test-admin-1', 'admin1@test.com')
ON CONFLICT (id) DO NOTHING;

-- Create test profiles
INSERT INTO profiles (id, role, display_name, email) VALUES
  ('test-student-1', 'student', 'Test Student 1', 'student1@test.com'),
  ('test-student-2', 'student', 'Test Student 2', 'student2@test.com'),
  ('test-teacher-1', 'teacher', 'Test Teacher 1', 'teacher1@test.com'),
  ('test-admin-1', 'admin', 'Test Admin 1', 'admin1@test.com')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name;

-- Create test classes
INSERT INTO classes (id, teacher_id, title, description, price, max_students, scheduled_at, duration_minutes, status) VALUES
  ('test-class-1', 'test-teacher-1', 'Introduction to English Grammar', 'Learn the basics', 20.00, 5, NOW() + INTERVAL '1 day', 60, 'published'),
  ('test-class-2', 'test-teacher-1', 'Advanced Conversation', 'Practice speaking', 25.00, 4, NOW() + INTERVAL '2 days', 60, 'published')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price;

-- Create test bookings
INSERT INTO bookings (student_id, class_id, payment_status, gems_used, final_price) VALUES
  ('test-student-1', 'test-class-1', 'confirmed', 0, 20.00),
  ('test-student-2', 'test-class-1', 'confirmed', 20, 10.00)
ON CONFLICT DO NOTHING;

-- Create test gem transactions
INSERT INTO gem_transactions (student_id, amount, transaction_type, reason) VALUES
  ('test-student-1', 100, 'earned', 'lesson_completion'),
  ('test-student-1', 50, 'earned', 'daily_login'),
  ('test-student-2', 200, 'earned', 'referral'),
  ('test-student-2', -20, 'spent', 'Class booking discount')
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- Initial Activity Tracking Examples (Optional)
-- =====================================================

-- Uncomment to seed example activity tracking

/*
INSERT INTO activity_tracking (student_id, activity_type, activity_metadata, gems_awarded) VALUES
  ('test-student-1', 'lesson_completion', '{"booking_id": "test-class-1", "quiz_score": 85}'::JSONB, 50),
  ('test-student-1', 'daily_login', '{}'::JSONB, 10),
  ('test-student-2', 'referral', '{"referred_user_id": "test-student-1"}'::JSONB, 200)
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- End of Seed Data
-- =====================================================

-- Log seeding completion
DO $$
BEGIN
  RAISE NOTICE 'Seed data applied successfully';
  RAISE NOTICE 'Gem earning rules: % active rules', (SELECT COUNT(*) FROM gem_earning_rules WHERE is_active = TRUE);
END $$;
