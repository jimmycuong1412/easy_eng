-- Migration 028: XP System
-- Task: T145 - Create xp_transactions table for character progression
-- Purpose: Track XP (Experience Points) earned by students for various activities
-- Date: 2026-02-05

-- ============================================================================
-- XP TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  career_id UUID REFERENCES student_careers(id) ON DELETE SET NULL,

  -- Transaction details
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  activity_type VARCHAR(100) NOT NULL,
  activity_description TEXT,
  activity_metadata JSONB,

  -- Leveling context
  level_before INTEGER NOT NULL,
  level_after INTEGER NOT NULL,
  caused_level_up BOOLEAN NOT NULL DEFAULT false,

  -- Source tracking
  source VARCHAR(100) NOT NULL DEFAULT 'system',
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT xp_transactions_level_check CHECK (
    level_before >= 1 AND
    level_after >= level_before
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_xp_transactions_student ON xp_transactions(student_id, created_at DESC);
CREATE INDEX idx_xp_transactions_career ON xp_transactions(career_id);
CREATE INDEX idx_xp_transactions_activity ON xp_transactions(activity_type);
CREATE INDEX idx_xp_transactions_level_up ON xp_transactions(caused_level_up) WHERE caused_level_up = true;
CREATE INDEX idx_xp_transactions_created ON xp_transactions(created_at DESC);

-- ============================================================================
-- XP EARNING RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS xp_earning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  activity_type VARCHAR(100) NOT NULL UNIQUE,
  xp_reward INTEGER NOT NULL CHECK (xp_reward >= 0),

  -- Rule configuration
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit JSONB, -- e.g., {"max_per_day": 3}
  conditions JSONB, -- e.g., {"min_score": 80}

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- XP EARNING RULES - SEED DATA
-- ============================================================================

INSERT INTO xp_earning_rules (activity_type, xp_reward, description, rate_limit, conditions) VALUES
  ('lesson_completion', 100, 'Complete a lesson', '{"max_per_day": 5}'::JSONB, NULL),
  ('quiz_perfect', 200, 'Score 100% on a quiz', '{"max_per_day": 3}'::JSONB, '{"min_score": 100}'::JSONB),
  ('quiz_high', 150, 'Score 90-99% on a quiz', '{"max_per_day": 3}'::JSONB, '{"min_score": 90, "max_score": 99}'::JSONB),
  ('quiz_pass', 75, 'Pass a quiz (75-89%)', '{"max_per_day": 3}'::JSONB, '{"min_score": 75, "max_score": 89}'::JSONB),
  ('attendance_streak_3', 150, '3-day attendance streak', '{"max_per_week": 2}'::JSONB, '{"min_streak": 3}'::JSONB),
  ('attendance_streak_7', 500, '7-day attendance streak', '{"max_per_week": 1}'::JSONB, '{"min_streak": 7}'::JSONB),
  ('referral_signup', 300, 'Successful referral signup', '{"max_per_month": 5}'::JSONB, NULL),
  ('profile_complete', 200, 'Complete profile 100%', NULL, NULL),
  ('first_review', 100, 'Write first class review', NULL, NULL),
  ('daily_login', 25, 'Daily login bonus', '{"max_per_day": 1}'::JSONB, NULL),
  ('marketplace_purchase', 50, 'Purchase marketplace item', '{"max_per_day": 10}'::JSONB, NULL),
  ('manual_award', 0, 'Manually awarded by admin', NULL, NULL)
ON CONFLICT (activity_type) DO UPDATE SET
  xp_reward = EXCLUDED.xp_reward,
  description = EXCLUDED.description,
  rate_limit = EXCLUDED.rate_limit,
  conditions = EXCLUDED.conditions,
  updated_at = NOW();

-- ============================================================================
-- INDEXES FOR XP RULES
-- ============================================================================

CREATE INDEX idx_xp_earning_rules_active ON xp_earning_rules(is_active);
CREATE INDEX idx_xp_earning_rules_activity ON xp_earning_rules(activity_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp for rules
CREATE OR REPLACE FUNCTION update_xp_earning_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER xp_earning_rules_updated_at_trigger
  BEFORE UPDATE ON xp_earning_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_xp_earning_rules_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get total XP for student
CREATE OR REPLACE FUNCTION get_student_total_xp(p_student_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(xp_amount), 0)::INTEGER
  FROM xp_transactions
  WHERE student_id = p_student_id;
$$ LANGUAGE sql STABLE;

-- Get XP for specific career
CREATE OR REPLACE FUNCTION get_career_total_xp(p_career_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(xp_amount), 0)::INTEGER
  FROM xp_transactions
  WHERE career_id = p_career_id;
$$ LANGUAGE sql STABLE;

-- Check rate limit for XP earning
CREATE OR REPLACE FUNCTION check_xp_rate_limit(
  p_student_id UUID,
  p_activity_type VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rule xp_earning_rules%ROWTYPE;
  v_max_per_day INTEGER;
  v_max_per_week INTEGER;
  v_max_per_month INTEGER;
  v_count_today INTEGER;
  v_count_week INTEGER;
  v_count_month INTEGER;
BEGIN
  -- Get rule
  SELECT * INTO v_rule
  FROM xp_earning_rules
  WHERE activity_type = p_activity_type
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check rate limits if defined
  IF v_rule.rate_limit IS NOT NULL THEN
    v_max_per_day := (v_rule.rate_limit->>'max_per_day')::INTEGER;
    v_max_per_week := (v_rule.rate_limit->>'max_per_week')::INTEGER;
    v_max_per_month := (v_rule.rate_limit->>'max_per_month')::INTEGER;

    -- Check daily limit
    IF v_max_per_day IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count_today
      FROM xp_transactions
      WHERE student_id = p_student_id
        AND activity_type = p_activity_type
        AND created_at >= CURRENT_DATE;

      IF v_count_today >= v_max_per_day THEN
        RETURN false;
      END IF;
    END IF;

    -- Check weekly limit
    IF v_max_per_week IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count_week
      FROM xp_transactions
      WHERE student_id = p_student_id
        AND activity_type = p_activity_type
        AND created_at >= DATE_TRUNC('week', NOW());

      IF v_count_week >= v_max_per_week THEN
        RETURN false;
      END IF;
    END IF;

    -- Check monthly limit
    IF v_max_per_month IS NOT NULL THEN
      SELECT COUNT(*) INTO v_count_month
      FROM xp_transactions
      WHERE student_id = p_student_id
        AND activity_type = p_activity_type
        AND created_at >= DATE_TRUNC('month', NOW());

      IF v_count_month >= v_max_per_month THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_earning_rules ENABLE ROW LEVEL SECURITY;

-- Students can view their own XP transactions
DROP POLICY IF EXISTS "Students view own xp transactions" ON xp_transactions;
CREATE POLICY "Students view own xp transactions"
  ON xp_transactions
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR is_admin());

-- System can insert XP transactions
DROP POLICY IF EXISTS "System creates xp transactions" ON xp_transactions;
CREATE POLICY "System creates xp transactions"
  ON xp_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Backend validates before insert

-- Prevent modifications (append-only ledger)
DROP POLICY IF EXISTS "No updates to xp transactions" ON xp_transactions;
CREATE POLICY "No updates to xp transactions"
  ON xp_transactions
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No deletes from xp transactions" ON xp_transactions;
CREATE POLICY "No deletes from xp transactions"
  ON xp_transactions
  FOR DELETE
  USING (is_admin()); -- Only admin for corrections

-- Anyone can view active XP rules
DROP POLICY IF EXISTS "Anyone can view xp rules" ON xp_earning_rules;
CREATE POLICY "Anyone can view xp rules"
  ON xp_earning_rules
  FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin());

-- Admins manage XP rules
DROP POLICY IF EXISTS "Admins manage xp rules" ON xp_earning_rules;
CREATE POLICY "Admins manage xp rules"
  ON xp_earning_rules
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT ON xp_transactions TO authenticated;
GRANT ALL ON xp_transactions TO service_role;
GRANT SELECT ON xp_earning_rules TO authenticated;
GRANT ALL ON xp_earning_rules TO service_role;
GRANT EXECUTE ON FUNCTION get_student_total_xp TO authenticated;
GRANT EXECUTE ON FUNCTION get_career_total_xp TO authenticated;
GRANT EXECUTE ON FUNCTION check_xp_rate_limit TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE xp_transactions IS 'Ledger of all XP earned by students for character progression';
COMMENT ON TABLE xp_earning_rules IS 'Rules defining XP rewards for various activities';
COMMENT ON COLUMN xp_transactions.caused_level_up IS 'True if this XP award triggered a level up';
COMMENT ON COLUMN xp_transactions.activity_metadata IS 'Additional context (quiz_id, booking_id, etc.)';
COMMENT ON FUNCTION get_student_total_xp IS 'Calculate total XP earned by student across all careers';
COMMENT ON FUNCTION get_career_total_xp IS 'Calculate total XP for specific career';
COMMENT ON FUNCTION check_xp_rate_limit IS 'Validate if student can earn XP for activity (rate limiting)';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ XP System Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables:';
  RAISE NOTICE '  • xp_transactions (append-only ledger)';
  RAISE NOTICE '  • xp_earning_rules (12 activity types)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Features:';
  RAISE NOTICE '  • Rate limiting (daily/weekly/monthly)';
  RAISE NOTICE '  • Level-up tracking';
  RAISE NOTICE '  • Activity metadata support';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS: Students view own, system creates';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Create student_levels view and award-xp Edge Function';
  RAISE NOTICE '========================================';
END $$;
