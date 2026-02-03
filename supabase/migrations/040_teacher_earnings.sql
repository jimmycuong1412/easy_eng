-- ============================================================================
-- Migration: Teacher Earnings Tracking
-- Task: T203 - Create teacher_earnings table
-- ============================================================================
-- This migration creates tables and functions for tracking teacher revenue
-- with the 70/30 teacher/platform split model
-- ============================================================================

-- ============================================================================
-- Teacher Earnings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Teacher and booking info
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,

  -- Student info
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Revenue breakdown
  class_price DECIMAL(10, 2) NOT NULL CHECK (class_price >= 0),
  gems_discount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (gems_discount >= 0),
  final_price DECIMAL(10, 2) NOT NULL CHECK (final_price >= 0),

  -- Split calculation (70/30)
  teacher_share DECIMAL(10, 2) NOT NULL CHECK (teacher_share >= 0), -- 70% of final_price
  platform_fee DECIMAL(10, 2) NOT NULL CHECK (platform_fee >= 0), -- 30% of final_price

  -- Payment status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Class not yet completed
    'earned',     -- Class completed, earnings available
    'processing', -- Included in payout request
    'paid',       -- Paid out to teacher
    'cancelled'   -- Booking cancelled
  )),

  -- Payout tracking
  payout_request_id UUID REFERENCES payout_requests(id) ON DELETE SET NULL,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  earned_at TIMESTAMP WITH TIME ZONE -- When class was completed
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for teacher earnings queries
CREATE INDEX idx_teacher_earnings_teacher ON teacher_earnings(teacher_id, status);

-- Index for booking lookup
CREATE INDEX idx_teacher_earnings_booking ON teacher_earnings(booking_id);

-- Index for unpaid earnings
CREATE INDEX idx_teacher_earnings_unpaid ON teacher_earnings(teacher_id, status)
  WHERE status IN ('earned', 'processing');

-- Index for date range queries
CREATE INDEX idx_teacher_earnings_earned_at ON teacher_earnings(teacher_id, earned_at)
  WHERE earned_at IS NOT NULL;

-- Index for payout requests
CREATE INDEX idx_teacher_earnings_payout ON teacher_earnings(payout_request_id)
  WHERE payout_request_id IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE teacher_earnings ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own earnings
