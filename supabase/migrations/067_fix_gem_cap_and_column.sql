-- Migration 067: Fix gem balance cap enforcement and student_id/user_id column inconsistency
-- Depends on: 066 (adds 'earned' enum value and 'reason' column)
--
-- Problems fixed:
-- 1. award-class-rewards inserted directly into gem_transactions bypassing the cap check
--    → Add a BEFORE INSERT trigger that enforces the 10,000 gem cap on positive amounts
-- 2. analytics_gem_circulation and analytics_gem_balances views used student_id
--    instead of user_id, causing silent query failures
-- 3. gems_expiring_soon view and its index used student_id
-- 4. Unified cap at 10,000 (matches process_gem_activity DB function and GemRuleValidation.ts)

-- ============================================================================
-- 1. Fix analytics_gem_circulation view (student_id → user_id)
-- ============================================================================

CREATE OR REPLACE VIEW public.analytics_gem_circulation AS
SELECT
  DATE(created_at) as date,
  activity_type,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as gems_minted,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as gems_burned,
  SUM(amount) as net_gems,
  COUNT(DISTINCT user_id) as unique_students
FROM public.gem_transactions
GROUP BY DATE(created_at), activity_type
ORDER BY date DESC, activity_type;

COMMENT ON VIEW public.analytics_gem_circulation IS 'Daily Gem flow by activity type (minting vs burning)';

-- ============================================================================
-- 2. Fix analytics_gem_balances view (student_id → user_id join)
-- ============================================================================

CREATE OR REPLACE VIEW public.analytics_gem_balances AS
SELECT
  p.id as student_id,
  p.full_name,
  p.email,
  COALESCE(SUM(gt.amount), 0) as current_balance,
  COUNT(gt.id) as total_transactions,
  MAX(gt.created_at) as last_transaction_date,
  CASE
    WHEN COALESCE(SUM(gt.amount), 0) = 0 THEN 'empty'
    WHEN COALESCE(SUM(gt.amount), 0) < 50 THEN 'low'
    WHEN COALESCE(SUM(gt.amount), 0) < 200 THEN 'medium'
    ELSE 'high'
  END as balance_level
FROM public.profiles p
LEFT JOIN public.gem_transactions gt ON p.id = gt.user_id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.email
ORDER BY current_balance DESC;

COMMENT ON VIEW public.analytics_gem_balances IS 'Current Gem balance for each student with categorization';

-- ============================================================================
-- 3. Fix gems_expiring_soon view (student_id → user_id)
-- ============================================================================

CREATE OR REPLACE VIEW gems_expiring_soon AS
SELECT
  user_id,
  SUM(amount) as expiring_gems,
  MIN(expires_at) as earliest_expiration
FROM gem_transactions
WHERE transaction_type = 'earned'
  AND expired = FALSE
  AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
GROUP BY user_id;

-- Fix the index on gem_transactions that referenced nonexistent student_id column
DROP INDEX IF EXISTS idx_gem_transactions_expiration;
CREATE INDEX IF NOT EXISTS idx_gem_transactions_expiration
  ON gem_transactions(user_id, expires_at, expired)
  WHERE expires_at IS NOT NULL AND expired = FALSE;

-- ============================================================================
-- 4. Fix award_gems_for_activity DB function — was inserting student_id but
--    gem_transactions canonical column is user_id (migration 006).
--    Also: activity_tracking uses student_id which is correct for that table.
-- ============================================================================

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
  SELECT * INTO v_qualifies, v_gem_reward, v_reason
  FROM check_activity_qualifies(p_student_id, p_activity_type, p_metadata);

  IF NOT v_qualifies THEN
    INSERT INTO activity_tracking (student_id, activity_type, activity_metadata, gems_awarded)
    VALUES (p_student_id, p_activity_type, p_metadata, 0)
    RETURNING id INTO v_activity_id;
    RETURN QUERY SELECT FALSE, 0, NULL::UUID, v_reason;
    RETURN;
  END IF;

  SELECT COALESCE(get_gems_balance(p_student_id), 0) INTO v_current_balance;
  v_new_balance := v_current_balance + v_gem_reward;

  IF v_new_balance > 10000 THEN
    RETURN QUERY SELECT FALSE, 0, NULL::UUID, 'Would exceed maximum gem balance of 10,000';
    RETURN;
  END IF;

  -- Use user_id (canonical column on gem_transactions)
  -- transaction_type 'earned' added to enum in migration 067
  INSERT INTO gem_transactions (
    user_id,
    amount,
    transaction_type,
    reason,
    description,
    metadata
  ) VALUES (
    p_student_id,
    v_gem_reward,
    'earned',
    p_activity_type,
    format('Earned %s gems for %s', v_gem_reward, p_activity_type),
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

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
  );

  RETURN QUERY SELECT
    TRUE,
    v_gem_reward,
    v_transaction_id,
    format('Awarded %s gems for %s', v_gem_reward, p_activity_type);
END;
$$;

COMMENT ON FUNCTION award_gems_for_activity IS
  'Awards gems for an activity. Checks eligibility, rate limits, and 10,000 cap. '
  'Inserts into gem_transactions using user_id (canonical column).';

-- ============================================================================
-- 5. Add cap enforcement trigger on gem_transactions for positive (earning) amounts
--    Safety net: catches any direct inserts that bypass award_gems_for_activity.
--    Single source of truth: 10,000 gems (matches award_gems_for_activity and GemRuleValidation.ts)
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_gem_balance_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Only apply cap to earning transactions (positive amounts)
  IF NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  v_current_balance := COALESCE(get_gems_balance(NEW.user_id), 0);
  v_new_balance := v_current_balance + NEW.amount;

  IF v_new_balance > 10000 THEN
    RAISE EXCEPTION
      'Gem balance cap exceeded. Current: %, Attempting to add: %, Would result in: % (cap: 10000)',
      v_current_balance, NEW.amount, v_new_balance;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_gem_cap_before_insert ON gem_transactions;
CREATE TRIGGER enforce_gem_cap_before_insert
  BEFORE INSERT ON gem_transactions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_gem_balance_cap();

COMMENT ON FUNCTION enforce_gem_balance_cap IS
  'Enforces 10,000 gem balance cap on all earning inserts regardless of caller. '
  'Unified cap value matching award_gems_for_activity() and GemRuleValidation.ts.';

-- ============================================================================
-- 6. Seed gem_earning_rules for booking_cancellation_refund activity type
--    award_gems_for_activity calls check_activity_qualifies which requires a rule.
--    Refunds must always pass — set a high daily limit and no conditions.
--    gem_reward=0 here because refund amount is passed as p_metadata.gems_refunded;
--    award_gems_for_activity uses the rule's gem_reward, so we need a sentinel rule
--    OR we bypass check_activity_qualifies for refund types.
--    Simpler: insert a real rule with a representative amount (the actual amount
--    is checked by the caller; refunds call rpc directly with the right amount).
--
--    ACTUALLY: award_gems_for_activity uses gem_earning_rules.gem_reward as the
--    award amount — it ignores the caller's requested amount. For refunds the
--    amount varies per booking. So refund-gems should NOT go through
--    award_gems_for_activity for the gem amount — instead insert directly but
--    still enforce the cap trigger. Revert refund-gems to direct insert.
--    (See edge function fix in refund-gems/index.ts)
-- ============================================================================
