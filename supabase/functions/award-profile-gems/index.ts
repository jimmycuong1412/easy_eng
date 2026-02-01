// Edge Function: Award Profile Completion Gems
// Purpose: Award 100 gems when student completes their profile 100%
// Triggered by: Profile update events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileCompletenessRequest {
  student_id: string;
  profile_data: {
    display_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    phone?: string | null;
    timezone?: string | null;
    language_preference?: string | null;
    learning_goals?: string[] | null;
    interests?: string[] | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { student_id, profile_data }: ProfileCompletenessRequest = await req.json();

    if (!student_id || !profile_data) {
      return new Response(
        JSON.stringify({ error: 'student_id and profile_data are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Checking profile completeness for student: ${student_id}`);

    // Calculate profile completeness
    const fieldWeights: Record<string, number> = {
      display_name: 20,
      email: 15,
      avatar_url: 15,
      bio: 10,
      phone: 10,
      timezone: 10,
      language_preference: 10,
      learning_goals: 5,
      interests: 5,
    };

    const isFieldComplete = (value: any): boolean => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    };

    let completedWeight = 0;
    const totalWeight = Object.values(fieldWeights).reduce((sum, w) => sum + w, 0);

    for (const [field, weight] of Object.entries(fieldWeights)) {
      const value = profile_data[field as keyof typeof profile_data];
      if (isFieldComplete(value)) {
        completedWeight += weight;
      }
    }

    const percentage = Math.round((completedWeight / totalWeight) * 100);
    const isComplete = percentage === 100;

    console.log(`Profile completion: ${percentage}%`);

    if (!isComplete) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Profile is ${percentage}% complete. Need 100% to earn gems.`,
          percentage,
          is_complete: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if profile completion gems already awarded
    const { data: existingActivity, error: activityError } = await supabase
      .from('activity_tracking')
      .select('id')
      .eq('student_id', student_id)
      .eq('activity_type', 'profile_completion')
      .maybeSingle();

    if (activityError && activityError.code !== 'PGRST116') {
      console.error('Error checking existing activity:', activityError);
    }

    if (existingActivity) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Profile completion gems already awarded',
          percentage: 100,
          is_complete: true,
          already_awarded: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Award gems for profile completion
    const { data: gemResult, error: gemError } = await supabase.rpc(
      'award_gems_for_activity',
      {
        p_student_id: student_id,
        p_activity_type: 'profile_completion',
        p_metadata: {
          completion_percentage: 100,
          completed_at: new Date().toISOString(),
        },
      }
    );

    if (gemError) {
      console.error('Error awarding gems:', gemError);
      return new Response(
        JSON.stringify({ error: gemError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = gemResult[0];

    console.log(`Profile completion gems result:`, result);

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        gems_awarded: result.gems_awarded,
        transaction_id: result.transaction_id,
        percentage: 100,
        is_complete: true,
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

POST /award-profile-gems

{
  "student_id": "uuid-here",
  "profile_data": {
    "display_name": "John Doe",
    "email": "john@example.com",
    "avatar_url": "https://...",
    "bio": "I love learning!",
    "phone": "+1234567890",
    "timezone": "America/New_York",
    "language_preference": "en",
    "learning_goals": ["fluency", "business"],
    "interests": ["travel", "technology"]
  }
}

Response (Success):
{
  "success": true,
  "message": "Awarded 100 gems for profile_completion",
  "gems_awarded": 100,
  "transaction_id": "uuid",
  "percentage": 100,
  "is_complete": true
}

Response (Already Awarded):
{
  "success": false,
  "message": "Profile completion gems already awarded",
  "percentage": 100,
  "is_complete": true,
  "already_awarded": true
}

Response (Incomplete):
{
  "success": false,
  "message": "Profile is 85% complete. Need 100% to earn gems.",
  "percentage": 85,
  "is_complete": false
}

*/
