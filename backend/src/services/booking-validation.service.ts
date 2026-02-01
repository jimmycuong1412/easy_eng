import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../lib/logger';

export interface BookingValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface BookingValidationResult {
  valid: boolean;
  errors: BookingValidationError[];
}

export interface BookingRequest {
  student_id: string;
  class_id: string;
  gems_used: number;
  final_price: number;
}

/**
 * Booking Validation Service
 *
 * Validates booking requests before processing:
 * - Class exists and is available
 * - Class has available capacity
 * - Student has sufficient gem balance
 * - Price calculations are correct
 * - Final price meets minimum threshold ($5)
 * - Discount does not exceed 50% cap
 */
export class BookingValidationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Validate a booking request
   */
  async validateBooking(request: BookingRequest): Promise<BookingValidationResult> {
    const errors: BookingValidationError[] = [];

    try {
      // 1. Validate class exists and is bookable
      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select('id, price, capacity, scheduled_at, status')
        .eq('id', request.class_id)
        .single();

      if (classError || !classData) {
        errors.push({
          code: 'CLASS_NOT_FOUND',
          message: 'Class not found or no longer available',
          field: 'class_id',
        });
        return { valid: false, errors };
      }

      // Check class is not in the past
      if (new Date(classData.scheduled_at) < new Date()) {
        errors.push({
          code: 'CLASS_EXPIRED',
          message: 'Cannot book classes in the past',
          field: 'class_id',
        });
      }

      // Check class status
      if (classData.status !== 'active') {
        errors.push({
          code: 'CLASS_INACTIVE',
          message: 'Class is not available for booking',
          field: 'class_id',
        });
      }

      // 2. Validate capacity
      const { data: bookings, error: bookingsError } = await this.supabase
        .from('bookings')
        .select('id')
        .eq('class_id', request.class_id)
        .in('status', ['confirmed', 'pending']);

      if (bookingsError) {
        logger.error('Error checking class capacity:', bookingsError);
        errors.push({
          code: 'CAPACITY_CHECK_FAILED',
          message: 'Unable to verify class availability',
        });
      } else if (bookings && bookings.length >= classData.capacity) {
        errors.push({
          code: 'CLASS_FULL',
          message: 'Class is already at full capacity',
          field: 'class_id',
        });
      }

      // 3. Validate gem balance
      if (request.gems_used > 0) {
        const { data: gemBalance, error: gemError } = await this.supabase
          .rpc('get_student_gem_balance', { student_id: request.student_id });

        if (gemError) {
          logger.error('Error checking gem balance:', gemError);
          errors.push({
            code: 'GEM_BALANCE_CHECK_FAILED',
            message: 'Unable to verify gem balance',
            field: 'gems_used',
          });
        } else if (gemBalance < request.gems_used) {
          errors.push({
            code: 'INSUFFICIENT_GEMS',
            message: `Insufficient gems. You have ${gemBalance}, but trying to use ${request.gems_used}`,
            field: 'gems_used',
          });
        }
      }

      // 4. Validate pricing calculations
      const originalPrice = classData.price;
      const gemDiscount = request.gems_used * 0.5; // 1 Gem = $0.50
      const maxDiscount = originalPrice * 0.5; // 50% cap
      const actualDiscount = Math.min(gemDiscount, maxDiscount);
      const expectedFinalPrice = Math.max(originalPrice - actualDiscount, 5); // $5 minimum

      // Allow 1 cent tolerance for floating point differences
      if (Math.abs(request.final_price - expectedFinalPrice) > 0.01) {
        errors.push({
          code: 'INVALID_PRICE',
          message: `Price mismatch. Expected $${expectedFinalPrice.toFixed(
            2
          )}, got $${request.final_price.toFixed(2)}`,
          field: 'final_price',
        });
      }

      // 5. Validate minimum price
      if (request.final_price < 5) {
        errors.push({
          code: 'BELOW_MINIMUM_PRICE',
          message: 'Final price cannot be below $5',
          field: 'final_price',
        });
      }

      // 6. Validate discount cap
      const discountPercentage = ((originalPrice - request.final_price) / originalPrice) * 100;
      if (discountPercentage > 50.01) {
        // 0.01% tolerance for rounding
        errors.push({
          code: 'EXCEEDS_DISCOUNT_CAP',
          message: 'Discount cannot exceed 50% of original price',
          field: 'gems_used',
        });
      }

      // 7. Check for duplicate bookings
      const { data: existingBooking, error: duplicateError } = await this.supabase
        .from('bookings')
        .select('id')
        .eq('student_id', request.student_id)
        .eq('class_id', request.class_id)
        .in('status', ['confirmed', 'pending'])
        .maybeSingle();

      if (duplicateError) {
        logger.error('Error checking for duplicate booking:', duplicateError);
      } else if (existingBooking) {
        errors.push({
          code: 'DUPLICATE_BOOKING',
          message: 'You have already booked this class',
          field: 'class_id',
        });
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      logger.error('Unexpected error during booking validation:', error);
      return {
        valid: false,
        errors: [
          {
            code: 'VALIDATION_ERROR',
            message: 'An unexpected error occurred during validation',
          },
        ],
      };
    }
  }

  /**
   * Validate gem usage for a specific price
   */
  validateGemUsage(
    gemsUsed: number,
    originalPrice: number
  ): { valid: boolean; error?: string } {
    if (gemsUsed < 0) {
      return { valid: false, error: 'Gems used cannot be negative' };
    }

    const gemDiscount = gemsUsed * 0.5;
    const maxDiscount = originalPrice * 0.5;

    if (gemDiscount > maxDiscount) {
      const maxGems = Math.floor(maxDiscount / 0.5);
      return {
        valid: false,
        error: `Maximum ${maxGems} gems can be used for this price (50% discount cap)`,
      };
    }

    const finalPrice = Math.max(originalPrice - gemDiscount, 5);
    if (finalPrice < 5) {
      const maxGems = Math.floor((originalPrice - 5) / 0.5);
      return {
        valid: false,
        error: `Maximum ${maxGems} gems can be used to maintain $5 minimum price`,
      };
    }

    return { valid: true };
  }
}

export default BookingValidationService;
