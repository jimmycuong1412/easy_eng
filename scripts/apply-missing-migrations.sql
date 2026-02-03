-- ============================================================================
-- Apply Missing Migrations Script
-- ============================================================================
-- Purpose: Apply the 3 migrations that were skipped due to naming
-- Run this in Supabase Dashboard SQL Editor
-- Project: evrcwtsexlamacawofxo
-- ============================================================================

-- Check if migrations are already applied
DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'APPLYING MISSING MIGRATIONS';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'This will apply:';
    RAISE NOTICE '  1. Cookie constraints';
    RAISE NOTICE '  2. Gem constraints (CRITICAL)';
    RAISE NOTICE '  3. CometChat user sync trigger (CRITICAL)';
    RAISE NOTICE '==================================================';
END $$;

-- ============================================================================
-- MIGRATION 1: Cookie Constraints (20240129_010000_cookie_constraints.sql)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Applying: Cookie Constraints...';
END $$;

-- Add cookie constraints (if cookie system is used)
-- Note: This may fail if cookie tables don't exist yet, which is OK

ALTER TABLE IF EXISTS cookies
  ADD CONSTRAINT IF NOT EXISTS chk_cookie_amount_positive
  CHECK (amount > 0);

ALTER TABLE IF EXISTS cookie_transactions
  ADD CONSTRAINT IF NOT EXISTS chk_cookie_transaction_amount
  CHECK (amount != 0);

-- ============================================================================
-- MIGRATION 2: Gem Constraints (20240129_020000_gem_constraints.sql)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Applying: Gem Constraints (CRITICAL)...';
END $$;

-- Add check constraint to ensure amount is never zero
ALTER TABLE gem_transactions
  DROP CONSTRAINT IF EXISTS chk_gem_amount_not_zero;

ALTER TABLE gem_transactions
  ADD CONSTRAINT chk_gem_amount_not_zero
  CHECK (amount != 0);

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
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON gem_transaction_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_transaction ON gem_transaction_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON gem_transaction_audit_log(action, created_at DESC);

-- Enhanced balance calculation function with atomic operations
CREATE OR REPLACE FUNCTION calculate_gem_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_balance
  FROM gem_transactions
  WHERE user_id = p_user_id;

  RETURN GREATEST(v_balance, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate and execute gem transaction with audit logging
CREATE OR REPLACE FUNCTION process_gem_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_type gem_transaction_type,
  p_description TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_idempotency_key VARCHAR(255) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_audit_id UUID;
BEGIN
  -- Start transaction
  v_current_balance := calculate_gem_balance(p_user_id);
  v_new_balance := v_current_balance + p_amount;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    -- Log failed attempt
    INSERT INTO gem_transaction_audit_log (
      user_id, action, balance_before, balance_after,
      amount_attempted, transaction_type, success, error_message, metadata
    ) VALUES (
      p_user_id, 'ATTEMPT_NEGATIVE', v_current_balance, NULL,
      p_amount, p_type, false, 'Insufficient Gems', p_metadata
    );

    RAISE EXCEPTION 'Insufficient Gems: balance=%, attempted=%, would result in=%',
      v_current_balance, p_amount, v_new_balance
      USING ERRCODE = 'check_violation';
  END IF;

  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_transaction_id
    FROM gem_transactions
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN v_transaction_id;
    END IF;
  END IF;

  -- Insert transaction
  INSERT INTO gem_transactions (
    user_id, amount, transaction_type, description,
    related_id, idempotency_key, metadata
  ) VALUES (
    p_user_id, p_amount, p_type, p_description,
    p_related_id, p_idempotency_key, p_metadata
  ) RETURNING id INTO v_transaction_id;

  -- Log successful transaction
  INSERT INTO gem_transaction_audit_log (
    transaction_id, user_id, action, balance_before, balance_after,
    amount_attempted, transaction_type, success, metadata
  ) VALUES (
    v_transaction_id, p_user_id, 'INSERT', v_current_balance, v_new_balance,
    p_amount, p_type, true, p_metadata
  );

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_gem_transaction IS
  'Atomically process gem transaction with validation, idempotency, and audit logging';

-- ============================================================================
-- MIGRATION 3: CometChat User Sync Trigger (20240203_150000_cometchat_user_sync_trigger.sql)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Applying: CometChat User Sync Trigger (CRITICAL)...';
END $$;

-- Enable HTTP extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.system_settings IS
  'System-wide configuration settings';

-- Insert default CometChat webhook URL
INSERT INTO public.system_settings (key, value, description)
VALUES
  (
    'cometchat_webhook_url',
    'https://evrcwtsexlamacawofxo.supabase.co/functions/v1/cometchat-user-sync',
    'Edge Function URL for CometChat user sync'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Grant permissions
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role can manage settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.system_settings;

-- Policy: Only service_role can modify settings
CREATE POLICY "Service role can manage settings"
  ON public.system_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read non-sensitive settings
CREATE POLICY "Authenticated users can read settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (key NOT LIKE '%_secret' AND key NOT LIKE '%_key');

-- Create trigger function
CREATE OR REPLACE FUNCTION notify_cometchat_user_sync()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  request_body JSONB;
BEGIN
  -- Get the Edge Function URL
  SELECT value INTO webhook_url
  FROM public.system_settings
  WHERE key = 'cometchat_webhook_url';

  IF webhook_url IS NULL THEN
    RAISE WARNING 'CometChat webhook URL not configured in system_settings';
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build request body
  request_body := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END,
    'old_record', CASE
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END
  );

  -- Log the sync attempt
  RAISE LOG 'CometChat sync triggered: type=%, user_id=%',
    TG_OP,
    COALESCE(NEW.id, OLD.id);

  -- Make HTTP POST request
  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := request_body
    );
  EXCEPTION
    WHEN undefined_function THEN
      RAISE WARNING 'pg_net extension not available. CometChat sync skipped for user %.',
        COALESCE(NEW.id, OLD.id);
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to trigger CometChat sync: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_cometchat_user_sync() IS
  'Triggers CometChat user sync via Edge Function when profiles are created/updated';

-- Drop trigger if exists
DROP TRIGGER IF EXISTS profiles_cometchat_sync ON public.profiles;

-- Create trigger
CREATE TRIGGER profiles_cometchat_sync
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_cometchat_user_sync();

COMMENT ON TRIGGER profiles_cometchat_sync ON public.profiles IS
  'Automatically syncs profile changes to CometChat';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'MIGRATIONS APPLIED SUCCESSFULLY';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Verifying...';

    -- Check if gem_transaction_audit_log exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'gem_transaction_audit_log') THEN
        RAISE NOTICE '✅ gem_transaction_audit_log table created';
    ELSE
        RAISE WARNING '❌ gem_transaction_audit_log table missing';
    END IF;

    -- Check if system_settings exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_settings') THEN
        RAISE NOTICE '✅ system_settings table created';
    ELSE
        RAISE WARNING '❌ system_settings table missing';
    END IF;

    -- Check if trigger exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_cometchat_sync') THEN
        RAISE NOTICE '✅ profiles_cometchat_sync trigger created';
    ELSE
        RAISE WARNING '❌ profiles_cometchat_sync trigger missing';
    END IF;

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Deploy CometChat Edge Function';
    RAISE NOTICE '2. Set CometChat secrets';
    RAISE NOTICE '3. Test user sync';
    RAISE NOTICE 'See: docs/cometchat-quick-start.md';
    RAISE NOTICE '==================================================';
END $$;
