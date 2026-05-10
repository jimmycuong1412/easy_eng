-- Migration 080: Materials Library — Vietnamese-targeted curriculum
-- Spec: specs/001-english-learning-platform/features/materials-library/data-model.md
-- Date: 2026-05-10
--
-- Creates the canonical schema for the platform-wide Materials Library:
-- 12 tables + 4 enums + indexes + triggers. RLS, storage, RPC, and seed
-- live in subsequent migrations 081–084.
--
-- This migration is additive — does not touch the existing class_materials
-- table (per-class teacher uploads is a different feature).

-- ============================================================
-- 1. Enumerated types
-- ============================================================
DO $$ BEGIN
  CREATE TYPE material_type AS ENUM (
    'vocabulary_pack', 'grammar_lesson', 'reading_passage',
    'listening_audio', 'dialogue', 'mock_test'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE material_level AS ENUM ('a1', 'a2', 'b1', 'b2', 'c1');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE material_status AS ENUM ('draft', 'in_review', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE material_goal AS ENUM (
    'school', 'vstep', 'toeic', 'ielts', 'business',
    'study_abroad', 'conversation', 'travel'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add 'material_completion' to the existing gem_transaction_type enum
-- Must run in its own transaction (cannot ALTER TYPE … ADD VALUE inside a
-- transaction block that also USES the new value). Migration is split so
-- subsequent CHECK-constraint update can reference the new label.
ALTER TYPE gem_transaction_type ADD VALUE IF NOT EXISTS 'material_completion';

-- Update the gem_transactions positive_earned CHECK constraint so the new
-- 'material_completion' label is accepted (only positive amounts).
-- The constraint hard-codes the allowed enum values; without this update,
-- INSERTs from award_material_completion would fail with check_violation.
ALTER TABLE gem_transactions DROP CONSTRAINT IF EXISTS positive_earned;

ALTER TABLE gem_transactions ADD CONSTRAINT positive_earned CHECK (
  (amount > 0 AND transaction_type IN (
    'first_booking_bonus',
    'class_completion',
    'referral_bonus',
    'daily_login',
    'quiz_completion',
    'homework_submission',
    'admin_grant',
    'gem_purchase',
    'gem_purchase_refund',
    'material_completion'
  )) OR (amount < 0 AND transaction_type IN (
    'booking_discount',
    'booking_payment',
    'admin_deduction'
  ))
);

-- ============================================================
-- 2. updated_at trigger (shared)
-- ============================================================
CREATE OR REPLACE FUNCTION public.materials_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. materials (canonical row)
-- ============================================================
CREATE TABLE IF NOT EXISTS materials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text UNIQUE NOT NULL CHECK (length(slug) <= 96
                                                  AND slug ~ '^[a-z0-9-]+$'),
  type                material_type NOT NULL,
  level               material_level NOT NULL,
  status              material_status NOT NULL DEFAULT 'draft',
  goal                material_goal NULL,

  title_vi            text NOT NULL CHECK (length(title_vi) <= 200),
  title_en            text NULL,
  summary_vi          text NOT NULL CHECK (length(summary_vi) <= 500),
  summary_en          text NULL,
  body_vi             text NOT NULL,
  body_en             text NULL,

  duration_min        int  NOT NULL CHECK (duration_min BETWEEN 1 AND 90),
  gems_reward         int  NOT NULL DEFAULT 3 CHECK (gems_reward >= 0),
  xp_reward           int  NOT NULL DEFAULT 40 CHECK (xp_reward >= 0),
  min_completion_pct  int  NOT NULL DEFAULT 80
                           CHECK (min_completion_pct BETWEEN 0 AND 100),

  cover_path          text NULL,
  popularity_score    numeric(10,2) NOT NULL DEFAULT 0,

  author_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  last_editor_id      uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  published_at        timestamptz NULL,
  published_by        uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  archived_at         timestamptz NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,

  CONSTRAINT materials_published_bilingual_chk CHECK (
    status <> 'published'
    OR (title_en IS NOT NULL AND summary_en IS NOT NULL AND body_en IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_materials_published
  ON materials (status, level, type) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_materials_goal
  ON materials (goal) WHERE goal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_popularity
  ON materials (popularity_score DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_materials_fts
  ON materials USING gin (
    to_tsvector('simple',
      coalesce(title_vi, '') || ' ' || coalesce(title_en, '') || ' ' ||
      coalesce(summary_vi, '') || ' ' || coalesce(summary_en, '')
    )
  ) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_materials_author
  ON materials (author_id, updated_at DESC);

DROP TRIGGER IF EXISTS materials_updated_at ON materials;
CREATE TRIGGER materials_updated_at BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION materials_set_updated_at();

-- ============================================================
-- 4. material_sections
-- ============================================================
CREATE TABLE IF NOT EXISTS material_sections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id   uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  idx           int  NOT NULL CHECK (idx >= 0),
  kind          text NOT NULL CHECK (kind IN (
                  'intro', 'pattern', 'drill', 'passage',
                  'audio', 'dialogue_line', 'test_block'
                )),
  body_vi       text NULL,
  body_en       text NULL,
  audio_path    text NULL,
  duration_sec  int  NULL,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_sections_material_idx_unique UNIQUE (material_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_material_sections_material
  ON material_sections (material_id, idx);

DROP TRIGGER IF EXISTS material_sections_updated_at ON material_sections;
CREATE TRIGGER material_sections_updated_at BEFORE UPDATE ON material_sections
  FOR EACH ROW EXECUTE FUNCTION materials_set_updated_at();

-- ============================================================
-- 5. Helper: assert parent material is of expected type
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_parent_material_type(expected material_type)
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  actual material_type;
BEGIN
  SELECT type INTO actual FROM materials WHERE id = NEW.material_id;
  IF actual IS NULL THEN
    RAISE EXCEPTION 'parent material % not found', NEW.material_id;
  END IF;
  IF actual <> expected THEN
    RAISE EXCEPTION 'parent material type % does not match expected %', actual, expected;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 6. vocabulary_items
-- ============================================================
CREATE TABLE IF NOT EXISTS vocabulary_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id       uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  idx               int  NOT NULL,
  term              text NOT NULL,
  pos               text NULL,
  ipa               text NULL,
  vi_phonetic_hint  text NULL,
  gloss_vi          text NOT NULL,
  gloss_en          text NULL,
  example_en        text NOT NULL,
  example_vi        text NOT NULL,
  audio_path        text NULL,
  image_path        text NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vocab_items_material_idx_unique UNIQUE (material_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_vocab_items_material
  ON vocabulary_items (material_id, idx);

DROP TRIGGER IF EXISTS vocab_items_parent_type_trg ON vocabulary_items;
CREATE TRIGGER vocab_items_parent_type_trg
  BEFORE INSERT OR UPDATE ON vocabulary_items
  FOR EACH ROW EXECUTE FUNCTION check_parent_material_type('vocabulary_pack');

DROP TRIGGER IF EXISTS vocab_items_updated_at ON vocabulary_items;
CREATE TRIGGER vocab_items_updated_at BEFORE UPDATE ON vocabulary_items
  FOR EACH ROW EXECUTE FUNCTION materials_set_updated_at();

-- ============================================================
-- 7. mock_test_items
-- ============================================================
CREATE TABLE IF NOT EXISTS mock_test_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id     uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  idx             int  NOT NULL,
  format          text NOT NULL CHECK (format IN (
                    'multiple_choice', 'fill_in_blank', 'true_false', 'matching'
                  )),
  prompt_vi       text NOT NULL,
  prompt_en       text NOT NULL,
  options_en      text[] NOT NULL CHECK (array_length(options_en, 1) BETWEEN 2 AND 6),
  options_vi      text[] NULL,
  correct_index   int  NOT NULL CHECK (correct_index >= 0),
  explanation_vi  text NOT NULL,
  explanation_en  text NULL,
  points          int  NOT NULL DEFAULT 1 CHECK (points BETWEEN 1 AND 10),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mock_test_items_idx_unique UNIQUE (material_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_mock_test_items_material
  ON mock_test_items (material_id, idx);

DROP TRIGGER IF EXISTS mock_test_items_parent_type_trg ON mock_test_items;
CREATE TRIGGER mock_test_items_parent_type_trg
  BEFORE INSERT OR UPDATE ON mock_test_items
  FOR EACH ROW EXECUTE FUNCTION check_parent_material_type('mock_test');

DROP TRIGGER IF EXISTS mock_test_items_updated_at ON mock_test_items;
CREATE TRIGGER mock_test_items_updated_at BEFORE UPDATE ON mock_test_items
  FOR EACH ROW EXECUTE FUNCTION materials_set_updated_at();

-- ============================================================
-- 8. material_assets
-- ============================================================
CREATE TABLE IF NOT EXISTS material_assets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id         uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  kind                text NOT NULL CHECK (kind IN ('audio', 'image', 'pdf', 'transcript')),
  path                text NOT NULL UNIQUE,
  original_filename   text NULL,
  mime_type           text NOT NULL,
  size_bytes          bigint NOT NULL,
  duration_sec        int NULL,
  width               int NULL,
  height              int NULL,
  uploaded_by         uuid NOT NULL REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_assets_material
  ON material_assets (material_id, kind);

-- ============================================================
-- 9. material_tags + material_tag_links
-- ============================================================
CREATE TABLE IF NOT EXISTS material_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  label_vi    text NOT NULL,
  label_en    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_tag_links (
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES material_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (material_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_material_tag_links_tag
  ON material_tag_links (tag_id);

-- ============================================================
-- 10. material_collections + material_collection_items
-- ============================================================
CREATE TABLE IF NOT EXISTS material_collections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  title_vi      text NOT NULL,
  title_en      text NOT NULL,
  summary_vi    text NOT NULL,
  summary_en    text NULL,
  cover_path    text NULL,
  goal          material_goal NULL,
  status        material_status NOT NULL DEFAULT 'draft',
  author_id     uuid NOT NULL REFERENCES profiles(id),
  published_at  timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS material_collections_updated_at ON material_collections;
CREATE TRIGGER material_collections_updated_at BEFORE UPDATE ON material_collections
  FOR EACH ROW EXECUTE FUNCTION materials_set_updated_at();

CREATE TABLE IF NOT EXISTS material_collection_items (
  collection_id uuid NOT NULL REFERENCES material_collections(id) ON DELETE CASCADE,
  material_id   uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  idx           int  NOT NULL CHECK (idx >= 0),
  PRIMARY KEY (collection_id, material_id),
  UNIQUE (collection_id, idx)
);

-- ============================================================
-- 11. material_progress
-- ============================================================
CREATE TABLE IF NOT EXISTS material_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  material_id       uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  started_at        timestamptz NOT NULL DEFAULT now(),
  last_activity_at  timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz NULL,
  completion_pct    int NOT NULL DEFAULT 0
                       CHECK (completion_pct BETWEEN 0 AND 100),
  score_pct         int NULL CHECK (score_pct IS NULL OR score_pct BETWEEN 0 AND 100),
  gems_awarded      int NOT NULL DEFAULT 0,
  xp_awarded        int NOT NULL DEFAULT 0,
  state             text NOT NULL DEFAULT 'in_progress'
                       CHECK (state IN ('in_progress', 'completed', 'abandoned')),
  meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT material_progress_unique_user_material UNIQUE (user_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_material_progress_user
  ON material_progress (user_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_progress_completed
  ON material_progress (user_id, completed_at DESC) WHERE completed_at IS NOT NULL;

-- ============================================================
-- 12. material_reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS material_reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id         uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  submitted_by        uuid NOT NULL REFERENCES profiles(id),
  reviewed_by         uuid NULL REFERENCES profiles(id),
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  decided_at          timestamptz NULL,
  decision            text NULL CHECK (decision IS NULL OR decision IN ('approved', 'rejected')),
  comment             text NULL,
  checklist_passed    jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_material_reviews_material
  ON material_reviews (material_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_reviews_pending
  ON material_reviews (submitted_at) WHERE decision IS NULL;

-- ============================================================
-- 13. material_translations (forward-compatible scaffold)
-- ============================================================
CREATE TABLE IF NOT EXISTS material_translations (
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  locale      text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  field       text NOT NULL CHECK (field IN ('title', 'summary', 'body')),
  value       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (material_id, locale, field)
);

-- ============================================================
-- 14. materials_audit (feature-scoped audit trail)
-- ============================================================
-- Per clarification 2026-05-10: feature uses its own audit table rather than
-- a non-existent global audit_log. Captures publish actions and award failures.
CREATE TABLE IF NOT EXISTS materials_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event       text NOT NULL,
  material_id uuid NULL REFERENCES materials(id) ON DELETE SET NULL,
  user_id     uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_audit_event
  ON materials_audit (event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_audit_material
  ON materials_audit (material_id, created_at DESC) WHERE material_id IS NOT NULL;

COMMENT ON TABLE materials IS 'Platform-wide curated learning materials (Vietnamese-first).';
COMMENT ON TABLE material_progress IS 'Per-(user,material) completion ledger; idempotent via unique key.';
COMMENT ON TABLE materials_audit IS 'Feature-scoped audit trail: publish transitions, award failures, etc.';
