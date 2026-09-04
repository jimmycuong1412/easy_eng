-- 104_shadowing.sql
-- Free Shadowing — tables, RLS, RPCs.
-- Spec: docs/superpowers/specs/2026-08-21-free-shadowing-design.md
--
-- Model: the PACK is the materials row (type = 'shadowing'); individual clips
-- are child rows here. Clips cannot be their own materials rows because
-- materials.duration_min is CHECK (BETWEEN 1 AND 90) and a clip is ~10s.

-- ============================================================
-- 1. shadowing_clips
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shadowing_clips (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id         uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  idx                 int  NOT NULL CHECK (idx >= 0),
  text_en             text NOT NULL CHECK (length(text_en) BETWEEN 1 AND 300),
  text_vi             text NOT NULL CHECK (length(text_vi) BETWEEN 1 AND 300),
  audio_path          text NOT NULL,
  duration_ms         int  NOT NULL CHECK (duration_ms BETWEEN 500 AND 60000),
  -- Precomputed energy/pause profile the rhythm score compares against.
  -- Built once at content-build time; never computed at runtime.
  reference_envelope  jsonb NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT shadowing_clips_material_idx_unique UNIQUE (material_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_shadowing_clips_material
  ON public.shadowing_clips (material_id, idx);

ALTER TABLE public.shadowing_clips ENABLE ROW LEVEL SECURITY;

-- Anonymous read when the parent pack is published. Mirrors
-- materials_select_published: the published branch has no auth.uid() term,
-- which is what lets cold ad traffic load clips with no session.
DROP POLICY IF EXISTS shadowing_clips_select_published ON public.shadowing_clips;
CREATE POLICY shadowing_clips_select_published
  ON public.shadowing_clips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.materials m
      WHERE m.id = shadowing_clips.material_id
        AND (
          m.status = 'published'
          OR m.author_id = auth.uid()
          OR public.get_my_role() = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS shadowing_clips_write_admin ON public.shadowing_clips;
CREATE POLICY shadowing_clips_write_admin
  ON public.shadowing_clips FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- 2. shadowing_attempts  (append-only history)
-- ============================================================
-- Separate from material_progress because that table is
-- UNIQUE (user_id, material_id) and so cannot hold a history, and
-- improvement-over-time is the retention hook.
CREATE TABLE IF NOT EXISTS public.shadowing_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id        uuid NOT NULL REFERENCES public.shadowing_clips(id) ON DELETE CASCADE,
  word_score     int  NULL CHECK (word_score IS NULL OR word_score BETWEEN 0 AND 100),
  rhythm_score   int  NOT NULL CHECK (rhythm_score BETWEEN 0 AND 100),
  overall_score  int  NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  heard_text     text NOT NULL DEFAULT '',
  -- Stored from day one so adaptive clip selection is possible later
  -- without a backfill. Not read by any Phase A or Phase B code.
  weak_words     text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- word_score is nullable: browsers without SpeechRecognition (Firefox, some
-- Android WebViews) produce a rhythm-only attempt.

CREATE INDEX IF NOT EXISTS idx_shadowing_attempts_user_clip
  ON public.shadowing_attempts (user_id, clip_id, created_at DESC);

ALTER TABLE public.shadowing_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shadowing_attempts_own_select ON public.shadowing_attempts;
CREATE POLICY shadowing_attempts_own_select
  ON public.shadowing_attempts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS shadowing_attempts_own_insert ON public.shadowing_attempts;
CREATE POLICY shadowing_attempts_own_insert
  ON public.shadowing_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. get_shadowing_pack — anonymous-safe pack + clips read
-- ============================================================
-- SECURITY INVOKER on purpose: it must run as the caller so the RLS policies
-- above decide visibility. Anonymous callers see published packs only.
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
  ORDER BY c.idx;
$$;

GRANT EXECUTE ON FUNCTION public.get_shadowing_pack(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_shadowing_pack IS
  'Ordered clips for a shadowing pack. Anonymous-safe: SECURITY INVOKER, relies on RLS. best_score is NULL for anonymous callers.';

-- ============================================================
-- 4. award_shadowing_pack — XP only, once per pack  [PHASE B]
-- ============================================================
-- Deliberately NOT award_material_completion: that function grants gems, and
-- its idempotency guard IS the gem transaction, so a gems-free path through it
-- would have no replay protection and would re-grant XP on every call.
--
-- Guard here is material_progress.completed_at, which is safe because
-- material_progress is UNIQUE (user_id, material_id) — the NULL -> non-NULL
-- transition happens at most once.
CREATE OR REPLACE FUNCTION public.award_shadowing_pack(p_material_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_material     materials%ROWTYPE;
  v_was_complete boolean;
  v_xp           int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Serialize concurrent completions for this (user, material).
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_uid::text || p_material_id::text, 0)
  );

  SELECT * INTO v_material FROM materials WHERE id = p_material_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_material.type <> 'shadowing' THEN
    RAISE EXCEPTION 'not a shadowing pack' USING ERRCODE = 'P0001';
  END IF;

  IF v_material.status <> 'published' THEN
    RAISE EXCEPTION 'material not publishable' USING ERRCODE = 'P0001';
  END IF;

  -- Was this pack already completed before this call?
  SELECT (completed_at IS NOT NULL) INTO v_was_complete
  FROM material_progress
  WHERE user_id = v_uid AND material_id = p_material_id;

  INSERT INTO material_progress (
    user_id, material_id, started_at, last_activity_at, completed_at,
    completion_pct, gems_awarded, xp_awarded, state
  )
  VALUES (
    v_uid, p_material_id, now(), now(), now(),
    100, 0, v_material.xp_reward, 'completed'
  )
  ON CONFLICT (user_id, material_id) DO UPDATE
    SET completed_at     = COALESCE(material_progress.completed_at, EXCLUDED.completed_at),
        last_activity_at = EXCLUDED.last_activity_at,
        completion_pct   = GREATEST(material_progress.completion_pct, EXCLUDED.completion_pct),
        xp_awarded       = CASE WHEN material_progress.completed_at IS NULL
                                THEN EXCLUDED.xp_awarded
                                ELSE material_progress.xp_awarded END,
        state            = 'completed';

  -- Already complete before this call: no ledger write.
  IF COALESCE(v_was_complete, false) THEN
    RETURN jsonb_build_object('already_completed', true, 'xp_awarded', 0);
  END IF;

  v_xp := COALESCE(v_material.xp_reward, 0);

  -- xp_transactions has CHECK (amount > 0): a zero-XP pack must skip the
  -- insert rather than raise. NOTE: column is student_id, not user_id, and
  -- there is no metadata column.
  IF v_xp > 0 THEN
    INSERT INTO xp_transactions (student_id, amount, activity_type, description)
    VALUES (
      v_uid,
      v_xp,
      'shadowing_pack_completion',
      'Hoàn thành gói luyện nói theo: ' || v_material.title_vi
    );
  END IF;

  -- Gems are deliberately never granted for shadowing.
  RETURN jsonb_build_object('already_completed', false, 'xp_awarded', v_xp);
END;
$$;

REVOKE ALL ON FUNCTION public.award_shadowing_pack(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_shadowing_pack(uuid) TO authenticated;

COMMENT ON FUNCTION public.award_shadowing_pack IS
  'XP-only grant for shadowing pack completion. Never grants gems. Idempotent via material_progress.completed_at.';

-- ============================================================
-- 5. record_shadowing_attempt  [PHASE B]
-- ============================================================
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
  v_done        int;
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
    v_uid, p_clip_id, p_word_score, p_rhythm_score, p_overall, COALESCE(p_heard_text, ''), COALESCE(p_weak_words, '{}')
  );

  UPDATE material_progress
     SET last_activity_at = now()
   WHERE user_id = v_uid AND material_id = v_material_id;

  -- Award once every clip in the pack has at least one attempt.
  SELECT COUNT(*) INTO v_total
  FROM shadowing_clips WHERE material_id = v_material_id;

  SELECT COUNT(DISTINCT a.clip_id) INTO v_done
  FROM shadowing_attempts a
  JOIN shadowing_clips c ON c.id = a.clip_id
  WHERE a.user_id = v_uid AND c.material_id = v_material_id;

  IF v_total > 0 AND v_done >= v_total THEN
    v_award := public.award_shadowing_pack(v_material_id);
  END IF;

  RETURN jsonb_build_object('pack_complete', v_done >= v_total, 'award', v_award);
END;
$$;

REVOKE ALL ON FUNCTION public.record_shadowing_attempt(uuid, int, int, int, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_shadowing_attempt(uuid, int, int, int, text, text[]) TO authenticated;
