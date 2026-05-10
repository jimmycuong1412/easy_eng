-- Migration 082: Materials Library — Supabase Storage bucket
-- Spec: research.md § R5
-- Date: 2026-05-10
--
-- Bucket `material-assets` holds audio (≤ 3 MB MP3), images (≤ 200 KB), and
-- optional PDFs (≤ 5 MB). Public read; teacher/admin write to own paths.

-- ============================================================
-- Create the bucket (public-read, versioned via UUID paths so the immutable
-- cache header is safe).
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'material-assets',
  'material-assets',
  true,
  5242880,  -- 5 MB hard cap; per-kind limits enforced at application layer
  ARRAY[
    'audio/mpeg',         -- MP3
    'audio/mp4',          -- AAC/M4A (optional)
    'image/webp',
    'image/png',
    'image/jpeg',
    'application/pdf',
    'text/vtt'            -- transcript captions
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Storage policies
-- ============================================================
-- Public read (anonymous + authenticated)
DROP POLICY IF EXISTS material_assets_public_read ON storage.objects;
CREATE POLICY material_assets_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'material-assets');

-- Teachers and admins may upload; the file path's first segment must equal
-- the material UUID, so we leave path-vs-ownership validation to the
-- application (Edge Function) layer rather than try to enforce it in SQL.
DROP POLICY IF EXISTS material_assets_authenticated_write ON storage.objects;
CREATE POLICY material_assets_authenticated_write
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'material-assets'
    AND public.get_my_role() IN ('teacher', 'admin')
  );

-- Authors can update / delete their own uploads; admins can do anything.
DROP POLICY IF EXISTS material_assets_owner_update ON storage.objects;
CREATE POLICY material_assets_owner_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'material-assets'
    AND (owner = auth.uid() OR public.get_my_role() = 'admin')
  )
  WITH CHECK (
    bucket_id = 'material-assets'
    AND (owner = auth.uid() OR public.get_my_role() = 'admin')
  );

DROP POLICY IF EXISTS material_assets_owner_delete ON storage.objects;
CREATE POLICY material_assets_owner_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'material-assets'
    AND (owner = auth.uid() OR public.get_my_role() = 'admin')
  );

COMMENT ON POLICY material_assets_public_read ON storage.objects IS
  'Materials Library audio/images/PDFs are public so SEO crawlers and anonymous landing-page visitors can preview content.';
