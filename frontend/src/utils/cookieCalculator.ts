/**
 * Gem Discount Calculator
 *
 * Business rules:
 * - 1 Gem = $0.50 discount
 * - Maximum discount: 50% of class price
 * - Minimum final price: 25% of class price (floor)
 * - Absolute minimum price: $5.00
 *
 * @see Constitution Principle II / SC-005
 */

const GEM_VALUE = 0.5; // Each gem is worth $0.50
const MAX_DISCOUNT_PERCENT = 0.5; // 50% max discount
const MIN_PRICE_FLOOR_PERCENT = 0.25; // 25% minimum price floor
const ABSOLUTE_MIN_PRICE = 5.0; // $5 absolute minimum

/**
 * Calculate the dollar discount for a given number of gems
 */
export function calculateDiscount(gems: number): number {
  if (gems < 0) {
    throw new Error('Gem count cannot be negative');
  }
  return gems * GEM_VALUE;
}

/**
 * Apply a gem discount to a class price, enforcing all caps and floors.
 *
 * Returns an object with the final price and metadata about the calculation.
 */
export function applyGemDiscount(
  classPrice: number,
  gemsUsed: number
): {
  finalPrice: number;
  discountApplied: number;
  maxGemsAllowed: number;
} {
  if (classPrice < 0) {
    throw new Error('Class price cannot be negative');
  }
  if (gemsUsed < 0) {
    throw new Error('Gems used cannot be negative');
  }

  // Raw discount value
  const rawDiscount = gemsUsed * GEM_VALUE;

  // Calculate caps
  const maxDiscountByPercent = classPrice * MAX_DISCOUNT_PERCENT;
  const priceFloor = Math.max(classPrice * MIN_PRICE_FLOOR_PERCENT, ABSOLUTE_MIN_PRICE);
  const maxDiscountByFloor = classPrice - priceFloor;

  // The effective max discount is the most restrictive limit
  const effectiveMaxDiscount = Math.max(0, Math.min(maxDiscountByPercent, maxDiscountByFloor));

  // Actual discount applied
  const discountApplied = Math.min(rawDiscount, effectiveMaxDiscount);

  // Final price
  const finalPrice = Math.max(classPrice - discountApplied, ABSOLUTE_MIN_PRICE);

  // Max gems that can be used (based on the effective max discount)
  const maxGemsAllowed = Math.floor(effectiveMaxDiscount / GEM_VALUE);

  return {
    finalPrice: Math.round(finalPrice * 100) / 100,
    discountApplied: Math.round(discountApplied * 100) / 100,
    maxGemsAllowed,
  };
}

/**
 * Validate that a user has sufficient gem balance for a spending amount
 */
export function validateGemBalance(balance: number, spending: number): boolean {
  if (spending < 0) {
    throw new Error('Gem spending cannot be negative');
  }
  return balance >= spending;
}

// Legacy aliases for backward compatibility
export const applyCookieDiscount = applyGemDiscount;
export const validateCookieBalance = validateGemBalance;
