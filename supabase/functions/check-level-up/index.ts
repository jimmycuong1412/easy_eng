// Edge Function: Check Level Up
// Task: T148 - Create level-up detection and notification
// Purpose: Check if student should level up and trigger notifications
// Can be called periodically or after XP awards
// Date: 2026-02-05

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LevelUpCheckRequest {
  student_id: string;
}

interface LevelUpCheckResult {
  should_level_up: boolean;
  current_level: number;
  new_level: number;
  current_xp: number;
  xp_to_next_level: number;
  notifications_sent: number;
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
    const { student_id }: LevelUpCheckRequest = await req.json();

    // Validate required fields
    if (!student_id) {
      return new Response(
        JSON.stringify({ error: 'student_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Checking level-up eligibility for student: ${student_id}`);

    // Get student's active career
    const { data: career, error: careerError } = await supabase
      .from('student_careers')
      .select(`
        *,
        career_paths (
          name,
          max_level,
          xp_multiplier
        )
      `)
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (careerError || !career) {
      return new Response(
        JSON.stringify({
          error: 'No active career found for student',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const current_level = career.current_level;
    const current_xp = career.current_xp;
    const xp_to_next_level = career.xp_to_next_level;
    const max_level = career.career_paths.max_level || 50;

    // Check if already at max level
    if (current_level >= max_level) {
      return new Response(
        JSON.stringify({
          should_level_up: false,
          current_level,
          new_level: current_level,
          current_xp,
          xp_to_next_level: 0,
          notifications_sent: 0,
          message: 'Already at maximum level',
        } as LevelUpCheckResult),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if XP is sufficient for level up
    let should_level_up = current_xp >= xp_to_next_level;
    let new_level = current_level;
    let remaining_xp = current_xp;
    let notifications_sent = 0;

    if (!should_level_up) {
      return new Response(
        JSON.stringify({
          should_level_up: false,
          current_level,
          new_level: current_level,
          current_xp,
          xp_to_next_level,
          notifications_sent: 0,
          message: `Need ${xp_to_next_level - current_xp} more XP to level up`,
        } as LevelUpCheckResult),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate how many levels to gain
    let new_xp_requirement = xp_to_next_level;
    while (remaining_xp >= new_xp_requirement && new_level < max_level) {
      remaining_xp -= new_xp_requirement;
      new_level++;

      // Calculate next level XP requirement
      const { data: nextLevelXP } = await supabase.rpc('calculate_xp_for_level', {
        p_level: new_level,
        p_multiplier: career.career_paths.xp_multiplier || 1.0,
      });

      new_xp_requirement = nextLevelXP || 100;
    }

    // Update student career with new level
    const { error: updateError } = await supabase
      .from('student_careers')
      .update({
        current_level: new_level,
        current_xp: remaining_xp,
        xp_to_next_level: new_xp_requirement,
        total_levels_gained: career.total_levels_gained + (new_level - current_level),
        last_level_up_at: new Date().toISOString(),
        // Increase stats based on levels gained
        health: career.health + (new_level - current_level) * 5,
        mana: career.mana + (new_level - current_level) * 5,
        strength: career.strength + (new_level - current_level) * 1,
        intelligence: career.intelligence + (new_level - current_level) * 1,
        creativity: career.creativity + (new_level - current_level) * 1,
        charisma: career.charisma + (new_level - current_level) * 1,
      })
      .eq('id', career.id);

    if (updateError) {
      console.error('Failed to update career:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update student level' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send notification for each level gained
    const levels_gained = new_level - current_level;
    try {
      for (let i = 0; i < levels_gained; i++) {
        const level_reached = current_level + i + 1;
        await supabase.from('notifications').insert({
          user_id: student_id,
          type: 'level_up',
          title: `🎉 Level Up! You reached Level ${level_reached}`,
          message: `Congratulations! You've advanced to level ${level_reached} in your ${career.career_paths.name} career. Your stats have increased!`,
          metadata: {
            old_level: level_reached - 1,
            new_level: level_reached,
            career_name: career.career_paths.name,
            stat_increases: {
              health: 5,
              mana: 5,
              strength: 1,
              intelligence: 1,
              creativity: 1,
              charisma: 1,
            },
          },
        });
        notifications_sent++;
      }
    } catch (notificationError) {
      console.error('Failed to create notifications:', notificationError);
      // Don't fail the request if notification fails
    }

    console.log(`Student ${student_id} leveled up: ${current_level} -> ${new_level}`);

    return new Response(
      JSON.stringify({
        should_level_up: true,
        current_level: current_level,
        new_level: new_level,
        current_xp: remaining_xp,
        xp_to_next_level: new_xp_requirement,
        notifications_sent,
        message: levels_gained === 1
          ? `Leveled up to ${new_level}!`
          : `Leveled up ${levels_gained} times to ${new_level}!`,
      } as LevelUpCheckResult),
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

POST /check-level-up

Request Body:
{
  "student_id": "uuid-here"
}

Response (Level Up):
{
  "should_level_up": true,
  "current_level": 5,
  "new_level": 6,
  "current_xp": 25,
  "xp_to_next_level": 150,
  "notifications_sent": 1,
  "message": "Leveled up to 6!"
}

Response (Multiple Levels):
{
  "should_level_up": true,
  "current_level": 5,
  "new_level": 8,
  "current_xp": 50,
  "xp_to_next_level": 200,
  "notifications_sent": 3,
  "message": "Leveled up 3 times to 8!"
}

Response (Not Enough XP):
{
  "should_level_up": false,
  "current_level": 5,
  "new_level": 5,
  "current_xp": 75,
  "xp_to_next_level": 150,
  "notifications_sent": 0,
  "message": "Need 75 more XP to level up"
}

Response (Max Level):
{
  "should_level_up": false,
  "current_level": 50,
  "new_level": 50,
  "current_xp": 1000,
  "xp_to_next_level": 0,
  "notifications_sent": 0,
  "message": "Already at maximum level"
}

*/