CREATE POLICY "Teachers can view their own earnings"
  ON teacher_earnings
  FOR SELECT
  USING (
    auth.uid() = teacher_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only service role can insert/update earnings
CREATE POLICY "Service role can manage earnings"
  ON teacher_earnings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Calculate teacher earnings for a booking
CREATE OR REPLACE FUNCTION calculate_teacher_earnings(
  p_booking_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_booking RECORD;
  v_earnings_id UUID;
  v_teacher_share DECIMAL(10, 2);
  v_platform_fee DECIMAL(10, 2);
BEGIN
  -- Get booking details
  SELECT
    b.id,
    b.student_id,
    b.class_id,
    b.final_price,
    c.teacher_id,
    c.price as class_price,
    COALESCE(b.gems_used, 0) * 0.5 as gems_discount
  INTO v_booking
  FROM bookings b
  JOIN classes c ON c.id = b.class_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Calculate 70/30 split
  v_teacher_share := ROUND(v_booking.final_price * 0.70, 2);
  v_platform_fee := v_booking.final_price - v_teacher_share;

  -- Insert or update earnings record
  INSERT INTO teacher_earnings (
    teacher_id,
    booking_id,
    class_id,
    student_id,
    class_price,
    gems_discount,
    final_price,
    teacher_share,
    platform_fee,
    status
  ) VALUES (
    v_booking.teacher_id,
    p_booking_id,
    v_booking.class_id,
    v_booking.student_id,
    v_booking.class_price,
    v_booking.gems_discount,
    v_booking.final_price,
    v_teacher_share,
    v_platform_fee,
    'pending'
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    final_price = EXCLUDED.final_price,
    teacher_share = EXCLUDED.teacher_share,
    platform_fee = EXCLUDED.platform_fee,
    updated_at = NOW()
  RETURNING id INTO v_earnings_id;

  RETURN v_earnings_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark earnings as earned (after class completion)
CREATE OR REPLACE FUNCTION mark_earnings_earned(
  p_session_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE teacher_earnings
  SET status = 'earned',
      earned_at = NOW(),
      session_id = p_session_id,
      updated_at = NOW()
  WHERE booking_id IN (
    SELECT b.id
    FROM bookings b
    JOIN class_sessions cs ON cs.class_id = b.class_id
    WHERE cs.id = p_session_id
      AND b.status = 'completed'
  )
  AND status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cancel earnings (when booking is cancelled)
CREATE OR REPLACE FUNCTION cancel_earnings(
  p_booking_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE teacher_earnings
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE booking_id = p_booking_id
    AND status IN ('pending', 'earned');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get teacher earnings summary
CREATE OR REPLACE FUNCTION get_teacher_earnings_summary(
  p_teacher_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_earned DECIMAL(10, 2),
  total_paid DECIMAL(10, 2),
  total_pending DECIMAL(10, 2),
  total_processing DECIMAL(10, 2),
  classes_completed INTEGER,
  average_earning DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN status = 'earned' THEN teacher_share ELSE 0 END), 0) as total_earned,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN teacher_share ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN teacher_share ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN status = 'processing' THEN teacher_share ELSE 0 END), 0) as total_processing,
    COUNT(CASE WHEN status IN ('earned', 'processing', 'paid') THEN 1 END)::INTEGER as classes_completed,
    COALESCE(AVG(CASE WHEN status IN ('earned', 'processing', 'paid') THEN teacher_share END), 0) as average_earning
  FROM teacher_earnings
  WHERE teacher_id = p_teacher_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_earnings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_teacher_earnings_timestamp
  BEFORE UPDATE ON teacher_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_earnings_timestamp();

-- Trigger: Auto-create earnings record when booking is confirmed
CREATE OR REPLACE FUNCTION trigger_create_teacher_earnings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    PERFORM calculate_teacher_earnings(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_teacher_earnings
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_teacher_earnings();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE teacher_earnings IS
  'Tracks teacher revenue with 70/30 split between teacher and platform';

COMMENT ON COLUMN teacher_earnings.teacher_share IS
  '70% of final booking price goes to teacher';

COMMENT ON COLUMN teacher_earnings.platform_fee IS
  '30% of final booking price goes to platform';

COMMENT ON COLUMN teacher_earnings.status IS
  'pending: class not completed | earned: available for payout | processing: in payout request | paid: paid out | cancelled: booking cancelled';

COMMENT ON FUNCTION calculate_teacher_earnings IS
  'Creates or updates earnings record for a booking with 70/30 split';

COMMENT ON FUNCTION mark_earnings_earned IS
  'Marks earnings as earned after class completion';

COMMENT ON FUNCTION cancel_earnings IS
  'Cancels earnings when booking is cancelled';

COMMENT ON FUNCTION get_teacher_earnings_summary IS
  'Returns summary of teacher earnings for a date range';

-- ============================================================================
-- Usage Examples
-- ============================================================================

/*
-- Calculate earnings for a booking:
SELECT calculate_teacher_earnings('booking-uuid');

-- Mark earnings as earned after class:
SELECT mark_earnings_earned('session-uuid');

-- Cancel earnings:
SELECT cancel_earnings('booking-uuid');

-- Get teacher earnings summary:
SELECT * FROM get_teacher_earnings_summary('teacher-uuid');

-- Query unpaid earnings:
SELECT *
FROM teacher_earnings
WHERE teacher_id = 'teacher-uuid'
  AND status = 'earned'
ORDER BY earned_at DESC;

-- Get earnings for a specific month:
SELECT *
FROM teacher_earnings
WHERE teacher_id = 'teacher-uuid'
  AND earned_at >= '2024-01-01'
  AND earned_at < '2024-02-01'
ORDER BY earned_at DESC;
*/
