/**
 * Award Gems Edge Function with Balance Cap
 * Task: T130 - Implement Gem balance cap (1000)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const GEM_BALANCE_CAP = 1000;

serve(async (req: Request) => {
  try {
    const { student_id, amount, reason, metadata } = await req.json();

    // Get current balance
    const { data: currentBalance } = await supabase
      .from('student_gems')
      .select('balance')
      .eq('student_id', student_id)
      .single();

    const balance = currentBalance?.balance || 0;

    // Check cap
    if (balance >= GEM_BALANCE_CAP) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Gem balance cap reached (${GEM_BALANCE_CAP} Gems)`,
          current_balance: balance,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cap the award amount if it would exceed limit
    const effectiveAmount = Math.min(amount, GEM_BALANCE_CAP - balance);
    const cappedAmount = effectiveAmount < amount;

    // Award Gems
    const { error } = await supabase.from('gem_transactions').insert({
      student_id,
      amount: effectiveAmount,
      transaction_type: 'earned',
      reason,
      metadata: {
        ...metadata,
        capped: cappedAmount,
        requested_amount: amount,
        awarded_amount: effectiveAmount,
      },
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        awarded: effectiveAmount,
        capped: cappedAmount,
        new_balance: balance + effectiveAmount,
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
