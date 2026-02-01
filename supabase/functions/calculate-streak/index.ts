// Edge Function: Calculate Attendance Streak
// Purpose: Calculate and update student attendance streaks
// Can be called manually or triggered after lesson completion

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreakCalculationRequest {
  student_id: string;
  attendance_date?: string; // ISO date string, defaults to today
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { student_id, attendance_date }: StreakCalculationRequest = await req.json();

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: 'student_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use provided date or default to current date
    const dateToUse = attendance_date || new Date().toISOString().split('T')[0];

    console.log(`Calculating streak for student ${student_id} on ${dateToUse}`);

    // Call update_attendance_streak function
    const { data, error } = await supabase.rpc('update_attendance_streak', {
      p_student_id: student_id,
      p_attendance_date: dateToUse,
    });

    if (error) {
      console.error('Error updating streak:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = data[0];

    console.log(`Streak updated:`, result);

    return new Response(
      JSON.stringify({
        success: true,
        current_streak: result.current_streak,
        previous_streak: result.previous_streak,
        is_new_record: result.is_new_record,
        streak_bonus_awarded: result.streak_bonus_awarded,
        gems_awarded: result.gems_awarded,
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

POST /calculate-streak

{
  "student_id": "uuid-here",
  "attendance_date": "2026-02-01"
}

Response:
{
  "success": true,
  "current_streak": 7,
  "previous_streak": 6,
  "is_new_record": false,
  "streak_bonus_awarded": true,
  "gems_awarded": 100
}

*/
