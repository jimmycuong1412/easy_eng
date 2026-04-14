-- Migration 066: Fix gem_transaction_type enum and gem_transactions schema
--
-- Problems fixed:
-- 1. 'earned' was never added to gem_transaction_type enum — every lesson/activity/refund
--    gem insert has been failing with "invalid input value for enum" since migration 011
-- 2. 'gem_purchase_refund' was in the enum but blocked by the positive_earned CHECK constraint
--    (it was only allowed as a positive earning type implicitly but not listed)
-- 3. gem_transactions has no 'reason' column — refund-gems and award functions write to it,
--    useGemNotifications reads from it. Add 'reason' as alias-friendly TEXT column.
-- 4. positive_earned CHECK constraint updated to allow 'earned' for positive amounts
--    and 'gem_purchase_refund' for positive amounts (refunds are credits back to user)

-- ============================================================================
-- 1. Add missing enum values
-- ============================================================================

ALTER TYPE gem_transaction_type ADD VALUE IF NOT EXISTS 'earned';
ALTER TYPE gem_transaction_type ADD VALUE IF NOT EXISTS 'spent';
ALTER TYPE gem_transaction_type ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE gem_transaction_type ADD VALUE IF NOT EXISTS 'booking_cancellation_refund';

-- ============================================================================
-- 2. Add 'reason' column to gem_transactions
--    useGemNotifications reads transaction.reason for the toast display label.
--    Many functions write it. Previously silently ignored (extra key in JSON body
--    or JSONB metadata) — now a real column.
-- ============================================================================

ALTER TABLE gem_transactions
  ADD COLUMN IF NOT EXISTS reason TEXT;

COMMENT ON COLUMN gem_transactions.reason IS
  'Human-readable reason/activity type for this transaction (e.g. lesson_completion, booking_cancellation_refund). '
  'Read by useGemNotifications hook for toast display.';

-- ============================================================================
-- 3. Update positive_earned CHECK constraint to allow 'earned', 'refunded',
--    'booking_cancellation_refund', and 'gem_purchase_refund' for positive amounts,
--    and 'spent' for negative amounts.
--    PostgreSQL requires DROP + re-ADD to modify a CHECK constraint.
-- ============================================================================

ALTER TABLE gem_transactions DROP CONSTRAINT IF EXISTS positive_earned;

ALTER TABLE gem_transactions ADD CONSTRAINT positive_earned CHECK (
  (amount > 0 AND transaction_type IN (
    'first_booking_bonus',
    'class_completion',
    'referral_bonus',
    'daily_login',
    'quiz_completion',
    'homework_submission',
    'admin_grant',
    'gem_purchase',
    'gem_purchase_refund',
    'booking_cancellation_refund',
    'earned',
    'refunded'
  )) OR (amount < 0 AND transaction_type IN (
    'booking_discount',
    'booking_payment',
    'admin_deduction',
    'spent'
  ))
);

-- ============================================================================
-- 4. Fix set_gem_expiration trigger — was checking transaction_type = 'earned'
--    which never matched (enum value didn't exist). Now also covers class_completion
--    and other earning types so purchased gems don't accidentally expire.
-- ============================================================================

CREATE OR REPLACE FUNCTION set_gem_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only earned-activity gems expire (not purchased gems)
  IF NEW.transaction_type IN (
    'earned',
    'class_completion',
    'first_booking_bonus',
    'referral_bonus',
    'daily_login',
    'quiz_completion',
    'homework_submission',
    'booking_cancellation_refund',
    'refunded'
  ) THEN
    NEW.expires_at := NOW() + INTERVAL '180 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Fix expire_gems() function — same 'earned' literal issue
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_gems()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE gem_transactions
  SET expired = TRUE
  WHERE transaction_type IN (
    'earned',
    'class_completion',
    'first_booking_bonus',
    'referral_bonus',
    'daily_login',
    'quiz_completion',
    'homework_submission',
    'booking_cancellation_refund',
    'refunded'
  )
    AND expires_at < NOW()
    AND expired = FALSE;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Fix gems_expiring_soon view (same 'earned' literal — was always empty)
-- ============================================================================

CREATE OR REPLACE VIEW gems_expiring_soon AS
SELECT
  user_id,
  SUM(amount) as expiring_gems,
  MIN(expires_at) as earliest_expiration
FROM gem_transactions
WHERE transaction_type IN (
    'earned',
    'class_completion',
    'first_booking_bonus',
    'referral_bonus',
    'daily_login',
    'quiz_completion',
    'homework_submission',
    'booking_cancellation_refund',
    'refunded'
  )
  AND expired = FALSE
  AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
GROUP BY user_id;

-- ============================================================================
-- 7. Add get_student_gem_balance as alias for get_gems_balance
--    useGemNotifications hook called the nonexistent get_student_gem_balance RPC.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_student_gem_balance(student_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT get_gems_balance(student_id);
$$;

GRANT EXECUTE ON FUNCTION get_student_gem_balance TO authenticated;

COMMENT ON FUNCTION get_student_gem_balance IS
  'Alias for get_gems_balance. Accepts student_id parameter name for compatibility.';

-- ============================================================================
-- 8. Fix send-gem-notification trigger comment (documentation only)
-- ============================================================================

COMMENT ON TRIGGER after_gem_transaction ON gem_transactions IS
  'Fires after any positive gem insert to send in-app notification via notify_user().';
