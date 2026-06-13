-- ============================================================================
-- 089: Daily streak RPCs (Growth Plan — Phase 1.1)
-- ============================================================================
-- record_daily_activity: marks one active day for the user, idempotent per day
--   (Asia/Ho_Chi_Minh). Consecutive day → +1; gap → reset to 1. Call from any
--   learning action (material completed, class attended, quiz done).
-- get_my_streak: read-only fetch for the dashboard widget.
-- Applied to production 2026-06-14 via MCP (CI deploy-supabase is broken).

CREATE OR REPLACE FUNCTION public.record_daily_activity(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (current_streak int, longest_streak int, last_attendance_date date, is_new_day boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_row attendance_streaks%ROWTYPE;
  v_new_day boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No user';
  END IF;

  SELECT * INTO v_row FROM attendance_streaks WHERE student_id = v_uid;

  IF NOT FOUND THEN
    INSERT INTO attendance_streaks (student_id, current_streak, longest_streak, last_attendance_date, total_classes_attended)
    VALUES (v_uid, 1, 1, v_today, 0)
    RETURNING * INTO v_row;
    v_new_day := true;
  ELSIF v_row.last_attendance_date IS DISTINCT FROM v_today THEN
    v_new_day := true;
    IF v_row.last_attendance_date = v_today - 1 THEN
      v_row.current_streak := v_row.current_streak + 1;          -- consecutive day
    ELSE
      v_row.current_streak := 1;                                  -- streak broken, restart
    END IF;
    v_row.longest_streak := GREATEST(v_row.longest_streak, v_row.current_streak);
    v_row.last_attendance_date := v_today;
    UPDATE attendance_streaks
      SET current_streak = v_row.current_streak,
          longest_streak = v_row.longest_streak,
          last_attendance_date = v_today,
          updated_at = now()
      WHERE student_id = v_uid;
  END IF;

  RETURN QUERY SELECT v_row.current_streak, v_row.longest_streak, v_row.last_attendance_date, v_new_day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_daily_activity(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_streak()
RETURNS TABLE (current_streak int, longest_streak int, last_attendance_date date, active_today boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(s.current_streak, 0),
    COALESCE(s.longest_streak, 0),
    s.last_attendance_date,
    (s.last_attendance_date = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS active_today
  FROM (SELECT auth.uid() AS uid) me
  LEFT JOIN attendance_streaks s ON s.student_id = me.uid;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_streak() TO authenticated;
