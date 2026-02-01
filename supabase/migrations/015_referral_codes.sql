-- Migration 015: Referral System for Gem Bonuses
-- Purpose: Track referral codes and award gems for successful referrals

-- =====================================================
-- 1. Referral Codes Table
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER DEFAULT 0 CHECK (total_referrals >= 0),
  total_gems_earned INTEGER DEFAULT 0 CHECK (total_gems_earned >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_referral_code UNIQUE (student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_student
  ON referral_codes(student_id);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code
  ON referral_codes(referral_code)
  WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE referral_codes IS 'Student referral codes for gem earning bonuses';
COMMENT ON COLUMN referral_codes.referral_code IS 'Unique alphanumeric referral code (e.g., JOHN2024ABC)';

-- =====================================================
-- 2. Referrals Table (Track who referred whom)
-- =====================================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  gems_awarded_to_referrer INTEGER DEFAULT 0,
  referred_completed_first_class BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rewarded_at TIMESTAMPTZ,

  -- Prevent self-referral
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id),
  -- Prevent duplicate referrals
  CONSTRAINT unique_referred_user UNIQUE (referred_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON referrals(referrer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referred
  ON referrals(referred_id);

CREATE INDEX IF NOT EXISTS idx_referrals_pending_reward
  ON referrals(referrer_id)
  WHERE gems_awarded_to_referrer = 0 AND referred_completed_first_class = TRUE;

-- Comments
COMMENT ON TABLE referrals IS 'Tracks referral relationships and rewards';
COMMENT ON COLUMN referrals.referred_completed_first_class IS 'Whether referred user has completed their first class (triggers reward)';

-- =====================================================
-- 3. Function: Generate Unique Referral Code
-- =====================================================

CREATE OR REPLACE FUNCTION generate_unique_referral_code(
  p_student_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_counter INTEGER := 0;
  v_student_name TEXT;
BEGIN
  -- Get student's first name or email prefix
  SELECT COALESCE(
    SPLIT_PART(display_name, ' ', 1),
    SPLIT_PART(email, '@', 1)
  ) INTO v_student_name
  FROM profiles
  WHERE id = p_student_id;

  -- Generate code: FIRSTNAME + RANDOM6DIGITS
  LOOP
    v_code := UPPER(SUBSTRING(v_student_name, 1, 6)) ||
              LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM referral_codes WHERE referral_code = v_code) THEN
      EXIT;
    END IF;

    v_counter := v_counter + 1;
    IF v_counter > 10 THEN
      -- Fallback: pure random code
      v_code := 'REF' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
      EXIT;
    END IF;
  END LOOP;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION generate_unique_referral_code IS 'Generates a unique alphanumeric referral code for a student';

-- =====================================================
-- 4. Function: Create Referral Code for Student
-- =====================================================

CREATE OR REPLACE FUNCTION create_referral_code_for_student(
  p_student_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_existing_code TEXT;
BEGIN
  -- Check if student already has a code
  SELECT referral_code INTO v_existing_code
  FROM referral_codes
  WHERE student_id = p_student_id;

  IF v_existing_code IS NOT NULL THEN
    RETURN v_existing_code;
  END IF;

  -- Generate new code
  v_code := generate_unique_referral_code(p_student_id);

  -- Insert referral code
  INSERT INTO referral_codes (student_id, referral_code)
  VALUES (p_student_id, v_code);

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION create_referral_code_for_student IS 'Creates or returns existing referral code for a student';

-- =====================================================
-- 5. Function: Process Referral
-- =====================================================

CREATE OR REPLACE FUNCTION process_referral(
  p_referral_code TEXT,
  p_referred_student_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  referrer_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_referred_role TEXT;
BEGIN
  -- Validate referral code exists and is active
  SELECT student_id INTO v_referrer_id
  FROM referral_codes
  WHERE referral_code = p_referral_code
  AND is_active = TRUE;

  IF v_referrer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid or inactive referral code', NULL::UUID;
    RETURN;
  END IF;

  -- Check that referred user is a student
  SELECT role INTO v_referred_role
  FROM profiles
  WHERE id = p_referred_student_id;

  IF v_referred_role != 'student' THEN
    RETURN QUERY SELECT FALSE, 'Only students can be referred', NULL::UUID;
    RETURN;
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_referred_student_id THEN
    RETURN QUERY SELECT FALSE, 'Cannot refer yourself', NULL::UUID;
    RETURN;
  END IF;

  -- Check if user was already referred
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_referred_student_id) THEN
    RETURN QUERY SELECT FALSE, 'User was already referred by someone else', NULL::UUID;
    RETURN;
  END IF;

  -- Create referral record (gems not awarded yet - wait for first class completion)
  INSERT INTO referrals (referrer_id, referred_id, referral_code, gems_awarded_to_referrer)
  VALUES (v_referrer_id, p_referred_student_id, p_referral_code, 0);

  -- Update referral code stats
  UPDATE referral_codes
  SET total_referrals = total_referrals + 1,
      updated_at = NOW()
  WHERE student_id = v_referrer_id;

  RETURN QUERY SELECT TRUE, 'Referral processed successfully. Reward will be granted when referred user completes their first class.', v_referrer_id;
END;
$$;

COMMENT ON FUNCTION process_referral IS 'Processes a referral code when a new user signs up';

-- =====================================================
-- 6. Function: Award Referral Gems (after first class)
-- =====================================================

CREATE OR REPLACE FUNCTION award_referral_gems(
  p_referred_student_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  gems_awarded INTEGER,
  referrer_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral RECORD;
  v_gems_result RECORD;
BEGIN
  -- Get referral record
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_referred_student_id
  AND gems_awarded_to_referrer = 0
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID;
    RETURN;
  END IF;

  -- Mark referred user as having completed first class
  UPDATE referrals
  SET referred_completed_first_class = TRUE,
      rewarded_at = NOW()
  WHERE id = v_referral.id;

  -- Award gems to referrer
  SELECT * INTO v_gems_result
  FROM award_gems_for_activity(
    v_referral.referrer_id,
    'referral',
    jsonb_build_object(
      'referred_user_id', p_referred_student_id,
      'referral_code', v_referral.referral_code
    )
  );

  IF v_gems_result.success THEN
    -- Update referral record with gems awarded
    UPDATE referrals
    SET gems_awarded_to_referrer = v_gems_result.gems_awarded
    WHERE id = v_referral.id;

    -- Update referral code stats
    UPDATE referral_codes
    SET total_gems_earned = total_gems_earned + v_gems_result.gems_awarded,
        updated_at = NOW()
    WHERE student_id = v_referral.referrer_id;

    RETURN QUERY SELECT TRUE, v_gems_result.gems_awarded, v_referral.referrer_id;
  ELSE
    RETURN QUERY SELECT FALSE, 0, v_referral.referrer_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION award_referral_gems IS 'Awards gems to referrer when referred student completes their first class';

-- =====================================================
-- 7. Trigger: Award Referral Gems on First Class Completion
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_referral_reward_on_first_class()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_first_class BOOLEAN;
  v_referral_result RECORD;
BEGIN
  -- Only process if lesson was just completed
  IF NEW.lesson_status = 'completed' AND (OLD.lesson_status IS NULL OR OLD.lesson_status != 'completed') THEN
    -- Check if this is the student's first completed class
    SELECT COUNT(*) = 1 INTO v_is_first_class
    FROM bookings
    WHERE student_id = NEW.student_id
    AND lesson_status = 'completed';

    IF v_is_first_class THEN
      -- Award referral gems to whoever referred this student
      SELECT * INTO v_referral_result
      FROM award_referral_gems(NEW.student_id);

      IF v_referral_result.success THEN
        RAISE NOTICE 'Awarded % gems to referrer % for student % completing first class',
          v_referral_result.gems_awarded, v_referral_result.referrer_id, NEW.student_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_referral_reward_on_completion ON bookings;
CREATE TRIGGER trigger_referral_reward_on_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.lesson_status = 'completed')
  EXECUTE FUNCTION trigger_referral_reward_on_first_class();

-- =====================================================
-- 8. RLS Policies
-- =====================================================

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Students can view their own referral code
CREATE POLICY "Students can view own referral code"
  ON referral_codes
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Admins can view all referral codes
CREATE POLICY "Admins can view all referral codes"
  ON referral_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students can view referrals they made
CREATE POLICY "Students can view own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role can manage all
CREATE POLICY "Service role can manage referral codes"
  ON referral_codes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role can manage referrals"
  ON referrals FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- =====================================================
-- 9. Grants
-- =====================================================

GRANT SELECT ON referral_codes TO authenticated;
GRANT SELECT ON referrals TO authenticated;
GRANT ALL ON referral_codes, referrals TO service_role;

-- =====================================================
-- End of Migration 015
-- =====================================================
