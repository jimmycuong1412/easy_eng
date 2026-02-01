-- Migration: 006a_gem_constraints.sql
-- Description: Additional constraints for Gems transaction integrity
-- Purpose: Enforce transaction atomicity, prevent double-spending, add audit logging
-- Constitution Principle VI: Currency system integrity
-- Date: 2026-01-31

-- ============================================================================
-- ENHANCED BALANCE VALIDATION
-- ============================================================================

-- Add check constraint to ensure amount is never zero (already checked in transaction)
ALTER TABLE gem_transactions
  DROP CONSTRAINT IF EXISTS chk_gem_amount_not_zero;

ALTER TABLE gem_transactions
  ADD CONSTRAINT chk_gem_amount_not_zero
  CHECK (amount != 0);

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

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS gem_transaction_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES gem_transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'INSERT', 'ATTEMPT_NEGATIVE', 'ROLLBACK', etc.
  balance_before INTEGER NOT NULL,
  balance_after INTEGER,
  amount_attempted INTEGER NOT NULL,
  transaction_type gem_transaction_type NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gem_audit_user ON gem_transaction_audit_log(user_id);
CREATE INDEX idx_gem_audit_transaction ON gem_transaction_audit_log(transaction_id);
CREATE INDEX idx_gem_audit_created ON gem_transaction_audit_log(created_at DESC);
CREATE INDEX idx_gem_audit_failed ON gem_transaction_audit_log(success) WHERE success = false;

COMMENT ON TABLE gem_transaction_audit_log IS
  'Audit trail for all Gems transactions including failed attempts';

-- ============================================================================
-- ENHANCED BALANCE VALIDATION TRIGGER
-- ============================================================================

-- Update the existing validation function to add audit logging
CREATE OR REPLACE FUNCTION validate_gems_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Only validate deductions (negative amounts)
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

  -- Calculate current balance
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

-- The trigger already exists from 006_gem_transactions.sql
-- This migration just enhances the function

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

  -- Log rollback
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

-- Function to perform atomic Gems deduction with row-level locking
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

  -- Insert deduction
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
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant execute on utility functions to authenticated users
GRANT EXECUTE ON FUNCTION get_gems_balance TO authenticated;
GRANT EXECUTE ON FUNCTION atomic_deduct_gems TO authenticated;

-- Only admins can rollback transactions
GRANT EXECUTE ON FUNCTION rollback_gems_transaction TO service_role;

-- ============================================================================
-- FINAL VALIDATION
-- ============================================================================

-- Verify the trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'validate_gems_before_insert'
  ) THEN
    RAISE WARNING 'Trigger validate_gems_before_insert not found. Run migration 006_gem_transactions.sql first.';
  END IF;
END $$;
