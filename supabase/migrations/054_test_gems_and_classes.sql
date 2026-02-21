-- Migration: 054_test_gems_and_classes.sql
-- Purpose: Add test gems to student accounts and update class durations to 25 minutes

-- ============================================================
-- 1. Award gems to ALL student accounts (test/dev purpose)
--    Uses INSERT ... SELECT so it works for any existing student.
--    Safe to re-run (idempotency via unique description check).
-- ============================================================

INSERT INTO gem_transactions (user_id, amount, transaction_type, description, metadata)
SELECT
  p.id,
  2000,
  'admin_grant',
  'Test gems — development seed',
  '{"source": "dev_seed", "migration": "054"}'::jsonb
FROM profiles p
WHERE p.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM gem_transactions gt
    WHERE gt.user_id = p.id
      AND gt.description = 'Test gems — development seed'
  );

-- ============================================================
-- 2. Update existing class duration from 60 → 25 minutes
--    Only updates classes that still have the old 60-minute default.
-- ============================================================

UPDATE classes
SET
  duration_minutes = 25,
  updated_at       = NOW()
WHERE duration_minutes = 60;

-- ============================================================
-- 3. Update seed test classes to 25 minutes (covered by #2,
--    but also update the end_time if the classes table has one)
-- ============================================================

-- Also update end_time to match new duration where end_time exists
-- (start_time + 25 minutes)
UPDATE classes
SET
  end_time   = start_time + INTERVAL '25 minutes',
  updated_at = NOW()
WHERE duration_minutes = 25
  AND end_time IS NOT NULL
  AND end_time != start_time + INTERVAL '25 minutes';
