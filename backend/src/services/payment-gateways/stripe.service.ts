/**
 * Stripe Payment Gateway Integration
 *
 * Stripe is the international payment gateway for credit/debit cards.
 * Docs: https://stripe.com/docs/api
 *
 * Related Tasks: T194 [P] Configure Stripe integration
 */

import Stripe from 'stripe';
import logger from '../../lib/logger';

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripePaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface StripePaymentResponse {
  sessionId: string;
  checkoutUrl: string;
  transactionId: string;
}

export class StripeService {
  private stripe: Stripe;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }

  /**
   * Create Stripe Checkout Session
   */
  async createCheckoutSession(
    request: StripePaymentRequest
  ): Promise<StripePaymentResponse> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: request.currency.toLowerCase(),
              unit_amount: Math.round(request.amount * 100), // Convert to cents
              product_data: {
                name: 'English Class Booking',
                description: request.description,
              },
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.config.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: this.config.cancelUrl,
        customer_email: request.customerEmail,
        client_reference_id: request.orderId,
        metadata: request.metadata || {},
        payment_intent_data: {
          metadata: {
            order_id: request.orderId,
            ...request.metadata,
          },
        },
      });

      logger.info('Stripe checkout session created:', {
        sessionId: session.id,
        orderId: request.orderId,
        amount: request.amount,
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url || '',
        transactionId: session.id,
      };
    } catch (error) {
      logger.error('Error creating Stripe checkout session:', error);
      throw new Error('Failed to create Stripe checkout session');
    }
  }

  /**
   * Create Payment Intent (for custom checkout flow)
   */
  async createPaymentIntent(request: StripePaymentRequest): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        description: request.description,
        metadata: {
          order_id: request.orderId,
          ...request.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info('Stripe payment intent created:', {
        paymentIntentId: paymentIntent.id,
        orderId: request.orderId,
      });

      return {
        clientSecret: paymentIntent.client_secret || '',
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logger.error('Error creating Stripe payment intent:', error);
      throw new Error('Failed to create Stripe payment intent');
    }
  }

  /**
   * Retrieve checkout session
   */
  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      logger.error('Error retrieving Stripe session:', error);
      throw new Error('Failed to retrieve Stripe session');
    }
  }

  /**
   * Retrieve payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      logger.error('Error retrieving Stripe payment intent:', error);
      throw new Error('Failed to retrieve Stripe payment intent');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string | Buffer, signature: string): Stripe.Event | null {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );

      logger.info('Stripe webhook verified:', {
        eventType: event.type,
        eventId: event.id,
      });

      return event;
    } catch (error) {
      logger.error('Error verifying Stripe webhook:', error);
      return null;
    }
  }

  /**
   * Process refund
   */
  async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      });

      logger.info('Stripe refund created:', {
        refundId: refund.id,
        paymentIntentId,
        amount: amount || 'full',
      });

      return refund;
    } catch (error) {
      logger.error('Error creating Stripe refund:', error);
      throw new Error('Failed to create Stripe refund');
    }
  }

  /**
   * Check if payment was successful
   */
  isPaymentSuccessful(session: Stripe.Checkout.Session): boolean {
    return session.payment_status === 'paid';
  }

  /**
   * Check if payment intent was successful
   */
  isPaymentIntentSuccessful(paymentIntent: Stripe.PaymentIntent): boolean {
    return paymentIntent.status === 'succeeded';
  }

  /**
   * Get customer email from session
   */
  getCustomerEmail(session: Stripe.Checkout.Session): string | null {
    return session.customer_details?.email || null;
  }

  /**
   * Get payment amount from session
   */
  getPaymentAmount(session: Stripe.Checkout.Session): number {
    return (session.amount_total || 0) / 100; // Convert cents to dollars
  }

  /**
   * Get metadata from session
   */
  getMetadata(session: Stripe.Checkout.Session): Record<string, string> {
    return session.metadata || {};
  }
}

export default StripeService;
