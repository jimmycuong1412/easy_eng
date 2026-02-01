-- Migration 013: Lesson Completion Trigger for Automatic Gem Awards
-- Purpose: Automatically award gems when students complete lessons

-- =====================================================
-- 1. Lesson Completion Status Enum
-- =====================================================

-- Add lesson completion status if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_status') THEN
    CREATE TYPE lesson_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
  END IF;
END$$;

-- =====================================================
-- 2. Add Completion Tracking to Bookings
-- =====================================================

-- Add columns to track lesson completion
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS lesson_status lesson_status DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS quiz_score INTEGER CHECK (quiz_score >= 0 AND quiz_score <= 100),
ADD COLUMN IF NOT EXISTS attendance_verified BOOLEAN DEFAULT FALSE;

-- Index for completion queries
CREATE INDEX IF NOT EXISTS idx_bookings_lesson_status
  ON bookings(lesson_status, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_student_completed
  ON bookings(student_id, lesson_status, completed_at DESC)
  WHERE lesson_status = 'completed';

-- Comments
COMMENT ON COLUMN bookings.lesson_status IS 'Current status of the lesson';
COMMENT ON COLUMN bookings.completed_at IS 'Timestamp when lesson was marked as completed';
COMMENT ON COLUMN bookings.quiz_score IS 'Optional quiz score (0-100) for the lesson';
COMMENT ON COLUMN bookings.attendance_verified IS 'Whether student attendance was verified';

-- =====================================================
-- 3. Function: Mark Lesson as Completed
-- =====================================================

CREATE OR REPLACE FUNCTION mark_lesson_completed(
  p_booking_id UUID,
  p_quiz_score INTEGER DEFAULT NULL,
  p_attendance_verified BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  gems_awarded INTEGER,
  transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_gems_result RECORD;
  v_metadata JSONB;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Booking not found', 0, NULL::UUID;
    RETURN;
  END IF;

  -- Check if already completed
  IF v_booking.lesson_status = 'completed' THEN
    RETURN QUERY SELECT FALSE, 'Lesson already marked as completed', 0, NULL::UUID;
    RETURN;
  END IF;

  -- Update booking to completed
  UPDATE bookings
  SET
    lesson_status = 'completed',
    completed_at = NOW(),
    quiz_score = p_quiz_score,
    attendance_verified = p_attendance_verified
  WHERE id = p_booking_id;

  -- Build metadata for activity tracking
  v_metadata := jsonb_build_object(
    'booking_id', p_booking_id,
    'class_id', v_booking.class_id,
    'quiz_score', p_quiz_score,
    'attendance_verified', p_attendance_verified
  );

  -- Award gems for lesson completion
  SELECT * INTO v_gems_result
  FROM award_gems_for_activity(
    v_booking.student_id,
    'lesson_completion',
    v_metadata
  );

  -- Return result
  RETURN QUERY SELECT
    v_gems_result.success,
    v_gems_result.message,
    v_gems_result.gems_awarded,
    v_gems_result.transaction_id;
END;
$$;

COMMENT ON FUNCTION mark_lesson_completed IS 'Marks a booking as completed and awards gems automatically';

-- =====================================================
-- 4. Trigger Function: Auto-complete on Class End
-- =====================================================

CREATE OR REPLACE FUNCTION auto_complete_lesson_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_end_time TIMESTAMPTZ;
  v_gems_result RECORD;
  v_metadata JSONB;
BEGIN
  -- Get class scheduled end time
  SELECT scheduled_at + (duration_minutes || ' minutes')::INTERVAL INTO v_class_end_time
  FROM classes
  WHERE id = NEW.class_id;

  -- Only auto-complete if:
  -- 1. Current time is past class end time
  -- 2. Lesson status is still scheduled or in_progress
  -- 3. Payment status is confirmed
  IF NOW() >= v_class_end_time
    AND NEW.lesson_status IN ('scheduled', 'in_progress')
    AND NEW.payment_status = 'confirmed' THEN

    -- Mark as completed
    NEW.lesson_status := 'completed';
    NEW.completed_at := NOW();
    NEW.attendance_verified := TRUE; -- Assume attended if in booking

    -- Award gems asynchronously (will be handled by Edge Function)
    -- Just mark for processing here
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_auto_complete_lesson ON bookings;
CREATE TRIGGER trigger_auto_complete_lesson
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.lesson_status != OLD.lesson_status OR NEW.completed_at IS DISTINCT FROM OLD.completed_at)
  EXECUTE FUNCTION auto_complete_lesson_trigger();

COMMENT ON TRIGGER trigger_auto_complete_lesson ON bookings IS 'Automatically completes lessons after class end time';

-- =====================================================
-- 5. Function: Get Lesson Completion Stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_lesson_completion_stats(
  p_student_id UUID
) RETURNS TABLE (
  total_lessons INTEGER,
  completed_lessons INTEGER,
  completion_rate NUMERIC,
  avg_quiz_score NUMERIC,
  total_gems_from_lessons INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_lessons,
    COUNT(*) FILTER (WHERE lesson_status = 'completed')::INTEGER AS completed_lessons,
    ROUND(
      (COUNT(*) FILTER (WHERE lesson_status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS completion_rate,
    ROUND(AVG(quiz_score) FILTER (WHERE quiz_score IS NOT NULL), 2) AS avg_quiz_score,
    COALESCE(
      (
        SELECT SUM(gems_awarded)
        FROM activity_tracking
        WHERE student_id = p_student_id
        AND activity_type = 'lesson_completion'
      ),
      0
    )::INTEGER AS total_gems_from_lessons
  FROM bookings
  WHERE student_id = p_student_id
  AND payment_status = 'confirmed';
END;
$$;

COMMENT ON FUNCTION get_lesson_completion_stats IS 'Returns lesson completion statistics for a student';

-- =====================================================
-- 6. RLS Policies
-- =====================================================

-- Students can view their own lesson completion status
-- (Already covered by existing booking RLS policies)

-- Teachers can see lesson completion for their classes
CREATE POLICY "Teachers can view lesson completion for their classes"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = bookings.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- End of Migration 013
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 013 completed: Lesson completion tracking and automatic gem awards enabled';
END $$;
