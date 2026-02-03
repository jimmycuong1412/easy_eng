/**
 * CometChat Webhook Handler
 *
 * Handles webhooks from CometChat for session events
 * Task: T127 Create CometChat webhook handler
 *
 * Webhook events:
 * - call.initiated
 * - call.accepted
 * - call.ended
 * - group.member_joined
 * - group.member_left
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Types
// ============================================================================

interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: number;
  appId: string;
}

interface CallEventData {
  sessionId: string;
  action: 'initiated' | 'accepted' | 'rejected' | 'ended' | 'cancelled';
  initiator: string;
  receiver: string;
  callType: 'video' | 'audio';
  timestamp: number;
}

interface GroupEventData {
  guid: string;
  action: 'member-joined' | 'member-left' | 'member-kicked' | 'member-banned';
  user: string;
  actionBy?: string;
  timestamp: number;
}

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle call initiated event
 */
async function handleCallInitiated(data: CallEventData): Promise<void> {
  console.log('Call initiated:', data);

  // Find session by CometChat session ID
  const { data: session, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('cometchat_session_id', data.sessionId)
    .single();

  if (error || !session) {
    console.warn('Session not found for call:', data.sessionId);
    return;
  }

  // Update session with CometChat session ID
  await supabase
    .from('class_sessions')
    .update({
      cometchat_session_id: data.sessionId,
      status: 'live',
      actual_start_time: new Date(data.timestamp).toISOString(),
    })
    .eq('id', session.id);

  // Log event
  await supabase.from('session_events').insert({
    session_id: session.id,
    event_type: 'session_started',
    event_data: {
      cometchat_session_id: data.sessionId,
      timestamp: data.timestamp,
    },
  });
}

/**
 * Handle call ended event
 */
async function handleCallEnded(data: CallEventData): Promise<void> {
  console.log('Call ended:', data);

  // Find session by CometChat session ID
  const { data: session, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('cometchat_session_id', data.sessionId)
    .single();

  if (error || !session) {
    console.warn('Session not found for call:', data.sessionId);
    return;
  }

  // Calculate duration
  const actualStart = session.actual_start_time
    ? new Date(session.actual_start_time)
    : new Date(session.scheduled_start_time);
  const endTime = new Date(data.timestamp);
  const durationMinutes = Math.floor((endTime.getTime() - actualStart.getTime()) / 60000);

  // Update session status
  await supabase
    .from('class_sessions')
    .update({
      status: 'ended',
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq('id', session.id);

  // Update all participants who haven't left yet
  await supabase
    .from('session_participants')
    .update({
      left_at: endTime.toISOString(),
    })
    .eq('session_id', session.id)
    .is('left_at', null);

  // Log event
  await supabase.from('session_events').insert({
    session_id: session.id,
    event_type: 'session_ended',
    event_data: {
      cometchat_session_id: data.sessionId,
      timestamp: data.timestamp,
      duration_minutes: durationMinutes,
    },
  });

  // Trigger reward distribution
  // Note: This would typically invoke another edge function
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/award-class-rewards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        session_id: session.id,
      }),
    });
  } catch (error) {
    console.error('Failed to trigger reward distribution:', error);
  }
}

/**
 * Handle group member joined event
 */
async function handleMemberJoined(data: GroupEventData): Promise<void> {
  console.log('Member joined:', data);

  // Find session by CometChat group ID
  const { data: session, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('cometchat_group_id', data.guid)
    .single();

  if (error || !session) {
    console.warn('Session not found for group:', data.guid);
    return;
  }

  // Log event
  await supabase.from('session_events').insert({
    session_id: session.id,
    event_type: 'participant_joined',
    event_data: {
      user_id: data.user,
      group_id: data.guid,
      timestamp: data.timestamp,
    },
  });

  // Increment participant count
  await supabase.rpc('increment_session_participants', {
    session_id: session.id,
  });
}

/**
 * Handle group member left event
 */
async function handleMemberLeft(data: GroupEventData): Promise<void> {
  console.log('Member left:', data);

  // Find session by CometChat group ID
  const { data: session, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('cometchat_group_id', data.guid)
    .single();

  if (error || !session) {
    console.warn('Session not found for group:', data.guid);
    return;
  }

  // Update participant left time
  await supabase
    .from('session_participants')
    .update({
      left_at: new Date(data.timestamp).toISOString(),
    })
    .eq('session_id', session.id)
    .eq('user_id', data.user)
    .is('left_at', null);

  // Log event
  await supabase.from('session_events').insert({
    session_id: session.id,
    user_id: data.user,
    event_type: 'participant_left',
    event_data: {
      group_id: data.guid,
      timestamp: data.timestamp,
    },
  });

  // Decrement participant count
  await supabase.rpc('decrement_session_participants', {
    session_id: session.id,
  });
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

    console.log('CometChat webhook received:', {
      event: payload.event,
      timestamp: payload.timestamp,
    });

    // Route to appropriate handler based on event type
    switch (payload.event) {
      case 'call.initiated':
        await handleCallInitiated(payload.data as CallEventData);
        break;

      case 'call.ended':
        await handleCallEnded(payload.data as CallEventData);
        break;

      case 'group.member_joined':
        await handleMemberJoined(payload.data as GroupEventData);
        break;

      case 'group.member_left':
        await handleMemberLeft(payload.data as GroupEventData);
        break;

      default:
        console.log('Unhandled webhook event:', payload.event);
    }

    return new Response(
      JSON.stringify({
        success: true,
        event: payload.event,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);

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
To set up this webhook:

1. Deploy the function:
   supabase functions deploy cometchat-webhook

2. Configure CometChat webhook in dashboard:
   - Go to CometChat Dashboard > Settings > Webhooks
   - Add webhook URL: https://your-project.supabase.co/functions/v1/cometchat-webhook
   - Select events: call.initiated, call.ended, group.member_joined, group.member_left
   - Save configuration

3. Create database functions for participant counting:

CREATE OR REPLACE FUNCTION increment_session_participants(session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE class_sessions
  SET current_participants = current_participants + 1
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_session_participants(session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE class_sessions
  SET current_participants = GREATEST(current_participants - 1, 0)
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

4. Test the webhook:
   - Create a test class session
   - Start a video call
   - Join/leave the session
   - Check Edge Function logs: supabase functions logs cometchat-webhook
*/
