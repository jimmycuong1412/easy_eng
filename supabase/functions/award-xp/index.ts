// Edge Function: Award XP
// Task: T147 - Create XP award Edge Function
// Purpose: Process activity completions and award XP with automatic level-up detection
// Triggered by: Activity events or manual API calls
// Date: 2026-02-05

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwardXPRequest {
  student_id: string;
  activity_type: string;
  activity_description?: string;
  activity_metadata?: Record<string, any>;
  manual_xp_amount?: number; // For admin manual awards
}

interface AwardXPResult {
  success: boolean;
  xp_awarded: number;
  transaction_id: string | null;
  caused_level_up: boolean;
  old_level: number;
  new_level: number;
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

    // Get auth header for admin validation
    const authHeader = req.headers.get('Authorization');

    // Parse request body
    const {
      student_id,
      activity_type,
      activity_description,
      activity_metadata,
      manual_xp_amount,
    }: AwardXPRequest = await req.json();

    // Validate required fields
    if (!student_id || !activity_type) {
      return new Response(
        JSON.stringify({ error: 'student_id and activity_type are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate student exists and has role 'student'
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', student_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Student not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (profile.role !== 'student') {
      return new Response(
        JSON.stringify({ error: 'User must have student role' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing XP award for student: ${student_id}, activity: ${activity_type}`);

    // Get student's active career
    const { data: career, error: careerError } = await supabase
      .from('student_careers')
      .select('*')
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (careerError || !career) {
      return new Response(
        JSON.stringify({
          error: 'Student must select a career path first',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get XP earning rule
    const { data: rule, error: ruleError } = await supabase
      .from('xp_earning_rules')
      .select('*')
      .eq('activity_type', activity_type)
      .eq('is_active', true)
      .single();

    if (ruleError || !rule) {
      return new Response(
        JSON.stringify({ error: `No active rule for activity type: ${activity_type}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Determine XP amount (manual award or from rule)
    let xp_amount = rule.xp_reward;
    if (activity_type === 'manual_award' && manual_xp_amount !== undefined) {
      // Validate admin permission for manual awards
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization required for manual awards' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      xp_amount = manual_xp_amount;
    }

    // Check rate limits
    const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc(
      'check_xp_rate_limit',
      {
        p_student_id: student_id,
        p_activity_type: activity_type,
      }
    );

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (rateLimitOk === false) {
      return new Response(
        JSON.stringify({
          success: false,
          xp_awarded: 0,
          transaction_id: null,
          caused_level_up: false,
          old_level: career.current_level,
          new_level: career.current_level,
          message: `Rate limit exceeded for ${activity_type}`,
        } as AwardXPResult),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate new XP and level
    const new_xp = career.current_xp + xp_amount;
    let new_level = career.current_level;
    let remaining_xp = new_xp;
    let caused_level_up = false;

    // Check for level up (may level up multiple times if XP is large enough)
    while (remaining_xp >= career.xp_to_next_level && new_level < 50) {
      remaining_xp -= career.xp_to_next_level;
      new_level++;
      caused_level_up = true;

      // Recalculate XP requirement for next level
      const { data: nextLevelXP } = await supabase.rpc('calculate_xp_for_level', {
        p_level: new_level,
        p_multiplier: 1.0, // Can be adjusted per career
      });

      career.xp_to_next_level = nextLevelXP || 100;
    }

    // Insert XP transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('xp_transactions')
      .insert({
        student_id,
        career_id: career.id,
        xp_amount,
        activity_type,
        activity_description,
        activity_metadata,
        level_before: career.current_level,
        level_after: new_level,
        caused_level_up,
        source: activity_type === 'manual_award' ? 'admin' : 'system',
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction insert error:', transactionError);
      return new Response(
        JSON.stringify({ error: 'Failed to record XP transaction' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update student career
    const updates: Record<string, any> = {
      current_xp: remaining_xp,
      current_level: new_level,
      total_xp_earned: career.total_xp_earned + xp_amount,
      xp_to_next_level: career.xp_to_next_level,
    };

    if (caused_level_up) {
      updates.total_levels_gained = career.total_levels_gained + (new_level - career.current_level);
      updates.last_level_up_at = new Date().toISOString();

      // Increase stats on level up (simple progression)
      updates.health = career.health + (new_level - career.current_level) * 5;
      updates.mana = career.mana + (new_level - career.current_level) * 5;
      updates.strength = career.strength + (new_level - career.current_level) * 1;
      updates.intelligence = career.intelligence + (new_level - career.current_level) * 1;
      updates.creativity = career.creativity + (new_level - career.current_level) * 1;
      updates.charisma = career.charisma + (new_level - career.current_level) * 1;
    }

    const { error: updateError } = await supabase
      .from('student_careers')
      .update(updates)
      .eq('id', career.id);

    if (updateError) {
      console.error('Career update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update career' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // If level up occurred, trigger notification
    if (caused_level_up) {
      try {
        await supabase.from('notifications').insert({
          user_id: student_id,
          type: 'level_up',
          title: `Level Up! You reached Level ${new_level}`,
          message: `Congratulations! You've advanced to level ${new_level}. Keep learning!`,
          metadata: {
            old_level: career.current_level,
            new_level,
            activity_type,
          },
        });
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    const result: AwardXPResult = {
      success: true,
      xp_awarded: xp_amount,
      transaction_id: transaction.id,
      caused_level_up,
      old_level: career.current_level,
      new_level,
      message: caused_level_up
        ? `Awarded ${xp_amount} XP and leveled up to ${new_level}!`
        : `Awarded ${xp_amount} XP for ${activity_type}`,
    };

    console.log('XP award result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

POST /award-xp

Request Body (Standard Activity):
{
  "student_id": "uuid-here",
  "activity_type": "lesson_completion",
  "activity_description": "Completed Introduction to Grammar",
  "activity_metadata": {
    "booking_id": "uuid-here",
    "quiz_score": 95
  }
}

Request Body (Manual Award):
{
  "student_id": "uuid-here",
  "activity_type": "manual_award",
  "activity_description": "Bonus for excellent performance",
  "manual_xp_amount": 500
}

Response (Success, No Level Up):
{
  "success": true,
  "xp_awarded": 100,
  "transaction_id": "uuid-here",
  "caused_level_up": false,
  "old_level": 5,
  "new_level": 5,
  "message": "Awarded 100 XP for lesson_completion"
}

Response (Success, Level Up):
{
  "success": true,
  "xp_awarded": 150,
  "transaction_id": "uuid-here",
  "caused_level_up": true,
  "old_level": 5,
  "new_level": 6,
  "message": "Awarded 150 XP and leveled up to 6!"
}

Response (Rate Limited):
{
  "success": false,
  "xp_awarded": 0,
  "transaction_id": null,
  "caused_level_up": false,
  "old_level": 5,
  "new_level": 5,
  "message": "Rate limit exceeded for lesson_completion"
}

*/
