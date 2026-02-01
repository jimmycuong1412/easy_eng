-- ============================================================================
-- Easy English Learning Platform - Complete Migration Script
-- ============================================================================
-- This file contains all migrations for Phase 3: User Story 1
-- Run this in your Supabase SQL Editor
-- 
-- Migrations included:
-- - 004_classes.sql: Classes table
-- - 005_bookings.sql: Bookings table with Gems discount constraints
-- - 006_gem_transactions.sql: Gems transaction ledger
-- - 006a_gem_constraints.sql: Enhanced Gems transaction integrity constraints
-- - 007_booking_rls.sql: Row Level Security policies
-- ============================================================================

-- Note: Migrations 001-003 (users, profiles, RLS) should already be applied
-- This script focuses on the new Gems and booking functionality

-- ============================================================================
-- Migration 004: Classes Table
-- ============================================================================

-- Create class level enum
DO $$ BEGIN
  CREATE TYPE class_level AS ENUM ('beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create schedule type enum
DO $$ BEGIN
  CREATE TYPE schedule_type AS ENUM ('one_time', 'recurring');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create class status enum
DO $$ BEGIN
  CREATE TYPE class_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Class details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  level class_level NOT NULL,
  
  -- Pricing
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 5.00),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Scheduling
  schedule_type schedule_type DEFAULT 'one_time',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Capacity
  max_students INTEGER NOT NULL DEFAULT 10,
  current_enrollments INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status class_status DEFAULT 'draft',
  is_active BOOLEAN DEFAULT true,
  
  -- Additional
  materials_url TEXT,
  meeting_link TEXT,
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_enrollment CHECK (current_enrollments <= max_students)
);

-- Indexes for classes
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_start_time ON classes(start_time);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_classes_available ON classes(status, start_time) WHERE status = 'scheduled' AND is_active = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration 005: Bookings Table
-- ============================================================================

-- Create payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create booking status enum
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  
  -- Pricing with Gems discount
  original_price DECIMAL(10, 2) NOT NULL,
  gems_used INTEGER NOT NULL DEFAULT 0 CHECK (gems_used >= 0),
  gems_discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (gems_discount_amount >= 0),
  final_price DECIMAL(10, 2) NOT NULL CHECK (final_price >= 0),
  
  -- Payment
  payment_status payment_status DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  paid_at TIMESTAMPTZ,
  
  -- Booking status
  status booking_status DEFAULT 'pending',
  booking_notes TEXT,
  cancellation_reason TEXT,
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints to enforce Gems discount rules
  CONSTRAINT valid_gems_discount CHECK (
    gems_discount_amount = ROUND(gems_used::DECIMAL / 100, 2)
  ),
  CONSTRAINT valid_final_price CHECK (
    final_price = original_price - gems_discount_amount
  ),
  CONSTRAINT valid_discount_percentage CHECK (
    gems_discount_amount <= original_price * 0.5
  ),
  CONSTRAINT valid_minimum_price CHECK (
    final_price >= 5.00
  ),
  CONSTRAINT unique_user_class_booking UNIQUE (user_id, class_id)
);

-- Indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_class ON bookings(class_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(user_id, status) WHERE status IN ('pending', 'confirmed');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment class enrollment
CREATE OR REPLACE FUNCTION increment_class_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE classes
    SET current_enrollments = current_enrollments + 1
    WHERE id = NEW.class_id;
    
    -- Check if class is now full and update status
    UPDATE classes
    SET status = 'full'
    WHERE id = NEW.class_id 
      AND current_enrollments >= max_students
      AND status = 'scheduled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_increment_enrollment ON bookings;
CREATE TRIGGER booking_increment_enrollment
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION increment_class_enrollment();

-- Function to decrement class enrollment
CREATE OR REPLACE FUNCTION decrement_class_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    UPDATE classes
    SET current_enrollments = GREATEST(0, current_enrollments - 1)
    WHERE id = NEW.class_id;
    
    -- Reopen class if it was full
    UPDATE classes
    SET status = 'scheduled'
    WHERE id = NEW.class_id 
      AND status = 'full'
      AND current_enrollments < max_students;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_decrement_enrollment ON bookings;
CREATE TRIGGER booking_decrement_enrollment
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION decrement_class_enrollment();

-- ============================================================================
-- Migration 006: Gem Transactions
-- ============================================================================

-- Create gem transaction type enum
DO $$ BEGIN
  CREATE TYPE gem_transaction_type AS ENUM (
    'first_booking',
    'class_completion',
    'referral',
    'daily_login',
    'quiz_completion',
    'homework_completion',
    'admin_grant',
    'booking_discount',
    'booking_refund'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create gem_transactions table (append-only ledger)
CREATE TABLE IF NOT EXISTS gem_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction details
  amount INTEGER NOT NULL CHECK (amount != 0),
  transaction_type gem_transaction_type NOT NULL,
  description TEXT,
  
  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Timestamp (no updated_at - transactions are immutable)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: earned transactions are positive, spent are negative
  CONSTRAINT positive_earned CHECK (
    (amount > 0 AND transaction_type IN ('first_booking', 'class_completion', 'referral', 'daily_login', 'quiz_completion', 'homework_completion', 'admin_grant', 'booking_refund'))
    OR
    (amount < 0 AND transaction_type IN ('booking_discount'))
  )
);

-- Indexes for gem_transactions
CREATE INDEX IF NOT EXISTS idx_gem_transactions_user ON gem_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_created ON gem_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_type ON gem_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_booking ON gem_transactions(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gem_transactions_user_created ON gem_transactions(user_id, created_at DESC);

-- Function to get user's Gems balance
CREATE OR REPLACE FUNCTION get_gems_balance(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount)::INTEGER FROM gem_transactions WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate Gems balance before insert (prevents negative balance)
CREATE OR REPLACE FUNCTION validate_gems_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  current_balance := get_gems_balance(NEW.user_id);
  
  -- Calculate new balance
  new_balance := current_balance + NEW.amount;
  
  -- Prevent negative balance
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient Gems balance. Current: %, Required: %, Shortfall: %',
      current_balance, ABS(NEW.amount), ABS(new_balance);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_gems_before_insert ON gem_transactions;
CREATE TRIGGER validate_gems_before_insert
  BEFORE INSERT ON gem_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_gems_balance();

-- Create view for user Gems balances
DROP VIEW IF EXISTS user_gems_balances CASCADE;
CREATE OR REPLACE VIEW user_gems_balances AS
SELECT 
  user_id,
  SUM(amount)::INTEGER AS balance,
  COUNT(*)::INTEGER AS transaction_count,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)::INTEGER AS total_earned,
  ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END))::INTEGER AS total_spent,
  MAX(created_at) AS last_transaction_at
