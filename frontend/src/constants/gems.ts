/**
 * Gems System Constants
 * 
 * Core constants for the virtual currency system
 */

/**
 * Gems to USD conversion rate
 * 100 Gems = $1 USD
 */
export const GEMS_TO_USD_RATE = 100;

/**
 * Maximum discount percentage allowed
 * Students can use Gems for up to 50% off
 */
export const MAX_DISCOUNT_PERCENTAGE = 0.5;

/**
 * Minimum final price after discount (USD)
 * Class price cannot go below $5
 */
export const MIN_FINAL_PRICE = 5;

/**
 * Gems earning rates for various activities
 */
export const GEMS_EARNING_RATES = {
  FIRST_BOOKING: 500, // 500 Gems for first class booking
  CLASS_COMPLETION: 200, // 200 Gems per completed class
  REFERRAL: 1000, // 1000 Gems for successful referral
  DAILY_LOGIN: 10, // 10 Gems for daily login streak
  QUIZ_COMPLETION: 50, // 50 Gems per quiz
  HOMEWORK_SUBMISSION: 30, // 30 Gems per homework
} as const;

/**
 * Gems transaction types
 */
export const GEMS_TRANSACTION_TYPES = {
  EARNED: {
    FIRST_BOOKING: 'first_booking_bonus',
    CLASS_COMPLETION: 'class_completion',
    REFERRAL: 'referral_bonus',
    DAILY_LOGIN: 'daily_login',
    QUIZ_COMPLETION: 'quiz_completion',
    HOMEWORK_SUBMISSION: 'homework_submission',
    ADMIN_GRANT: 'admin_grant',
  },
  SPENT: {
    BOOKING_DISCOUNT: 'booking_discount',
    ADMIN_DEDUCTION: 'admin_deduction',
  },
} as const;

/**
 * Convert Gems to USD
 */
export function gemsToUSD(gems: number): number {
  return gems / GEMS_TO_USD_RATE;
}

/**
 * Convert USD to Gems
 */
export function usdToGems(usd: number): number {
  return Math.round(usd * GEMS_TO_USD_RATE);
}

/**
 * Calculate maximum discount allowed for a given class price
 */
export function getMaxDiscountAmount(classPrice: number): number {
  const fiftyPercent = classPrice * MAX_DISCOUNT_PERCENTAGE;
  const maxAllowedDiscount = classPrice - MIN_FINAL_PRICE;
  
  // Return the more restrictive constraint
  return Math.max(0, Math.min(fiftyPercent, maxAllowedDiscount));
}

/**
 * Calculate maximum Gems usable for a given class price
 */
export function getMaxGemsUsable(classPrice: number): number {
  const maxDiscount = getMaxDiscountAmount(classPrice);
  return usdToGems(maxDiscount);
}

/**
 * Type definitions
 */
export type GemsEarningType = keyof typeof GEMS_EARNING_RATES;
export type GemsTransactionType = 
  | typeof GEMS_TRANSACTION_TYPES.EARNED[keyof typeof GEMS_TRANSACTION_TYPES.EARNED]
  | typeof GEMS_TRANSACTION_TYPES.SPENT[keyof typeof GEMS_TRANSACTION_TYPES.SPENT];
