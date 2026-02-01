-- Migration 011: Activity Rules and Tracking for Gem Earning Automation
-- Purpose: Support automatic gem earning based on student activities
-- Relates to: gem_earning_rules (044) for configuration

-- =====================================================
-- 1. Activity Tracking Table
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_metadata JSONB DEFAULT '{}',
  gems_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign key to gem transaction if gems were awarded
  gem_transaction_id UUID REFERENCES gem_transactions(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_tracking_student
  ON activity_tracking(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_tracking_type
  ON activity_tracking(activity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_tracking_student_type
  ON activity_tracking(student_id, activity_type, created_at DESC);

-- Comments
COMMENT ON TABLE activity_tracking IS 'Tracks all student activities that can earn gems';
COMMENT ON COLUMN activity_tracking.activity_type IS 'Type of activity (matches gem_earning_rules.activity_type)';
COMMENT ON COLUMN activity_tracking.activity_metadata IS 'Additional context (e.g., booking_id, quiz_score)';
COMMENT ON COLUMN activity_tracking.gems_awarded IS 'Number of gems awarded for this activity (0 if not eligible)';

-- =====================================================
-- 2. Helper Function: Check if Activity Qualifies for Gems
-- =====================================================

CREATE OR REPLACE FUNCTION check_activity_qualifies(
  p_student_id UUID,
  p_activity_type TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE (
  qualifies BOOLEAN,
  gem_reward INTEGER,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule RECORD;
  v_rate_limit_passed BOOLEAN;
BEGIN
  -- Get the gem earning rule for this activity type
  SELECT * INTO v_rule
  FROM gem_earning_rules
  WHERE activity_type = p_activity_type
  AND is_active = TRUE;

  -- If no active rule exists, activity doesn't qualify
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'No active rule for this activity type';
    RETURN;
  END IF;

  -- Check rate limits using existing function
  v_rate_limit_passed := check_gem_earning_rate_limit(p_student_id, p_activity_type);

  IF NOT v_rate_limit_passed THEN
    RETURN QUERY SELECT FALSE, 0, 'Rate limit exceeded';
    RETURN;
  END IF;

  -- Check if conditions are met (if any)
  -- TODO: Implement condition checking based on v_rule.conditions and p_metadata
  -- For now, assume all conditions pass

  -- Activity qualifies!
  RETURN QUERY SELECT TRUE, v_rule.gem_reward, 'Activity qualifies for reward';
END;
$$;

COMMENT ON FUNCTION check_activity_qualifies IS 'Checks if an activity qualifies for gem rewards based on rules and rate limits';

-- =====================================================
-- 3. Function: Award Gems for Activity
-- =====================================================

CREATE OR REPLACE FUNCTION award_gems_for_activity(
  p_student_id UUID,
  p_activity_type TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE (
  success BOOLEAN,
  gems_awarded INTEGER,
  transaction_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qualifies BOOLEAN;
  v_gem_reward INTEGER;
  v_reason TEXT;
  v_transaction_id UUID;
  v_activity_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check if activity qualifies
  SELECT * INTO v_qualifies, v_gem_reward, v_reason
  FROM check_activity_qualifies(p_student_id, p_activity_type, p_metadata);

  IF NOT v_qualifies THEN
    -- Log the activity but don't award gems
    INSERT INTO activity_tracking (student_id, activity_type, activity_metadata, gems_awarded)
    VALUES (p_student_id, p_activity_type, p_metadata, 0)
    RETURNING id INTO v_activity_id;

    RETURN QUERY SELECT FALSE, 0, NULL::UUID, v_reason;
    RETURN;
  END IF;

  -- Get current balance
  SELECT COALESCE(get_student_gem_balance(p_student_id), 0) INTO v_current_balance;
  v_new_balance := v_current_balance + v_gem_reward;

  -- Check balance cap (10,000 gems max from GemRuleValidation.ts)
  IF v_new_balance > 10000 THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID, 'Would exceed maximum gem balance of 10,000';
    RETURN;
  END IF;

  -- Create gem transaction
  INSERT INTO gem_transactions (
    student_id,
    amount,
    transaction_type,
    reason,
    metadata
  ) VALUES (
    p_student_id,
    v_gem_reward,
    'earned',
    p_activity_type,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  -- Log the activity with gem award
  INSERT INTO activity_tracking (
    student_id,
    activity_type,
    activity_metadata,
    gems_awarded,
    gem_transaction_id
  ) VALUES (
    p_student_id,
    p_activity_type,
    p_metadata,
    v_gem_reward,
    v_transaction_id
  )
  RETURNING id INTO v_activity_id;

  RETURN QUERY SELECT
    TRUE,
    v_gem_reward,
    v_transaction_id,
    format('Awarded %s gems for %s', v_gem_reward, p_activity_type);
END;
$$;

COMMENT ON FUNCTION award_gems_for_activity IS 'Awards gems to a student for completing an activity, respecting rules and rate limits';

-- =====================================================
-- 4. RLS Policies
-- =====================================================

ALTER TABLE activity_tracking ENABLE ROW LEVEL SECURITY;

-- Students can only view their own activity history
CREATE POLICY "Students can view own activity history"
  ON activity_tracking
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only system can insert activity tracking (via Edge Functions)
CREATE POLICY "Service role can insert activity tracking"
  ON activity_tracking
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- No updates or deletes allowed (immutable log)

-- =====================================================
-- 5. Grants
-- =====================================================

GRANT SELECT ON activity_tracking TO authenticated;
GRANT ALL ON activity_tracking TO service_role;
