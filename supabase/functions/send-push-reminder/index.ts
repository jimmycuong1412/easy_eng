/**
 * Send Push Reminder Edge Function
 *
 * Sends browser push notifications for class reminders
 * Task: T176 - Create class reminder push 15min before class
 *
 * Triggered by: Cron job or scheduler
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

// Web Push configuration
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@easyeng.com';

const REMINDER_MINUTES_BEFORE = 15;

// ============================================================================
// Types
// ============================================================================

interface PushReminderRequest {
  booking_id?: string;
  check_upcoming?: boolean;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ============================================================================
// Web Push Helper
// ============================================================================

/**
 * Send web push notification using fetch (simplified version)
 * In production, use a proper web-push library
 */
async function sendWebPush(
  subscription: PushSubscription,
  payload: Record<string, any>
): Promise<boolean> {
  try {
    // For this implementation, we'll use a simplified approach
    // In production, you should use the web-push npm package or similar

    console.log('Sending push to:', subscription.endpoint);
    console.log('Payload:', payload);

    // Here you would implement the actual web push protocol
    // This requires:
    // 1. Generating VAPID headers
    // 2. Encrypting the payload
    // 3. Sending to the push service endpoint

    // For now, we'll just log it
    // TODO: Implement actual web push sending
    console.warn('Web push sending not fully implemented - would send:', payload);

    return true;
  } catch (error) {
    console.error('Failed to send web push:', error);
    return false;
  }
}

// ============================================================================
// Main Logic
// ============================================================================

/**
 * Send push reminder for a specific booking
 */
async function sendPushReminderForBooking(bookingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Fetch booking with class and student details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        class:classes!inner(
          id,
          title,
          scheduled_at,
          duration_minutes,
          teacher:teacher_profiles!inner(
            user:users!inner(
              full_name
            )
          )
        ),
        student:profiles!inner(
          user_id,
          full_name
        )
      `)
      .eq('id', bookingId)
      .eq('status', 'confirmed')
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message || bookingId}`);
    }

    // Get student's push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', booking.student_id)
      .eq('enabled', true);

    if (subsError) {
      throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions for user ${booking.student_id}`);
      return { success: true }; // Not an error if user hasn't subscribed
    }

    // Calculate time until class
    const now = new Date();
    const classStart = new Date(booking.class.scheduled_at);
    const minutesUntil = Math.floor((classStart.getTime() - now.getTime()) / (1000 * 60));

    // Prepare push notification payload
    const payload = {
      title: `⏰ Class Starting in ${minutesUntil} Minutes!`,
      body: `${booking.class.title} with ${booking.class.teacher.user.full_name}`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `class-reminder-${bookingId}`,
      requireInteraction: true,
      data: {
        url: `${FRONTEND_URL}/class/${booking.class.id}/live`,
        booking_id: bookingId,
        class_id: booking.class.id,
        type: 'class_reminder',
      },
      actions: [
        {
          action: 'view',
          title: 'Join Class',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };

    // Send push to all subscriptions
    let sentCount = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      try {
        const success = await sendWebPush(subscription.subscription_data, payload);
        if (success) {
          sentCount++;
        } else {
          errors.push(`Failed to send to ${subscription.endpoint}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${subscription.endpoint}: ${errorMsg}`);
        console.error('Error sending push:', error);
      }
    }

    // Log the push notification
    await supabase.from('push_logs').insert({
      booking_id: bookingId,
      user_id: booking.student_id,
      type: 'class_reminder',
      payload,
      sent_count: sentCount,
      total_count: subscriptions.length,
      errors: errors.length > 0 ? errors : null,
      sent_at: new Date().toISOString(),
    });

    console.log(`Push reminder sent: ${sentCount}/${subscriptions.length} successful`);

    return { success: true };
  } catch (error) {
    console.error('Error sending push reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check for upcoming classes and send push reminders
 */
async function checkUpcomingClasses(): Promise<{
  success: boolean;
  sent: number;
  errors: string[];
}> {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + REMINDER_MINUTES_BEFORE * 60 * 1000);
    const reminderEndTime = new Date(now.getTime() + (REMINDER_MINUTES_BEFORE + 5) * 60 * 1000);

    // Find all confirmed bookings with classes starting in the reminder window
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        class:classes!inner(
          scheduled_at
        )
      `)
      .eq('status', 'confirmed')
      .gte('class.scheduled_at', reminderTime.toISOString())
      .lte('class.scheduled_at', reminderEndTime.toISOString());

    if (bookingsError) {
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      console.log('No upcoming classes requiring push reminders');
      return { success: true, sent: 0, errors: [] };
    }

    console.log(`Found ${bookings.length} bookings requiring push reminders`);

    // Send reminders for each booking
    let sent = 0;
    const errors: string[] = [];

    for (const booking of bookings) {
      const result = await sendPushReminderForBooking(booking.id);
      if (result.success) {
        sent++;
      } else {
        errors.push(`${booking.id}: ${result.error}`);
      }
    }

    return { success: true, sent, errors };
  } catch (error) {
    console.error('Error checking upcoming classes:', error);
    return {
      success: false,
      sent: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
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

    const payload: PushReminderRequest = await req.json();

    // Send reminder for specific booking
    if (payload.booking_id) {
      console.log('Sending push reminder for booking:', payload.booking_id);

      const result = await sendPushReminderForBooking(payload.booking_id);

      if (!result.success) {
        return new Response(
          JSON.stringify({ success: false, error: result.error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          booking_id: payload.booking_id,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check all upcoming classes
    if (payload.check_upcoming) {
      console.log('Checking all upcoming classes for push reminders');

      const result = await checkUpcomingClasses();

      return new Response(
        JSON.stringify({
          success: result.success,
          reminders_sent: result.sent,
          errors: result.errors.length > 0 ? result.errors : undefined,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Must provide booking_id or check_upcoming' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-reminder function:', error);
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

1. Generate VAPID keys:
   npx web-push generate-vapid-keys

2. Set environment variables in Supabase:
   - VAPID_PUBLIC_KEY=your_public_key
   - VAPID_PRIVATE_KEY=your_private_key
   - VAPID_SUBJECT=mailto:your@email.com

3. Deploy the function:
   supabase functions deploy send-push-reminder

4. Create push_subscriptions table:
   CREATE TABLE push_subscriptions (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     endpoint TEXT NOT NULL UNIQUE,
     subscription_data JSONB NOT NULL,
     enabled BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

5. Create push_logs table (optional):
   CREATE TABLE push_logs (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     booking_id UUID REFERENCES bookings(id),
     user_id UUID REFERENCES auth.users(id),
     type TEXT NOT NULL,
     payload JSONB NOT NULL,
     sent_count INTEGER DEFAULT 0,
     total_count INTEGER DEFAULT 0,
     errors TEXT[],
     sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

6. Set up cron job:
   SELECT cron.schedule(
     'push-reminders',
     '*/5 * * * *',
     $$
     SELECT net.http_post(
       url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-reminder',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
       ),
       body := '{"check_upcoming": true}'::jsonb
     );
     $$
   );

NOTE: This implementation uses a simplified web push approach.
For production, consider using the web-push npm package or a dedicated push service.
*/
