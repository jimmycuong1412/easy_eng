/**
 * Unified Payment Service
 *
 * Orchestrates payment processing across multiple gateways:
 * - VNPay (Vietnam domestic cards)
 * - MoMo (Vietnam mobile wallet)
 * - ZaloPay (Vietnam mobile wallet)
 * - Stripe (International cards)
 *
 * Related Tasks: T197 - Create unified payment processor
 */

import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../lib/logger';
import VNPayService, { VNPayConfig } from './payment-gateways/vnpay.service';
import MoMoService, { MoMoConfig } from './payment-gateways/momo.service';
import ZaloPayService, { ZaloPayConfig } from './payment-gateways/zalopay.service';
import StripeService, { StripeConfig } from './payment-gateways/stripe.service';

export type PaymentMethod = 'vnpay' | 'momo' | 'zalopay' | 'stripe';

export interface UnifiedPaymentRequest {
  bookingId: string;
  studentId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description: string;
  customerEmail?: string;
  ipAddress?: string;
}

export interface UnifiedPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
  sessionId?: string;
  qrCode?: string;
}

export class UnifiedPaymentService {
  private supabase: SupabaseClient;
  private vnpay: VNPayService;
  private momo: MoMoService;
  private zalopay: ZaloPayService;
  private stripe: StripeService;

  constructor(
    supabase: SupabaseClient,
    vnpayConfig: VNPayConfig,
    momoConfig: MoMoConfig,
    zalopayConfig: ZaloPayConfig,
    stripeConfig: StripeConfig
  ) {
    this.supabase = supabase;
    this.vnpay = new VNPayService(vnpayConfig);
    this.momo = new MoMoService(momoConfig);
    this.zalopay = new ZaloPayService(zalopayConfig);
    this.stripe = new StripeService(stripeConfig);
  }