FROM gem_transactions
GROUP BY user_id;

-- Materialized view for better performance
DROP MATERIALIZED VIEW IF EXISTS user_gems_balances_mv CASCADE;
CREATE MATERIALIZED VIEW user_gems_balances_mv AS
SELECT * FROM user_gems_balances;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_gems_balances_mv_user ON user_gems_balances_mv(user_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_gems_balances()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_gems_balances_mv;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration 006a: Enhanced Gems Transaction Integrity Constraints
-- ============================================================================

-- Add idempotency_key column to prevent duplicate transactions
ALTER TABLE gem_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_gem_transactions_idempotency
  ON gem_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN gem_transactions.idempotency_key IS
  'Optional unique key to prevent duplicate transactions (idempotent operations)';

-- Create audit log table
CREATE TABLE IF NOT EXISTS gem_transaction_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES gem_transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
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

-- Enhanced balance validation trigger with audit logging
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
  new_balance := current_balance + NEW.amount;

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
  SELECT * INTO v_transaction
  FROM gem_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_transaction_id;
  END IF;

  v_rollback_amount := -v_transaction.amount;

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
  PERFORM 1 FROM gem_transactions
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_current_balance := get_gems_balance(p_user_id);

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Gems balance. Current: %, Required: %',
      v_current_balance, p_amount;
  END IF;

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
    -p_amount,
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

-- Index for fast atomic operations
CREATE INDEX IF NOT EXISTS idx_gem_transactions_user_lock
  ON gem_transactions(user_id)
  INCLUDE (amount, created_at);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_gems_balance TO authenticated;
GRANT EXECUTE ON FUNCTION atomic_deduct_gems TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_gems_transaction TO service_role;
GRANT SELECT ON gem_transaction_audit_log TO authenticated;
GRANT SELECT ON gem_balance_discrepancies TO authenticated;

-- Enable RLS on audit log
ALTER TABLE gem_transaction_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own audit logs" ON gem_transaction_audit_log;
CREATE POLICY "Users can view own audit logs" ON gem_transaction_audit_log
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================================
-- Migration 007: Row Level Security Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_transactions ENABLE ROW LEVEL SECURITY;

-- Classes policies
DROP POLICY IF EXISTS "Students can view active scheduled classes" ON classes;
CREATE POLICY "Students can view active scheduled classes" ON classes
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND status = 'scheduled'
  );

DROP POLICY IF EXISTS "Teachers can view own classes" ON classes;
CREATE POLICY "Teachers can view own classes" ON classes
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
CREATE POLICY "Teachers can create classes" ON classes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
  );

DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
CREATE POLICY "Teachers can update own classes" ON classes
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Teachers can delete own classes" ON classes;
CREATE POLICY "Teachers can delete own classes" ON classes
  FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Bookings policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM classes WHERE classes.id = bookings.class_id AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can create bookings" ON bookings;
CREATE POLICY "Students can create bookings" ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('student', 'admin')
  );

DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Gem transactions policies (append-only)
DROP POLICY IF EXISTS "Users can view own transactions" ON gem_transactions;
CREATE POLICY "Users can view own transactions" ON gem_transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "System can insert transactions" ON gem_transactions;
CREATE POLICY "System can insert transactions" ON gem_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO authenticated;
GRANT SELECT, INSERT ON gem_transactions TO authenticated;
GRANT SELECT ON user_gems_balances TO authenticated;
GRANT SELECT ON user_gems_balances_mv TO authenticated;
GRANT EXECUTE ON FUNCTION get_gems_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_gems_balances() TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Refresh materialized view
SELECT refresh_gems_balances();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All migrations applied successfully!';
  RAISE NOTICE '📋 Tables created: classes, bookings, gem_transactions, gem_transaction_audit_log';
  RAISE NOTICE '👁️ Views created: user_gems_balances, user_gems_balances_mv, gem_balance_discrepancies';
  RAISE NOTICE '⚙️ Functions created: get_gems_balance, validate_gems_balance, refresh_gems_balances, rollback_gems_transaction, atomic_deduct_gems';
  RAISE NOTICE '🔔 Triggers created: enrollment management, Gems balance validation with audit logging';
  RAISE NOTICE '🔒 RLS policies created: Secure multi-tenant access with audit log protection';
  RAISE NOTICE '✨ New features: Idempotency support, audit logging, transaction rollback, concurrency protection';
END $$;
