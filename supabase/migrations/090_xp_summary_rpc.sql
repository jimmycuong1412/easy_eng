-- ============================================================================
-- 090: Career-independent XP/level summary (Growth Plan — Phase 1.4)
-- ============================================================================
-- Dashboard needs a level that works for EVERY learner, even those who have
-- not picked a career (career XP lives in student_careers). This sums all
-- xp_transactions and derives a level from a gentle curve:
--   level = floor(sqrt(totalXp / 50)) + 1   (50→L2, 200→L3, 800→L5 …)
-- Also exposes the active career level when one exists.
-- Applied to production 2026-06-14 via MCP (CI deploy-supabase is broken).

CREATE OR REPLACE FUNCTION public.get_my_xp_summary()
RETURNS TABLE (
  total_xp int,
  level int,
  xp_in_level int,
  xp_for_next int,
  progress_pct int,
  career_level int
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  agg AS (
    SELECT COALESCE(SUM(amount), 0)::int AS total_xp
    FROM xp_transactions, me WHERE student_id = me.uid
  ),
  lvl AS (
    SELECT total_xp, GREATEST(1, FLOOR(SQRT(total_xp::numeric / 50)) + 1)::int AS level FROM agg
  ),
  band AS (
    SELECT total_xp, level,
      (50 * (level - 1) * (level - 1))::int AS lvl_start_xp,
      (50 * level * level)::int AS lvl_end_xp
    FROM lvl
  )
  SELECT
    b.total_xp,
    b.level,
    (b.total_xp - b.lvl_start_xp) AS xp_in_level,
    (b.lvl_end_xp - b.lvl_start_xp) AS xp_for_next,
    LEAST(100, GREATEST(0, ROUND(
      (b.total_xp - b.lvl_start_xp)::numeric
      / NULLIF(b.lvl_end_xp - b.lvl_start_xp, 0) * 100)))::int AS progress_pct,
    (SELECT current_level FROM student_careers sc, me
       WHERE sc.student_id = me.uid AND sc.is_active = true LIMIT 1) AS career_level
  FROM band b;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_xp_summary() TO authenticated;
