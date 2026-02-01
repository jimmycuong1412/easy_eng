-- Migration 014: Attendance Streaks for Gem Bonuses
-- Purpose: Track consecutive class attendance and award streak bonuses

-- =====================================================
-- 1. Attendance Streaks Table
-- =====================================================

CREATE TABLE IF NOT EXISTS attendance_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  last_attendance_date DATE,
  streak_started_at DATE,
  streak_broken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per student
  CONSTRAINT unique_student_streak UNIQUE (student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_streaks_student
  ON attendance_streaks(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_streaks_current
  ON attendance_streaks(current_streak DESC)
  WHERE current_streak > 0;

-- Comments
COMMENT ON TABLE attendance_streaks IS 'Tracks consecutive class attendance streaks for students';
COMMENT ON COLUMN attendance_streaks.current_streak IS 'Current number of consecutive days with attendance';
COMMENT ON COLUMN attendance_streaks.longest_streak IS 'Longest streak ever achieved by student';
COMMENT ON COLUMN attendance_streaks.last_attendance_date IS 'Most recent date of class attendance';
COMMENT ON COLUMN attendance_streaks.streak_started_at IS 'Date when current streak began';

-- =====================================================
-- 2. Function: Update Attendance Streak
-- =====================================================

CREATE OR REPLACE FUNCTION update_attendance_streak(
  p_student_id UUID,
  p_attendance_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  current_streak INTEGER,
  previous_streak INTEGER,
  is_new_record BOOLEAN,
  streak_bonus_awarded BOOLEAN,
  gems_awarded INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_streak RECORD;
  v_previous_streak INTEGER;
  v_is_consecutive BOOLEAN;
  v_new_streak INTEGER;
  v_is_new_record BOOLEAN := FALSE;
  v_streak_bonus_awarded BOOLEAN := FALSE;
  v_gems_awarded INTEGER := 0;
  v_gems_result RECORD;
BEGIN
  -- Get or create streak record
  INSERT INTO attendance_streaks (student_id, current_streak, longest_streak, last_attendance_date, streak_started_at)
  VALUES (p_student_id, 0, 0, NULL, NULL)
  ON CONFLICT (student_id) DO NOTHING;

  -- Lock the row for update
  SELECT * INTO v_streak
  FROM attendance_streaks
  WHERE student_id = p_student_id
  FOR UPDATE;

  v_previous_streak := v_streak.current_streak;

  -- Check if attendance is consecutive (same day or next day)
  IF v_streak.last_attendance_date IS NULL THEN
    -- First attendance ever
    v_is_consecutive := TRUE;
    v_new_streak := 1;
  ELSIF p_attendance_date = v_streak.last_attendance_date THEN
    -- Same day attendance (already counted)
    RETURN QUERY SELECT
      v_streak.current_streak,
      v_previous_streak,
      FALSE,
      FALSE,
      0;
    RETURN;
  ELSIF p_attendance_date = v_streak.last_attendance_date + 1 THEN
    -- Next consecutive day
    v_is_consecutive := TRUE;
    v_new_streak := v_streak.current_streak + 1;
  ELSIF p_attendance_date > v_streak.last_attendance_date + 1 THEN
    -- Streak broken (gap in attendance)
    v_is_consecutive := FALSE;
    v_new_streak := 1;
  ELSE
    -- Past date (ignore)
    RETURN QUERY SELECT
      v_streak.current_streak,
      v_previous_streak,
      FALSE,
      FALSE,
      0;
    RETURN;
  END IF;

  -- Check if new record
  IF v_new_streak > v_streak.longest_streak THEN
    v_is_new_record := TRUE;
  END IF;

  -- Update streak record
  UPDATE attendance_streaks
  SET
    current_streak = v_new_streak,
    longest_streak = GREATEST(v_new_streak, longest_streak),
    last_attendance_date = p_attendance_date,
    streak_started_at = CASE
      WHEN v_is_consecutive AND streak_started_at IS NOT NULL THEN streak_started_at
      ELSE p_attendance_date
    END,
    streak_broken_at = CASE
      WHEN NOT v_is_consecutive AND current_streak > 0 THEN NOW()
      ELSE streak_broken_at
    END,
    updated_at = NOW()
  WHERE student_id = p_student_id;

  -- Award streak bonus if milestone reached
  -- Check gem_earning_rules for attendance_streak conditions
  IF v_new_streak >= 3 AND v_new_streak % 7 = 0 THEN
    -- Award bonus for weekly streak (7, 14, 21, etc days)
    SELECT * INTO v_gems_result
    FROM award_gems_for_activity(
      p_student_id,
      'attendance_streak',
      jsonb_build_object(
        'streak_length', v_new_streak,
        'streak_type', 'weekly',
        'attendance_date', p_attendance_date
      )
    );

    IF v_gems_result.success THEN
      v_streak_bonus_awarded := TRUE;
      v_gems_awarded := v_gems_result.gems_awarded;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_new_streak AS current_streak,
    v_previous_streak AS previous_streak,
    v_is_new_record AS is_new_record,
    v_streak_bonus_awarded AS streak_bonus_awarded,
    v_gems_awarded AS gems_awarded;
END;
$$;

COMMENT ON FUNCTION update_attendance_streak IS 'Updates student attendance streak and awards bonus gems for milestones';

-- =====================================================
-- 3. Trigger: Auto-Update Streak on Lesson Completion
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_update_streak_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_date DATE;
  v_streak_result RECORD;
BEGIN
  -- Only process if lesson was just completed
  IF NEW.lesson_status = 'completed' AND (OLD.lesson_status IS NULL OR OLD.lesson_status != 'completed') THEN
    -- Get the class date
    SELECT DATE(scheduled_at) INTO v_class_date
    FROM classes
    WHERE id = NEW.class_id;

    -- Update attendance streak
    SELECT * INTO v_streak_result
    FROM update_attendance_streak(NEW.student_id, v_class_date);

    -- Log streak update in activity metadata
    IF v_streak_result.current_streak > 0 THEN
      RAISE NOTICE 'Updated streak for student %: % days (gems awarded: %)',
        NEW.student_id, v_streak_result.current_streak, v_streak_result.gems_awarded;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_streak_on_lesson_completion ON bookings;
CREATE TRIGGER trigger_update_streak_on_lesson_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.lesson_status = 'completed')
  EXECUTE FUNCTION trigger_update_streak_on_completion();

COMMENT ON TRIGGER trigger_update_streak_on_lesson_completion ON bookings IS 'Automatically updates attendance streak when lessons are completed';

-- =====================================================
-- 4. Function: Get Student Streak Stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_student_streak_stats(
  p_student_id UUID
) RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  days_until_break INTEGER,
  streak_rank INTEGER,
  total_gems_from_streaks INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_days_until_break INTEGER;
  v_streak_rank INTEGER;
BEGIN
  -- Calculate days until streak breaks (2 days without attendance)
  SELECT
    CASE
      WHEN last_attendance_date IS NULL THEN 0
      WHEN CURRENT_DATE - last_attendance_date >= 1 THEN 0
      ELSE 2 - (CURRENT_DATE - last_attendance_date)
    END
  INTO v_days_until_break
  FROM attendance_streaks
  WHERE student_id = p_student_id;

  -- Calculate streak rank (position among all students)
  SELECT COUNT(*) + 1 INTO v_streak_rank
  FROM attendance_streaks
  WHERE current_streak > (
    SELECT COALESCE(current_streak, 0)
    FROM attendance_streaks
    WHERE student_id = p_student_id
  );

  RETURN QUERY
  SELECT
    COALESCE(s.current_streak, 0)::INTEGER AS current_streak,
    COALESCE(s.longest_streak, 0)::INTEGER AS longest_streak,
    COALESCE(v_days_until_break, 0)::INTEGER AS days_until_break,
    v_streak_rank::INTEGER AS streak_rank,
    COALESCE(
      (
        SELECT SUM(gems_awarded)
        FROM activity_tracking
        WHERE student_id = p_student_id
        AND activity_type = 'attendance_streak'
      ),
      0
    )::INTEGER AS total_gems_from_streaks
  FROM attendance_streaks s
  WHERE s.student_id = p_student_id;

  -- If no streak record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 999999, 0;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_student_streak_stats IS 'Returns comprehensive streak statistics for a student';

-- =====================================================
-- 5. Function: Get Top Streaks Leaderboard
-- =====================================================

CREATE OR REPLACE FUNCTION get_streak_leaderboard(
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  current_streak INTEGER,
  longest_streak INTEGER,
  streak_started_at DATE,
  rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.student_id,
    p.display_name AS student_name,
    s.current_streak,
    s.longest_streak,
    s.streak_started_at,
    ROW_NUMBER() OVER (ORDER BY s.current_streak DESC, s.longest_streak DESC)::INTEGER AS rank
  FROM attendance_streaks s
  JOIN profiles p ON p.id = s.student_id
  WHERE s.current_streak > 0
  ORDER BY s.current_streak DESC, s.longest_streak DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_streak_leaderboard IS 'Returns top students by current attendance streak';

-- =====================================================
-- 6. RLS Policies
-- =====================================================

ALTER TABLE attendance_streaks ENABLE ROW LEVEL SECURITY;

-- Students can view their own streak
CREATE POLICY "Students can view own streak"
  ON attendance_streaks
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Admins can view all streaks
CREATE POLICY "Admins can view all streaks"
  ON attendance_streaks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only service role can update streaks (via triggers/functions)
CREATE POLICY "Service role can manage streaks"
  ON attendance_streaks
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- =====================================================
-- 7. Grants
-- =====================================================

GRANT SELECT ON attendance_streaks TO authenticated;
GRANT ALL ON attendance_streaks TO service_role;

-- =====================================================
-- End of Migration 014
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 014 completed: Attendance streak tracking enabled';
END $$;
