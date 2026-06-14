-- ============================================================================
-- 097: Free-trial status (Growth Plan — Phase 3.1)
-- ============================================================================
-- Lets the dashboard show a "book your free trial lesson" CTA. "Used" = the
-- caller has at least one booking. Applied to production 2026-06-14 via MCP.

CREATE OR REPLACE FUNCTION public.get_free_trial_status()
RETURNS TABLE (has_welcome_gems boolean, has_booked boolean, trial_available boolean, gem_balance int)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid)
  SELECT
    EXISTS (SELECT 1 FROM gem_transactions g, me WHERE g.user_id = me.uid AND g.transaction_type = 'first_booking_bonus') AS has_welcome_gems,
    EXISTS (SELECT 1 FROM bookings b, me WHERE b.user_id = me.uid) AS has_booked,
    (NOT EXISTS (SELECT 1 FROM bookings b, me WHERE b.user_id = me.uid)) AS trial_available,
    COALESCE((SELECT get_gems_balance(me.uid) FROM me), 0)::int AS gem_balance;
$$;
GRANT EXECUTE ON FUNCTION public.get_free_trial_status() TO authenticated;
