/**
 * Payment Webhook Routes
 *
 * Handle callbacks/webhooks from payment gateways:
 * - VNPay IPN (Instant Payment Notification)
 * - MoMo IPN
 * - ZaloPay Callback
 * - Stripe Webhook
 *
 * Related Tasks: T198 - Create payment webhook handler
 */

import { Router, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import VNPayService from '../services/payment-gateways/vnpay.service';
import MoMoService from '../services/payment-gateways/momo.service';
import ZaloPayService from '../services/payment-gateways/zalopay.service';
import StripeService from '../services/payment-gateways/stripe.service';
import logger from '../lib/logger';

export function createPaymentWebhookRoutes(
  supabase: SupabaseClient,
  vnpay: VNPayService,
  momo: MoMoService,
  zalopay: ZaloPayService,
  stripe: StripeService
): Router {
  const router = Router();

  /**
   * VNPay IPN Handler
   * GET /api/webhooks/payment/vnpay
   */
  router.get('/vnpay', async (req: Request, res: Response) => {
    try {
      logger.info('VNPay IPN received:', { query: req.query });

      const vnpParams = req.query as any;

      // Verify signature
      const isValid = vnpay.verifyIPN(vnpParams);
      if (!isValid) {
        logger.warn('VNPay IPN signature verification failed');
        return res.json({ RspCode: '97', Message: 'Invalid signature' });
      }

      // Check payment status
      const isSuccess = vnpay.isPaymentSuccessful(vnpParams.vnp_ResponseCode);
      const transactionId = vnpParams.vnp_TxnRef;

      // Update payment status in database
      const status = isSuccess ? 'completed' : 'failed';
      const { error } = await supabase
        .from('payments')
        .update({
          status,
          completed_at: isSuccess ? new Date().toISOString() : null,
          gateway_response: vnpParams,
        })
        .eq('transaction_id', transactionId);

      if (error) {
        logger.error('Error updating VNPay payment:', error);
        return res.json({ RspCode: '99', Message: 'Update failed' });
      }

      // Update booking status if payment successful
      if (isSuccess) {
        const { data: payment } = await supabase
          .from('payments')
          .select('booking_id')
          .eq('transaction_id', transactionId)
          .single();

        if (payment) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);

          logger.info('VNPay payment confirmed:', { transactionId });
        }
      }

      return res.json({ RspCode: '00', Message: 'Confirm Success' });
    } catch (error) {
      logger.error('VNPay IPN error:', error);
      return res.json({ RspCode: '99', Message: 'Unknown error' });
    }
  });

  /**
   * MoMo IPN Handler
   * POST /api/webhooks/payment/momo
   */
  router.post('/momo', async (req: Request, res: Response) => {
    try {
      logger.info('MoMo IPN received:', { body: req.body });

      const ipnData = req.body;

      // Verify signature
      const isValid = momo.verifyIPN(ipnData);
      if (!isValid) {
        logger.warn('MoMo IPN signature verification failed');
        return res.json({ resultCode: 97, message: 'Invalid signature' });
      }

      // Check payment status
      const isSuccess = momo.isPaymentSuccessful(ipnData.resultCode);
      const transactionId = ipnData.orderId;

      // Update payment status
      const status = isSuccess ? 'completed' : 'failed';
      const { error } = await supabase
        .from('payments')
        .update({
          status,
          completed_at: isSuccess ? new Date().toISOString() : null,
          gateway_response: ipnData,
        })
        .eq('transaction_id', transactionId);

      if (error) {
        logger.error('Error updating MoMo payment:', error);
        return res.json({ resultCode: 99, message: 'Update failed' });
      }

      // Update booking if successful
      if (isSuccess) {
        const { data: payment } = await supabase
          .from('payments')
          .select('booking_id')
          .eq('transaction_id', transactionId)
          .single();

        if (payment) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);

          logger.info('MoMo payment confirmed:', { transactionId });
        }
      }

      return res.json({ resultCode: 0, message: 'Success' });
    } catch (error) {
      logger.error('MoMo IPN error:', error);
      return res.json({ resultCode: 99, message: 'Unknown error' });
    }
  });

  /**
   * ZaloPay Callback Handler
   * POST /api/webhooks/payment/zalopay
   */
  router.post('/zalopay', async (req: Request, res: Response) => {
    try {
      logger.info('ZaloPay callback received:', { body: req.body });

      const callbackData = req.body;

      // Verify signature
      const verification = zalopay.verifyCallback(callbackData);
      if (!verification.isValid || !verification.data) {
        logger.warn('ZaloPay callback verification failed');
        return res.json({ return_code: -1, return_message: 'Invalid signature' });
      }

      const data = verification.data;
      const transactionId = data.app_trans_id;

      // Update payment status
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          gateway_response: data,
        })
        .eq('transaction_id', transactionId);

      if (error) {
        logger.error('Error updating ZaloPay payment:', error);
        return res.json({ return_code: 0, return_message: 'Update failed' });
      }

      // Update booking
      const { data: payment } = await supabase
        .from('payments')
        .select('booking_id')
        .eq('transaction_id', transactionId)
        .single();

      if (payment) {
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', payment.booking_id);

        logger.info('ZaloPay payment confirmed:', { transactionId });
      }

      return res.json({ return_code: 1, return_message: 'Success' });
    } catch (error) {
      logger.error('ZaloPay callback error:', error);
      return res.json({ return_code: 0, return_message: 'Unknown error' });
    }
  });

  /**
   * Stripe Webhook Handler
   * POST /api/webhooks/payment/stripe
   */
  router.post('/stripe', async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      // Verify webhook signature
      const event = stripe.verifyWebhook(JSON.stringify(payload), signature);
      if (!event) {
        logger.warn('Stripe webhook verification failed');
        return res.status(400).send('Webhook signature verification failed');
      }

      logger.info('Stripe webhook received:', { eventType: event.type });

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await handleStripeCheckoutCompleted(event.data.object as any, supabase, stripe);
          break;

        case 'payment_intent.succeeded':
          await handleStripePaymentSucceeded(event.data.object as any, supabase);
          break;

        case 'payment_intent.payment_failed':
          await handleStripePaymentFailed(event.data.object as any, supabase);
          break;

        default:
          logger.info('Unhandled Stripe event type:', { type: event.type });
      }

      return res.json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}

