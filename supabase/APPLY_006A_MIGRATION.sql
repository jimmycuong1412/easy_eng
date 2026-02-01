-- ============================================================================
-- Migration 006a: Enhanced Gems Transaction Integrity Constraints
-- ============================================================================
-- Purpose: Add idempotency, audit logging, rollback support, and concurrency protection
-- Constitution Principle VI: Currency System Integrity
-- Date: 2026-01-31
--
-- ⚠️ PREREQUISITE: Migration 006_gem_transactions.sql must be applied first
--
-- Apply this in your Supabase SQL Editor or via CLI:
-- supabase db push --db-url "your-database-url"
-- ============================================================================

BEGIN;

-- ============================================================================
-- IDEMPOTENCY SUPPORT
-- ============================================================================

-- Add idempotency_key column to prevent duplicate transactions
ALTER TABLE gem_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_gem_transactions_idempotency
  ON gem_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN gem_transactions.idempotency_key IS
  'Optional unique key to prevent duplicate transactions (idempotent operations)';

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

-- Create audit log table to track all transaction attempts
CREATE TABLE IF NOT EXISTS gem_transaction_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES gem_transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'EARN', 'SPEND', 'ATTEMPT_NEGATIVE', 'ROLLBACK'
  balance_before INTEGER NOT NULL,
  balance_after INTEGER,
  amount_attempted INTEGER NOT NULL,
  transaction_type gem_transaction_type NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_gem_audit_user ON gem_transaction_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gem_audit_transaction ON gem_transaction_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_gem_audit_created ON gem_transaction_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gem_audit_failed ON gem_transaction_audit_log(success) WHERE success = false;

COMMENT ON TABLE gem_transaction_audit_log IS
  'Audit trail for all Gems transactions including failed attempts';

-- ============================================================================
-- ENHANCED VALIDATION TRIGGER WITH AUDIT LOGGING
-- ============================================================================

