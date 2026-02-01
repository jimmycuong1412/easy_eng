-- Migration 044: Gem Rule Audit and Admin Audit Log
-- Purpose: Add comprehensive audit logging for gem rules and admin actions
-- Constitution Compliance: Principle VI (Virtual Currency System Integrity)

-- =====================================================
-- 1. Gem Earning Rules Table
-- =====================================================

CREATE TABLE IF NOT EXISTS gem_earning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL UNIQUE,
  gem_reward INTEGER NOT NULL CHECK (gem_reward >= 1 AND gem_reward <= 1000),
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  rate_limit JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on activity_type for fast lookups
CREATE INDEX IF NOT EXISTS idx_gem_earning_rules_activity_type
  ON gem_earning_rules(activity_type);

-- Add index on is_active for filtering active rules
CREATE INDEX IF NOT EXISTS idx_gem_earning_rules_is_active
  ON gem_earning_rules(is_active)
  WHERE is_active = TRUE;

-- Add comments
COMMENT ON TABLE gem_earning_rules IS 'Configurable rules for how students earn gems';
COMMENT ON COLUMN gem_earning_rules.activity_type IS 'Type of activity (lesson_completion, referral, etc.)';
COMMENT ON COLUMN gem_earning_rules.gem_reward IS 'Number of gems awarded (1-1000)';
COMMENT ON COLUMN gem_earning_rules.conditions IS 'Additional conditions as JSON (e.g., min_streak, required_level)';
COMMENT ON COLUMN gem_earning_rules.rate_limit IS 'Rate limiting config (max_per_day, max_per_week, max_per_month)';

