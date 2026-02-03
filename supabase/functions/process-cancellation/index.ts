/**
 * Process Cancellation Edge Function
 *
 * Handles booking cancellations with time-based refund logic
 * Task: T211 - Create cancellation processor with time checks
 *
 * Called by: Student/Teacher cancellation requests
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// Types
// ============================================================================

interface CancellationRequest {
  booking_id: string;
  cancelled_by: string;
  cancelled_by_role: 'student' | 'teacher' | 'admin';
  reason?: string;
  notes?: string;
  force_full_refund?: boolean; // Teacher/admin can force 100% refund
}

interface CancellationResult {
  success: boolean;
  cancellation_id?: string;
  refund_percentage?: number;
  gems_refunded?: number;
  cash_refunded?: number;
  error?: string;
}

// ============================================================================
// Main Logic
// ============================================================================

async function processCancellation(request: CancellationRequest): Promise<CancellationResult> {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        class:classes!inner(
          id,
          title,
          scheduled_at,
          price,
          teacher_id
        )
      `)
      .eq('id', request.booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message || request.booking_id}`);
    }

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    // Check if class has already started
    const classStart = new Date(booking.class.scheduled_at);
    const now = new Date();

    if (now >= classStart && request.cancelled_by_role === 'student') {
      throw new Error('Cannot cancel: Class has already started');
    }

    // Verify authorization
    if (request.cancelled_by_role === 'student' && booking.student_id !== request.cancelled_by) {
      throw new Error('Unauthorized: Only the booking student can cancel');
    }

    if (request.cancelled_by_role === 'teacher' && booking.class.teacher_id !== request.cancelled_by) {
      throw new Error('Unauthorized: Only the class teacher can cancel');
    }

    // Calculate hours before class
    const hoursBeforeClass = (classStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Get refund percentage
    let refundPercentage = 0;

    if (request.force_full_refund) {
      // Teacher/admin cancellation = 100% refund
      refundPercentage = 100;
    } else {
      // Apply cancellation policy
      const { data: refundData, error: refundError } = await supabase.rpc('get_refund_percentage', {
        p_class_scheduled_at: booking.class.scheduled_at,
        p_cancellation_time: new Date().toISOString(),
      });

      if (refundError) {
        throw refundError;
      }

      refundPercentage = refundData as number;
    }

    // Calculate refund amounts
    const { data: refundAmounts, error: refundCalcError } = await supabase.rpc(
      'calculate_refund_amounts',
      {
        p_booking_id: request.booking_id,
        p_refund_percentage: refundPercentage,
      }
    );

    if (refundCalcError || !refundAmounts || refundAmounts.length === 0) {
      throw new Error('Failed to calculate refund amounts');
    }

    const { gems_refunded, cash_refunded } = refundAmounts[0];

    // Get policy details
    const { data: policy } = await supabase
      .from('cancellation_policies')
      .select('id, name')
      .eq('is_default', true)
      .single();

    // Create cancellation log
    const { data: cancellationLog, error: logError } = await supabase
      .from('cancellation_logs')
      .insert({
        booking_id: request.booking_id,
        class_id: booking.class_id,
        student_id: booking.student_id,
        teacher_id: booking.class.teacher_id,
        cancelled_by: request.cancelled_by,
        cancelled_by_role: request.cancelled_by_role,
        class_scheduled_at: booking.class.scheduled_at,
        cancelled_at: new Date().toISOString(),
        hours_before_class: hoursBeforeClass,
        original_price: booking.class.price,
        gems_used: booking.gems_used || 0,
        refund_percentage: refundPercentage,
        gems_refunded,
        cash_refunded,
        policy_id: policy?.id || null,
        policy_name: policy?.name || 'Default Policy',
        reason: request.reason || null,
        notes: request.notes || null,
        refund_status: 'pending',
      })
      .select()
      .single();

    if (logError) {
      throw logError;
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.booking_id);

    if (updateError) {
      throw updateError;
    }

    // Cancel teacher earnings
    await supabase.rpc('cancel_earnings', {
      p_booking_id: request.booking_id,
    });

    // Process refund
    await supabase.functions.invoke('refund-gems', {
      body: {
        cancellation_id: cancellationLog.id,
        booking_id: request.booking_id,
        gems_refunded,
        cash_refunded,
      },
    });

    // Create notification for student
    await supabase.functions.invoke('create-notification', {
      body: {
        user_id: booking.student_id,
        type: 'booking_cancelled',
        title: 'Class Cancelled',
        message: `Your class "${booking.class.title}" has been cancelled. Refund: ${refundPercentage}% (${gems_refunded} Gems + $${cash_refunded.toFixed(2)})`,
        action_url: `/student/bookings`,
        priority: 'high',
        icon: '✗',
        color: 'red',
      },
    });

    // Create notification for teacher (if student cancelled)
    if (request.cancelled_by_role === 'student') {
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: booking.class.teacher_id,
          type: 'booking_cancelled',
          title: 'Student Cancelled Class',
          message: `A student cancelled their booking for "${booking.class.title}"`,
          action_url: `/teacher/classes`,
          priority: 'normal',
          icon: '✗',
          color: 'orange',
        },
      });
    }

    console.log('Cancellation processed:', {
      booking_id: request.booking_id,
      refund_percentage: refundPercentage,
      gems_refunded,
      cash_refunded,
    });

    return {
      success: true,
      cancellation_id: cancellationLog.id,
      refund_percentage: refundPercentage,
      gems_refunded,
      cash_refunded,
    };
  } catch (error) {
    console.error('Error processing cancellation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// HTTP Handler
// ============================================================================

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const request: CancellationRequest = await req.json();

    // Validate required fields
    if (!request.booking_id || !request.cancelled_by || !request.cancelled_by_role) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: booking_id, cancelled_by, cancelled_by_role',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing cancellation:', request.booking_id);

    const result = await processCancellation(request);

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
        cancellation_id: result.cancellation_id,
        refund: {
          percentage: result.refund_percentage,
          gems: result.gems_refunded,
          cash: result.cash_refunded,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in process-cancellation function:', error);
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
To deploy:

1. Deploy the function:
   supabase functions deploy process-cancellation

2. Student cancellation:
   curl -X POST https://your-project.supabase.co/functions/v1/process-cancellation \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "booking_id": "uuid",
       "cancelled_by": "student-uuid",
       "cancelled_by_role": "student",
       "reason": "Schedule conflict"
     }'

3. Teacher cancellation (full refund):
   curl -X POST https://your-project.supabase.co/functions/v1/process-cancellation \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type": application/json" \
     -d '{
       "booking_id": "uuid",
       "cancelled_by": "teacher-uuid",
       "cancelled_by_role": "teacher",
       "force_full_refund": true,
       "reason": "Teacher emergency"
     }'

4. Cancellation policy:
   - 24+ hours before: 100% refund
   - 12-24 hours before: 50% refund
   - Less than 12 hours: 0% refund
   - Teacher cancellation: Always 100% refund
*/
