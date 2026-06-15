-- 101_daily_activity_log.sql
-- Per-day activity log for streak calendar views (week / month / year).
-- Previously the system only stored aggregate data (current_streak,
-- longest_streak, last_attendance_date) with no per-day history.
-- This table records one row per user per calendar day (Vietnam TZ).

CREATE TABLE IF NOT EXISTS public.daily_activity_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date       NOT NULL,  -- date in Asia/Ho_Chi_Minh timezone
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT daily_activity_log_user_date_unique UNIQUE (user_id, activity_date)
);

-- Index for calendar range queries (user + date range)
CREATE INDEX IF NOT EXISTS daily_activity_log_user_date_idx
  ON public.daily_activity_log (user_id, activity_date DESC);

-- RLS: users can only read/insert their own rows
ALTER TABLE public.daily_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own activity log"
  ON public.daily_activity_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own activity log"
  ON public.daily_activity_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── Backfill from attendance_streaks ──────────────────────────────────────
-- For every existing user who has a streak, reconstruct the consecutive
-- active days going back from last_attendance_date.
-- Max backfill = current_streak days (we can only know the current run).

INSERT INTO public.daily_activity_log (user_id, activity_date)
SELECT
  s.student_id AS user_id,
  (s.last_attendance_date - offs)::date AS activity_date
FROM public.attendance_streaks s
CROSS JOIN generate_series(0, GREATEST(s.current_streak - 1, 0)) AS offs
WHERE s.last_attendance_date IS NOT NULL
  AND s.current_streak > 0
ON CONFLICT (user_id, activity_date) DO NOTHING;

-- ─── RPC: get_my_activity_dates ────────────────────────────────────────────
-- Returns all activity dates for the calling user in a date range.
-- Used by StreakWidget calendar views to avoid loading the full log.

CREATE OR REPLACE FUNCTION public.get_my_activity_dates(
  p_from date,
  p_to   date
)
RETURNS TABLE (activity_date date)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT activity_date
  FROM daily_activity_log
  WHERE user_id = auth.uid()
    AND activity_date >= p_from
    AND activity_date <= p_to
  ORDER BY activity_date;
$$;

-- ─── Update record_daily_activity to also write to log ─────────────────────

CREATE OR REPLACE FUNCTION public.record_daily_activity(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  current_streak      integer,
  longest_streak      integer,
  last_attendance_date date,
  is_new_day          boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid  := COALESCE(p_user_id, auth.uid());
  v_today   date  := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_row     attendance_streaks%ROWTYPE;
  v_new_day boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No user';
  END IF;

  SELECT * INTO v_row FROM attendance_streaks WHERE student_id = v_uid;

  IF NOT FOUND THEN
    INSERT INTO attendance_streaks
      (student_id, current_streak, longest_streak, last_attendance_date, total_classes_attended)
    VALUES (v_uid, 1, 1, v_today, 0)
    RETURNING * INTO v_row;
    v_new_day := true;

  ELSIF v_row.last_attendance_date IS DISTINCT FROM v_today THEN
    v_new_day := true;
    IF v_row.last_attendance_date = v_today - 1 THEN
      v_row.current_streak := v_row.current_streak + 1;
    ELSE
      v_row.current_streak := 1;
    END IF;
    v_row.longest_streak      := GREATEST(v_row.longest_streak, v_row.current_streak);
    v_row.last_attendance_date := v_today;

    UPDATE attendance_streaks
    SET current_streak       = v_row.current_streak,
        longest_streak       = v_row.longest_streak,
        last_attendance_date = v_today,
        updated_at           = now()
    WHERE student_id = v_uid;
  END IF;

  -- Always upsert today into the log (idempotent)
  INSERT INTO daily_activity_log (user_id, activity_date)
  VALUES (v_uid, v_today)
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  RETURN QUERY
  SELECT v_row.current_streak, v_row.longest_streak, v_row.last_attendance_date, v_new_day;
END;
$$;
