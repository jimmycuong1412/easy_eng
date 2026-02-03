/**
 * Teacher Cancel Class Edge Function
 * Task: T215 - Create teacher-initiated cancellation with full refund
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    const { class_id, teacher_id, reason } = await req.json();

    // Get all confirmed bookings for the class
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('class_id', class_id)
      .eq('status', 'confirmed');

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, cancelled_count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cancel each booking with 100% refund
    let cancelledCount = 0;
    for (const booking of bookings) {
      await fetch(`${SUPABASE_URL}/functions/v1/process-cancellation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          cancelled_by: teacher_id,
          cancelled_by_role: 'teacher',
          reason: reason || 'Teacher cancelled class',
          force_full_refund: true,
        }),
      });
      cancelledCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_count: cancelledCount,
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
