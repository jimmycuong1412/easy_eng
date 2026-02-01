// Edge Function: Process Referral
// Purpose: Validate and process referral code during user signup
// Called when: New user enters a referral code during registration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessReferralRequest {
  referral_code: string;
  referred_student_id?: string; // Optional, uses authenticated user if not provided
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { referral_code, referred_student_id }: ProcessReferralRequest = await req.json();

    if (!referral_code) {
      return new Response(
        JSON.stringify({ error: 'referral_code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    let studentId = referred_student_id;

    // If no student ID provided, get from auth token
    if (!studentId) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header or student_id' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const supabaseAnon = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        {
          global: { headers: { Authorization: authHeader } },
        }
      );

      const {
        data: { user },
        error: authError,
      } = await supabaseAnon.auth.getUser();

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      studentId = user.id;
    }

    console.log(`Processing referral code ${referral_code} for student ${studentId}`);

    // Use service role to process referral
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call process_referral function
    const { data, error } = await supabase.rpc('process_referral', {
      p_referral_code: referral_code.toUpperCase(), // Normalize to uppercase
      p_referred_student_id: studentId,
    });

    if (error) {
      console.error('Error processing referral:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = data[0];

    if (!result.success) {
      console.warn(`Referral processing failed: ${result.message}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Referral processed successfully. Referrer: ${result.referrer_id}`);

    // Get referrer info for confirmation message
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', result.referrer_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
        referrer_name: referrerProfile?.display_name || 'Another student',
        reward_info: 'Your referrer will receive 200 gems once you complete your first class!',
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

POST /process-referral

// Option 1: With auth token (preferred)
Headers: Authorization: Bearer <user-token>
Body: {
  "referral_code": "JOHN123456"
}

// Option 2: With explicit student ID (for server-side processing)
Body: {
  "referral_code": "JOHN123456",
  "referred_student_id": "uuid-here"
}

Response (Success):
{
  "success": true,
  "message": "Referral processed successfully. Reward will be granted when referred user completes their first class.",
  "referrer_name": "John Doe",
  "reward_info": "Your referrer will receive 200 gems once you complete your first class!"
}

Response (Invalid Code):
{
  "success": false,
  "message": "Invalid or inactive referral code"
}

Response (Already Referred):
{
  "success": false,
  "message": "User was already referred by someone else"
}

*/
