/**
 * Cookie Virtual Currency - Business Rules & Constants
 *
 * Source of Truth: spec.md lines 53-57, 158-164, 200-201
 * Last Updated: 2026-01-28
 *
 * These values are reconciled across spec.md and plan.md per P1 remediation.
 */

// ============================================================================
// COOKIE EARNING RULES
// ============================================================================

/**
 * Cookie earning rates for various platform activities
 * Values aligned with spec.md (authoritative source)
 */
export const COOKIE_EARNING_RULES = {
  /** Cookies earned per lesson completed (spec.md line 53) */
  LESSON_COMPLETION: 10,

  /** Cookies earned for 7-day consecutive attendance streak (spec.md line 54) */
  ATTENDANCE_STREAK_7_DAYS: 50,

  /** Cookies earned when referred friend completes first booking (spec.md line 55) */
  REFERRAL_BONUS: 100,

  /** Cookies earned for one-time profile completion (spec.md line 56) */
  PROFILE_COMPLETION: 10,

  /** Cookies earned for first review submitted (spec.md line 57) */
  FIRST_REVIEW: 5,

  /** Cookies earned for first booking (one-time bonus for new students) */
  FIRST_BOOKING: 20,
} as const;

// ============================================================================
// COOKIE CONVERSION & SPENDING RULES
// ============================================================================

/**
 * Conversion rate: 1 Cookie = $0.50 USD discount
 * Source: spec.md line 20
 */
export const COOKIE_CONVERSION_RATE = 0.5;

/**
 * Cookie spending constraints and caps
 * Source: spec.md lines 200-201, edge cases
 */
export const COOKIE_CONSTRAINTS = {
  /** Maximum Cookie balance per student (spec.md line 103) */
  MAX_BALANCE: 1000,

  /** Maximum discount percentage (50% of class price, spec.md line 201) */
  MAX_DISCOUNT_PERCENTAGE: 0.5,

  /** Minimum price percentage (25% of original price, spec.md line 200) */
  MIN_PRICE_PERCENTAGE: 0.25,

  /** Absolute minimum class price in USD (cannot go below this) */
  ABSOLUTE_MIN_PRICE_USD: 5.0,

  /** Cookie expiration period in months (spec.md line 103) */
  EXPIRY_MONTHS: 12,
} as const;

// ============================================================================
// COOKIE CALCULATION UTILITIES
// ============================================================================

/**
 * Represents the result of a Cookie discount calculation
 */
export interface CookieDiscountResult {
  /** Final price after discount applied */
  finalPrice: number;
  /** Actual discount amount in USD */
  discountAmount: number;
  /** Maximum Cookies that can be used for this class */
  maxCookiesAllowed: number;
  /** Number of Cookies actually used (may be less than requested) */
  cookiesUsed: number;
  /** Whether the requested Cookies amount was valid */
  isValid: boolean;
  /** Reason if invalid (e.g., "exceeds 50% cap") */
  invalidReason?: string;
}

/**
 * Calculate Cookie discount for a given class price
 *
 * Business Rules Enforced:
 * 1. 1 Cookie = $0.50 discount
 * 2. Maximum 50% discount cap
 * 3. Minimum 25% of original price must be paid
 * 4. Cannot reduce below $5 absolute minimum
 *
 * @param classPrice - Original class price in USD
 * @param cookiesRequested - Number of Cookies student wants to apply
 * @returns CookieDiscountResult with final price and validation
 *
 * @example
 * ```typescript
 * // $100 class, student wants to use 100 Cookies
 * const result = calculateCookieDiscount(100, 100);
 * // result.finalPrice = 50.00 (capped at 50%)
 * // result.maxCookiesAllowed = 100
 * ```
 */
