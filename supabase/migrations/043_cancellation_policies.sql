-- ============================================================================
-- Migration: Cancellation Policies
-- Task: T210 - Create cancellation policies table
-- ============================================================================
-- This migration creates tables and functions for booking cancellation
-- with time-based refund policies
-- ============================================================================

-- ============================================================================
-- Cancellation Policies Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS cancellation_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Policy details
  name TEXT NOT NULL,
  description TEXT,

  -- Time-based refund rules (hours before class)
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  /* Example structure:
  [
    { "hours_before": 24, "refund_percentage": 100 },
    { "hours_before": 12, "refund_percentage": 50 },
    { "hours_before": 0, "refund_percentage": 0 }
  ]
  */

  -- Default policy flag
  is_default BOOLEAN DEFAULT FALSE,

  -- Active status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Cancellation Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS cancellation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Booking info
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cancellation details
  cancelled_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cancelled_by_role TEXT NOT NULL CHECK (cancelled_by_role IN ('student', 'teacher', 'admin', 'system')),

  -- Timing
  class_scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hours_before_class NUMERIC(10, 2),

  -- Refund calculation
  original_price DECIMAL(10, 2) NOT NULL,
  gems_used INTEGER NOT NULL DEFAULT 0,
  refund_percentage INTEGER NOT NULL CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
  gems_refunded INTEGER NOT NULL DEFAULT 0,
  cash_refunded DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Policy applied
  policy_id UUID REFERENCES cancellation_policies(id) ON DELETE SET NULL,
  policy_name TEXT,

  -- Reason
  reason TEXT,
  notes TEXT,

  -- Status
  refund_status TEXT NOT NULL DEFAULT 'pending' CHECK (refund_status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  refund_processed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for booking cancellation lookup
CREATE INDEX idx_cancellation_logs_booking ON cancellation_logs(booking_id);

-- Index for student cancellations
CREATE INDEX idx_cancellation_logs_student ON cancellation_logs(student_id, cancelled_at);

-- Index for teacher cancellations
CREATE INDEX idx_cancellation_logs_teacher ON cancellation_logs(teacher_id, cancelled_by_role);

-- Index for refund processing
CREATE INDEX idx_cancellation_logs_refund_status ON cancellation_logs(refund_status)
  WHERE refund_status IN ('pending', 'processing');

-- ============================================================================
-- Default Cancellation Policy
-- ============================================================================

-- Insert default cancellation policy
INSERT INTO cancellation_policies (name, description, rules, is_default, is_active)
VALUES (
  'Standard Cancellation Policy',
  'Full refund 24+ hours before class, 50% refund 12-24 hours before, no refund less than 12 hours',
  '[
    {"hours_before": 24, "refund_percentage": 100},
    {"hours_before": 12, "refund_percentage": 50},
    {"hours_before": 0, "refund_percentage": 0}
  ]'::jsonb,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can view active policies
CREATE POLICY "Anyone can view active cancellation policies"
  ON cancellation_policies
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage policies
CREATE POLICY "Admins can manage cancellation policies"
  ON cancellation_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can view their own cancellation logs
CREATE POLICY "Users can view their own cancellation logs"
  ON cancellation_logs
  FOR SELECT
  USING (
    auth.uid() = student_id
    OR auth.uid() = teacher_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert cancellation logs
CREATE POLICY "Service role can manage cancellation logs"
  ON cancellation_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Get applicable refund percentage
CREATE OR REPLACE FUNCTION get_refund_percentage(
  p_class_scheduled_at TIMESTAMP WITH TIME ZONE,
  p_cancellation_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_policy_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_policy RECORD;
  v_hours_before NUMERIC(10, 2);
  v_rule RECORD;
  v_refund_percentage INTEGER := 0;
BEGIN
  -- Calculate hours before class
  v_hours_before := EXTRACT(EPOCH FROM (p_class_scheduled_at - p_cancellation_time)) / 3600;

  -- Get policy (use default if not specified)
  SELECT * INTO v_policy
  FROM cancellation_policies
  WHERE (p_policy_id IS NULL AND is_default = true) OR id = p_policy_id
  ORDER BY is_default DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0; -- No policy found, no refund
  END IF;

  -- Apply rules (find highest matching refund percentage)
  FOR v_rule IN
    SELECT * FROM jsonb_to_recordset(v_policy.rules)
    AS r(hours_before NUMERIC, refund_percentage INTEGER)
    ORDER BY hours_before DESC
  LOOP
    IF v_hours_before >= v_rule.hours_before THEN
      v_refund_percentage := v_rule.refund_percentage;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_refund_percentage;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Calculate refund amounts
CREATE OR REPLACE FUNCTION calculate_refund_amounts(
  p_booking_id UUID,
  p_refund_percentage INTEGER
)
RETURNS TABLE (
  gems_refunded INTEGER,
  cash_refunded DECIMAL(10, 2)
) AS $$
DECLARE
  v_booking RECORD;
  v_gems_value DECIMAL(10, 2);
  v_total_refund DECIMAL(10, 2);
BEGIN
  -- Get booking details
  SELECT
    b.gems_used,
    b.final_price,
    c.price as original_price
  INTO v_booking
  FROM bookings b
  JOIN classes c ON c.id = b.class_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Calculate total refund based on original price
  v_total_refund := (v_booking.original_price * p_refund_percentage / 100.0);

  -- Calculate Gems value (1 Gem = $0.50)
  v_gems_value := v_booking.gems_used * 0.5;

  -- Refund Gems first (proportionally)
  IF v_booking.gems_used > 0 AND v_total_refund > 0 THEN
    IF v_total_refund >= v_gems_value THEN
      -- Full Gems refund
      gems_refunded := v_booking.gems_used;
      cash_refunded := v_total_refund - v_gems_value;
    ELSE
      -- Partial Gems refund
      gems_refunded := FLOOR(v_total_refund / 0.5);
      cash_refunded := 0;
    END IF;
  ELSE
    gems_refunded := 0;
    cash_refunded := v_total_refund;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cancellation_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_cancellation_policy_timestamp
  BEFORE UPDATE ON cancellation_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_cancellation_policy_timestamp();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE cancellation_policies IS
  'Defines time-based refund policies for booking cancellations';

COMMENT ON TABLE cancellation_logs IS
  'Records all booking cancellations with refund calculations';

COMMENT ON FUNCTION get_refund_percentage IS
  'Calculates refund percentage based on cancellation policy and time';

COMMENT ON FUNCTION calculate_refund_amounts IS
  'Calculates Gems and cash refund amounts based on refund percentage';

-- ============================================================================
-- Usage Examples
-- ============================================================================

/*
-- Get refund percentage for a cancellation:
SELECT get_refund_percentage(
  p_class_scheduled_at := '2024-03-15 10:00:00'::timestamptz,
  p_cancellation_time := NOW()
);

-- Calculate refund amounts:
SELECT * FROM calculate_refund_amounts('booking-uuid', 50);

-- View default policy:
SELECT * FROM cancellation_policies WHERE is_default = true;

-- View cancellation history:
SELECT *
FROM cancellation_logs
WHERE student_id = auth.uid()
ORDER BY cancelled_at DESC;

-- Admin: View all recent cancellations:
SELECT
  cl.*,
  p_student.full_name as student_name,
  p_teacher.full_name as teacher_name
FROM cancellation_logs cl
LEFT JOIN profiles p_student ON p_student.user_id = cl.student_id
LEFT JOIN profiles p_teacher ON p_teacher.user_id = cl.teacher_id
WHERE cl.cancelled_at >= NOW() - INTERVAL '30 days'
ORDER BY cl.cancelled_at DESC;
*/
