-- 106_shadowing_phase_b_fixes.sql
-- Phase B corrections to objects created in 104_shadowing.sql.
-- Spec: docs/superpowers/specs/2026-08-21-free-shadowing-design.md
--
-- Three fixes, all found by the Phase A whole-branch review:
--   1. Pack award required only that every clip had SOME attempt. The spec
--      says "at or above threshold". Ten 0% grunts collected full XP.
--   2. shadowing_attempts.user_id referenced auth.users while
--      material_progress.user_id references profiles. record_shadowing_attempt
--      writes both in one transaction, so a user with no profiles row failed
--      mid-transaction with an FK violation.
--   3. get_shadowing_pack ignored status/deleted_at, so authors and admins saw
--      archived and soft-deleted packs as live practice pages.

-- ============================================================
-- 1. Repoint shadowing_attempts.user_id at profiles
-- ============================================================
-- profiles.id is itself FK'd to auth.users, so this is a narrowing, not a
-- widening: every profiles row already corresponds to an auth user.
ALTER TABLE public.shadowing_attempts
  DROP CONSTRAINT IF EXISTS shadowing_attempts_user_id_fkey;

ALTER TABLE public.shadowing_attempts
  ADD CONSTRAINT shadowing_attempts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================================
-- 2. Threshold-aware get_shadowing_pack (also fixes visibility)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_shadowing_pack(p_slug text)
RETURNS TABLE (
  clip_id            uuid,
  idx                int,
  text_en            text,
  text_vi            text,
  audio_path         text,
  duration_ms        int,
  reference_envelope jsonb,
  best_score         int
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.idx,
    c.text_en,
    c.text_vi,
    c.audio_path,
    c.duration_ms,
    c.reference_envelope,
    (
      SELECT MAX(a.overall_score)
      FROM shadowing_attempts a
      WHERE a.clip_id = c.id
        AND a.user_id = auth.uid()
    )::int AS best_score
  FROM shadowing_clips c
  JOIN materials m ON m.id = c.material_id
  WHERE m.slug = p_slug
    AND m.type = 'shadowing'
    -- Archived and soft-deleted packs are not practisable, not even for
    -- their author or an admin (RLS already hides them from anonymous users).
    AND m.status = 'published'
    AND m.deleted_at IS NULL
  ORDER BY c.idx;
$$;

GRANT EXECUTE ON FUNCTION public.get_shadowing_pack(text) TO anon, authenticated;

-- ============================================================
-- 3. Threshold-enforcing record_shadowing_attempt
-- ============================================================
-- The minimum overall score that counts a clip as practised. Kept as a
-- function so the value has exactly one definition on the server side.
CREATE OR REPLACE FUNCTION public.shadowing_pass_threshold()
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$ SELECT 60; $$;

COMMENT ON FUNCTION public.shadowing_pass_threshold IS
  'Minimum overall_score for a shadowing clip to count toward pack completion.';

CREATE OR REPLACE FUNCTION public.record_shadowing_attempt(
  p_clip_id      uuid,
  p_word_score   int,
  p_rhythm_score int,
  p_overall      int,
  p_heard_text   text DEFAULT '',
  p_weak_words   text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_material_id uuid;
  v_total       int;
  v_passed      int;
  v_threshold   int := public.shadowing_pass_threshold();
  v_award       jsonb := jsonb_build_object('already_completed', true, 'xp_awarded', 0);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT material_id INTO v_material_id
  FROM shadowing_clips WHERE id = p_clip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clip not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO shadowing_attempts (
    user_id, clip_id, word_score, rhythm_score, overall_score, heard_text, weak_words
  )
  VALUES (
    v_uid, p_clip_id, p_word_score, p_rhythm_score, p_overall,
    COALESCE(p_heard_text, ''), COALESCE(p_weak_words, '{}')
  );

  -- Keep an in-progress row warm so the pack shows activity before completion.
  -- (The Phase A version UPDATEd a row that does not exist yet on a first
  -- attempt, silently doing nothing.)
  INSERT INTO material_progress (
    user_id, material_id, started_at, last_activity_at,
    completion_pct, gems_awarded, xp_awarded, state
  )
  VALUES (v_uid, v_material_id, now(), now(), 0, 0, 0, 'in_progress')
  ON CONFLICT (user_id, material_id) DO UPDATE
    SET last_activity_at = now();

  SELECT COUNT(*) INTO v_total
  FROM shadowing_clips WHERE material_id = v_material_id;

  -- Only clips whose BEST attempt reaches the threshold count. A clip the user
  -- has attempted badly many times does not count; one good attempt does, and
  -- a later bad attempt cannot un-count it.
  SELECT COUNT(*) INTO v_passed
  FROM (
    SELECT a.clip_id
    FROM shadowing_attempts a
    JOIN shadowing_clips c ON c.id = a.clip_id
    WHERE a.user_id = v_uid AND c.material_id = v_material_id
    GROUP BY a.clip_id
    HAVING MAX(a.overall_score) >= v_threshold
  ) passed_clips;

  IF v_total > 0 AND v_passed >= v_total THEN
    v_award := public.award_shadowing_pack(v_material_id);
  END IF;

  RETURN jsonb_build_object(
    'pack_complete', (v_total > 0 AND v_passed >= v_total),
    'clips_passed',  v_passed,
    'clips_total',   v_total,
    'award',         v_award
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_shadowing_attempt(uuid, int, int, int, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_shadowing_attempt(uuid, int, int, int, text, text[]) TO authenticated;

COMMENT ON FUNCTION public.record_shadowing_attempt IS
  'Records one shadowing attempt. Awards the pack only when EVERY clip has a best attempt >= shadowing_pass_threshold(). Never grants gems.';
