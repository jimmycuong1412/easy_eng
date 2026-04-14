/**
 * Award Gems Edge Function
 * Routes through process_gem_activity() DB function which enforces:
 *   - activity eligibility check against gem_earning_rules
 *   - rate limits (max_per_day etc.)
 *   - 10,000 gem balance cap (single source of truth)
 *   - activity_tracking insert
 *
 * Cap is also enforced by enforce_gem_cap_before_insert DB trigger as a safety net.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { student_id, amount, reason, metadata } = await req.json();

    if (!student_id || !amount || !reason) {
      return new Response(
        JSON.stringify({ error: 'student_id, amount, and reason are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use award_gems_for_activity which handles eligibility, rate limits, and the 10,000 cap
    const { data, error } = await supabase.rpc('award_gems_for_activity', {
      p_student_id: student_id,
      p_activity_type: reason,
      p_metadata: metadata ?? {},
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result?.message ?? 'Activity did not qualify for gem award',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        awarded: result.gems_awarded,
        transaction_id: result.transaction_id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
