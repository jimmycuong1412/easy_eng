/**
 * Award Class Rewards Edge Function
 *
 * Awards Gems and XP to students who attended the class
 * Task: T128 Create award-class-rewards Edge Function
 *
 * Triggered after a class session ends
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Reward amounts (from activity rules or constants)
const REWARDS = {
  CLASS_COMPLETION: {
    gems: 10, // Gems for attending a class
    xp: 50, // XP for attending a class
  },
  ATTENDANCE_THRESHOLD: 0.5, // Must attend at least 50% to get rewards
};

// ============================================================================
// Types
// ============================================================================

interface RequestPayload {
  session_id: string;
}

interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  booking_id: string | null;
  role: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number;
  is_present: boolean;
}

interface ClassSession {
  id: string;
  class_id: string;
  teacher_id: string;
  status: string;
  duration_minutes: number | null;
}

// ============================================================================
// Main Logic
// ============================================================================

/**
 * Award rewards to all eligible participants
 */
async function awardSessionRewards(sessionId: string): Promise<{
  success: boolean;
  rewarded_count: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let rewardedCount = 0;

  try {
    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Session not found: ${sessionError.message}`);
    }

    if (session.status !== 'ended') {
      throw new Error('Session must be ended before awarding rewards');
    }

    // Get all participants who were present (attended >= 50%)
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('role', 'student') // Only students get rewards
      .eq('is_present', true); // Must have been present

    if (participantsError) {
      throw new Error(`Failed to fetch participants: ${participantsError.message}`);
    }

    if (!participants || participants.length === 0) {
      console.log('No eligible participants found for rewards');
      return { success: true, rewarded_count: 0, errors: [] };
    }

    // Award Gems and XP to each eligible participant
    for (const participant of participants) {
      try {
        // Award Gems
        const { error: gemsError } = await supabase.from('gem_transactions').insert({
          student_id: participant.user_id,
          amount: REWARDS.CLASS_COMPLETION.gems,
          transaction_type: 'earned',
          reason: 'lesson_completion',
          metadata: {
            session_id: sessionId,
            class_id: session.class_id,
            attendance_duration: participant.duration_seconds,
          },
        });

        if (gemsError) {
          errors.push(`Failed to award Gems to ${participant.user_id}: ${gemsError.message}`);
          continue;
        }

        // Award XP (if student_characters table exists)
        try {
          const { error: xpError } = await supabase.rpc('award_xp', {
            p_student_id: participant.user_id,
            p_amount: REWARDS.CLASS_COMPLETION.xp,
            p_reason: 'class_completion',
          });

          if (xpError) {
            console.warn(`Failed to award XP to ${participant.user_id}:`, xpError);
            // Don't fail the entire operation if XP fails
          }
        } catch (xpError) {
          // XP system may not be implemented yet
          console.log('XP system not available');
        }

        // Update booking status to completed
        if (participant.booking_id) {
          await supabase
            .from('bookings')
            .update({ status: 'completed' })
            .eq('id', participant.booking_id);
        }

        rewardedCount++;
        console.log(`Rewarded student ${participant.user_id}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process rewards for ${participant.user_id}: ${errorMsg}`);
        console.error('Error awarding rewards:', error);
      }
    }

    // Log reward distribution event
    await supabase.from('session_events').insert({
      session_id: sessionId,
      event_type: 'reward_distribution',
      event_data: {
        rewarded_count: rewardedCount,
        gems_per_student: REWARDS.CLASS_COMPLETION.gems,
        xp_per_student: REWARDS.CLASS_COMPLETION.xp,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      rewarded_count: rewardedCount,
      errors,
    };
  } catch (error) {
    console.error('Fatal error in reward distribution:', error);
    return {
      success: false,
      rewarded_count: rewardedCount,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

// ============================================================================
// HTTP Handler
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

    // Parse request payload
    const payload: RequestPayload = await req.json();

    if (!payload.session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Awarding rewards for session:', payload.session_id);

    // Award rewards
    const result = await awardSessionRewards(payload.session_id);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Reward distribution failed',
          details: result.errors,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: payload.session_id,
        rewarded_count: result.rewarded_count,
        gems_awarded: result.rewarded_count * REWARDS.CLASS_COMPLETION.gems,
        xp_awarded: result.rewarded_count * REWARDS.CLASS_COMPLETION.xp,
        errors: result.errors.length > 0 ? result.errors : undefined,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in award-class-rewards function:', error);

    return new Response(
      JSON.stringify({
        success: false,
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
To deploy this function:

1. Deploy the function:
   supabase functions deploy award-class-rewards

2. Create database function for XP awards (if not exists):

CREATE OR REPLACE FUNCTION award_xp(
  p_student_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Check if student_characters table exists and update
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_characters') THEN
    INSERT INTO xp_transactions (student_id, amount, reason)
    VALUES (p_student_id, p_amount, p_reason);

    UPDATE student_characters
    SET total_xp = total_xp + p_amount
    WHERE student_id = p_student_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

3. Test the function:
   curl -X POST https://your-project.supabase.co/functions/v1/award-class-rewards \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"session_id": "uuid-here"}'

4. Set up automatic invocation:
   - Called by cometchat-webhook when session ends
   - Or triggered by database trigger on session status change

Example trigger:
CREATE OR REPLACE FUNCTION trigger_reward_distribution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/award-class-rewards',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('session_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_ended
  AFTER UPDATE ON class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reward_distribution();
*/