/**
 * Handle Stripe checkout.session.completed event
 */
async function handleStripeCheckoutCompleted(
  session: any,
  supabase: SupabaseClient,
  stripe: StripeService
) {
  try {
    const transactionId = session.id;
    const bookingId = session.client_reference_id;

    if (!bookingId) {
      logger.warn('No booking ID in Stripe session');
      return;
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        gateway_response: session,
      })
      .eq('transaction_id', transactionId);

    // Update booking status
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);

    logger.info('Stripe checkout completed:', { sessionId: transactionId, bookingId });
  } catch (error) {
    logger.error('Error handling Stripe checkout completed:', error);
  }
}

/**
 * Handle Stripe payment_intent.succeeded event
 */
async function handleStripePaymentSucceeded(
  paymentIntent: any,
  supabase: SupabaseClient
) {
  try {
    const transactionId = paymentIntent.id;
    const bookingId = paymentIntent.metadata?.order_id;

    if (!bookingId) {
      logger.warn('No booking ID in payment intent');
      return;
    }

    await supabase
      .from('payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        gateway_response: paymentIntent,
      })
      .eq('transaction_id', transactionId);

    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);

    logger.info('Stripe payment succeeded:', { paymentIntentId: transactionId, bookingId });
  } catch (error) {
    logger.error('Error handling Stripe payment succeeded:', error);
  }
}

/**
 * Handle Stripe payment_intent.payment_failed event
 */
async function handleStripePaymentFailed(paymentIntent: any, supabase: SupabaseClient) {
  try {
    const transactionId = paymentIntent.id;

    await supabase
      .from('payments')
      .update({
        status: 'failed',
        gateway_response: paymentIntent,
        metadata: {
          failure_reason: paymentIntent.last_payment_error?.message,
        },
      })
      .eq('transaction_id', transactionId);

    logger.info('Stripe payment failed:', { paymentIntentId: transactionId });
  } catch (error) {
    logger.error('Error handling Stripe payment failed:', error);
  }
}

export default createPaymentWebhookRoutes;
