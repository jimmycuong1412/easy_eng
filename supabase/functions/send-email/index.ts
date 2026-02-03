/**
 * Send Email Edge Function
 *
 * Sends emails using SendGrid or Postmark
 * Task: T164 - Setup email service integration
 *
 * Usage:
 *   POST /send-email
 *   Body: { to, subject, html, template?, data? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Email Service Configuration
const EMAIL_SERVICE = Deno.env.get('EMAIL_SERVICE') || 'sendgrid'; // 'sendgrid' or 'postmark'
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const POSTMARK_API_KEY = Deno.env.get('POSTMARK_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@easyeng.com';
const FROM_NAME = Deno.env.get('FROM_NAME') || 'Easy English';

// ============================================================================
// Types
// ============================================================================

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, any>;
  from?: string;
  fromName?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// Email Service Implementations
// ============================================================================

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(email: EmailRequest): Promise<EmailResponse> {
  try {
    const recipients = Array.isArray(email.to) ? email.to : [email.to];

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: recipients.map(to => ({
          to: [{ email: to }],
          dynamic_template_data: email.data || {},
        })),
        from: {
          email: email.from || FROM_EMAIL,
          name: email.fromName || FROM_NAME,
        },
        subject: email.subject,
        content: [
          {
            type: 'text/html',
            value: email.html || email.text || '',
          },
        ],
        ...(email.template && {
          template_id: email.template,
        }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid error: ${error}`);
    }

    return {
      success: true,
      messageId: response.headers.get('x-message-id') || undefined,
    };
  } catch (error) {
    console.error('SendGrid error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email via Postmark
 */
async function sendViaPostmark(email: EmailRequest): Promise<EmailResponse> {
  try {
    const recipients = Array.isArray(email.to) ? email.to.join(',') : email.to;

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': POSTMARK_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        From: `${email.fromName || FROM_NAME} <${email.from || FROM_EMAIL}>`,
        To: recipients,
        Subject: email.subject,
        HtmlBody: email.html,
        TextBody: email.text,
        MessageStream: 'outbound',
        ...(email.template && {
          TemplateId: email.template,
          TemplateModel: email.data || {},
        }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Postmark error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.MessageID,
    };
  } catch (error) {
    console.error('Postmark error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fallback: Log email to database
 */
async function logEmailToDatabase(email: EmailRequest): Promise<EmailResponse> {
  try {
    const { error } = await supabase.from('email_logs').insert({
      to: Array.isArray(email.to) ? email.to.join(',') : email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      template: email.template,
      data: email.data,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    return {
      success: true,
      messageId: 'logged',
    };
  } catch (error) {
    console.error('Database log error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Main Handler
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
    const email: EmailRequest = await req.json();

    // Validate required fields
    if (!email.to || !email.subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!email.html && !email.text && !email.template) {
      return new Response(
        JSON.stringify({ error: 'Must provide html, text, or template' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending email:', {
      to: email.to,
      subject: email.subject,
      service: EMAIL_SERVICE,
    });

    // Send via configured service
    let result: EmailResponse;

    if (EMAIL_SERVICE === 'sendgrid' && SENDGRID_API_KEY) {
      result = await sendViaSendGrid(email);
    } else if (EMAIL_SERVICE === 'postmark' && POSTMARK_API_KEY) {
      result = await sendViaPostmark(email);
    } else {
      // Fallback: Log to database for manual sending
      console.warn('No email service configured, logging to database');
      result = await logEmailToDatabase(email);
    }

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
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-email function:', error);

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
   supabase functions deploy send-email

2. Set environment variables in Supabase dashboard:
   - EMAIL_SERVICE=sendgrid (or postmark)
   - SENDGRID_API_KEY=your_sendgrid_key (if using SendGrid)
   - POSTMARK_API_KEY=your_postmark_key (if using Postmark)
   - FROM_EMAIL=noreply@yourdomain.com
   - FROM_NAME=Your App Name

3. Create email_logs table (optional fallback):
   CREATE TABLE email_logs (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     to TEXT NOT NULL,
     subject TEXT NOT NULL,
     html TEXT,
     text TEXT,
     template TEXT,
     data JSONB,
     status TEXT DEFAULT 'pending',
     message_id TEXT,
     error TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     sent_at TIMESTAMP WITH TIME ZONE
   );

4. Test the function:
   curl -X POST https://your-project.supabase.co/functions/v1/send-email \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "test@example.com",
       "subject": "Test Email",
       "html": "<h1>Hello</h1><p>This is a test email.</p>"
     }'

SendGrid Setup:
- Sign up at https://sendgrid.com
- Create API key with "Mail Send" permissions
- Verify sender email address

Postmark Setup:
- Sign up at https://postmarkapp.com
- Create server and get API token
- Verify sender signature
*/
