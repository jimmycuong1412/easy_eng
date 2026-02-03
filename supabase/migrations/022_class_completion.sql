-- ============================================================================
-- Migration: Class Completion Tracking
-- Task: T129 - Implement class completion tracking
-- ============================================================================
-- This migration adds database functions and triggers to support:
-- - Session participant counting
-- - XP awards for class completion
-- - Automatic reward distribution
-- ============================================================================

-- ============================================================================
-- Database Functions for Session Management
-- ============================================================================

-- Function: Increment session participant count
CREATE OR REPLACE FUNCTION increment_session_participants(session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE class_sessions
  SET current_participants = current_participants + 1
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Decrement session participant count
CREATE OR REPLACE FUNCTION decrement_session_participants(session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE class_sessions
  SET current_participants = GREATEST(current_participants - 1, 0)
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- XP Award System
-- ============================================================================

-- Function: Award XP to student
CREATE OR REPLACE FUNCTION award_xp(
  p_student_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Check if student_characters table exists and update
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'student_characters'
  ) THEN
    -- Record XP transaction if xp_transactions table exists
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = 'xp_transactions'
    ) THEN
      INSERT INTO xp_transactions (student_id, amount, reason)
      VALUES (p_student_id, p_amount, p_reason);
    END IF;

    -- Update character XP
    UPDATE student_characters
    SET total_xp = total_xp + p_amount,
        updated_at = NOW()
    WHERE student_id = p_student_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Attendance Tracking
-- ============================================================================

-- Function: Calculate participant attendance percentage
CREATE OR REPLACE FUNCTION calculate_attendance_percentage(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_session_duration INTEGER;
  v_participant_duration INTEGER;
  v_attendance_percentage NUMERIC;
BEGIN
  -- Get session duration in seconds
  SELECT EXTRACT(EPOCH FROM (end_time - actual_start_time))::INTEGER
  INTO v_session_duration
  FROM class_sessions
  WHERE id = p_session_id;

  -- Get participant duration
  SELECT duration_seconds
  INTO v_participant_duration
  FROM session_participants
  WHERE session_id = p_session_id AND user_id = p_user_id;

  -- Calculate percentage
  IF v_session_duration IS NULL OR v_session_duration = 0 THEN
    RETURN 0;
  END IF;

  v_attendance_percentage := (v_participant_duration::NUMERIC / v_session_duration::NUMERIC) * 100;

  RETURN ROUND(v_attendance_percentage, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Automatic Presence Marking
-- ============================================================================

-- Function: Update participant presence based on attendance threshold
CREATE OR REPLACE FUNCTION update_participant_presence()
RETURNS TRIGGER AS $$
DECLARE
  v_session_duration INTEGER;
  v_attendance_threshold NUMERIC := 0.5; -- 50% threshold
BEGIN
  -- Only process when left_at is set (participant leaving)
  IF NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    -- Calculate duration in seconds
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.left_at - NEW.joined_at))::INTEGER;

    -- Get session duration
    SELECT EXTRACT(EPOCH FROM (end_time - actual_start_time))::INTEGER
    INTO v_session_duration
    FROM class_sessions
    WHERE id = NEW.session_id;

    -- If session hasn't ended yet, use current time
    IF v_session_duration IS NULL THEN
      SELECT EXTRACT(EPOCH FROM (NOW() - actual_start_time))::INTEGER
      INTO v_session_duration
      FROM class_sessions
      WHERE id = NEW.session_id;
    END IF;

    -- Mark as present if attended >= 50% of session
    IF v_session_duration > 0 THEN
      NEW.is_present := (NEW.duration_seconds::NUMERIC / v_session_duration::NUMERIC) >= v_attendance_threshold;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic presence marking
DROP TRIGGER IF EXISTS trg_update_participant_presence ON session_participants;
CREATE TRIGGER trg_update_participant_presence
  BEFORE UPDATE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_presence();

-- ============================================================================
-- Session Completion Tracking
-- ============================================================================

-- Function: Mark session participants' final attendance on session end
CREATE OR REPLACE FUNCTION finalize_session_attendance()
RETURNS TRIGGER AS $$
DECLARE
  v_participant RECORD;
  v_session_duration INTEGER;
BEGIN
  -- Only process when session status changes to 'ended'
  IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
    -- Calculate total session duration
    v_session_duration := EXTRACT(EPOCH FROM (NEW.end_time - NEW.actual_start_time))::INTEGER;

    -- Update all participants who haven't left yet
    UPDATE session_participants
    SET left_at = NEW.end_time,
        duration_seconds = EXTRACT(EPOCH FROM (NEW.end_time - joined_at))::INTEGER
    WHERE session_id = NEW.id
      AND left_at IS NULL;

    -- Update presence for all participants
    FOR v_participant IN
      SELECT * FROM session_participants WHERE session_id = NEW.id
    LOOP
      UPDATE session_participants
      SET is_present = (
        CASE
          WHEN v_session_duration > 0 THEN
            (duration_seconds::NUMERIC / v_session_duration::NUMERIC) >= 0.5
          ELSE false
        END
      )
      WHERE id = v_participant.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session completion
DROP TRIGGER IF EXISTS trg_finalize_session_attendance ON class_sessions;
CREATE TRIGGER trg_finalize_session_attendance
  AFTER UPDATE ON class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION finalize_session_attendance();

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for faster participant lookups by session
CREATE INDEX IF NOT EXISTS idx_session_participants_session_user
  ON session_participants(session_id, user_id);

-- Index for faster presence queries
CREATE INDEX IF NOT EXISTS idx_session_participants_present
  ON session_participants(session_id, is_present)
  WHERE is_present = true;

-- Index for faster session status queries
CREATE INDEX IF NOT EXISTS idx_class_sessions_status
  ON class_sessions(status);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION increment_session_participants IS
  'Increments the participant count for a live session';

COMMENT ON FUNCTION decrement_session_participants IS
  'Decrements the participant count when a participant leaves';

COMMENT ON FUNCTION award_xp IS
  'Awards XP to a student and records the transaction';

COMMENT ON FUNCTION calculate_attendance_percentage IS
  'Calculates the attendance percentage for a participant in a session';

COMMENT ON FUNCTION update_participant_presence IS
  'Automatically marks participant as present if they attended >= 50% of session';

COMMENT ON FUNCTION finalize_session_attendance IS
  'Finalizes attendance tracking when a session ends';

-- ============================================================================
-- Usage Notes
-- ============================================================================

/*
This migration provides the database foundation for class completion tracking:

1. Participant Counting:
   - increment_session_participants() - Called when someone joins
   - decrement_session_participants() - Called when someone leaves

2. XP System:
   - award_xp() - Awards XP and records transaction
   - Works with existing student_characters table if present

3. Attendance Tracking:
   - Automatic presence marking based on 50% threshold
   - Triggered when participant leaves or session ends
   - calculate_attendance_percentage() for queries

4. Session Finalization:
   - Automatic trigger when session status changes to 'ended'
   - Updates all remaining participants' left_at time
   - Marks presence for all participants based on attendance

5. Integration Points:
   - Used by cometchat-webhook Edge Function
   - Used by award-class-rewards Edge Function
   - Used by classSession.ts utilities

Example Usage:

-- Manually mark a participant as present
UPDATE session_participants
SET is_present = true
WHERE session_id = 'xxx' AND user_id = 'yyy';

-- Get attendance percentage
SELECT calculate_attendance_percentage('session-id', 'user-id');

-- Award XP to a student
SELECT award_xp('student-id', 50, 'class_completion');

-- Increment participant count
SELECT increment_session_participants('session-id');
*/
