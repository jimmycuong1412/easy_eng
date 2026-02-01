// Edge Function: Daily Streak Check
// Purpose: Check all students' streaks daily and identify broken streaks
// Triggered by: Supabase cron job (daily at midnight UTC)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting daily streak check...');

    // Get all active streaks
    const { data: streaks, error: streakError } = await supabase
      .from('attendance_streaks')
      .select('student_id, current_streak, last_attendance_date')
      .gt('current_streak', 0);

    if (streakError) {
      console.error('Error fetching streaks:', streakError);
      return new Response(
        JSON.stringify({ error: streakError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let brokenStreaks = 0;
    let activeStreaks = 0;
    const results: any[] = [];

    for (const streak of streaks || []) {
      const lastAttendance = streak.last_attendance_date;

      // Check if streak should be broken (no attendance yesterday)
      if (lastAttendance < yesterday) {
        // Streak is broken - reset it
        const { error: updateError } = await supabase
          .from('attendance_streaks')
          .update({
            current_streak: 0,
            streak_broken_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('student_id', streak.student_id);

        if (updateError) {
          console.error(`Error breaking streak for ${streak.student_id}:`, updateError);
        } else {
          brokenStreaks++;
          results.push({
            student_id: streak.student_id,
            action: 'broken',
            previous_streak: streak.current_streak,
          });
        }
      } else {
        // Streak is still active
        activeStreaks++;
        results.push({
          student_id: streak.student_id,
          action: 'maintained',
          current_streak: streak.current_streak,
        });
      }
    }

    console.log(`Daily streak check complete: ${activeStreaks} active, ${brokenStreaks} broken`);

    return new Response(
      JSON.stringify({
        success: true,
        date_checked: today,
        total_streaks_checked: (streaks || []).length,
        active_streaks: activeStreaks,
        broken_streaks: brokenStreaks,
        details: results,
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

/* Example Cron Setup:

In Supabase Dashboard:
1. Go to Database > Extensions > Enable pg_cron
2. Create cron job:

SELECT cron.schedule(
  'daily-streak-check',
  '0 0 * * *', -- Every day at midnight UTC
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/daily-streak-check',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

*/

/* Example Response:

{
  "success": true,
  "date_checked": "2026-02-01",
  "total_streaks_checked": 42,
  "active_streaks": 38,
  "broken_streaks": 4,
  "details": [
    {
      "student_id": "uuid1",
      "action": "broken",
      "previous_streak": 5
    },
    {
      "student_id": "uuid2",
      "action": "maintained",
      "current_streak": 12
    }
  ]
}

*/
