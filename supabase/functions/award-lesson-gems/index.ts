// Edge Function: Award Lesson Gems
// Purpose: Process lesson completion and award gems automatically
// Triggered by: Booking completion events or manual API calls

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LessonCompletionRequest {
  booking_id: string;
  quiz_score?: number;
  attendance_verified?: boolean;
}

interface GemAwardResult {
  success: boolean;
  gems_awarded: number;
  transaction_id: string | null;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { booking_id, quiz_score, attendance_verified = true }: LessonCompletionRequest =
      await req.json();

    // Validate booking_id
    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate quiz_score if provided
    if (quiz_score !== undefined && (quiz_score < 0 || quiz_score > 100)) {
      return new Response(
        JSON.stringify({ error: 'quiz_score must be between 0 and 100' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing lesson completion for booking: ${booking_id}`);

    // Call mark_lesson_completed function
    const { data, error } = await supabase.rpc('mark_lesson_completed', {
      p_booking_id: booking_id,
      p_quiz_score: quiz_score || null,
      p_attendance_verified: attendance_verified,
    });

    if (error) {
      console.error('Error marking lesson as completed:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result: GemAwardResult = data[0];

    console.log(`Lesson completion result:`, result);

    // If gems were awarded, log success
    if (result.success && result.gems_awarded > 0) {
      console.log(
        `Successfully awarded ${result.gems_awarded} gems (transaction: ${result.transaction_id})`
      );
    } else if (!result.success) {
      console.warn(`Gem award failed: ${result.message}`);
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        gems_awarded: result.gems_awarded,
        transaction_id: result.transaction_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/* Example Usage:

POST /award-lesson-gems

Request Body:
{
  "booking_id": "uuid-here",
  "quiz_score": 85,
  "attendance_verified": true
}

Response (Success):
{
  "success": true,
  "message": "Awarded 50 gems for lesson_completion",
  "gems_awarded": 50,
  "transaction_id": "uuid-here"
}

Response (Rate Limited):
{
  "success": false,
  "message": "Rate limit exceeded",
  "gems_awarded": 0,
  "transaction_id": null
}

Response (Already Completed):
{
  "success": false,
  "message": "Lesson already marked as completed",
  "gems_awarded": 0,
  "transaction_id": null
}

*/
