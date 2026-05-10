-- Test Suite: Materials Library — schema, constraints, and RLS policies
-- Purpose: Verify migrations 080–084 produce the schema specified in
--          specs/001-english-learning-platform/features/materials-library/data-model.md
-- Constitution Compliance: Principle II (TDD), Principle V (RBAC), Principle VI (Currency Integrity)
-- Convention: matches existing supabase/tests/rls/*.test.sql style — plain SQL with assertions
--             via DO $$ ... RAISE EXCEPTION $$ blocks. Wrap whole suite in BEGIN; ... ROLLBACK;

BEGIN;

-- ============================================================
-- 1. Enums exist
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_type') THEN
    RAISE EXCEPTION 'enum material_type missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_level') THEN
    RAISE EXCEPTION 'enum material_level missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_status') THEN
    RAISE EXCEPTION 'enum material_status missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_goal') THEN
    RAISE EXCEPTION 'enum material_goal missing';
  END IF;
END $$;

-- material_type must contain all 6 values
DO $$
DECLARE
  expected text[] := ARRAY['vocabulary_pack', 'grammar_lesson', 'reading_passage',
                            'listening_audio', 'dialogue', 'mock_test'];
  v text;
BEGIN
  FOREACH v IN ARRAY expected LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'material_type' AND e.enumlabel = v
    ) THEN
      RAISE EXCEPTION 'material_type missing label %', v;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 2. Tables exist
-- ============================================================
DO $$
DECLARE
  expected text[] := ARRAY[
    'materials', 'material_sections', 'vocabulary_items', 'mock_test_items',
    'material_assets', 'material_tags', 'material_tag_links',
    'material_collections', 'material_collection_items',
    'material_progress', 'material_reviews', 'material_translations',
    'materials_audit'
  ];
  v text;
BEGIN
  FOREACH v IN ARRAY expected LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = v) THEN
      RAISE EXCEPTION 'table % missing', v;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 3. materials.published_bilingual_chk constraint
-- ============================================================
-- Should fail to publish without title_en
DO $$
DECLARE
  test_author uuid := '44444444-4444-4444-4444-444444444444';
  err_caught boolean := false;
BEGIN
  -- Ensure admin profile exists
  INSERT INTO auth.users (id, email)
    VALUES (test_author, 'admin1@test.com')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO profiles (id, role, full_name)
    VALUES (test_author, 'admin', 'Test Admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';

  BEGIN
    INSERT INTO materials (slug, type, level, status, title_vi, summary_vi, body_vi,
                           duration_min, author_id)
    VALUES ('chk-test-1', 'vocabulary_pack', 'a1', 'published',
            'Tiêu đề', 'Tóm tắt', 'Nội dung', 5, test_author);
  EXCEPTION WHEN check_violation THEN
    err_caught := true;
  END;

  IF NOT err_caught THEN
    RAISE EXCEPTION 'Expected check_violation when publishing without title_en';
  END IF;
END $$;

-- ============================================================
-- 4. mock_test_items_public view exists and excludes correct_index
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views
                 WHERE table_schema = 'public' AND table_name = 'mock_test_items_public') THEN
    RAISE EXCEPTION 'view mock_test_items_public missing';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'mock_test_items_public'
               AND column_name = 'correct_index') THEN
    RAISE EXCEPTION 'mock_test_items_public must NOT expose correct_index';
  END IF;
END $$;

-- ============================================================
-- 5. RPC functions exist
-- ============================================================
DO $$
DECLARE
  expected text[] := ARRAY['award_material_completion', 'grade_mock_test',
                            'recommend_next_material', 'compute_popularity_scores'];
  v text;
BEGIN
  FOREACH v IN ARRAY expected LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc p
                   JOIN pg_namespace n ON p.pronamespace = n.oid
                   WHERE n.nspname = 'public' AND p.proname = v) THEN
      RAISE EXCEPTION 'function public.% missing', v;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 6. material_progress unique (user_id, material_id) constraint
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'material_progress'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%user_id%material_id%'
  ) THEN
    RAISE EXCEPTION 'material_progress unique (user_id, material_id) constraint missing';
  END IF;
END $$;

-- ============================================================
-- 7. RLS enabled on all materials tables
-- ============================================================
DO $$
DECLARE
  protected text[] := ARRAY['materials', 'material_sections', 'vocabulary_items',
                             'mock_test_items', 'material_progress', 'material_reviews'];
  v text;
BEGIN
  FOREACH v IN ARRAY protected LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables
                   WHERE schemaname = 'public' AND tablename = v AND rowsecurity = true) THEN
      RAISE EXCEPTION 'RLS not enabled on %', v;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 8. material-assets storage bucket exists
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'material-assets') THEN
    RAISE EXCEPTION 'storage bucket material-assets missing';
  END IF;
END $$;

-- ============================================================
-- 9. Seed catalog has at least 30 published materials
-- ============================================================
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM materials WHERE status = 'published';
  IF cnt < 30 THEN
    RAISE EXCEPTION 'Expected ≥ 30 published seed materials, got %', cnt;
  END IF;
END $$;

ROLLBACK;