export function calculateCookieDiscount(
  classPrice: number,
  cookiesRequested: number
): CookieDiscountResult {
  // Validate inputs
  if (classPrice < 0 || cookiesRequested < 0) {
    throw new Error('Class price and cookies must be non-negative');
  }

  if (cookiesRequested === 0) {
    return {
      finalPrice: classPrice,
      discountAmount: 0,
      maxCookiesAllowed: 0,
      cookiesUsed: 0,
      isValid: true,
    };
  }

  // Calculate raw discount value
  const requestedDiscountValue = cookiesRequested * COOKIE_CONVERSION_RATE;

  // Apply 50% maximum discount cap
  const maxDiscountValue = classPrice * COOKIE_CONSTRAINTS.MAX_DISCOUNT_PERCENTAGE;
  const cappedDiscountValue = Math.min(requestedDiscountValue, maxDiscountValue);

  // Calculate preliminary final price
  let finalPrice = classPrice - cappedDiscountValue;

  // Apply 25% minimum price floor
  const minPriceFromPercentage = classPrice * COOKIE_CONSTRAINTS.MIN_PRICE_PERCENTAGE;
  const minPrice = Math.max(minPriceFromPercentage, COOKIE_CONSTRAINTS.ABSOLUTE_MIN_PRICE_USD);

  if (finalPrice < minPrice) {
    finalPrice = minPrice;
  }

  // Calculate actual discount applied (may be less than requested)
  const actualDiscountApplied = classPrice - finalPrice;

  // Calculate actual Cookies used
  const actualCookiesUsed = Math.floor(actualDiscountApplied / COOKIE_CONVERSION_RATE);

  // Calculate maximum Cookies that can be used for this class
  const maxCookiesAllowed = Math.floor(actualDiscountApplied / COOKIE_CONVERSION_RATE);

  // Determine if request was valid
  const isValid = actualCookiesUsed === cookiesRequested;
  let invalidReason: string | undefined;

  if (!isValid) {
    if (cappedDiscountValue < requestedDiscountValue) {
      invalidReason = '50% maximum discount cap exceeded';
    } else if (finalPrice === minPrice) {
      invalidReason = `Minimum price floor (${minPrice.toFixed(2)} USD) enforced`;
    }
  }

  return {
    finalPrice: Number(finalPrice.toFixed(2)),
    discountAmount: Number(actualDiscountApplied.toFixed(2)),
    maxCookiesAllowed,
    cookiesUsed: actualCookiesUsed,
    isValid,
    invalidReason,
  };
}

/**
 * Validate if student has sufficient Cookie balance for a purchase
 *
 * @param userBalance - Current Cookie balance
 * @param cookiesToSpend - Number of Cookies to spend
 * @returns true if sufficient balance, false otherwise
 */
export function validateCookieBalance(
  userBalance: number,
  cookiesToSpend: number
): boolean {
  if (cookiesToSpend < 0) {
    throw new Error('Cannot spend negative Cookies');
  }
  return userBalance >= cookiesToSpend;
}

/**
 * Calculate Cookies to be awarded for an activity
 *
 * @param activityType - Type of activity completed
 * @returns Number of Cookies to award
 */
export function getCookieReward(
  activityType: keyof typeof COOKIE_EARNING_RULES
): number {
  return COOKIE_EARNING_RULES[activityType];
}

/**
 * Check if Cookie balance exceeds maximum allowed
 *
 * @param currentBalance - Current Cookie balance
 * @returns true if balance is at or above cap
 */
export function isBalanceAtCap(currentBalance: number): boolean {
  return currentBalance >= COOKIE_CONSTRAINTS.MAX_BALANCE;
}

/**
 * Calculate remaining capacity before hitting balance cap
 *
 * @param currentBalance - Current Cookie balance
 * @returns Number of Cookies that can still be earned before cap
 */
export function getRemainingCapacity(currentBalance: number): number {
  return Math.max(0, COOKIE_CONSTRAINTS.MAX_BALANCE - currentBalance);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Valid activity types for Cookie earning
 */
export type CookieActivityType = keyof typeof COOKIE_EARNING_RULES;

/**
 * Cookie transaction types
 */
export type CookieTransactionType = 'earned' | 'spent' | 'refunded' | 'expired';
