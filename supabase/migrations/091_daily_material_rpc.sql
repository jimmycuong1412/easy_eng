-- ============================================================================
-- 091: "Bài học hôm nay" / Daily lesson picker (Growth Plan — Phase 1.2)
-- ============================================================================
-- Deterministic per (user, day): pick one published material the user has not
-- completed, ordered by a stable hash of (material id + today) so it stays the
-- same all day. Falls back to completed materials if the user finished all.
-- Applied to production 2026-06-14 via MCP (CI deploy-supabase is broken).

CREATE OR REPLACE FUNCTION public.get_daily_material()
RETURNS TABLE (id uuid, slug text, type material_type, level material_level,
               title_vi text, title_en text, summary_vi text, duration_min int,
               gems_reward int, xp_reward int, already_completed boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT auth.uid() AS uid,
           (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS today
  ),
  done AS (
    SELECT material_id FROM material_progress, me
    WHERE user_id = me.uid AND completed_at IS NOT NULL
  ),
  pool AS (
    SELECT m.*, (m.id IN (SELECT material_id FROM done)) AS is_done
    FROM materials m WHERE m.status = 'published'
  ),
  ranked AS (
    SELECT p.*, md5(p.id::text || (SELECT today::text FROM me)) AS ord
    FROM pool p
    ORDER BY p.is_done ASC, ord
    LIMIT 1
  )
  SELECT r.id, r.slug, r.type, r.level, r.title_vi, r.title_en, r.summary_vi,
         r.duration_min, r.gems_reward, r.xp_reward, r.is_done
  FROM ranked r;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_material() TO authenticated;
