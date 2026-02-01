/**
 * Refund Service
 *
 * Handles refund processing across all payment gateways:
 * - Process full and partial refunds
 * - Restore Gems for refunded bookings
 * - Handle cancellation policies
 * - Track refund transactions
 *
 * Related Tasks: T202 - Implement refund processing
 */

import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../lib/logger';
import VNPayService from './payment-gateways/vnpay.service';
import MoMoService from './payment-gateways/momo.service';
import ZaloPayService from './payment-gateways/zalopay.service';
import StripeService from './payment-gateways/stripe.service';

export interface RefundRequest {
  bookingId: string;
  reason: string;
  initiatedBy: 'student' | 'teacher' | 'admin';
  amount?: number; // Optional for partial refunds
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundAmount?: number;
  gemsRestored?: number;
  error?: string;
}

export interface CancellationPolicy {
  hoursBeforeClass: number;
  refundPercentage: number; // 0-100
}

const CANCELLATION_POLICIES: CancellationPolicy[] = [
  { hoursBeforeClass: 24, refundPercentage: 100 }, // Full refund if cancelled 24+ hours before
  { hoursBeforeClass: 12, refundPercentage: 50 }, // 50% refund if cancelled 12-24 hours before
  { hoursBeforeClass: 0, refundPercentage: 0 }, // No refund if cancelled <12 hours before
];

export class RefundService {
  private supabase: SupabaseClient;
  private vnpay: VNPayService;
  private momo: MoMoService;
  private zalopay: ZaloPayService;
  private stripe: StripeService;

  constructor(
    supabase: SupabaseClient,
    vnpay: VNPayService,
    momo: MoMoService,
    zalopay: ZaloPayService,
    stripe: StripeService
  ) {
    this.supabase = supabase;
    this.vnpay = vnpay;
    this.momo = momo;
    this.zalopay = zalopay;
    this.stripe = stripe;
  }

