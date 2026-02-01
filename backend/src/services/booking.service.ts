/**
 * Booking Service
 * 
 * Handles class booking operations with Gems discount and payment processing.
 * Ensures atomic transactions: booking creation + Gems deduction + payment.
 */

import { supabase } from '../lib/supabase';
import { deductGems, addGems } from './gems.service';
import { v4 as uuidv4 } from 'uuid';

export interface Booking {
  id: string;
  user_id: string;
  class_id: string;
  original_price: number;
  gems_used: number;
  gems_discount_amount: number;
  final_price: number;
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_intent_id: string | null;
  paid_at: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  booking_notes: string | null;
  cancellation_reason: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  level: string;
  price: number;
  currency: string;
  max_students: number;
  current_enrollments: number;
  status: string;
}

/**
 * Process a booking with Gems discount
 * Atomic operation: Create booking + Deduct Gems + Process payment
 */
export async function processBookingWithGems(params: {
  userId: string;
  classId: string;
  gemsToUse: number;
  paymentMethodId?: string;
  idempotencyKey?: string;
}): Promise<Booking> {
  const {
    userId,
    classId,
    gemsToUse,
    paymentMethodId,
    idempotencyKey = uuidv4(),
  } = params;

  try {
    // 1. Check for existing booking with same idempotency key
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingBooking) {
      return existingBooking;
    }

    // 2. Get class details and validate availability
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      throw new Error('Class not found');
    }

    if (classData.current_enrollments >= classData.max_students) {
      throw new Error('Class is full');
    }

    const originalPrice = classData.price;

    // 3. Calculate discount (Gems conversion: 100 Gems = $1)
    const gemsDiscountAmount = Math.round((gemsToUse / 100) * 100) / 100; // Round to 2 decimals
    const finalPrice = originalPrice - gemsDiscountAmount;

    // 4. Validate constraints (enforced by DB but check early)
    if (gemsDiscountAmount > originalPrice * 0.5) {
      throw new Error('Gems discount cannot exceed 50% of class price');
    }
    if (finalPrice < 5.0) {
      throw new Error('Final price must be at least $5');
    }

    // 5. Start transaction: Create booking first
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        class_id: classId,
        original_price: originalPrice,
        gems_used: gemsToUse,
        gems_discount_amount: gemsDiscountAmount,
        final_price: finalPrice,
        payment_status: 'pending',
        status: 'pending',
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Booking creation failed: ${bookingError.message}`);
    }

    try {
      // 6. Deduct Gems if any are used
      if (gemsToUse > 0) {
        await deductGems({
          userId,
          amount: gemsToUse,
          transactionType: 'booking_discount',
          description: `Discount for class: ${classData.title}`,
          classId,
          bookingId: booking.id,
          metadata: {
            class_title: classData.title,
            original_price: originalPrice,
            discount_amount: gemsDiscountAmount,
          },
        });
      }

      // 7. Process payment if final price > 0
      let paymentIntentId: string | null = null;
      if (finalPrice > 0) {
        if (!paymentMethodId) {
          throw new Error('Payment method required for non-zero final price');
        }

        // Process payment (mock for now)
        paymentIntentId = await processPayment({
          amount: finalPrice,
          currency: classData.currency,
          paymentMethodId,
          metadata: {
            booking_id: booking.id,
            class_id: classId,
            user_id: userId,
          },
        });
      }

      // 8. Update booking with payment info and confirm
      const { data: confirmedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: finalPrice === 0 ? 'completed' : 'processing',
          payment_intent_id: paymentIntentId,
          status: 'confirmed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', booking.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Booking update failed: ${updateError.message}`);
      }

      return confirmedBooking;

    } catch (error) {
      // Rollback: Delete booking if Gems deduction or payment fails
      await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      throw error;
    }

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Booking processing failed');
  }
}

/**
 * Cancel a booking and refund Gems
 */
export async function cancelBooking(params: {
  bookingId: string;
  userId: string;
  reason?: string;
}): Promise<Booking> {
  const { bookingId, userId, reason } = params;

  // 1. Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('user_id', userId)
    .single();

  if (bookingError || !booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === 'cancelled') {
    throw new Error('Booking already cancelled');
  }

  if (booking.status === 'completed') {
    throw new Error('Cannot cancel completed booking');
  }

  try {
    // 2. Refund Gems if any were used
    if (booking.gems_used > 0) {
      await addGems({
        userId,
        amount: booking.gems_used,
        transactionType: 'booking_refund',
        description: reason || 'Booking cancellation refund',
        classId: booking.class_id,
        bookingId: booking.id,
        metadata: {
          original_booking_id: booking.id,
          refund_amount: booking.gems_used,
        },
      });
    }

    // 3. Update booking status
    const { data: cancelledBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || null,
        payment_status: booking.payment_status === 'completed' ? 'refunded' : booking.payment_status,
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Booking cancellation failed: ${updateError.message}`);
    }

    return cancelledBooking;

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Booking cancellation failed');
  }
}

/**
 * Get user's bookings
 */
export async function getUserBookings(params: {
  userId: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ bookings: Booking[]; total: number }> {
  const { userId, status, limit = 50, offset = 0 } = params;

  let query = supabase
    .from('bookings')
    .select('*, classes(*)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to get bookings: ${error.message}`);
  }

  return {
    bookings: data || [],
    total: count || 0,
  };
}

/**
 * Mock payment processing (replace with real payment gateway)
 */
async function processPayment(_params: {
  amount: number;
  currency: string;
  paymentMethodId: string;
  metadata: Record<string, any>;
}): Promise<string> {
  // Mock payment intent ID
  const paymentIntentId = `pi_${uuidv4()}`;

  // TODO: Integrate with actual payment gateway (Stripe, PayPal, etc.)
  // For now, simulate successful payment
  await new Promise(resolve => setTimeout(resolve, 100));

  return paymentIntentId;
}

/**
 * Get booking details
 */
export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, classes(*)')
    .eq('id', bookingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get booking: ${error.message}`);
  }

  return data;
}
