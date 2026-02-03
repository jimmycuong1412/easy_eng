# CometChat Video Integration Setup Guide

**Task Reference**: T117 - Setup database webhook for user creation trigger

**Purpose**: This guide walks you through setting up the CometChat video integration for live class functionality.

---

## Prerequisites

- ✅ CometChat account created
- ✅ CometChat App created in dashboard
- ✅ Supabase project created
- ✅ Edge Function `cometchat-user-sync` deployed
- ✅ Migration `021b_cometchat_user_sync_trigger.sql` applied

---

## Step 1: Get CometChat Credentials

1. Log in to [CometChat Dashboard](https://app.cometchat.com/)
2. Select your app (or create a new one)
3. Navigate to **API Keys** section
4. Copy the following credentials:
   - **App ID**: Your application identifier
   - **API Key**: For server-side operations (REST API Key)
   - **Auth Key**: For client-side authentication
   - **Region**: Your app region (e.g., `us`, `eu`)

---

## Step 2: Configure Supabase Secrets

Set the CometChat credentials as Supabase secrets:

```bash
# Navigate to your project root
cd F:/Git/easy_eng

# Set CometChat secrets for Edge Functions
supabase secrets set COMETCHAT_APP_ID=your-app-id-here
supabase secrets set COMETCHAT_API_KEY=your-api-key-here
supabase secrets set COMETCHAT_REGION=us

# Verify secrets are set
supabase secrets list
```

---

## Step 3: Configure Frontend Environment

Update your frontend `.env.local` file:

```env
# CometChat Configuration
NEXT_PUBLIC_COMETCHAT_APP_ID=your-app-id-here
NEXT_PUBLIC_COMETCHAT_REGION=us
NEXT_PUBLIC_COMETCHAT_AUTH_KEY=your-auth-key-here
```

**Important**:
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Never commit `.env.local` to version control
- Use different CometChat apps for development and production

---

## Step 4: Update Database Webhook URL

Update the webhook URL in the database to point to your actual Supabase project:

```sql
-- Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- Example: https://abcdefghijklmnop.supabase.co

UPDATE public.system_settings
SET value = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cometchat-user-sync'
WHERE key = 'cometchat_webhook_url';
```

**To find your Project Reference**:
1. Go to Supabase Dashboard
2. Navigate to **Settings** > **API**
3. Copy your **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)

---

## Step 5: Deploy Edge Function

Deploy the CometChat user sync Edge Function:

```bash
# Deploy the function
supabase functions deploy cometchat-user-sync

# Verify deployment
supabase functions list
```

Expected output:
```
┌─────────────────────┬─────────────┬─────────────┐
│       NAME          │   VERSION   │  CREATED    │
├─────────────────────┼─────────────┼─────────────┤
│ cometchat-user-sync │   v1        │  Just now   │
└─────────────────────┴─────────────┴─────────────┘
```

---

## Step 6: Test the Integration

### Test 1: Manual Edge Function Call

Test the Edge Function directly:

```bash
# Create a test payload
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cometchat-user-sync' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "INSERT",
    "table": "profiles",
    "record": {
      "id": "test-user-123",
      "email": "test@example.com",
      "display_name": "Test User",
      "role": "student"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "userId": "test-user-123",
  "action": "insert",
  "timestamp": "2026-02-03T10:00:00.000Z"
}
```

### Test 2: Database Trigger

Create a test user profile to trigger the automatic sync:

```sql
-- Insert a test profile (trigger should fire automatically)
INSERT INTO public.profiles (id, email, display_name, role)
VALUES (
  gen_random_uuid(),
  'trigger-test@example.com',
  'Trigger Test User',
  'student'
);

-- Check if the profile was created
SELECT id, email, display_name, role
FROM public.profiles
WHERE email = 'trigger-test@example.com';
```

### Test 3: Check Edge Function Logs

Monitor the Edge Function logs to verify sync:

```bash
# Tail the logs in real-time
supabase functions logs cometchat-user-sync --tail

# Or fetch recent logs
supabase functions logs cometchat-user-sync --limit 50
```

Look for log messages like:
```
Webhook received: type=INSERT, table=profiles, userId=...
Syncing new profile to CometChat: ...
Successfully synced profile ... to CometChat
```

### Test 4: Verify in CometChat Dashboard

1. Go to CometChat Dashboard
2. Navigate to **Users** section
3. Check if the test users appear in the list
4. Verify user metadata (email, role, etc.)

---

## Step 7: Backfill Existing Users (Optional)

If you have existing users that need to be synced to CometChat:

```sql
-- Run the backfill function
SELECT * FROM sync_existing_profiles_to_cometchat();

-- Review results
-- SUCCESS rows: User synced successfully
-- FAILED rows: Check error message and retry manually
```

---

## Step 8: Test Video Functionality

### Student Flow Test

