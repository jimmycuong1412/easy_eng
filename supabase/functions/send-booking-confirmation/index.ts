/**
 * Send Booking Confirmation Email
 *
 * Sends a confirmation email when a booking is created
 * Task: T166 - Create booking confirmation email
 *
 * Triggered by: Database trigger or direct call after booking creation
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

// ============================================================================
// Types
// ============================================================================

interface BookingConfirmationRequest {
  booking_id: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date for email display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format time for email display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Load email template and replace placeholders
 */
async function loadTemplate(templateName: string, data: Record<string, any>): Promise<string> {
  try {
    // Read template file
    const templatePath = `../email-templates/${templateName}.html`;
    const template = await Deno.readTextFile(templatePath);

    // Replace placeholders
    let html = template;

    // Handle conditional blocks {{#if}}...{{/if}}
    html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
      return data[key] ? content : '';
    });

    // Replace simple variables {{variable}}
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

async function sendBookingConfirmation(bookingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Fetch booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        class:classes!inner(
          id,
          title,
          description,
          scheduled_at,
          duration_minutes,
          price,
          teacher:teacher_profiles!inner(
            user:users!inner(
              id,
              full_name,
              email
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
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message || bookingId}`);
    }

    // Calculate pricing details
    const originalPrice = booking.class.price;
    const gemsUsed = booking.gems_used || 0;
    const gemsDiscount = gemsUsed * 0.5; // 1 Gem = $0.50
    const finalPrice = booking.final_price;

    // Prepare template data
    const templateData = {
      studentName: booking.student.full_name,
      studentEmail: booking.student.email,
      className: booking.class.title,
      teacherName: booking.class.teacher.user.full_name,
      scheduledDate: formatDate(booking.class.scheduled_at),
      scheduledTime: formatTime(booking.class.scheduled_at),
      duration: booking.class.duration_minutes,
      bookingId: booking.id,
      originalPrice: originalPrice.toFixed(2),
      gemsUsed: gemsUsed > 0 ? gemsUsed : null,
      gemsDiscount: gemsUsed > 0 ? gemsDiscount.toFixed(2) : null,
      finalPrice: finalPrice.toFixed(2),
      classUrl: `${FRONTEND_URL}/class/${booking.class.id}/live`,
    };

    // Load and render email template
    const html = await loadTemplate('booking-confirmation', templateData);

    // Send email via send-email function
    const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: booking.student.email,
        subject: `Booking Confirmed: ${booking.class.title}`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    // Log the email notification
    await supabase.from('email_logs').insert({
      booking_id: bookingId,
      to: booking.student.email,
      subject: `Booking Confirmed: ${booking.class.title}`,
      template: 'booking-confirmation',
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    console.log(`Booking confirmation sent to ${booking.student.email}`);

    return { success: true };
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
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
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: BookingConfirmationRequest = await req.json();

    if (!payload.booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing booking_id parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending booking confirmation for:', payload.booking_id);

    // Send confirmation email
    const result = await sendBookingConfirmation(payload.booking_id);

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
        booking_id: payload.booking_id,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-booking-confirmation function:', error);

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
   supabase functions deploy send-booking-confirmation

2. Set environment variables:
   - FRONTEND_URL=https://yourdomain.com

3. Create database trigger to auto-send on booking creation:

CREATE OR REPLACE FUNCTION trigger_booking_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-booking-confirmation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('booking_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_confirmed
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_confirmation();

4. Test the function:
   curl -X POST https://your-project.supabase.co/functions/v1/send-booking-confirmation \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"booking_id": "uuid-here"}'
*/
