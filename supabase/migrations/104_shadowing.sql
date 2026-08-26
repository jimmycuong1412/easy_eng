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