-- =====================================================
-- 2. Admin Audit Log Table
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'gem_adjustment',
    'gem_rule_change',
    'gem_refund',
    'gem_fraud_detection',
    'role_change',
    'user_suspension',
    'booking_override',
    'system_config_change'
  )),
  admin_id UUID NOT NULL,
  target_user_id UUID,
  action_details JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- Foreign keys
  CONSTRAINT fk_admin_audit_log_admin
    FOREIGN KEY (admin_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_admin_audit_log_target
    FOREIGN KEY (target_user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_event_type
  ON admin_audit_log(event_type);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id
  ON admin_audit_log(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_id
  ON admin_audit_log(target_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_timestamp
  ON admin_audit_log(timestamp DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_timestamp
  ON admin_audit_log(admin_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_timestamp
  ON admin_audit_log(target_user_id, timestamp DESC);

-- Add comments
COMMENT ON TABLE admin_audit_log IS 'Comprehensive audit trail for all administrative actions';
COMMENT ON COLUMN admin_audit_log.event_type IS 'Type of admin action performed';
COMMENT ON COLUMN admin_audit_log.admin_id IS 'ID of admin who performed the action';
COMMENT ON COLUMN admin_audit_log.target_user_id IS 'ID of user affected by the action (if applicable)';
COMMENT ON COLUMN admin_audit_log.action_details IS 'Full details of the action as JSON';

-- =====================================================
-- 3. Row Level Security Policies
-- =====================================================

-- Enable RLS
ALTER TABLE gem_earning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Gem Earning Rules Policies
-- Allow all authenticated users to read active rules
CREATE POLICY "Users can view active gem earning rules"
  ON gem_earning_rules
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Only admins can view all rules (including inactive)
CREATE POLICY "Admins can view all gem earning rules"
  ON gem_earning_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert rules
CREATE POLICY "Admins can create gem earning rules"
  ON gem_earning_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update rules
CREATE POLICY "Admins can update gem earning rules"
  ON gem_earning_rules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete rules
CREATE POLICY "Admins can delete gem earning rules"
  ON gem_earning_rules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin Audit Log Policies
-- Only admins can read audit logs
CREATE POLICY "Admins can view all audit logs"
  ON admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only service role can insert audit logs (via backend)
CREATE POLICY "Service role can insert audit logs"
  ON admin_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- No updates or deletes allowed (audit logs are immutable)
-- No policies = no access

-- =====================================================
-- 4. Helper Functions
-- =====================================================

-- Function to get active gem rule for an activity type
CREATE OR REPLACE FUNCTION get_gem_reward_for_activity(
  p_activity_type TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward INTEGER;
BEGIN
  SELECT gem_reward INTO v_reward
  FROM gem_earning_rules
  WHERE activity_type = p_activity_type
  AND is_active = TRUE;

  RETURN COALESCE(v_reward, 0);
END;
$$;

COMMENT ON FUNCTION get_gem_reward_for_activity IS 'Get the gem reward amount for a specific activity type';

-- Function to check if user has exceeded rate limit for an activity
CREATE OR REPLACE FUNCTION check_gem_earning_rate_limit(
  p_student_id UUID,
  p_activity_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate_limit JSONB;
  v_max_per_day INTEGER;
  v_max_per_week INTEGER;
  v_max_per_month INTEGER;
  v_count_today INTEGER;
  v_count_week INTEGER;
  v_count_month INTEGER;
BEGIN
  -- Get rate limit config for this activity type
  SELECT rate_limit INTO v_rate_limit
  FROM gem_earning_rules
  WHERE activity_type = p_activity_type
  AND is_active = TRUE;

  -- If no rate limit, allow
  IF v_rate_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Extract limits
  v_max_per_day := (v_rate_limit->>'max_per_day')::INTEGER;
  v_max_per_week := (v_rate_limit->>'max_per_week')::INTEGER;
  v_max_per_month := (v_rate_limit->>'max_per_month')::INTEGER;

  -- Check daily limit
  IF v_max_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count_today
    FROM gem_transactions
    WHERE student_id = p_student_id
    AND transaction_type = 'earned'
    AND reason = p_activity_type
    AND created_at >= NOW() - INTERVAL '1 day';

    IF v_count_today >= v_max_per_day THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check weekly limit
  IF v_max_per_week IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count_week
    FROM gem_transactions
    WHERE student_id = p_student_id
    AND transaction_type = 'earned'
    AND reason = p_activity_type
    AND created_at >= NOW() - INTERVAL '7 days';

    IF v_count_week >= v_max_per_week THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check monthly limit
  IF v_max_per_month IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count_month
    FROM gem_transactions
    WHERE student_id = p_student_id
    AND transaction_type = 'earned'
    AND reason = p_activity_type
    AND created_at >= NOW() - INTERVAL '30 days';

    IF v_count_month >= v_max_per_month THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION check_gem_earning_rate_limit IS 'Check if student has exceeded rate limits for earning gems from a specific activity';

-- =====================================================
-- 5. Seed Default Gem Earning Rules
-- =====================================================

INSERT INTO gem_earning_rules (activity_type, gem_reward, is_active, rate_limit, conditions) VALUES
  ('lesson_completion', 50, TRUE, '{"max_per_day": 3}'::JSONB, NULL),
  ('attendance_streak', 100, TRUE, '{"max_per_week": 1}'::JSONB, '{"min_streak": 3}'::JSONB),
  ('referral', 200, TRUE, '{"max_per_month": 5}'::JSONB, NULL),
  ('profile_completion', 100, TRUE, NULL, NULL),
  ('first_review', 50, TRUE, NULL, NULL),
  ('daily_login', 10, TRUE, '{"max_per_day": 1}'::JSONB, NULL),
  ('quiz_completion', 30, TRUE, '{"max_per_day": 5}'::JSONB, NULL),
  ('manual_award', 0, TRUE, NULL, NULL) -- Admin sets amount manually
ON CONFLICT (activity_type) DO NOTHING;

-- =====================================================
-- 6. Triggers
-- =====================================================

-- Update updated_at timestamp on gem_earning_rules
CREATE OR REPLACE FUNCTION update_gem_earning_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gem_earning_rules_updated_at
  BEFORE UPDATE ON gem_earning_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_gem_earning_rules_updated_at();

-- =====================================================
-- 7. Grants
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON gem_earning_rules TO authenticated;
GRANT SELECT ON admin_audit_log TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON gem_earning_rules TO service_role;
GRANT ALL ON admin_audit_log TO service_role;
