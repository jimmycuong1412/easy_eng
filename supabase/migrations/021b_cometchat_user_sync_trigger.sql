-- ============================================================================
-- CometChat User Sync Trigger
-- ============================================================================
-- Task: T117 Setup database webhook for user creation trigger in Supabase dashboard
-- Purpose: Automatically sync Supabase profiles to CometChat when users are created/updated
-- Dependencies: Requires profiles table (from 002_profiles.sql)
-- Edge Function: supabase/functions/cometchat-user-sync/index.ts

-- ============================================================================
-- Enable HTTP Extension (required for making HTTP requests)
-- ============================================================================

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ============================================================================
-- Trigger Function: Notify CometChat User Sync
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_cometchat_user_sync()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  request_body JSONB;
  response_status INTEGER;
BEGIN
  -- Get the Edge Function URL from environment or use default
  -- Note: Replace with your actual Supabase project URL
  -- You can also store this in a settings table for easier management
  webhook_url := current_setting('app.settings.cometchat_webhook_url', true);

  -- Fallback to SUPABASE_URL if available
  IF webhook_url IS NULL THEN
    webhook_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/cometchat-user-sync';
  END IF;

  -- Build the request body matching the WebhookPayload interface
  request_body := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END,
    'old_record', CASE
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END
  );

  -- Log the sync attempt (optional - comment out if too verbose)
  RAISE LOG 'CometChat sync triggered: type=%, user_id=%',
    TG_OP,
    COALESCE(NEW.id, OLD.id);

  -- Make HTTP POST request to Edge Function
  -- Using pg_net for non-blocking async HTTP requests (preferred)
  -- If pg_net is not available, this will fail gracefully
  BEGIN
    -- Attempt to use pg_net for async request
    PERFORM net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' ||
                 current_setting('request.jwt.claim.sub', true) || '"}'::jsonb,
      body := request_body
    );
  EXCEPTION
    WHEN undefined_function THEN
      -- pg_net not available, log warning
      RAISE WARNING 'pg_net extension not available. CometChat sync skipped for user %.',
        COALESCE(NEW.id, OLD.id);
    WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Failed to trigger CometChat sync: %', SQLERRM;
  END;

  -- Always return the NEW record to not interrupt the main operation
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION notify_cometchat_user_sync() IS
  'Triggers CometChat user sync via Edge Function when profiles are created/updated';

-- ============================================================================
-- Trigger: Profile Changes → CometChat Sync
-- ============================================================================

-- Drop trigger if exists (for migration re-runs)
DROP TRIGGER IF EXISTS profiles_cometchat_sync ON public.profiles;

-- Create trigger on profiles table
CREATE TRIGGER profiles_cometchat_sync
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_cometchat_user_sync();

COMMENT ON TRIGGER profiles_cometchat_sync ON public.profiles IS
  'Automatically syncs profile changes to CometChat';

-- ============================================================================
-- Configuration Table (Optional but Recommended)
-- ============================================================================

-- Create a settings table to store webhook URL and other configs
-- This makes it easier to update the webhook URL without modifying code

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.system_settings IS
  'System-wide configuration settings';

-- Insert default CometChat webhook URL (update this with your actual URL)
-- Format: https://your-project-ref.supabase.co/functions/v1/cometchat-user-sync
INSERT INTO public.system_settings (key, value, description)
VALUES
  (
    'cometchat_webhook_url',
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cometchat-user-sync',
    'Edge Function URL for CometChat user sync'
  )
ON CONFLICT (key) DO NOTHING;

-- Grant read access to authenticated users (they don't need to modify this)
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can modify settings
CREATE POLICY "Service role can manage settings"
  ON public.system_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read non-sensitive settings
CREATE POLICY "Authenticated users can read settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (key NOT LIKE '%_secret' AND key NOT LIKE '%_key');

-- ============================================================================
-- Manual Sync Function (For Backfilling Existing Users)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_existing_profiles_to_cometchat()
RETURNS TABLE (user_id UUID, status TEXT) AS $$
DECLARE
  profile_record RECORD;
  webhook_url TEXT;
BEGIN
  -- Get webhook URL
  SELECT value INTO webhook_url
  FROM public.system_settings
  WHERE key = 'cometchat_webhook_url';

  -- Loop through all profiles and trigger sync
  FOR profile_record IN
    SELECT id, email, display_name, avatar_url, role
    FROM public.profiles
    WHERE deleted_at IS NULL
  LOOP
    BEGIN
      -- Trigger sync for this profile
      PERFORM net.http_post(
        url := webhook_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'profiles',
          'record', row_to_json(profile_record)
        )
      );

      user_id := profile_record.id;
      status := 'SUCCESS';
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      user_id := profile_record.id;
      status := 'FAILED: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_existing_profiles_to_cometchat() IS
  'Manually sync all existing profiles to CometChat. Run once after setup.';

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION sync_existing_profiles_to_cometchat() TO service_role;

-- ============================================================================
-- Deployment Notes
-- ============================================================================

/*
POST-MIGRATION SETUP STEPS:

1. Update the webhook URL in system_settings:

   UPDATE public.system_settings
   SET value = 'https://your-actual-project-ref.supabase.co/functions/v1/cometchat-user-sync'
   WHERE key = 'cometchat_webhook_url';

2. Ensure the Edge Function is deployed:

   supabase functions deploy cometchat-user-sync

3. Set required secrets for the Edge Function:

   supabase secrets set COMETCHAT_APP_ID=your-app-id
   supabase secrets set COMETCHAT_API_KEY=your-api-key
   supabase secrets set COMETCHAT_REGION=us

4. Test the trigger by creating a test user:

   INSERT INTO auth.users (email, encrypted_password)
   VALUES ('test@example.com', crypt('password', gen_salt('bf')));

5. Check Edge Function logs:

   supabase functions logs cometchat-user-sync --tail

6. (Optional) Backfill existing users:

   SELECT * FROM sync_existing_profiles_to_cometchat();

ALTERNATIVE: Dashboard Webhook Setup
If you prefer using the Supabase Dashboard instead of database triggers:

1. Go to: Database > Webhooks > Create a new hook
2. Name: CometChat User Sync
3. Table: public.profiles
4. Events: INSERT, UPDATE
5. Type: HTTP Request
6. Method: POST
7. URL: https://your-project.supabase.co/functions/v1/cometchat-user-sync
8. Headers: {"Content-Type": "application/json"}

Note: Database triggers (this migration) are preferred for reliability and versioning.
*/
