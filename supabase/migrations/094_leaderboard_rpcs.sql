-- ============================================================================
-- 094: Career-independent leaderboards (Growth Plan — Phase 2.2)
-- ============================================================================
-- The page previously ranked student_careers (career XP), which is empty for
-- users who never picked a career. These rank by total xp_transactions and by
-- current streak so every learner appears. SECURITY DEFINER for cross-user
-- ranking; only public-safe columns are returned.
-- Applied to production 2026-06-14 via MCP (CI deploy-supabase is broken).

CREATE OR REPLACE FUNCTION public.get_xp_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (rank int, user_id uuid, full_name text, avatar_url text, total_xp bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY x.total_xp DESC, p.full_name ASC)::int AS rank,
    x.student_id AS user_id,
    COALESCE(p.full_name, 'Học viên') AS full_name,
    p.avatar_url,
    x.total_xp
  FROM (
    SELECT student_id, SUM(amount)::bigint AS total_xp
    FROM xp_transactions GROUP BY student_id HAVING SUM(amount) > 0
  ) x
  JOIN profiles p ON p.id = x.student_id AND p.role = 'student' AND p.is_active = true
  ORDER BY x.total_xp DESC, p.full_name ASC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_xp_leaderboard(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_streak_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (rank int, user_id uuid, full_name text, avatar_url text, current_streak int, longest_streak int)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY s.current_streak DESC, s.longest_streak DESC, p.full_name ASC)::int AS rank,
    s.student_id AS user_id,
    COALESCE(p.full_name, 'Học viên') AS full_name,
    p.avatar_url,
    s.current_streak,
    s.longest_streak
  FROM attendance_streaks s
  JOIN profiles p ON p.id = s.student_id AND p.role = 'student' AND p.is_active = true
  WHERE s.current_streak > 0
  ORDER BY s.current_streak DESC, s.longest_streak DESC, p.full_name ASC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_streak_leaderboard(int) TO authenticated;
