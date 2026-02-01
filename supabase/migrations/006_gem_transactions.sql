-- Migration: 006_gem_transactions.sql
-- Description: Create gem_transactions table for Gems ledger
-- Date: 2024-01-29

-- Gems transaction types enum
CREATE TYPE gem_transaction_type AS ENUM (
  'first_booking_bonus',
  'class_completion',
  'referral_bonus',
  'daily_login',
  'quiz_completion',
  'homework_submission',
  'admin_grant',
  'booking_discount',
  'admin_deduction'
);

-- Gems transactions table (append-only ledger)
CREATE TABLE IF NOT EXISTS gem_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  amount INTEGER NOT NULL CHECK (amount != 0),
  transaction_type gem_transaction_type NOT NULL,
  
  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Admin tracking
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_earned CHECK (
    (amount > 0 AND transaction_type IN (
      'first_booking_bonus',
      'class_completion',
      'referral_bonus',
      'daily_login',
      'quiz_completion',
      'homework_submission',
      'admin_grant'
    )) OR (amount < 0 AND transaction_type IN (
      'booking_discount',
      'admin_deduction'
    ))
  )
);

-- Indexes for efficient balance calculation
CREATE INDEX idx_gem_transactions_user ON gem_transactions(user_id);
CREATE INDEX idx_gem_transactions_created ON gem_transactions(created_at DESC);
CREATE INDEX idx_gem_transactions_type ON gem_transactions(transaction_type);
CREATE INDEX idx_gem_transactions_booking ON gem_transactions(booking_id) WHERE booking_id IS NOT NULL;

-- Composite index for user balance queries
CREATE INDEX idx_gem_transactions_user_created ON gem_transactions(user_id, created_at DESC);

-- Function to calculate user's Gems balance
CREATE OR REPLACE FUNCTION get_gems_balance(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM gem_transactions
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Function to validate Gems balance before deduction
CREATE OR REPLACE FUNCTION validate_gems_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Only validate deductions (negative amounts)
  IF NEW.amount >= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Calculate current balance
  current_balance := get_gems_balance(NEW.user_id);
  new_balance := current_balance + NEW.amount; -- amount is negative
  
  -- Prevent negative balance
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient Gems balance. Current: %, Attempting to deduct: %, Would result in: %',
      current_balance, ABS(NEW.amount), new_balance;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce non-negative balance
CREATE TRIGGER validate_gems_before_insert
  BEFORE INSERT ON gem_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_gems_balance();

-- View for user Gems balances (for easier querying)
DROP VIEW IF EXISTS user_gems_balances CASCADE;
CREATE VIEW user_gems_balances AS
SELECT 
  user_id,
  SUM(amount) AS balance,
  COUNT(*) AS transaction_count,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_earned,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS total_spent,
  MAX(created_at) AS last_transaction_at
FROM gem_transactions
GROUP BY user_id;

-- Create materialized view for better performance (refresh periodically)
DROP MATERIALIZED VIEW IF EXISTS user_gems_balances_mv CASCADE;
CREATE MATERIALIZED VIEW user_gems_balances_mv AS
SELECT * FROM user_gems_balances;

CREATE UNIQUE INDEX idx_gems_balances_mv_user ON user_gems_balances_mv(user_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_gems_balances()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_gems_balances_mv;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE gem_transactions IS 'Append-only ledger of all Gems transactions';
COMMENT ON COLUMN gem_transactions.amount IS 'Gems amount (positive = earned, negative = spent)';
COMMENT ON COLUMN gem_transactions.transaction_type IS 'Type of transaction (earning or spending)';
COMMENT ON FUNCTION get_gems_balance IS 'Calculate current Gems balance for a user';
COMMENT ON VIEW user_gems_balances IS 'Real-time view of user Gems balances';
COMMENT ON MATERIALIZED VIEW user_gems_balances_mv IS 'Cached view of user Gems balances (refresh periodically)';
