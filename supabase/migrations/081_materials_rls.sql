-- Migration 081: Materials Library — RLS policies + mock_test_items_public view
-- Spec: data-model.md § RLS summary
-- Date: 2026-05-10
--
-- Default deny on every materials table. Read access for anonymous users is
-- limited to published rows. correct_index on mock_test_items is locked to
-- admin only; students must read via the mock_test_items_public view.

-- ============================================================
-- Enable RLS on every materials table
-- ============================================================
ALTER TABLE materials                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_sections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_test_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_tag_links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_collections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_collection_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_translations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_audit            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- materials
-- ============================================================
DROP POLICY IF EXISTS materials_select_published ON materials;
CREATE POLICY materials_select_published ON materials FOR SELECT
  USING (
    status = 'published'
    OR author_id = auth.uid()
    OR public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS materials_insert_author ON materials;
CREATE POLICY materials_insert_author ON materials FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND public.get_my_role() IN ('teacher', 'admin')
    AND status = 'draft'
  );

DROP POLICY IF EXISTS materials_update_owner ON materials;
CREATE POLICY materials_update_owner ON materials FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    OR (author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND status IN ('draft', 'in_review'))
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND status IN ('draft', 'in_review'))
  );

-- Admins archive instead of delete; no DELETE policy.

-- ============================================================
-- material_sections — follow parent material visibility
-- ============================================================
DROP POLICY IF EXISTS material_sections_select ON material_sections;
CREATE POLICY material_sections_select ON material_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_sections.material_id
        AND (
          m.status = 'published'
          OR m.author_id = auth.uid()
          OR public.get_my_role() = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS material_sections_write ON material_sections;
CREATE POLICY material_sections_write ON material_sections
  FOR ALL
  USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_sections.material_id
        AND m.author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND m.status IN ('draft', 'in_review')
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_sections.material_id
        AND m.author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND m.status IN ('draft', 'in_review')
    )
  );

-- ============================================================
-- vocabulary_items — same as sections
-- ============================================================
DROP POLICY IF EXISTS vocabulary_items_select ON vocabulary_items;
CREATE POLICY vocabulary_items_select ON vocabulary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = vocabulary_items.material_id
        AND (
          m.status = 'published'
          OR m.author_id = auth.uid()
          OR public.get_my_role() = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS vocabulary_items_write ON vocabulary_items;
CREATE POLICY vocabulary_items_write ON vocabulary_items
  FOR ALL
  USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = vocabulary_items.material_id
        AND m.author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND m.status IN ('draft', 'in_review')
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = vocabulary_items.material_id
        AND m.author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND m.status IN ('draft', 'in_review')
    )
  );

-- ============================================================
-- mock_test_items — base table is admin-and-author only
-- Students go through the mock_test_items_public view.
-- ============================================================
DROP POLICY IF EXISTS mock_test_items_select_owner ON mock_test_items;
CREATE POLICY mock_test_items_select_owner ON mock_test_items FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = mock_test_items.material_id
        AND m.author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
    )
  );

DROP POLICY IF EXISTS mock_test_items_write ON mock_test_items;
CREATE POLICY mock_test_items_write ON mock_test_items
  FOR ALL
  USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = mock_test_items.material_id
        AND m.author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND m.status IN ('draft', 'in_review')
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = mock_test_items.material_id
        AND m.author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND m.status IN ('draft', 'in_review')
    )
  );

-- Public view: omits correct_index and explanation_*
-- View runs with caller's privileges; SECURITY DEFINER RPC grade_mock_test
-- is the only path that reads correct_index for non-admins.
CREATE OR REPLACE VIEW mock_test_items_public AS
SELECT
  i.id,
  i.material_id,
  i.idx,
  i.format,
  i.prompt_vi,
  i.prompt_en,
  i.options_en,
  i.options_vi,
  i.points
FROM mock_test_items i
JOIN materials m ON m.id = i.material_id
WHERE m.status = 'published';

-- View ownership: must run with table owner so RLS on base table doesn't
-- silently hide rows for student callers (matches existing platform pattern,
-- see knowledge base note on RLS-and-views).
ALTER VIEW mock_test_items_public OWNER TO postgres;

GRANT SELECT ON mock_test_items_public TO anon, authenticated;