  /**
   * Process a refund for a booking
   */
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    try {
      // Get booking and payment details
      const { data: booking, error: bookingError } = await this.supabase
        .from('bookings')
        .select(
          `
          id,
          student_id,
          class_id,
          final_price,
          gems_used,
          discount_amount,
          status,
          classes (
            scheduled_at,
            price
          )
        `
        )
        .eq('id', request.bookingId)
        .single();

      if (bookingError || !booking) {
        return {
          success: false,
          error: 'Booking not found',
        };
      }

      // Check if booking can be refunded
      if (booking.status === 'cancelled' || booking.status === 'refunded') {
        return {
          success: false,
          error: 'Booking has already been cancelled or refunded',
        };
      }

      // Get payment record
      const { data: payment, error: paymentError } = await this.supabase
        .from('payments')
        .select('*')
        .eq('booking_id', request.bookingId)
        .eq('status', 'completed')
        .single();

      if (paymentError || !payment) {
        return {
          success: false,
          error: 'Payment not found or not completed',
        };
      }

      // Calculate refund amount based on cancellation policy
      const refundAmount =
        request.amount || this.calculateRefundAmount(booking, request.initiatedBy);

      if (refundAmount <= 0) {
        return {
          success: false,
          error: 'No refund available based on cancellation policy',
        };
      }

      // Process refund through payment gateway
      let gatewayRefundResult: any;

      switch (payment.payment_method) {
        case 'stripe':
          gatewayRefundResult = await this.processStripeRefund(
            payment.transaction_id,
            refundAmount
          );
          break;

        case 'vnpay':
        case 'momo':
        case 'zalopay':
          // Note: Vietnamese gateways typically require manual refund processing
          // This would need to be handled through their admin portals
          logger.warn('Vietnamese gateway refunds require manual processing:', {
            gateway: payment.payment_method,
            bookingId: request.bookingId,
          });
          gatewayRefundResult = {
            success: true,
            requiresManualProcessing: true,
          };
          break;

        default:
          return {
            success: false,
            error: 'Unsupported payment method for refund',
          };
      }

      if (!gatewayRefundResult.success && !gatewayRefundResult.requiresManualProcessing) {
        return {
          success: false,
          error: 'Gateway refund failed',
        };
      }

      // Record refund transaction
      const { data: refund, error: refundError } = await this.supabase
        .from('payments')
        .insert({
          booking_id: request.bookingId,
          transaction_id: `refund_${Date.now()}`,
          amount: -refundAmount, // Negative for refund
          currency: payment.currency,
          payment_method: payment.payment_method,
          status: gatewayRefundResult.requiresManualProcessing
            ? 'pending_manual_refund'
            : 'refunded',
          metadata: {
            original_payment_id: payment.id,
            reason: request.reason,
            initiated_by: request.initiatedBy,
            gateway_refund_id: gatewayRefundResult.refundId,
          },
        })
        .select()
        .single();

      if (refundError) {
        logger.error('Error recording refund:', refundError);
        return {
          success: false,
          error: 'Failed to record refund',
        };
      }

      // Restore Gems if any were used
      let gemsRestored = 0;
      if (booking.gems_used > 0) {
        gemsRestored = await this.restoreGems(booking.student_id, booking.gems_used, booking.id);
      }

      // Update booking status
      await this.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          metadata: {
            cancellation_reason: request.reason,
            cancelled_by: request.initiatedBy,
            cancelled_at: new Date().toISOString(),
            refund_amount: refundAmount,
          },
        })
        .eq('id', request.bookingId);

      logger.info('Refund processed successfully:', {
        bookingId: request.bookingId,
        refundAmount,
        gemsRestored,
      });

      return {
        success: true,
        refundId: refund.id,
        refundAmount,
        gemsRestored,
      };
    } catch (error) {
      logger.error('Error processing refund:', error);
      return {
        success: false,
        error: 'Refund processing failed',
      };
    }
  }

  /**
   * Calculate refund amount based on cancellation policy
   */
  private calculateRefundAmount(booking: any, initiatedBy: string): number {
    // Teacher-initiated cancellations get full refund
    if (initiatedBy === 'teacher') {
      return booking.final_price;
    }

    // Admin-initiated cancellations get full refund
    if (initiatedBy === 'admin') {
      return booking.final_price;
    }

    // Student-initiated cancellations follow the policy
    const classTime = new Date(booking.classes.scheduled_at);
    const now = new Date();
    const hoursUntilClass = (classTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Find applicable policy
    for (const policy of CANCELLATION_POLICIES) {
      if (hoursUntilClass >= policy.hoursBeforeClass) {
        return (booking.final_price * policy.refundPercentage) / 100;
      }
    }

    // Default: no refund
    return 0;
  }

  /**
   * Process Stripe refund
   */
  private async processStripeRefund(
    paymentIntentId: string,
    amount: number
  ): Promise<{ success: boolean; refundId?: string }> {
    try {
      const refund = await this.stripe.createRefund(paymentIntentId, amount);

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (error) {
      logger.error('Stripe refund error:', error);
      return {
        success: false,
      };
    }
  }

  /**
   * Restore Gems to student's balance
   */
  private async restoreGems(
    studentId: string,
    gemsAmount: number,
    bookingId: string
  ): Promise<number> {
    try {
      // Create Gem transaction for restoration
      await this.supabase.from('gem_transactions').insert({
        student_id: studentId,
        amount: gemsAmount,
        transaction_type: 'refund',
        reason: 'Booking cancellation - gems restored',
        related_booking_id: bookingId,
      });

      logger.info('Gems restored:', {
        studentId,
        gemsAmount,
        bookingId,
      });

      return gemsAmount;
    } catch (error) {
      logger.error('Error restoring gems:', error);
      return 0;
    }
  }

  /**
   * Get refund eligibility and amount for a booking
   */
  async getRefundEligibility(bookingId: string): Promise<{
    eligible: boolean;
    refundAmount: number;
    refundPercentage: number;
    reason?: string;
  }> {
    try {
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .select(
          `
          id,
          final_price,
          status,
          classes (
            scheduled_at
          )
        `
        )
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        return {
          eligible: false,
          refundAmount: 0,
          refundPercentage: 0,
          reason: 'Booking not found',
        };
      }

      if (booking.status === 'cancelled' || booking.status === 'refunded') {
        return {
          eligible: false,
          refundAmount: 0,
          refundPercentage: 0,
          reason: 'Booking already cancelled or refunded',
        };
      }

      const classTime = new Date(booking.classes.scheduled_at);
      const now = new Date();
      const hoursUntilClass = (classTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Find applicable policy
      for (const policy of CANCELLATION_POLICIES) {
        if (hoursUntilClass >= policy.hoursBeforeClass) {
          const refundAmount = (booking.final_price * policy.refundPercentage) / 100;

          return {
            eligible: policy.refundPercentage > 0,
            refundAmount,
            refundPercentage: policy.refundPercentage,
          };
        }
      }

      return {
        eligible: false,
        refundAmount: 0,
        refundPercentage: 0,
        reason: 'Class is too close to scheduled time for refund',
      };
    } catch (error) {
      logger.error('Error checking refund eligibility:', error);
      return {
        eligible: false,
        refundAmount: 0,
        refundPercentage: 0,
        reason: 'Error checking eligibility',
      };
    }
  }
}

export default RefundService;