1. Log in as a student
2. Navigate to a class detail page
3. Click "Join Class" (if class is live)
4. Verify:
   - ✅ Waiting room appears
   - ✅ Camera/microphone permissions requested
   - ✅ Video feed displays
   - ✅ Can join call successfully

### Teacher Flow Test

1. Log in as a teacher
2. Navigate to your class
3. Click "Start Class" (within 15 minutes of start time)
4. Verify:
   - ✅ Video call initiates
   - ✅ Waiting room shows students
   - ✅ Can admit students to call
   - ✅ Screen sharing works
   - ✅ In-call chat functional

---

## Troubleshooting

### Issue: "CometChat user creation failed"

**Possible Causes**:
- Invalid API credentials
- CometChat API rate limit exceeded
- Network connectivity issues

**Solutions**:
1. Verify secrets are set correctly: `supabase secrets list`
2. Check CometChat dashboard for API usage/limits
3. Review Edge Function logs: `supabase functions logs cometchat-user-sync`

### Issue: "Trigger not firing"

**Possible Causes**:
- Migration not applied
- pg_net extension not enabled
- Webhook URL not configured

**Solutions**:
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'profiles_cometchat_sync';
   ```
2. Verify pg_net extension:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'http';
   ```
3. Check webhook URL:
   ```sql
   SELECT * FROM public.system_settings WHERE key = 'cometchat_webhook_url';
   ```

### Issue: "User can't join video call"

**Possible Causes**:
- User not synced to CometChat
- Invalid CometChat credentials
- Browser doesn't support WebRTC

**Solutions**:
1. Verify user exists in CometChat dashboard
2. Check browser console for errors
3. Test with supported browser (Chrome, Firefox, Edge)
4. Manually sync user:
   ```sql
   SELECT notify_cometchat_user_sync() FROM public.profiles WHERE id = 'user-id';
   ```

### Issue: "pg_net extension not available"

**Solution**:
Contact Supabase support to enable the `pg_net` extension on your project, or use the Dashboard Webhook method (see Alternative Setup below).

---

## Alternative Setup: Dashboard Webhooks

If database triggers aren't working, use Supabase Dashboard webhooks:

1. **Go to Supabase Dashboard** → Database → Webhooks
2. **Click "Create a new hook"**
3. **Configure**:
   - **Name**: CometChat User Sync
   - **Table**: `public.profiles`
   - **Events**: Check `INSERT` and `UPDATE`
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/cometchat-user-sync`
   - **Headers**: `{"Content-Type": "application/json"}`
4. **Save** and test with a profile insert

---

## Security Considerations

### Production Setup

1. **Use separate CometChat apps** for development and production
2. **Rotate API keys** regularly
3. **Monitor API usage** in CometChat dashboard
4. **Enable CometChat security features**:
   - Token-based authentication
   - User role restrictions
   - Call recording disabled (unless needed)

### Environment Separation

```bash
# Development
COMETCHAT_APP_ID=dev-app-id
COMETCHAT_API_KEY=dev-api-key

# Production
COMETCHAT_APP_ID=prod-app-id
COMETCHAT_API_KEY=prod-api-key
```

---

## Monitoring and Maintenance

### Regular Checks

- **Weekly**: Review Edge Function logs for errors
- **Monthly**: Audit CometChat user count vs. Supabase profiles
- **Quarterly**: Review CometChat plan usage and upgrade if needed

### Key Metrics to Monitor

- Edge Function invocations
- Sync success rate
- CometChat API errors
- Video call quality metrics
- User connection times

### Alerts to Set Up

1. Edge Function failure rate > 5%
2. CometChat API errors
3. User sync failures
4. Video call connection failures

---

## CometChat Plan Limits

### Free Plan (Development)
- **MAU**: 100 users
- **Concurrent Calls**: 5
- **Call Duration**: 100 minutes/month
- **Storage**: 100 MB

### Basic Plan (Production)
- **MAU**: 25,000 users
- **Concurrent Calls**: Unlimited
- **Call Duration**: Unlimited
- **Storage**: 1 GB

**Upgrade Path**: When approaching limits, upgrade to Basic plan in CometChat dashboard.

---

## Next Steps

After completing this setup:

1. ✅ Run integration tests (see `frontend/tests/e2e/video-integration.spec.ts`)
2. ✅ Test with multiple concurrent users
3. ✅ Verify class completion rewards trigger correctly
4. ✅ Document any custom configurations in your team wiki
5. ✅ Train teachers on video class features

---

## Additional Resources

- [CometChat Documentation](https://www.cometchat.com/docs)
- [CometChat React UI Kit](https://www.cometchat.com/docs/react-ui-kit/overview)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)

---

**Status**: ✅ Setup Complete - Phase 8 CometChat Integration Fully Functional

**Last Updated**: 2026-02-03
**Maintained By**: Development Team
