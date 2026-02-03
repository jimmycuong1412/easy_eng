/**
 * Send Class Reminder Email
 *
 * Sends reminder emails 15 minutes before class starts
 * Task: T168 - Create class reminder email
 *
 * Triggered by: Scheduled cron job or Edge Function scheduler
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

// Send reminder X minutes before class
const REMINDER_MINUTES_BEFORE = 15;

// ============================================================================
// Types
// ============================================================================

interface ClassReminderRequest {
  booking_id?: string; // Send for specific booking
  check_upcoming?: boolean; // Check all upcoming classes
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getMinutesUntilStart(scheduledAt: string): number {
  const now = new Date();
  const start = new Date(scheduledAt);
  return Math.floor((start.getTime() - now.getTime()) / (1000 * 60));
}

async function loadTemplate(templateName: string, data: Record<string, any>): Promise<string> {
  try {
    const templatePath = `../email-templates/${templateName}.html`;
    const template = await Deno.readTextFile(templatePath);

    let html = template;

    // Handle conditionals
    html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
      return data[key] ? content : '';
    });

    // Replace variables
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, String(data[key] || ''));
    });

    return html;
  } catch (error) {
    console.error('Error loading template:', error);
    throw error;
  }
}

// ============================================================================
// Main Logic
// ============================================================================

/**
 * Send reminder for a specific booking
 */
async function sendReminderForBooking(bookingId: string): Promise<{
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
          full_name,
          email
        )
      `)
      .eq('id', bookingId)
      .eq('status', 'confirmed')
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found or not confirmed: ${bookingError?.message || bookingId}`);
    }

    // Check if reminder was already sent
    const { data: existingReminder } = await supabase
      .from('email_logs')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('template', 'class-reminder')
      .single();

    if (existingReminder) {
      console.log(`Reminder already sent for booking ${bookingId}`);
      return { success: true };
    }

    const minutesUntilStart = getMinutesUntilStart(booking.class.scheduled_at);

    // Prepare template data
    const templateData = {
      studentName: booking.student.full_name,
      studentEmail: booking.student.email,
      className: booking.class.title,
      teacherName: booking.class.teacher.user.full_name,
      startTime: formatTime(booking.class.scheduled_at),
      duration: booking.class.duration_minutes,
      minutesUntilStart,
      bookingId: booking.id,
      classUrl: `${FRONTEND_URL}/class/${booking.class.id}/live`,
    };

    // Load and render template
    const html = await loadTemplate('class-reminder', templateData);

    // Send email
    const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: booking.student.email,
        subject: `⏰ Class Starting in ${minutesUntilStart} Minutes: ${booking.class.title}`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    // Log the email
    await supabase.from('email_logs').insert({
      booking_id: bookingId,
      to: booking.student.email,
      subject: `Class Starting in ${minutesUntilStart} Minutes`,
      template: 'class-reminder',
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    console.log(`Reminder sent to ${booking.student.email} for booking ${bookingId}`);

    return { success: true };
  } catch (error) {
    console.error('Error sending class reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check for upcoming classes and send reminders
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
      console.log('No upcoming classes requiring reminders');
      return { success: true, sent: 0, errors: [] };
    }

    console.log(`Found ${bookings.length} bookings requiring reminders`);

    // Send reminders for each booking
    let sent = 0;
    const errors: string[] = [];

    for (const booking of bookings) {
      const result = await sendReminderForBooking(booking.id);
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

    const payload: ClassReminderRequest = await req.json();

    // Send reminder for specific booking
    if (payload.booking_id) {
      console.log('Sending reminder for booking:', payload.booking_id);

      const result = await sendReminderForBooking(payload.booking_id);

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
      console.log('Checking all upcoming classes for reminders');

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
    console.error('Error in send-class-reminder function:', error);
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

1. supabase functions deploy send-class-reminder

2. Set up cron job to check for upcoming classes every 5 minutes:
   - Use Supabase Cron extension or external service (GitHub Actions, etc.)
   - Call: POST /functions/v1/send-class-reminder with body {"check_upcoming": true}

3. Example cron configuration (pg_cron):

SELECT cron.schedule(
  'class-reminders',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-class-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"check_upcoming": true}'::jsonb
  );
  $$
);

4. Or trigger immediately when booking is created (send 15 min before):
   - Use pg_cron to schedule at specific time
   - Or use external scheduler service

5. Test manually:
   curl -X POST https://your-project.supabase.co/functions/v1/send-class-reminder \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"booking_id": "uuid-here"}'
*/
