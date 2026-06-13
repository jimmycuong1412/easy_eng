-- ============================================================================
-- 092: Web Push subscriptions (Growth Plan — Phase 1.3)
-- ============================================================================
-- Stores browser push subscriptions so reminder cron/edge functions can send
-- "join your class" / "keep your streak" notifications.
-- Applied to production 2026-06-14 via MCP (CI deploy-supabase is broken).

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role reads push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role reads push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');
