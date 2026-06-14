-- ============================================================================
-- 096: Welcome gems = free trial lesson (Growth Plan — Phase 3.1)
-- ============================================================================
-- Grants 200 gems (one 1-on-1 booking) on signup so new users reach the "aha"
-- before paying. Extends handle_new_user; idempotent. Backfill is conservative:
-- only students with no welcome grant AND no booking yet (don't gift payers).
-- Applied to production 2026-06-14 via MCP (CI deploy-supabase is broken).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, email_verified)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.gem_transactions
    WHERE user_id = NEW.id AND transaction_type = 'first_booking_bonus'
  ) THEN
    INSERT INTO public.gem_transactions (user_id, amount, transaction_type, description)
    VALUES (NEW.id, 200, 'first_booking_bonus', 'Quà chào mừng — 1 buổi học thử miễn phí 🎁');
  END IF;

  RETURN NEW;
END;
$function$;

INSERT INTO public.gem_transactions (user_id, amount, transaction_type, description)
SELECT p.id, 200, 'first_booking_bonus', 'Quà chào mừng — 1 buổi học thử miễn phí 🎁'
FROM public.profiles p
WHERE p.role = 'student'
  AND NOT EXISTS (SELECT 1 FROM public.gem_transactions g WHERE g.user_id = p.id AND g.transaction_type = 'first_booking_bonus')
  AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.user_id = p.id);
