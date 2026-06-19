/**
 * Gems Calculator Utilities
 * 
 * Core calculation functions for Gems-to-USD conversion and discount logic
 */

import {
  GEMS_TO_USD_RATE,
  MAX_DISCOUNT_PERCENTAGE,
  MIN_FINAL_PRICE,
} from '@/constants/gems';

/**
 * Convert Gems to USD
 * @param gems - Number of Gems
 * @returns USD amount rounded to 2 decimal places
 */
export function convertGemsToUSD(gems: number): number {
  if (gems < 0) return 0;
  return Math.round((gems / GEMS_TO_USD_RATE) * 100) / 100;
}

/**
 * Convert USD to Gems
 * @param usd - USD amount
 * @returns Number of Gems
 */
export function convertUSDToGems(usd: number): number {
  if (usd < 0) return 0;
  return Math.round(usd * GEMS_TO_USD_RATE);
}

/**
 * Calculate Gems discount with constraints
 * @param gemsToUse - Number of Gems to use
 * @param classPrice - Original class price in USD
 * @returns Discount details
 */
export function calculateGemsDiscount(
  gemsToUse: number,
  classPrice: number = 0
): {
  gemsUsed: number;
  discountAmount: number;
} {
  if (gemsToUse <= 0) {
    return { gemsUsed: 0, discountAmount: 0 };
  }

  // If no class price, return full Gems value
  if (classPrice === 0) {
    const discountAmount = convertGemsToUSD(gemsToUse);
    return { gemsUsed: gemsToUse, discountAmount };
  }

  // Convert Gems to USD
  let discountAmount = convertGemsToUSD(gemsToUse);

  // Apply 50% cap
  const maxDiscountByCap = classPrice * MAX_DISCOUNT_PERCENTAGE;
  if (discountAmount > maxDiscountByCap) {
    discountAmount = maxDiscountByCap;
  }

  // Apply $5 floor
  const maxDiscountByFloor = classPrice - MIN_FINAL_PRICE;
  if (discountAmount > maxDiscountByFloor) {
    discountAmount = Math.max(0, maxDiscountByFloor);
  }

  // Round to 2 decimal places
  discountAmount = Math.round(discountAmount * 100) / 100;

  // Calculate actual Gems used
  const gemsUsed = convertUSDToGems(discountAmount);

  return { gemsUsed, discountAmount };
}

/**
 * Calculate maximum Gems usable for a class price
 * @param classPrice - Class price in USD
 * @returns Maximum Gems that can be used
 */
export function calculateMaxGemsUsable(classPrice: number): number {
  if (classPrice <= MIN_FINAL_PRICE) {
    return 0;
  }

  // Check 50% cap
  const fiftyPercent = classPrice * MAX_DISCOUNT_PERCENTAGE;
  
  // Check $5 floor
  const maxByFloor = classPrice - MIN_FINAL_PRICE;
  
  // Use the more restrictive limit
  const maxDiscount = Math.min(fiftyPercent, maxByFloor);
  
  return convertUSDToGems(maxDiscount);
}

/**
 * Calculate final price after Gems discount
 * @param classPrice - Original class price
 * @param gemsToUse - Gems to use for discount
 * @returns Final price after discount
 */
export function calculateFinalPrice(classPrice: number, gemsToUse: number): number {
  const { discountAmount } = calculateGemsDiscount(gemsToUse, classPrice);
  const finalPrice = classPrice - discountAmount;
  
  // Ensure minimum price
  return Math.max(MIN_FINAL_PRICE, Math.round(finalPrice * 100) / 100);
}

/**
 * Validate Gems usage for a booking
 * @param params - Validation parameters
 * @returns Validation result
 */
export function validateGemsUsage(params: {
  gemsToUse: number;
  gemsBalance: number;
  classPrice: number;
}): {
  isValid: boolean;
  errors: string[];
} {
  const { gemsToUse, gemsBalance, classPrice } = params;
  const errors: string[] = [];

  // Check for negative or zero Gems
  if (gemsToUse < 0) {
    errors.push('Gems amount must be positive');
  }

  if (gemsToUse === 0) {
    return { isValid: true, errors: [] };
  }

  // Check sufficient balance
  if (gemsToUse > gemsBalance) {
    errors.push('Insufficient Gems balance');
  }

  // Calculate discount amount
  const discountAmount = convertGemsToUSD(gemsToUse);

  // Check 50% cap
  const maxDiscountByCap = classPrice * MAX_DISCOUNT_PERCENTAGE;
  if (discountAmount > maxDiscountByCap) {
    errors.push('Gems discount cannot exceed 50% of class price');
  }

  // Check $5 floor
  const finalPrice = classPrice - discountAmount;
  if (finalPrice < MIN_FINAL_PRICE) {
    errors.push('Final price must be at least $5');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