  /**
   * Process payment through selected gateway
   */
  async processPayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    try {
      // Validate booking
      const { data: booking, error: bookingError } = await this.supabase
        .from('bookings')
        .select('id, status, final_price, student_id')
        .eq('id', request.bookingId)
        .eq('student_id', request.studentId)
        .single();

      if (bookingError || !booking) {
        return {
          success: false,
          error: 'Booking not found',
        };
      }

      if (booking.status !== 'pending') {
        return {
          success: false,
          error: 'Booking is not in pending state',
        };
      }

      // Verify amount matches booking
      if (Math.abs(request.amount - booking.final_price) > 0.01) {
        return {
          success: false,
          error: 'Payment amount does not match booking price',
        };
      }

      // Create pending payment record
      const { data: payment, error: paymentError } = await this.supabase
        .from('payments')
        .insert({
          booking_id: request.bookingId,
          transaction_id: `pending_${Date.now()}`,
          amount: request.amount,
          currency: request.currency,
          payment_method: request.paymentMethod,
          status: 'pending',
        })
        .select()
        .single();

      if (paymentError) {
        logger.error('Error creating payment record:', paymentError);
        return {
          success: false,
          error: 'Failed to initialize payment',
        };
      }

      // Route to appropriate gateway
      let result: UnifiedPaymentResponse;

      switch (request.paymentMethod) {
        case 'vnpay':
          result = await this.processVNPayPayment(request, payment.id);
          break;
        case 'momo':
          result = await this.processMoMoPayment(request, payment.id);
          break;
        case 'zalopay':
          result = await this.processZaloPayPayment(request, payment.id);
          break;
        case 'stripe':
          result = await this.processStripePayment(request, payment.id);
          break;
        default:
          return {
            success: false,
            error: 'Unsupported payment method',
          };
      }

      // Update payment record with gateway response
      if (result.success && result.transactionId) {
        await this.supabase
          .from('payments')
          .update({
            transaction_id: result.transactionId,
            payment_url: result.paymentUrl,
            status: 'processing',
          })
          .eq('id', payment.id);
      }

      return result;
    } catch (error) {
      logger.error('Error processing payment:', error);
      return {
        success: false,
        error: 'Payment processing failed',
      };
    }
  }

  /**
   * Process VNPay payment
   */
  private async processVNPayPayment(
    request: UnifiedPaymentRequest,
    paymentId: string
  ): Promise<UnifiedPaymentResponse> {
    try {
      const vnpayResult = this.vnpay.createPaymentUrl({
        orderId: request.bookingId,
        amount: request.amount,
        orderInfo: request.description,
        orderType: 'billpayment',
        locale: 'vn',
        ipAddr: request.ipAddress || '127.0.0.1',
      });

      logger.info('VNPay payment initiated:', {
        bookingId: request.bookingId,
        paymentId,
      });

      return {
        success: true,
        paymentUrl: vnpayResult.paymentUrl,
        transactionId: vnpayResult.transactionId,
      };
    } catch (error) {
      logger.error('VNPay payment error:', error);
      return {
        success: false,
        error: 'VNPay payment initialization failed',
      };
    }
  }

  /**
   * Process MoMo payment
   */
  private async processMoMoPayment(
    request: UnifiedPaymentRequest,
    paymentId: string
  ): Promise<UnifiedPaymentResponse> {
    try {
      const momoResult = await this.momo.createPayment({
        orderId: request.bookingId,
        amount: request.amount,
        orderInfo: request.description,
        requestId: `${Date.now()}`,
        extraData: JSON.stringify({ payment_id: paymentId }),
      });

      logger.info('MoMo payment initiated:', {
        bookingId: request.bookingId,
        paymentId,
      });

      return {
        success: true,
        paymentUrl: momoResult.payUrl,
        transactionId: momoResult.transactionId,
        qrCode: momoResult.qrCodeUrl,
      };
    } catch (error) {
      logger.error('MoMo payment error:', error);
      return {
        success: false,
        error: 'MoMo payment initialization failed',
      };
    }
  }

  /**
   * Process ZaloPay payment
   */
  private async processZaloPayPayment(
    request: UnifiedPaymentRequest,
    paymentId: string
  ): Promise<UnifiedPaymentResponse> {
    try {
      const zalopayResult = await this.zalopay.createOrder({
        orderId: request.bookingId,
        amount: request.amount,
        description: request.description,
        embedData: { payment_id: paymentId },
      });

      logger.info('ZaloPay payment initiated:', {
        bookingId: request.bookingId,
        paymentId,
      });

      return {
        success: true,
        paymentUrl: zalopayResult.orderUrl,
        transactionId: zalopayResult.transactionId,
      };
    } catch (error) {
      logger.error('ZaloPay payment error:', error);
      return {
        success: false,
        error: 'ZaloPay payment initialization failed',
      };
    }
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(
    request: UnifiedPaymentRequest,
    paymentId: string
  ): Promise<UnifiedPaymentResponse> {
    try {
      const stripeResult = await this.stripe.createCheckoutSession({
        orderId: request.bookingId,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        customerEmail: request.customerEmail,
        metadata: {
          booking_id: request.bookingId,
          payment_id: paymentId,
        },
      });

      logger.info('Stripe payment initiated:', {
        bookingId: request.bookingId,
        paymentId,
        sessionId: stripeResult.sessionId,
      });

      return {
        success: true,
        paymentUrl: stripeResult.checkoutUrl,
        transactionId: stripeResult.transactionId,
        sessionId: stripeResult.sessionId,
      };
    } catch (error) {
      logger.error('Stripe payment error:', error);
      return {
        success: false,
        error: 'Stripe payment initialization failed',
      };
    }
  }

  /**
   * Confirm payment completion (called from webhook/callback)
   */
  async confirmPayment(transactionId: string, gatewayResponse: any): Promise<boolean> {
    try {
      const { data: payment, error } = await this.supabase
        .from('payments')
        .select('*, bookings(*)')
        .eq('transaction_id', transactionId)
        .single();

      if (error || !payment) {
        logger.error('Payment not found:', { transactionId });
        return false;
      }

      // Update payment status
      await this.supabase
        .from('payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          gateway_response: gatewayResponse,
        })
        .eq('transaction_id', transactionId);

      // Update booking status
      await this.supabase
        .from('bookings')
        .update({
          status: 'confirmed',
        })
        .eq('id', payment.booking_id);

      logger.info('Payment confirmed:', {
        transactionId,
        bookingId: payment.booking_id,
      });

      return true;
    } catch (error) {
      logger.error('Error confirming payment:', error);
      return false;
    }
  }

  /**
   * Handle payment failure
   */
  async failPayment(transactionId: string, reason: string): Promise<boolean> {
    try {
      await this.supabase
        .from('payments')
        .update({
          status: 'failed',
          metadata: { failure_reason: reason },
        })
        .eq('transaction_id', transactionId);

      logger.info('Payment marked as failed:', { transactionId, reason });

      return true;
    } catch (error) {
      logger.error('Error marking payment as failed:', error);
      return false;
    }
  }
}

export default UnifiedPaymentService;
