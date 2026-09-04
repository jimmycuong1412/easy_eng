-- 107_get_my_role_anon_grant.sql
-- Make `anon`'s EXECUTE on get_my_role() explicit.
--
-- WHY THIS EXISTS
--
-- get_my_role() is referenced inside RLS policies that anonymous visitors
-- evaluate, most importantly `shadowing_clips_select_published`
-- (104_shadowing.sql) — the policy every paid-ads visitor hits when loading a
-- shadowing pack, and `material_sections_select` (081_materials_rls.sql).
--
-- 003b_fix_rls_policies.sql:19 grants EXECUTE to `authenticated` only. That has
-- never broken anything, because Postgres grants EXECUTE to PUBLIC by default on
-- a new function and no migration ever revoked it — verified against the live
-- database, whose ACL reads:
--   {=X/postgres, postgres=X/postgres, anon=X/postgres,
--    authenticated=X/postgres, service_role=X/postgres}
-- and where `SET ROLE anon; SELECT public.get_my_role();` returns NULL cleanly.
--
-- So this migration fixes no live outage. What it fixes is DURABILITY: the
-- anonymous landing page currently depends on an implicit default that is
-- invisible in this repo. A routine hardening pass — `REVOKE ALL ... FROM
-- PUBLIC` on public functions, the same pattern already applied deliberately to
-- award_shadowing_pack and record_shadowing_attempt in 104/106 — would strip
-- anon's access and take down every anonymous pack page, with nothing in the
-- migration history to explain why anon ever needed it.
--
-- Stating the grant explicitly makes the dependency greppable and survives such
-- a pass.
--
-- NOTE ON EXPOSURE: this grants no new visibility. get_my_role() reads
--   SELECT role FROM profiles WHERE id = auth.uid()
-- and an anonymous caller has no auth.uid(), so it returns NULL for them and
-- cannot leak another user's role. It is SECURITY DEFINER with a pinned
-- search_path (003b_fix_rls_policies.sql:9-17).

GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon;

COMMENT ON FUNCTION public.get_my_role() IS
  'Current caller''s role from profiles, or NULL when unauthenticated. Granted to anon as well as authenticated because anonymous-readable RLS policies (e.g. shadowing_clips_select_published) reference it. Do not REVOKE from anon without rewriting those policies.';
