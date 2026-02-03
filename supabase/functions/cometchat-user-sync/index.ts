/**
 * CometChat User Sync Edge Function
 *
 * Syncs Supabase user profiles to CometChat when users are created or updated
 * Task: T116 [P] Create CometChat user sync Edge Function
 *
 * Webhook trigger: Database trigger on profiles table (INSERT/UPDATE)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'admin';
}

interface CometChatUser {
  uid: string;
  name: string;
  avatar?: string;
  role?: string;
  metadata?: Record<string, any>;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Profile;
  old_record?: Profile;
}

// ============================================================================
// Configuration
// ============================================================================

const COMETCHAT_APP_ID = Deno.env.get('COMETCHAT_APP_ID') || '';
const COMETCHAT_API_KEY = Deno.env.get('COMETCHAT_API_KEY') || '';
const COMETCHAT_REGION = Deno.env.get('COMETCHAT_REGION') || 'us';
const COMETCHAT_API_BASE = `https://api-${COMETCHAT_REGION}.cometchat.io/v3`;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ============================================================================
// CometChat API Functions
// ============================================================================

/**
 * Create or update a user in CometChat
 */
async function createOrUpdateCometChatUser(user: CometChatUser): Promise<boolean> {
  try {
    const response = await fetch(`${COMETCHAT_API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'appId': COMETCHAT_APP_ID,
        'apiKey': COMETCHAT_API_KEY,
      },
      body: JSON.stringify({
        uid: user.uid,
        name: user.name,
        avatar: user.avatar || '',
        role: user.role || 'default',
        metadata: user.metadata || {},
      }),
    });

    if (response.ok) {
      console.log(`CometChat user created: ${user.uid}`);
      return true;
    }

    // If user already exists, update instead
    if (response.status === 400) {
      const errorData = await response.json();
      if (errorData.error?.code === 'ERR_UID_ALREADY_EXISTS') {
        return await updateCometChatUser(user);
      }
    }

    const errorData = await response.json();
    console.error('Failed to create CometChat user:', errorData);
    return false;
  } catch (error) {
    console.error('Error creating CometChat user:', error);
    return false;
  }
}

/**
 * Update an existing CometChat user
 */
async function updateCometChatUser(user: CometChatUser): Promise<boolean> {
  try {
    const response = await fetch(`${COMETCHAT_API_BASE}/users/${user.uid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'appId': COMETCHAT_APP_ID,
        'apiKey': COMETCHAT_API_KEY,
      },
      body: JSON.stringify({
        name: user.name,
        avatar: user.avatar || '',
        role: user.role || 'default',
        metadata: user.metadata || {},
      }),
    });

    if (response.ok) {
      console.log(`CometChat user updated: ${user.uid}`);
      return true;
    }

    const errorData = await response.json();
    console.error('Failed to update CometChat user:', errorData);
    return false;
  } catch (error) {
    console.error('Error updating CometChat user:', error);
    return false;
  }
}

/**
 * Delete a CometChat user (optional - for cleanup)
 */
async function deleteCometChatUser(uid: string): Promise<boolean> {
  try {
    const response = await fetch(`${COMETCHAT_API_BASE}/users/${uid}`, {
      method: 'DELETE',
      headers: {
        'appId': COMETCHAT_APP_ID,
        'apiKey': COMETCHAT_API_KEY,
      },
    });

    if (response.ok) {
      console.log(`CometChat user deleted: ${uid}`);
      return true;
    }

    const errorData = await response.json();
    console.error('Failed to delete CometChat user:', errorData);
    return false;
  } catch (error) {
    console.error('Error deleting CometChat user:', error);
    return false;
  }
}

// ============================================================================
// Sync Logic
// ============================================================================

/**
 * Sync a Supabase profile to CometChat
 */
async function syncProfileToCometChat(profile: Profile): Promise<boolean> {
  const cometChatUser: CometChatUser = {
    uid: profile.id,
    name: profile.display_name || profile.email.split('@')[0],
    avatar: profile.avatar_url,
    role: profile.role,
    metadata: {
      email: profile.email,
      role: profile.role,
      syncedAt: new Date().toISOString(),
    },
  };

  return await createOrUpdateCometChatUser(cometChatUser);
}

/**
 * Handle profile deletion
 */
async function handleProfileDeletion(profileId: string): Promise<boolean> {
  // Optional: Delete user from CometChat
  // You may want to keep the user for historical data
  console.log(`Profile deleted: ${profileId}. CometChat user preserved for history.`);
  return true;

  // Uncomment to actually delete from CometChat:
  // return await deleteCometChatUser(profileId);
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();

    console.log('Webhook received:', {
      type: payload.type,
      table: payload.table,
      userId: payload.record?.id,
    });

    // Validate payload
    if (!payload.record || !payload.record.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing record data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle different webhook types
    let success = false;

    switch (payload.type) {
      case 'INSERT':
        console.log(`Syncing new profile to CometChat: ${payload.record.id}`);
        success = await syncProfileToCometChat(payload.record);
        break;

      case 'UPDATE':
        console.log(`Updating CometChat user: ${payload.record.id}`);
        success = await syncProfileToCometChat(payload.record);
        break;

      case 'DELETE':
        console.log(`Handling profile deletion: ${payload.record.id}`);
        success = await handleProfileDeletion(payload.record.id);
        break;

      default:
        console.warn(`Unknown webhook type: ${payload.type}`);
        return new Response(
          JSON.stringify({ error: 'Unknown webhook type' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Log sync result
    if (success) {
      console.log(`Successfully synced profile ${payload.record.id} to CometChat`);
    } else {
      console.error(`Failed to sync profile ${payload.record.id} to CometChat`);
    }

    // Return response
    return new Response(
      JSON.stringify({
        success,
        userId: payload.record.id,
        action: payload.type.toLowerCase(),
        timestamp: new Date().toISOString(),
      }),
      {
        status: success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in cometchat-user-sync function:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Deployment Notes
// ============================================================================

/*
To set up this Edge Function:

1. Deploy the function:
   supabase functions deploy cometchat-user-sync

2. Set environment variables:
   supabase secrets set COMETCHAT_APP_ID=your-app-id
   supabase secrets set COMETCHAT_API_KEY=your-api-key
   supabase secrets set COMETCHAT_REGION=us

3. Create database webhook trigger:
   - Go to Supabase Dashboard > Database > Webhooks
   - Create new webhook for 'profiles' table
   - Events: INSERT, UPDATE
   - Webhook URL: https://your-project.supabase.co/functions/v1/cometchat-user-sync
   - HTTP Method: POST

4. Test the webhook:
   - Create or update a user profile
   - Check Edge Function logs: supabase functions logs cometchat-user-sync

Example trigger SQL (alternative to dashboard webhook):

CREATE OR REPLACE FUNCTION notify_cometchat_user_sync()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cometchat-user-sync',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_cometchat_sync
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_cometchat_user_sync();
*/
