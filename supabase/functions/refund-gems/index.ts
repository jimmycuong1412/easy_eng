/**
 * Refund Gems Edge Function
 *
 * Processes Gem refunds for cancelled bookings
 * Task: T212 - Implement proportional Gem refund
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    const { cancellation_id, booking_id, gems_refunded, cash_refunded } = await req.json();

    // Get booking and cancellation details
    const { data: cancellation } = await supabase
      .from('cancellation_logs')
      .select('*, student_id')
      .eq('id', cancellation_id)
      .single();

    if (!cancellation) {
      throw new Error('Cancellation not found');
    }

    // Refund Gems
    if (gems_refunded > 0) {
      await supabase.from('gem_transactions').insert({
        student_id: cancellation.student_id,
        amount: gems_refunded,
        transaction_type: 'earned',
        reason: 'booking_cancellation_refund',
        metadata: {
          booking_id,
          cancellation_id,
          refund_percentage: cancellation.refund_percentage,
        },
      });
    }

    // TODO: Process cash refund through payment gateway
    if (cash_refunded > 0) {
      console.log('Cash refund to process:', cash_refunded);
      // Integrate with Stripe/PayPal refund API
    }

    // Update cancellation log
    await supabase
      .from('cancellation_logs')
      .update({
        refund_status: 'completed',
        refund_processed_at: new Date().toISOString(),
      })
      .eq('id', cancellation_id);

    return new Response(
      JSON.stringify({
        success: true,
        gems_refunded,
        cash_refunded,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Refund error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