-- Update the validation function to include audit logging
CREATE OR REPLACE FUNCTION validate_gems_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Handle earning transactions (positive amounts)
  IF NEW.amount >= 0 THEN
    -- Log successful earning transaction
    INSERT INTO gem_transaction_audit_log (
      transaction_id,
      user_id,
      action,
      balance_before,
      balance_after,
      amount_attempted,
      transaction_type,
      success,
      metadata
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'EARN',
      get_gems_balance(NEW.user_id),
      get_gems_balance(NEW.user_id) + NEW.amount,
      NEW.amount,
      NEW.transaction_type,
      true,
      jsonb_build_object(
        'description', NEW.description,
        'booking_id', NEW.booking_id,
        'class_id', NEW.class_id
      )
    );
    RETURN NEW;
  END IF;

  -- Calculate current balance for spending transactions
  current_balance := get_gems_balance(NEW.user_id);
  new_balance := current_balance + NEW.amount; -- amount is negative

  -- Prevent negative balance
  IF new_balance < 0 THEN
    -- Log failed attempt
    INSERT INTO gem_transaction_audit_log (
      user_id,
      action,
      balance_before,
      balance_after,
      amount_attempted,
      transaction_type,
      success,
      error_message,
      metadata
    ) VALUES (
      NEW.user_id,
      'ATTEMPT_NEGATIVE',
      current_balance,
      new_balance,
      NEW.amount,
      NEW.transaction_type,
      false,
      format('Insufficient Gems balance. Current: %s, Attempting to deduct: %s, Would result in: %s',
        current_balance, ABS(NEW.amount), new_balance),
      jsonb_build_object(
        'description', NEW.description,
        'booking_id', NEW.booking_id,
        'class_id', NEW.class_id
      )
    );

    RAISE EXCEPTION 'Insufficient Gems balance. Current: %, Attempting to deduct: %, Would result in: %',
      current_balance, ABS(NEW.amount), new_balance;
  END IF;

  -- Log successful deduction
  INSERT INTO gem_transaction_audit_log (
    transaction_id,
    user_id,
    action,
    balance_before,
    balance_after,
    amount_attempted,
    transaction_type,
    success,
    metadata
  ) VALUES (
    NEW.id,
    NEW.user_id,
    'SPEND',
    current_balance,
    new_balance,
    NEW.amount,
    NEW.transaction_type,
    true,
    jsonb_build_object(
      'description', NEW.description,
      'booking_id', NEW.booking_id,
      'class_id', NEW.class_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_gems_balance IS
  'Enhanced validation with audit logging for all transaction attempts';

-- ============================================================================
-- TRANSACTION ROLLBACK SUPPORT
-- ============================================================================

-- Function to rollback a Gems transaction
CREATE OR REPLACE FUNCTION rollback_gems_transaction(
  p_transaction_id UUID,
  p_reason TEXT DEFAULT 'Manual rollback'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_transaction RECORD;
  v_rollback_amount INTEGER;
BEGIN
  -- Get the original transaction
  SELECT * INTO v_transaction
  FROM gem_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_transaction_id;
  END IF;

  -- Calculate rollback amount (reverse of original)
  v_rollback_amount := -v_transaction.amount;

  -- Insert reversal transaction
  INSERT INTO gem_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    booking_id,
    class_id,
    metadata
  ) VALUES (
    v_transaction.user_id,
    v_rollback_amount,
    v_transaction.transaction_type,
    format('ROLLBACK: %s - %s', v_transaction.description, p_reason),
    v_transaction.booking_id,
    v_transaction.class_id,
    jsonb_build_object(
      'rollback_of', p_transaction_id,
      'reason', p_reason,
      'original_amount', v_transaction.amount
    )
  );

  -- Log rollback in audit trail
  INSERT INTO gem_transaction_audit_log (
    user_id,
    action,
    balance_before,
    balance_after,
    amount_attempted,
    transaction_type,
    success,
    metadata
  ) VALUES (
    v_transaction.user_id,
    'ROLLBACK',
    get_gems_balance(v_transaction.user_id) - v_rollback_amount,
    get_gems_balance(v_transaction.user_id),
    v_rollback_amount,
    v_transaction.transaction_type,
    true,
    jsonb_build_object(
      'original_transaction_id', p_transaction_id,
      'reason', p_reason
    )
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_gems_transaction IS
  'Rollback a Gems transaction by creating an equal and opposite transaction';

-- ============================================================================
-- CONCURRENCY PROTECTION
-- ============================================================================

-- Function for atomic Gems deduction with row-level locking
CREATE OR REPLACE FUNCTION atomic_deduct_gems(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type gem_transaction_type,
  p_description TEXT DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_class_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_current_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Lock the user's transaction rows to prevent race conditions
  PERFORM 1 FROM gem_transactions
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Get current balance
  v_current_balance := get_gems_balance(p_user_id);

  -- Check if sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Gems balance. Current: %, Required: %',
      v_current_balance, p_amount;
  END IF;

  -- Insert deduction (trigger will validate and log)
  INSERT INTO gem_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    booking_id,
    class_id,
    metadata
  ) VALUES (
    p_user_id,
    -p_amount, -- Negative for deduction
    p_transaction_type,
    p_description,
    p_booking_id,
    p_class_id,
    p_metadata
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION atomic_deduct_gems IS
  'Atomically deduct Gems with row-level locking to prevent race conditions';

-- ============================================================================
-- RECONCILIATION HELPERS
-- ============================================================================

-- View to detect balance discrepancies
CREATE OR REPLACE VIEW gem_balance_discrepancies AS
WITH calculated_balances AS (
  SELECT
    user_id,
    SUM(amount) as calculated_balance,
    COUNT(*) as transaction_count
  FROM gem_transactions
  GROUP BY user_id
)
SELECT
  cb.user_id,
  cb.calculated_balance,
  cb.transaction_count,
  get_gems_balance(cb.user_id) as function_balance,
  ABS(cb.calculated_balance - get_gems_balance(cb.user_id)) as discrepancy
FROM calculated_balances cb
WHERE cb.calculated_balance != get_gems_balance(cb.user_id);

COMMENT ON VIEW gem_balance_discrepancies IS
  'Detects discrepancies between calculated and function-based balances';

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Index for fast atomic operations (row-level locking)
CREATE INDEX IF NOT EXISTS idx_gem_transactions_user_lock
  ON gem_transactions(user_id)
  INCLUDE (amount, created_at);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION get_gems_balance TO authenticated;
GRANT EXECUTE ON FUNCTION atomic_deduct_gems TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_gems_transaction TO service_role;

-- Grant select on new tables/views
GRANT SELECT ON gem_transaction_audit_log TO authenticated;
GRANT SELECT ON gem_balance_discrepancies TO authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on audit log
ALTER TABLE gem_transaction_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs, admins can view all
DROP POLICY IF EXISTS "Users can view own audit logs" ON gem_transaction_audit_log;
CREATE POLICY "Users can view own audit logs" ON gem_transaction_audit_log
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify the base trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'validate_gems_before_insert'
  ) THEN
    RAISE WARNING 'Trigger validate_gems_before_insert not found. Run migration 006_gem_transactions.sql first.';
  ELSE
    RAISE NOTICE '✅ Base trigger validated';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration 006a Applied Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 New Features:';
  RAISE NOTICE '  • Idempotency support for duplicate prevention';
  RAISE NOTICE '  • Audit log for all transaction attempts';
  RAISE NOTICE '  • Transaction rollback capability';
  RAISE NOTICE '  • Atomic deduction with concurrency protection';
  RAISE NOTICE '  • Balance discrepancy detection';
  RAISE NOTICE '';
  RAISE NOTICE '📊 New Database Objects:';
  RAISE NOTICE '  • Table: gem_transaction_audit_log';
  RAISE NOTICE '  • View: gem_balance_discrepancies';
  RAISE NOTICE '  • Function: rollback_gems_transaction()';
  RAISE NOTICE '  • Function: atomic_deduct_gems()';
  RAISE NOTICE '  • Enhanced: validate_gems_balance() with logging';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security:';
  RAISE NOTICE '  • RLS policies applied to audit log';
  RAISE NOTICE '  • Rollback function restricted to service_role';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Next Steps:';
  RAISE NOTICE '  1. Test atomic_deduct_gems() for bookings';
  RAISE NOTICE '  2. Monitor gem_transaction_audit_log for failures';
  RAISE NOTICE '  3. Check gem_balance_discrepancies view regularly';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
