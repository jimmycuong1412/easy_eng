-- Migration: Enforce Cookie balance constraints at database level
-- Purpose: Prevent negative balances and ensure transaction integrity per Constitution Principle VI
-- Author: Remediation Plan P0 Fix
-- Date: 2026-01-28

-- Create function to calculate current Cookie balance
CREATE OR REPLACE FUNCTION get_cookie_balance(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM cookie_transactions
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Create trigger function to validate balance before spending
CREATE OR REPLACE FUNCTION check_cookie_balance_before_spend()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Only check for 'spent' transactions
  IF NEW.transaction_type = 'spent' THEN
    -- Get current balance
    current_balance := get_cookie_balance(NEW.user_id);

    -- Check if spending would result in negative balance
    IF (current_balance + NEW.amount) < 0 THEN
      RAISE EXCEPTION 'Insufficient Cookie balance. Current: %, Attempting to spend: %',
        current_balance, ABS(NEW.amount)
        USING HINT = 'Cannot spend more Cookies than available';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce balance validation
CREATE TRIGGER validate_cookie_balance
BEFORE INSERT ON cookie_transactions
FOR EACH ROW
EXECUTE FUNCTION check_cookie_balance_before_spend();

-- Create audit trigger for Cookie transaction logging
CREATE OR REPLACE FUNCTION log_cookie_transaction_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id,
    timestamp
  ) VALUES (
    'cookie_transactions',
    NEW.id,
    'INSERT',
    NULL,
    row_to_json(NEW),
    NEW.user_id,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit log trigger (if audit_log table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_log') THEN
    CREATE TRIGGER audit_cookie_transactions
    AFTER INSERT OR UPDATE OR DELETE ON cookie_transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_cookie_transaction_audit();
  END IF;
END $$;

-- Create index for fast balance lookups
CREATE INDEX IF NOT EXISTS idx_cookie_transactions_user_balance
ON cookie_transactions (user_id, created_at DESC)
WHERE transaction_type IN ('earned', 'spent', 'refunded');

-- Add comment for documentation
COMMENT ON FUNCTION check_cookie_balance_before_spend() IS
'Ensures students cannot spend more Cookies than they have. Enforces balance >= 0 at all times per Constitution Principle VI.';

COMMENT ON FUNCTION get_cookie_balance(UUID) IS
'Calculates current Cookie balance for a user by summing all transactions. Used for validation and display.';
