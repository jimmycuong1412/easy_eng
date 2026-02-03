/**
 * Process Payout Edge Function
 *
 * Processes approved payout requests and integrates with payment providers
 * Task: T208 - Create payout processing Edge Function
 *
 * Called by: Admin approval or automated scheduler
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Payment provider API keys
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID') || '';
const PAYPAL_SECRET = Deno.env.get('PAYPAL_SECRET') || '';

// ============================================================================
// Types
// ============================================================================

interface ProcessPayoutRequest {
  payout_request_id: string;
  auto_complete?: boolean;
}

// ============================================================================
// Payment Provider Integrations
// ============================================================================

/**
 * Process Stripe payout
 */
async function processStripePayout(
  accountId: string,
  amount: number
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  try {
    // In production, use Stripe API to create payout
    // This is a simplified example
    const response = await fetch('https://api.stripe.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: Math.round(amount * 100).toString(), // Convert to cents
        currency: 'usd',
        destination: accountId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Stripe payout failed');
    }

    const payout = await response.json();

    return {
      success: true,
      transaction_id: payout.id,
    };
  } catch (error) {
    console.error('Stripe payout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process PayPal payout
 */
async function processPayPalPayout(
  email: string,
  amount: number
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  try {
    // Get PayPal access token
    const authResponse = await fetch('https://api.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Create payout
    const payoutResponse = await fetch('https://api.paypal.com/v1/payments/payouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `payout_${Date.now()}`,
          email_subject: 'You have a payout from Easy English',
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: {
              value: amount.toFixed(2),
              currency: 'USD',
            },
            receiver: email,
            note: 'Teacher earnings payout',
          },
        ],
      }),
    });

    if (!payoutResponse.ok) {
      const error = await payoutResponse.json();
      throw new Error(error.message || 'PayPal payout failed');
    }

    const payout = await payoutResponse.json();

    return {
      success: true,
      transaction_id: payout.batch_header.payout_batch_id,
    };
  } catch (error) {
    console.error('PayPal payout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simulate bank transfer (manual process)
 */
function processBankTransfer(
  paymentDetails: any
): { success: boolean; transaction_id: string } {
  // In production, this would integrate with a banking API
  // For now, return success to mark as processing (requires manual completion)
  console.log('Bank transfer initiated:', paymentDetails);

  return {
    success: true,
    transaction_id: `bank_${Date.now()}`,
  };
}

// ============================================================================
// Main Logic
// ============================================================================

async function processPayout(payoutRequestId: string, autoComplete: boolean = false): Promise<{
  success: boolean;
  transaction_id?: string;
  error?: string;
}> {
  try {
    // Get payout request details
    const { data: payoutRequest, error: fetchError } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('id', payoutRequestId)
      .single();

    if (fetchError || !payoutRequest) {
      throw new Error(`Payout request not found: ${fetchError?.message || payoutRequestId}`);
    }

    // Verify status
    if (payoutRequest.status !== 'approved') {
      throw new Error(`Payout must be approved before processing. Current status: ${payoutRequest.status}`);
    }

    // Update to processing status
    await supabase
      .from('payout_requests')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
      })
      .eq('id', payoutRequestId);

    // Process based on payment method
    let result: { success: boolean; transaction_id?: string; error?: string };

    switch (payoutRequest.payment_method) {
      case 'stripe':
        result = await processStripePayout(
          payoutRequest.payment_details.account_id,
          payoutRequest.amount
        );
        break;

      case 'paypal':
        result = await processPayPalPayout(
          payoutRequest.payment_details.email,
          payoutRequest.amount
        );
        break;

      case 'bank_transfer':
      case 'wise':
        result = processBankTransfer(payoutRequest.payment_details);
        break;

      default:
        throw new Error(`Unsupported payment method: ${payoutRequest.payment_method}`);
    }

    if (!result.success) {
      // Revert to approved status on failure
      await supabase
        .from('payout_requests')
        .update({
          status: 'approved',
          metadata: {
            ...payoutRequest.metadata,
            last_error: result.error,
            last_attempt: new Date().toISOString(),
          },
        })
        .eq('id', payoutRequestId);

      return result;
    }

    // Store transaction ID
    await supabase
      .from('payout_requests')
      .update({
        metadata: {
          ...payoutRequest.metadata,
          transaction_id: result.transaction_id,
        },
      })
      .eq('id', payoutRequestId);

    // Auto-complete if enabled (for automated methods)
    if (autoComplete) {
      await supabase.rpc('complete_payout_request', {
        p_payout_id: payoutRequestId,
      });
    }

    return result;
  } catch (error) {
    console.error('Error processing payout:', error);
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

    const request: ProcessPayoutRequest = await req.json();

    if (!request.payout_request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing payout_request_id parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing payout:', request.payout_request_id);

    const result = await processPayout(
      request.payout_request_id,
      request.auto_complete || false
    );

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
        payout_request_id: request.payout_request_id,
        transaction_id: result.transaction_id,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in process-payout function:', error);
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

1. Set environment variables:
   - STRIPE_SECRET_KEY=sk_...
   - PAYPAL_CLIENT_ID=...
   - PAYPAL_SECRET=...

2. Deploy:
   supabase functions deploy process-payout

3. Call after admin approval:
   curl -X POST https://your-project.supabase.co/functions/v1/process-payout \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"payout_request_id": "uuid", "auto_complete": true}'

4. Manual bank transfers:
   - Set auto_complete: false
   - Process payment manually
   - Call complete_payout_request when done

5. Webhook integration:
   - Listen for Stripe/PayPal webhooks
   - Call complete_payout_request on success
*/
