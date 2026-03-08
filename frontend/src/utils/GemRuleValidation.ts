import { z } from 'zod';

/**
 * Gem Rule Validation Utilities
 * Ensures all gem earning rules meet business constraints
 */

// Gem earning rule schema
export const gemRuleSchema = z.object({
  id: z.string().uuid().optional(),
  activity_type: z.enum([
    'lesson_completion',
    'attendance_streak',
    'referral',
    'profile_completion',
    'first_review',
    'daily_login',
    'quiz_completion',
    'manual_award',
    // Additional types used in DB
    'class_completion',
    'first_booking_bonus',
    'homework_submission',
    'referral_bonus',
    'streak_bonus_7',
    'streak_bonus_30',
  ]),
  gem_reward: z.number().int().min(1).max(1000, 'Gem reward cannot exceed 1000'),
  conditions: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().default(true),
  rate_limit: z.object({
    max_per_day: z.number().int().min(0).optional(),
    max_per_week: z.number().int().min(0).optional(),
    max_per_month: z.number().int().min(0).optional(),
  }).optional(),
});

export type GemRule = z.infer<typeof gemRuleSchema>;

/**
 * Validate a gem earning rule
 */
export function validateGemRule(rule: unknown): { valid: boolean; errors?: string[] } {
  try {
    gemRuleSchema.parse(rule);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Business rule constraints
 */
export const GEM_CONSTRAINTS = {
  MIN_REWARD: 1,
  MAX_REWARD: 1000,
  MAX_DAILY_EARNINGS: 500,
  MAX_BALANCE: 10000,
  CONVERSION_RATE: 0.01, // 100 gems = $1.00 (1 gem = $0.01)
  MAX_DISCOUNT_PERCENT: 50,
  MIN_CLASS_PRICE: 5.0,
} as const;

/**
 * Validate gem discount calculation
 */
export function validateDiscount(params: {
  classPrice: number;
  gemsToUse: number;
  studentBalance: number;
}): {
  valid: boolean;
  error?: string;
  discountAmount?: number;
  finalPrice?: number;
} {
  const { classPrice, gemsToUse, studentBalance } = params;

  // Check if student has enough gems
  if (gemsToUse > studentBalance) {
    return {
      valid: false,
      error: `Insufficient gems. Available: ${studentBalance}, Requested: ${gemsToUse}`,
    };
  }

  // Calculate discount
  const discountAmount = gemsToUse * GEM_CONSTRAINTS.CONVERSION_RATE;
  const maxDiscount = classPrice * (GEM_CONSTRAINTS.MAX_DISCOUNT_PERCENT / 100);

  // Check if discount exceeds 50% cap
  if (discountAmount > maxDiscount) {
    return {
      valid: false,
      error: `Discount cannot exceed ${GEM_CONSTRAINTS.MAX_DISCOUNT_PERCENT}% of class price`,
    };
  }

  const finalPrice = classPrice - discountAmount;

  // Check if final price is below minimum
  if (finalPrice < GEM_CONSTRAINTS.MIN_CLASS_PRICE) {
    return {
      valid: false,
      error: `Final price cannot be below $${GEM_CONSTRAINTS.MIN_CLASS_PRICE}`,
    };
  }

  return {
    valid: true,
    discountAmount,
    finalPrice,
  };
}

/**
 * Calculate maximum gems usable for a class
 */
export function calculateMaxGemsForClass(classPrice: number): number {
  const maxDiscount = classPrice * (GEM_CONSTRAINTS.MAX_DISCOUNT_PERCENT / 100);
  const maxGemsFromDiscount = Math.floor(maxDiscount / GEM_CONSTRAINTS.CONVERSION_RATE);

  // Ensure final price doesn't go below minimum
  const maxDiscountToMaintainMin = classPrice - GEM_CONSTRAINTS.MIN_CLASS_PRICE;
  const maxGemsFromMinPrice = Math.floor(maxDiscountToMaintainMin / GEM_CONSTRAINTS.CONVERSION_RATE);

  return Math.min(maxGemsFromDiscount, maxGemsFromMinPrice);
}

/**
 * Validate total gem balance doesn't exceed cap
 */
export function validateBalance(newBalance: number): {
  valid: boolean;
  error?: string;
} {
  if (newBalance > GEM_CONSTRAINTS.MAX_BALANCE) {
    return {
      valid: false,
      error: `Gem balance cannot exceed ${GEM_CONSTRAINTS.MAX_BALANCE}`,
    };
  }

  if (newBalance < 0) {
    return {
      valid: false,
      error: 'Gem balance cannot be negative',
    };
  }

  return { valid: true };
}