-- ============================================================
-- material_assets — read with parent visibility, write by author/admin
-- ============================================================
DROP POLICY IF EXISTS material_assets_select ON material_assets;
CREATE POLICY material_assets_select ON material_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_assets.material_id
        AND (
          m.status = 'published'
          OR m.author_id = auth.uid()
          OR public.get_my_role() = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS material_assets_write ON material_assets;
CREATE POLICY material_assets_write ON material_assets
  FOR ALL
  USING (
    public.get_my_role() = 'admin'
    OR uploaded_by = auth.uid()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (uploaded_by = auth.uid() AND public.get_my_role() IN ('teacher', 'admin'))
  );

-- ============================================================
-- material_tags / material_tag_links — read public, admin writes
-- ============================================================
DROP POLICY IF EXISTS material_tags_read ON material_tags;
CREATE POLICY material_tags_read ON material_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS material_tags_write ON material_tags;
CREATE POLICY material_tags_write ON material_tags
  FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS material_tag_links_read ON material_tag_links;
CREATE POLICY material_tag_links_read ON material_tag_links FOR SELECT USING (true);

DROP POLICY IF EXISTS material_tag_links_write ON material_tag_links;
CREATE POLICY material_tag_links_write ON material_tag_links
  FOR ALL
  USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_tag_links.material_id
        AND m.author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND m.status IN ('draft', 'in_review')
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_tag_links.material_id
        AND m.author_id = auth.uid()
        AND public.get_my_role() = 'teacher'
        AND m.status IN ('draft', 'in_review')
    )
  );

-- ============================================================
-- material_collections / material_collection_items
-- ============================================================
DROP POLICY IF EXISTS material_collections_select ON material_collections;
CREATE POLICY material_collections_select ON material_collections FOR SELECT
  USING (
    status = 'published'
    OR author_id = auth.uid()
    OR public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS material_collections_write ON material_collections;
CREATE POLICY material_collections_write ON material_collections
  FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS material_collection_items_select ON material_collection_items;
CREATE POLICY material_collection_items_select ON material_collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM material_collections c
      WHERE c.id = material_collection_items.collection_id
        AND (c.status = 'published' OR public.get_my_role() = 'admin')
    )
  );

DROP POLICY IF EXISTS material_collection_items_write ON material_collection_items;
CREATE POLICY material_collection_items_write ON material_collection_items
  FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- material_progress — owner-only; mutations go through RPCs
-- ============================================================
DROP POLICY IF EXISTS material_progress_select_own ON material_progress;
CREATE POLICY material_progress_select_own ON material_progress FOR SELECT
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin');

-- Direct writes are blocked at the policy level — clients must use
-- award_material_completion / grade_mock_test RPCs which are SECURITY DEFINER.
-- We allow INSERT for own row to support the "started_at" tracking from the
-- frontend (state='in_progress' only). Completion transitions only via RPC.
DROP POLICY IF EXISTS material_progress_insert_own ON material_progress;
CREATE POLICY material_progress_insert_own ON material_progress FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND state = 'in_progress'
    AND completed_at IS NULL
    AND gems_awarded = 0
    AND xp_awarded = 0
  );

DROP POLICY IF EXISTS material_progress_update_own ON material_progress;
CREATE POLICY material_progress_update_own ON material_progress FOR UPDATE
  USING (user_id = auth.uid() AND completed_at IS NULL)
  WITH CHECK (
    user_id = auth.uid()
    AND state IN ('in_progress', 'abandoned')
    AND gems_awarded = 0
    AND xp_awarded = 0
  );

-- ============================================================
-- material_reviews
-- ============================================================
DROP POLICY IF EXISTS material_reviews_select ON material_reviews;
CREATE POLICY material_reviews_select ON material_reviews FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    OR submitted_by = auth.uid()
  );

DROP POLICY IF EXISTS material_reviews_insert ON material_reviews;
CREATE POLICY material_reviews_insert ON material_reviews FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND public.get_my_role() IN ('teacher', 'admin')
  );

DROP POLICY IF EXISTS material_reviews_update_admin ON material_reviews;
CREATE POLICY material_reviews_update_admin ON material_reviews FOR UPDATE
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- material_translations
-- ============================================================
DROP POLICY IF EXISTS material_translations_read ON material_translations;
CREATE POLICY material_translations_read ON material_translations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM materials m
      WHERE m.id = material_translations.material_id AND m.status = 'published'
    )
    OR public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS material_translations_write ON material_translations;
CREATE POLICY material_translations_write ON material_translations
  FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- materials_audit — admin read only; writes go through SECURITY DEFINER RPCs
-- ============================================================
DROP POLICY IF EXISTS materials_audit_read ON materials_audit;
CREATE POLICY materials_audit_read ON materials_audit FOR SELECT
  USING (public.get_my_role() = 'admin');

-- No INSERT/UPDATE/DELETE policies — only SECURITY DEFINER functions
-- (e.g. award_material_completion's exception handler) can write here.
