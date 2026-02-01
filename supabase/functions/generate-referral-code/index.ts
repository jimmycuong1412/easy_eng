// Edge Function: Generate Referral Code
// Purpose: Generate or retrieve student's unique referral code
// Called during: Student signup or dashboard load

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
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user is a student
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'student') {
      return new Response(
        JSON.stringify({ error: 'Only students can have referral codes' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Generating referral code for student: ${user.id}`);

    // Use service role client for function execution
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Call create_referral_code_for_student function
    const { data, error } = await supabaseService.rpc('create_referral_code_for_student', {
      p_student_id: user.id,
    });

    if (error) {
      console.error('Error generating referral code:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const referralCode = data;

    // Get referral stats
    const { data: stats, error: statsError } = await supabaseService
      .from('referral_codes')
      .select('total_referrals, total_gems_earned')
      .eq('student_id', user.id)
      .single();

    if (statsError) {
      console.warn('Error fetching referral stats:', statsError);
    }

    // Build referral URL
    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:3000';
    const referralUrl = `${baseUrl}/auth/register?ref=${referralCode}`;

    console.log(`Referral code generated: ${referralCode}`);

    return new Response(
      JSON.stringify({
        success: true,
        referral_code: referralCode,
        referral_url: referralUrl,
        stats: {
          total_referrals: stats?.total_referrals || 0,
          total_gems_earned: stats?.total_gems_earned || 0,
        },
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

GET /generate-referral-code
Headers: Authorization: Bearer <user-token>

Response:
{
  "success": true,
  "referral_code": "JOHN123456",
  "referral_url": "https://example.com/auth/register?ref=JOHN123456",
  "stats": {
    "total_referrals": 5,
    "total_gems_earned": 1000
  }
}

*/
