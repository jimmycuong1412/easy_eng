-- ============================================================================
-- Migration: Payout Requests System
-- Task: T206 - Create payout_requests table
-- ============================================================================
-- This migration creates tables and functions for teacher payout requests
-- ============================================================================

-- ============================================================================
-- Payout Requests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Teacher info
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payout details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Payment method
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'bank_transfer',
    'paypal',
    'stripe',
    'wise',
    'cash'
  )),

  -- Payment details (encrypted or tokenized)
  payment_details JSONB NOT NULL, -- { account_number, routing_number, etc. }

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Submitted by teacher
    'reviewing',  -- Under admin review
    'approved',   -- Approved for payment
    'processing', -- Payment in progress
    'completed',  -- Payment sent
    'rejected',   -- Request rejected
    'cancelled'   -- Cancelled by teacher
  )),

  -- Admin notes
  admin_notes TEXT,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Reviewer
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for teacher's payout requests
CREATE INDEX idx_payout_requests_teacher ON payout_requests(teacher_id, status);

-- Index for pending requests (admin view)
CREATE INDEX idx_payout_requests_pending ON payout_requests(status, created_at)
  WHERE status IN ('pending', 'reviewing');

-- Index for date range queries
CREATE INDEX idx_payout_requests_created ON payout_requests(created_at);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own payout requests
CREATE POLICY "Teachers can view their own payout requests"
  ON payout_requests
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Teachers can create payout requests
CREATE POLICY "Teachers can create payout requests"
  ON payout_requests
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can cancel their own pending requests
CREATE POLICY "Teachers can cancel their own pending requests"
  ON payout_requests
  FOR UPDATE
  USING (
    auth.uid() = teacher_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = teacher_id
    AND status IN ('pending', 'cancelled')
  );

-- Admins can view and manage all requests
CREATE POLICY "Admins can manage all payout requests"
  ON payout_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Create payout request
CREATE OR REPLACE FUNCTION create_payout_request(
  p_teacher_id UUID,
  p_amount DECIMAL(10, 2),
  p_payment_method TEXT,
  p_payment_details JSONB
)
RETURNS UUID AS $$
DECLARE
  v_available_balance DECIMAL(10, 2);
  v_payout_id UUID;
BEGIN
  -- Verify teacher
  IF p_teacher_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check available balance
  SELECT COALESCE(SUM(teacher_share), 0)
  INTO v_available_balance
  FROM teacher_earnings
  WHERE teacher_id = p_teacher_id
    AND status = 'earned';

  IF p_amount > v_available_balance THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', v_available_balance, p_amount;
  END IF;

  -- Minimum payout amount check
  IF p_amount < 10.00 THEN
    RAISE EXCEPTION 'Minimum payout amount is $10.00';
  END IF;

  -- Create payout request
  INSERT INTO payout_requests (
    teacher_id,
    amount,
    payment_method,
    payment_details,
    status
  ) VALUES (
    p_teacher_id,
    p_amount,
    p_payment_method,
    p_payment_details,
    'pending'
  )
  RETURNING id INTO v_payout_id;

  -- Mark earnings as processing
  UPDATE teacher_earnings
  SET status = 'processing',
      payout_request_id = v_payout_id,
      updated_at = NOW()
  WHERE teacher_id = p_teacher_id
    AND status = 'earned'
    AND teacher_share <= p_amount
  ORDER BY earned_at ASC
  LIMIT (
    SELECT COUNT(*)
    FROM teacher_earnings te
    WHERE te.teacher_id = p_teacher_id
      AND te.status = 'earned'
      AND (
        SELECT SUM(te2.teacher_share)
        FROM teacher_earnings te2
        WHERE te2.teacher_id = p_teacher_id
          AND te2.status = 'earned'
          AND te2.earned_at <= te.earned_at
      ) <= p_amount
  );

  RETURN v_payout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cancel payout request
CREATE OR REPLACE FUNCTION cancel_payout_request(
  p_payout_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  -- Get teacher ID
  SELECT teacher_id INTO v_teacher_id
  FROM payout_requests
  WHERE id = p_payout_id;

  -- Verify ownership
  IF v_teacher_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update payout request
  UPDATE payout_requests
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_payout_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Revert earnings status
  UPDATE teacher_earnings
  SET status = 'earned',
      payout_request_id = NULL,
      updated_at = NOW()
  WHERE payout_request_id = p_payout_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Approve payout request (admin)
CREATE OR REPLACE FUNCTION approve_payout_request(
  p_payout_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  UPDATE payout_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      admin_notes = p_admin_notes,
      updated_at = NOW()
  WHERE id = p_payout_id
    AND status IN ('pending', 'reviewing');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reject payout request (admin)
CREATE OR REPLACE FUNCTION reject_payout_request(
  p_payout_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  UPDATE payout_requests
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      rejection_reason = p_rejection_reason,
      updated_at = NOW()
  WHERE id = p_payout_id
    AND status IN ('pending', 'reviewing');

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Revert earnings status
  UPDATE teacher_earnings
  SET status = 'earned',
      payout_request_id = NULL,
      updated_at = NOW()
  WHERE payout_request_id = p_payout_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Complete payout (admin/system)
CREATE OR REPLACE FUNCTION complete_payout_request(
  p_payout_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE payout_requests
  SET status = 'completed',
      completed_at = NOW(),
      processed_at = COALESCE(processed_at, NOW()),
      updated_at = NOW()
  WHERE id = p_payout_id
    AND status IN ('approved', 'processing');

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Mark earnings as paid
  UPDATE teacher_earnings
  SET status = 'paid',
      paid_at = NOW(),
      updated_at = NOW()
  WHERE payout_request_id = p_payout_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payout_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_payout_request_timestamp
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_request_timestamp();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE payout_requests IS
  'Teacher payout requests for earned revenue';

COMMENT ON COLUMN payout_requests.amount IS
  'Amount requested for payout (minimum $10)';

COMMENT ON COLUMN payout_requests.payment_details IS
  'Encrypted payment details (account info, etc.)';

COMMENT ON FUNCTION create_payout_request IS
  'Creates payout request and marks earnings as processing';

COMMENT ON FUNCTION cancel_payout_request IS
  'Cancels pending payout request and reverts earnings';

COMMENT ON FUNCTION approve_payout_request IS
  'Approves payout request (admin only)';

COMMENT ON FUNCTION reject_payout_request IS
  'Rejects payout request and reverts earnings (admin only)';

COMMENT ON FUNCTION complete_payout_request IS
  'Marks payout as completed and earnings as paid';

-- ============================================================================
-- Usage Examples
-- ============================================================================

/*
-- Teacher creates payout request:
SELECT create_payout_request(
  p_teacher_id := auth.uid(),
  p_amount := 150.00,
  p_payment_method := 'bank_transfer',
  p_payment_details := '{"account_number": "****1234", "routing_number": "****5678"}'::jsonb
);

-- Teacher cancels request:
SELECT cancel_payout_request('payout-uuid');

-- Admin approves request:
SELECT approve_payout_request('payout-uuid', 'Verified and approved');

-- Admin rejects request:
SELECT reject_payout_request('payout-uuid', 'Invalid payment details');

-- System completes payout:
SELECT complete_payout_request('payout-uuid');

-- View teacher's requests:
SELECT *
FROM payout_requests
WHERE teacher_id = auth.uid()
ORDER BY created_at DESC;

-- Admin view pending requests:
SELECT *
FROM payout_requests
WHERE status = 'pending'
ORDER BY created_at ASC;
*/
