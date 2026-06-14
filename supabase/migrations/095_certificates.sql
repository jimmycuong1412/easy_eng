-- ============================================================================
-- 095: Shareable completion certificates (Growth Plan — Phase 2.4)
-- ============================================================================
-- Public, link-shareable credentials (level / streak / material / mock_test /
-- course). Anyone can read by public_slug (for sharing to CV/LinkedIn/Facebook);
-- only the owner can create their own. issue_certificate is idempotent on
-- (user, kind, title). Applied to production 2026-06-14 via MCP.

CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('level','streak','material','mock_test','course')),
  title text NOT NULL,
  subtitle text,
  level text,
  public_slug text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificates_user_kind_title UNIQUE (user_id, kind, title)
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_slug ON public.certificates(public_slug);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view certificates" ON public.certificates;
CREATE POLICY "Anyone can view certificates" ON public.certificates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own certificates" ON public.certificates;
CREATE POLICY "Users insert own certificates" ON public.certificates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.issue_certificate(
  p_kind text, p_title text, p_subtitle text DEFAULT NULL, p_level text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (id uuid, public_slug text, already_existed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_existing certificates%ROWTYPE; v_slug text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No user'; END IF;
  SELECT * INTO v_existing FROM certificates WHERE user_id = v_uid AND kind = p_kind AND title = p_title;
  IF FOUND THEN RETURN QUERY SELECT v_existing.id, v_existing.public_slug, true; RETURN; END IF;
  v_slug := lower(p_kind) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  INSERT INTO certificates (user_id, kind, title, subtitle, level, public_slug, metadata)
  VALUES (v_uid, p_kind, p_title, p_subtitle, p_level, v_slug, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING certificates.id, certificates.public_slug INTO id, public_slug;
  already_existed := false; RETURN NEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION public.issue_certificate(text,text,text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_certificate(p_slug text)
RETURNS TABLE (kind text, title text, subtitle text, level text, issued_at timestamptz, holder_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.kind, c.title, c.subtitle, c.level, c.issued_at,
         COALESCE(p.full_name, 'Học viên EasyEng')
  FROM certificates c LEFT JOIN profiles p ON p.id = c.user_id
  WHERE c.public_slug = p_slug;
$$;
GRANT EXECUTE ON FUNCTION public.get_certificate(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_certificates()
RETURNS TABLE (id uuid, kind text, title text, subtitle text, level text, public_slug text, issued_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.kind, c.title, c.subtitle, c.level, c.public_slug, c.issued_at
  FROM certificates c WHERE c.user_id = auth.uid() ORDER BY c.issued_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_certificates() TO authenticated;
