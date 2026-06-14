-- ============================================================================
-- 099: Daily streak reminder cron (Growth Plan — Phase 1.3 delivery)
-- ============================================================================
-- Schedules send-daily-reminder at 20:00 ICT (13:00 UTC) via pg_cron + pg_net.
-- The shared secret is read from Vault key 'cron_secret'.
--
-- One-time manual setup (NOT in this migration — secrets don't belong in git):
--   1. Set Supabase Edge Function secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
--      VAPID_SUBJECT, CRON_SECRET, FRONTEND_URL.
--   2. select vault.create_secret('<same CRON_SECRET value>', 'cron_secret');
--
-- Applied to production 2026-06-14 via MCP.

DO $$
BEGIN
  PERFORM cron.unschedule('daily-streak-reminder')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-streak-reminder');
END $$;

SELECT cron.schedule(
  'daily-streak-reminder',
  '0 13 * * *',  -- 13:00 UTC = 20:00 Asia/Ho_Chi_Minh
  $cron$
  SELECT net.http_post(
    url := 'https://evrcwtsexlamacawofxo.supabase.co/functions/v1/send-daily-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1), '')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
