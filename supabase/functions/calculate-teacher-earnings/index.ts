/**
 * Calculate Teacher Earnings Edge Function
 *
 * Calculates and records teacher earnings (70% of final price)
 * Task: T204 - Create earnings calculation
 *
 * Triggered after: Booking confirmed, class completed
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Revenue split: 70% teacher, 30% platform
const TEACHER_SHARE_PERCENTAGE = 0.70;
const PLATFORM_FEE_PERCENTAGE = 0.30;

// ============================================================================
// Types
// ============================================================================

interface CalculateEarningsRequest {
  booking_id?: string;
  session_id?: string;
  mark_as_earned?: boolean;
}

interface EarningsResult {
  success: boolean;
  earnings_id?: string;
  teacher_share?: number;
  platform_fee?: number;
  error?: string;
}

// ============================================================================
// Main Logic
// ============================================================================

/**
 * Calculate earnings for a single booking
 */
async function calculateBookingEarnings(bookingId: string): Promise<EarningsResult> {
  try {
    // Use database function to calculate and store earnings
    const { data, error } = await supabase.rpc('calculate_teacher_earnings', {
      p_booking_id: bookingId,
    });

    if (error) {
      throw new Error(`Failed to calculate earnings: ${error.message}`);
    }

    // Get the created earnings record
    const { data: earnings, error: fetchError } = await supabase
      .from('teacher_earnings')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    console.log('Earnings calculated:', {
      booking_id: bookingId,
      teacher_share: earnings.teacher_share,
      platform_fee: earnings.platform_fee,
    });

    return {
      success: true,
      earnings_id: earnings.id,
      teacher_share: earnings.teacher_share,
      platform_fee: earnings.platform_fee,
    };
  } catch (error) {
    console.error('Error calculating earnings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark earnings as earned for a completed session
 */
async function markSessionEarningsAsEarned(sessionId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('mark_earnings_earned', {
      p_session_id: sessionId,
    });

    if (error) {
      throw error;
    }

    console.log(`Marked ${data} earnings as earned for session ${sessionId}`);

    return {
      success: true,
      count: data as number,
    };
  } catch (error) {
    console.error('Error marking earnings as earned:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process earnings for multiple bookings
 */
async function processMultipleEarnings(bookingIds: string[]): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
}> {
  let processed = 0;
  const errors: string[] = [];

  for (const bookingId of bookingIds) {
    const result = await calculateBookingEarnings(bookingId);
    if (result.success) {
      processed++;
    } else {
      errors.push(`${bookingId}: ${result.error}`);
    }
  }

  return {
    success: processed > 0,
    processed,
    errors,
  };
}

// ============================================================================
// HTTP Handler
// ============================================================================

serve(async (req: Request) => {
  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const request: CalculateEarningsRequest = await req.json();

    // Calculate for single booking
    if (request.booking_id) {
      console.log('Calculating earnings for booking:', request.booking_id);

      const result = await calculateBookingEarnings(request.booking_id);

      if (!result.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          earnings_id: result.earnings_id,
          teacher_share: result.teacher_share,
          platform_fee: result.platform_fee,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Mark session earnings as earned
    if (request.session_id) {
      console.log('Marking earnings as earned for session:', request.session_id);

      const result = await markSessionEarningsAsEarned(request.session_id);

      if (!result.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          session_id: request.session_id,
          earnings_marked: result.count,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Must provide booking_id or session_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-teacher-earnings function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Deployment Notes
// ============================================================================

/*
To deploy this function:

1. Deploy the function:
   supabase functions deploy calculate-teacher-earnings

2. Integration points:

   a) Auto-calculate on booking confirmation:
      Already handled by database trigger in 040_teacher_earnings.sql

   b) Mark as earned when class ends:
      Call from cometchat-webhook or award-class-rewards:

      await fetch(`${SUPABASE_URL}/functions/v1/calculate-teacher-earnings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

3. Manual calculation (if needed):
   curl -X POST https://your-project.supabase.co/functions/v1/calculate-teacher-earnings \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"booking_id": "uuid-here"}'

4. Revenue split verification:
   - Teacher share: 70% of final_price
   - Platform fee: 30% of final_price
   - Total: teacher_share + platform_fee = final_price

Example calculation:
  Class price: $20
  Gems used: 10 (= $5 discount)
  Final price: $15
  Teacher share: $15 * 0.70 = $10.50
  Platform fee: $15 * 0.30 = $4.50
*/
