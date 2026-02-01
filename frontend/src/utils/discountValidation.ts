/**
 * Gems Discount Validation Utilities
 * 
 * Validates Gems discount rules: 50% cap and $5 floor
 */

import {
  MAX_DISCOUNT_PERCENTAGE,
  MIN_FINAL_PRICE,
  GEMS_TO_USD_RATE,
} from '../../../shared/constants/gems';

/**
 * Validate 50% discount cap
 */
export function validateDiscountCap(params: {
  classPrice: number;
  discountAmount: number;
}): {
  isValid: boolean;
  maxDiscount: number;
  error?: string;
} {
  const { classPrice, discountAmount } = params;
  const maxDiscount = classPrice * MAX_DISCOUNT_PERCENTAGE;

  if (discountAmount > maxDiscount) {
    return {
      isValid: false,
      maxDiscount,
      error: `Discount cannot exceed 50% of class price ($${maxDiscount.toFixed(2)})`,
    };
  }

  return {
    isValid: true,
    maxDiscount,
  };
}

/**
 * Validate $5 minimum price floor
 */
export function validatePriceFloor(params: {
  classPrice: number;
  discountAmount: number;
}): {
  isValid: boolean;
  finalPrice: number;
  error?: string;
} {
  const { classPrice, discountAmount } = params;
  const finalPrice = classPrice - discountAmount;

  if (finalPrice < MIN_FINAL_PRICE) {
    return {
      isValid: false,
      finalPrice,
      error: `Final price must be at least $${MIN_FINAL_PRICE.toFixed(2)}`,
    };
  }

  return {
    isValid: true,
    finalPrice,
  };
}

/**
 * Validate Gems discount against all rules
 */
export function validateGemsDiscountRules(params: {
  classPrice: number;
  gemsToUse: number;
  gemsBalance: number;
}): {
  isValid: boolean;
  finalPrice: number;
  discountApplied: number;
  maxAllowedGems: number;
  violations: string[];
} {
  const { classPrice, gemsToUse, gemsBalance } = params;
  const violations: string[] = [];
  
  // Convert Gems to USD
  const discountAmount = gemsToUse / GEMS_TO_USD_RATE;
  const finalPrice = classPrice - discountAmount;

  // Check sufficient balance
  if (gemsToUse > gemsBalance) {
    violations.push('Insufficient Gems');
  }

  // Check 50% cap
  const capValidation = validateDiscountCap({ classPrice, discountAmount });
  if (!capValidation.isValid) {
    violations.push('50% discount cap');
  }

  // Check $5 floor
  const floorValidation = validatePriceFloor({ classPrice, discountAmount });
  if (!floorValidation.isValid) {
    violations.push('$5 minimum price');
  }

  // Calculate max allowed Gems
  const constraints = getDiscountConstraints(classPrice);

  return {
    isValid: violations.length === 0,
    finalPrice: Math.max(MIN_FINAL_PRICE, finalPrice),
    discountApplied: Math.min(discountAmount, constraints.maxAllowedDiscount),
    maxAllowedGems: Math.round(constraints.maxAllowedDiscount * GEMS_TO_USD_RATE),
    violations,
  };
}

/**
 * Get discount constraints for a class price
 */
export function getDiscountConstraints(classPrice: number): {
  maxDiscountPercent: number;
  maxDiscountAmount: number;
  minFinalPrice: number;
  maxAllowedDiscount: number;
  effectiveConstraint: 'cap' | 'floor';
} {
  const maxDiscountByCap = classPrice * MAX_DISCOUNT_PERCENTAGE;
  const maxDiscountByFloor = classPrice - MIN_FINAL_PRICE;
  
  const maxAllowedDiscount = Math.round(Math.max(0, Math.min(maxDiscountByCap, maxDiscountByFloor)) * 100) / 100;
  const effectiveConstraint = maxDiscountByCap <= maxDiscountByFloor ? 'cap' : 'floor';

  return {
    maxDiscountPercent: MAX_DISCOUNT_PERCENTAGE,
    maxDiscountAmount: maxDiscountByCap,
    minFinalPrice: MIN_FINAL_PRICE,
    maxAllowedDiscount,
    effectiveConstraint,
  };
}

/**
 * Calculate allowed discount amount (auto-adjust to constraints)
 */
export function calculateAllowedDiscount(params: {
  classPrice: number;
  requestedDiscount: number;
}): {
  allowedDiscount: number;
  wasReduced: boolean;
  reason?: string;
  limitingFactor?: 'cap' | 'floor';
} {
  const { classPrice, requestedDiscount } = params;
  const constraints = getDiscountConstraints(classPrice);

  if (requestedDiscount <= constraints.maxAllowedDiscount) {
    return {
      allowedDiscount: requestedDiscount,
      wasReduced: false,
    };
  }

  // Discount was reduced
  return {
    allowedDiscount: constraints.maxAllowedDiscount,
    wasReduced: true,
    reason: constraints.effectiveConstraint === 'cap'
      ? `Discount reduced to 50% maximum ($${constraints.maxDiscountAmount.toFixed(2)})`
      : `Discount reduced to maintain $${MIN_FINAL_PRICE} minimum price`,
    limitingFactor: constraints.effectiveConstraint,
  };
}
