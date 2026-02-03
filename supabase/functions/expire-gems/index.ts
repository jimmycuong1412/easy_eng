/**
 * Expire Gems Daily Job
 * Task: T132 - Create daily Gem expiration job
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    // Expire Gems
    const { data: expiredCount } = await supabase.rpc('expire_gems');

    console.log(`Expired ${expiredCount} Gem transactions`);

    return new Response(
      JSON.stringify({ success: true, expired_count: expiredCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// Deploy: supabase functions deploy expire-gems
// Schedule: Run daily via cron
