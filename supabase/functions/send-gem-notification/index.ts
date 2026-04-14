/**
 * Send Gem Earning Notification Email
 *
 * Sends an email when a student earns Gems
 * Task: T167 - Create Gem earning email
 *
 * Triggered by: Gem transaction creation
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

// Minimum Gems to trigger email (avoid spam for small amounts)
const MIN_GEMS_FOR_EMAIL = 5;

// ============================================================================
// Types
// ============================================================================

interface GemNotificationRequest {
  transaction_id: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable reason text
 */
function getReasonText(reason: string): string {
  const reasonMap: Record<string, string> = {
    'lesson_completion': 'Completing a class',
    'daily_login': 'Daily login streak',
    'quiz_completion': 'Completing a quiz',
    'achievement_unlocked': 'Unlocking an achievement',
    'referral_bonus': 'Referring a friend',
    'admin_adjustment': 'Admin adjustment',
    'bonus_reward': 'Special bonus reward',
  };

  return reasonMap[reason] || reason;
}

/**
 * Load email template
 */
async function loadTemplate(templateName: string, data: Record<string, any>): Promise<string> {
  try {
    const templatePath = `../email-templates/${templateName}.html`;
    const template = await Deno.readTextFile(templatePath);

    let html = template;

    // Handle conditional blocks
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

async function sendGemNotification(transactionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Fetch transaction details
    const { data: transaction, error: txError } = await supabase
      .from('gem_transactions')
      .select(`
        *,
        student:profiles!inner(
          user_id,
          full_name,
          email
        )
      `)
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      throw new Error(`Transaction not found: ${txError?.message || transactionId}`);
    }

    // Only send email for positive (earning) transactions
    if (transaction.amount <= 0) {
      console.log('Skipping email for non-earning transaction');
      return { success: true };
    }

    // Skip if amount is too small
    if (transaction.amount < MIN_GEMS_FOR_EMAIL) {
      console.log(`Skipping email for small amount: ${transaction.amount} Gems`);
      return { success: true };
    }

    // Get student's current balance via RPC (gem_transactions ledger, not student_gems)
    const { data: balanceData } = await supabase.rpc('get_gems_balance', {
      p_user_id: transaction.user_id,
    });

    const currentBalance = (balanceData as number) || 0;
    const previousBalance = currentBalance - transaction.amount;

    // Check if XP was also earned
    let xpEarned = null;
    if (transaction.metadata?.xp_earned) {
      xpEarned = transaction.metadata.xp_earned;
    }

    // Prepare template data
    const templateData = {
      studentName: transaction.student.full_name,
      studentEmail: transaction.student.email,
      gemsEarned: transaction.amount,
      reason: getReasonText(transaction.reason),
      xpEarned,
      previousBalance,
      newBalance: currentBalance,
      dashboardUrl: `${FRONTEND_URL}/student/dashboard`,
    };

    // Load and render email template
    const html = await loadTemplate('gem-earned', templateData);

    // Send email
    const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: transaction.student.email,
        subject: `🎉 You Earned ${transaction.amount} Gems!`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    // Log the email
    await supabase.from('email_logs').insert({
      to: transaction.student.email,
      subject: `You Earned ${transaction.amount} Gems!`,
      template: 'gem-earned',
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: { transaction_id: transactionId },
    });

    console.log(`Gem notification sent to ${transaction.student.email}`);

    return { success: true };
  } catch (error) {
    console.error('Error sending Gem notification:', error);
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

    const payload: GemNotificationRequest = await req.json();

    if (!payload.transaction_id) {
      return new Response(
        JSON.stringify({ error: 'Missing transaction_id parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending Gem notification for:', payload.transaction_id);

    const result = await sendGemNotification(payload.transaction_id);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: payload.transaction_id,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-gem-notification function:', error);
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

1. supabase functions deploy send-gem-notification

2. Create trigger on gem_transactions:

CREATE OR REPLACE FUNCTION trigger_gem_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'earned' AND NEW.amount >= 5 THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-gem-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('transaction_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_gem_earned
  AFTER INSERT ON gem_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_gem_notification();
*/
