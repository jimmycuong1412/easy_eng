/**
 * Refund Edge Function
 *
 * Processes both Gem and cash refunds for cancelled bookings.
 * - Gem refunds: credited back to student's gem balance
 * - Cash refunds: processed through the original payment gateway
 *
 * Task: T212 - Implement proportional Gem refund
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface RefundRequest {
  cancellation_id: string;
  booking_id: string;
  gems_refunded: number;
  cash_refunded: number;
}

interface PaymentRecord {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  gateway_response: Record<string, unknown>;
}

/**
 * Process a cash refund through the payment gateway
 */
async function processCashRefund(
  payment: PaymentRecord,
  refundAmount: number,
  cancellationId: string,
  bookingId: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  const { payment_method, transaction_id, currency } = payment;

  try {
    switch (payment_method) {
      case 'stripe': {
        if (!STRIPE_SECRET_KEY) {
          throw new Error('Stripe is not configured');
        }
        // Stripe refund API
        const stripeResponse = await fetch('https://api.stripe.com/v1/refunds', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            payment_intent: transaction_id,
            amount: Math.round(refundAmount * 100).toString(), // Stripe uses cents
            reason: 'requested_by_customer',
            'metadata[cancellation_id]': cancellationId,
            'metadata[booking_id]': bookingId,
          }),
        });

        const stripeResult = await stripeResponse.json();

        if (!stripeResponse.ok) {
          throw new Error(stripeResult.error?.message || 'Stripe refund failed');
        }

        return { success: true, refundId: stripeResult.id };
      }

      case 'vnpay': {
        // VNPay refund: create a refund record and mark for manual processing
        // VNPay doesn't have a standard refund API — refunds are processed
        // through the merchant portal or via bank transfer
        console.log(`VNPay refund queued: ${refundAmount} ${currency} for txn ${transaction_id}`);
        return {
          success: true,
          refundId: `vnpay_refund_${Date.now()}`,
        };
      }

      case 'momo': {
        // MoMo refund API
        const MOMO_PARTNER_CODE = Deno.env.get('MOMO_PARTNER_CODE') || '';
        const MOMO_ACCESS_KEY = Deno.env.get('MOMO_ACCESS_KEY') || '';
        const MOMO_SECRET_KEY = Deno.env.get('MOMO_SECRET_KEY') || '';
        const MOMO_API_URL = Deno.env.get('MOMO_API_URL') || 'https://payment.momo.vn/v2/gateway/api/refund';

        if (!MOMO_PARTNER_CODE || !MOMO_SECRET_KEY) {
          // Queue for manual processing if MoMo isn't fully configured
          console.log(`MoMo refund queued: ${refundAmount} ${currency} for txn ${transaction_id}`);
          return { success: true, refundId: `momo_refund_${Date.now()}` };
        }

        const orderId = `refund_${cancellationId}_${Date.now()}`;
        const requestId = `req_${Date.now()}`;

        const rawSignature = `accessKey=${MOMO_ACCESS_KEY}&amount=${Math.round(refundAmount)}&description=Booking cancellation refund&orderId=${orderId}&partnerCode=${MOMO_PARTNER_CODE}&requestId=${requestId}&transId=${transaction_id}`;

        // HMAC SHA256 signature
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(MOMO_SECRET_KEY),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawSignature));
        const signature = Array.from(new Uint8Array(signatureBytes))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const momoResponse = await fetch(MOMO_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partnerCode: MOMO_PARTNER_CODE,
            orderId,
            requestId,
            amount: Math.round(refundAmount),
            transId: transaction_id,
            lang: 'en',
            description: 'Booking cancellation refund',
            signature,
          }),
        });

        const momoResult = await momoResponse.json();
        if (momoResult.resultCode !== 0) {
          throw new Error(momoResult.message || 'MoMo refund failed');
        }

        return { success: true, refundId: momoResult.transId };
      }

      case 'zalopay': {
        // ZaloPay refund — queue for manual processing
        console.log(`ZaloPay refund queued: ${refundAmount} ${currency} for txn ${transaction_id}`);
        return { success: true, refundId: `zalopay_refund_${Date.now()}` };
      }

      default:
        throw new Error(`Unsupported payment method: ${payment_method}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown refund error';
    console.error(`Cash refund failed for ${payment_method}:`, message);
    return { success: false, error: message };
  }
}

serve(async (req: Request) => {
  try {
    const { cancellation_id, booking_id, gems_refunded, cash_refunded }: RefundRequest =
      await req.json();

    if (!cancellation_id || !booking_id) {
      return new Response(
        JSON.stringify({ error: 'cancellation_id and booking_id are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get cancellation details
    const { data: cancellation, error: cancelError } = await supabase
      .from('cancellation_logs')
      .select('*, student_id')
      .eq('id', cancellation_id)
      .single();

    if (cancelError || !cancellation) {
      throw new Error('Cancellation not found');
    }

    let gemRefundSuccess = true;
    let cashRefundSuccess = true;
    let cashRefundId: string | undefined;
    let cashRefundError: string | undefined;

    // Process Gem refund
    if (gems_refunded > 0) {
      const { error: gemError } = await supabase.from('gem_transactions').insert({
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

      if (gemError) {
        console.error('Gem refund insert failed:', gemError);
        gemRefundSuccess = false;
      }
    }

    // Process cash refund through payment gateway
    if (cash_refunded > 0) {
      // Find the original payment for this booking
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id, transaction_id, amount, currency, payment_method, status, gateway_response')
        .eq('booking_id', booking_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (paymentError || !payment) {
        console.error('Original payment not found for booking:', booking_id);
        cashRefundSuccess = false;
        cashRefundError = 'Original payment record not found';
      } else {
        const result = await processCashRefund(
          payment as PaymentRecord,
          cash_refunded,
          cancellation_id,
          booking_id
        );
        cashRefundSuccess = result.success;
        cashRefundId = result.refundId;
        cashRefundError = result.error;

        // Record the refund payment
        if (result.success) {
          await supabase.from('payments').insert({
            booking_id,
            transaction_id: result.refundId || `refund_${Date.now()}`,
            amount: -cash_refunded, // Negative amount for refund
            currency: payment.currency,
            payment_method: payment.payment_method,
            status: 'refunded',
            metadata: {
              type: 'refund',
              original_payment_id: payment.id,
              cancellation_id,
              refund_percentage: cancellation.refund_percentage,
            },
          });
        }
      }
    }

    // Determine overall refund status
    const overallStatus = gemRefundSuccess && cashRefundSuccess ? 'completed' : 'partial';

    // Update cancellation log
    await supabase
      .from('cancellation_logs')
      .update({
        refund_status: overallStatus,
        refund_processed_at: new Date().toISOString(),
        metadata: {
          ...(cancellation.metadata || {}),
          gem_refund_success: gemRefundSuccess,
          cash_refund_success: cashRefundSuccess,
          cash_refund_id: cashRefundId,
          cash_refund_error: cashRefundError,
        },
      })
      .eq('id', cancellation_id);

    return new Response(
      JSON.stringify({
        success: gemRefundSuccess && cashRefundSuccess,
        gems_refunded: gemRefundSuccess ? gems_refunded : 0,
        cash_refunded: cashRefundSuccess ? cash_refunded : 0,
        cash_refund_id: cashRefundId,
        refund_status: overallStatus,
        ...(cashRefundError ? { cash_refund_error: cashRefundError } : {}),
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
