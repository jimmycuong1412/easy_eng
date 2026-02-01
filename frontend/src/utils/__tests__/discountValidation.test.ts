/**
 * Gems Discount Validation Tests
 * 
 * Tests for validating Gems discount rules:
 * - 50% maximum discount cap
 * - $5 minimum final price floor
 * - Constraint interactions
 * 
 * Test-First Approach: These tests should FAIL until implementation is complete
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateDiscountCap,
  validatePriceFloor,
  validateGemsDiscountRules,
  getDiscountConstraints,
  calculateAllowedDiscount,
} from '../discountValidation';

describe('Gems Discount Validation', () => {
  describe('validateDiscountCap (50% Maximum)', () => {
    it('should allow discount at exactly 50%', () => {
      const result = validateDiscountCap({
        classPrice: 20,
        discountAmount: 10,
      });
      expect(result.isValid).toBe(true);
      expect(result.maxDiscount).toBe(10);
    });

    it('should reject discount exceeding 50%', () => {
      const result = validateDiscountCap({
        classPrice: 20,
        discountAmount: 12,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('50%');
    });

    it('should allow discount below 50%', () => {
      const result = validateDiscountCap({
        classPrice: 30,
        discountAmount: 10,
      });
      expect(result.isValid).toBe(true);
    });

    it('should calculate 50% cap for various prices', () => {
      expect(validateDiscountCap({ classPrice: 10, discountAmount: 5 }).isValid).toBe(true);
      expect(validateDiscountCap({ classPrice: 50, discountAmount: 25 }).isValid).toBe(true);
      expect(validateDiscountCap({ classPrice: 100, discountAmount: 50 }).isValid).toBe(true);
    });

    it('should handle decimal prices correctly', () => {
      const result = validateDiscountCap({
        classPrice: 15.50,
        discountAmount: 7.75,
      });
      expect(result.isValid).toBe(true);
      expect(result.maxDiscount).toBe(7.75);
    });
  });

  describe('validatePriceFloor ($5 Minimum)', () => {
    it('should allow final price at exactly $5', () => {
      const result = validatePriceFloor({
        classPrice: 10,
        discountAmount: 5,
      });
      expect(result.isValid).toBe(true);
      expect(result.finalPrice).toBe(5);
    });

    it('should reject discount that goes below $5', () => {
      const result = validatePriceFloor({
        classPrice: 8,
        discountAmount: 4,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('$5');
    });

    it('should allow final price above $5', () => {
      const result = validatePriceFloor({
        classPrice: 20,
        discountAmount: 10,
      });
      expect(result.isValid).toBe(true);
      expect(result.finalPrice).toBe(10);
    });

    it('should prevent any discount on $5 class', () => {
      const result = validatePriceFloor({
        classPrice: 5,
        discountAmount: 0.01,
      });
      expect(result.isValid).toBe(false);
    });

    it('should allow no discount on $5 class', () => {
      const result = validatePriceFloor({
        classPrice: 5,
        discountAmount: 0,
      });
      expect(result.isValid).toBe(true);
      expect(result.finalPrice).toBe(5);
    });
  });

  describe('validateGemsDiscountRules (Combined Constraints)', () => {
    it('should validate against both 50% cap and $5 floor', () => {
      const result = validateGemsDiscountRules({
        classPrice: 20,
        gemsToUse: 1000, // $10 discount
        gemsBalance: 2000,
      });
      expect(result.isValid).toBe(true);
      expect(result.finalPrice).toBe(10);
      expect(result.discountApplied).toBe(10);
    });

    it('should enforce 50% cap when it is more restrictive', () => {
      const result = validateGemsDiscountRules({
        classPrice: 100,
        gemsToUse: 7000, // $70 discount, but max is 50% = $50
        gemsBalance: 10000,
      });
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('50% discount cap');
      expect(result.maxAllowedGems).toBe(5000); // $50
    });

    it('should enforce $5 floor when it is more restrictive', () => {
      const result = validateGemsDiscountRules({
        classPrice: 8,
        gemsToUse: 400, // $4 discount (50%), but would make price $4
        gemsBalance: 1000,
      });
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('$5 minimum price');
      expect(result.maxAllowedGems).toBe(300); // Only $3 allowed
    });

    it('should handle edge case where constraints conflict', () => {
      // $7 class: 50% = $3.50, but floor requires price >= $5, so max discount is $2
      const result = validateGemsDiscountRules({
        classPrice: 7,
        gemsToUse: 350, // $3.50 (50%)
        gemsBalance: 1000,
      });
      expect(result.isValid).toBe(false);
      expect(result.maxAllowedGems).toBe(200); // Only $2 allowed (7-5=2)
    });

    it('should reject insufficient Gems balance', () => {
      const result = validateGemsDiscountRules({
        classPrice: 20,
        gemsToUse: 1000,
        gemsBalance: 500, // Not enough
      });
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Insufficient Gems');
    });
  });

  describe('getDiscountConstraints', () => {
    it('should return both constraints for $20 class', () => {
      const constraints = getDiscountConstraints(20);
      expect(constraints.maxDiscountPercent).toBe(0.5);
      expect(constraints.maxDiscountAmount).toBe(10);
      expect(constraints.minFinalPrice).toBe(5);
      expect(constraints.maxAllowedDiscount).toBe(10); // $20 * 50% = $10, floor is $5
    });

    it('should limit discount when floor is more restrictive', () => {
      const constraints = getDiscountConstraints(8);
      expect(constraints.maxDiscountAmount).toBe(4); // 50%
      expect(constraints.maxAllowedDiscount).toBe(3); // But floor limits to $3 (8-5)
      expect(constraints.effectiveConstraint).toBe('floor');
    });

    it('should limit discount when cap is more restrictive', () => {
      const constraints = getDiscountConstraints(50);
      expect(constraints.maxDiscountAmount).toBe(25); // 50%
      expect(constraints.maxAllowedDiscount).toBe(25); // Floor allows up to $45 off
      expect(constraints.effectiveConstraint).toBe('cap');
    });

    it('should show no discount available for $5 class', () => {
      const constraints = getDiscountConstraints(5);
      expect(constraints.maxAllowedDiscount).toBe(0);
      expect(constraints.effectiveConstraint).toBe('floor');
    });
  });

  describe('calculateAllowedDiscount', () => {
    it('should return full discount when within constraints', () => {
      const result = calculateAllowedDiscount({
        classPrice: 30,
        requestedDiscount: 10,
      });
      expect(result.allowedDiscount).toBe(10);
      expect(result.wasReduced).toBe(false);
    });

    it('should reduce discount to 50% cap', () => {
      const result = calculateAllowedDiscount({
        classPrice: 20,
        requestedDiscount: 12,
      });
      expect(result.allowedDiscount).toBe(10); // 50% of $20
      expect(result.wasReduced).toBe(true);
      expect(result.reason).toContain('50%');
    });

    it('should reduce discount to maintain $5 floor', () => {
      const result = calculateAllowedDiscount({
        classPrice: 10,
        requestedDiscount: 7,
      });
      expect(result.allowedDiscount).toBe(5); // $10 - $5 floor
      expect(result.wasReduced).toBe(true);
      expect(result.reason).toContain('$5');
    });

    it('should apply most restrictive constraint', () => {
      const result = calculateAllowedDiscount({
        classPrice: 8,
        requestedDiscount: 5,
      });
      expect(result.allowedDiscount).toBe(3); // Floor restricts to $3
      expect(result.wasReduced).toBe(true);
      expect(result.limitingFactor).toBe('floor');
    });

    it('should return 0 for $5 class', () => {
      const result = calculateAllowedDiscount({
        classPrice: 5,
        requestedDiscount: 1,
      });
      expect(result.allowedDiscount).toBe(0);
      expect(result.wasReduced).toBe(true);
    });
  });

  describe('Boundary Testing', () => {
    it('should handle $5.01 class (1 cent above floor)', () => {
      const constraints = getDiscountConstraints(5.01);
      expect(constraints.maxAllowedDiscount).toBe(0.01);
    });

    it('should handle very large class prices', () => {
      const constraints = getDiscountConstraints(1000);
      expect(constraints.maxAllowedDiscount).toBe(500); // 50%
      expect(constraints.effectiveConstraint).toBe('cap');
    });

    it('should validate exact boundary values', () => {
      // $10 class: 50% = $5, floor = $5, so max discount = $5
      const result = validateGemsDiscountRules({
        classPrice: 10,
        gemsToUse: 500,
        gemsBalance: 1000,
      });
      expect(result.isValid).toBe(true);
      expect(result.finalPrice).toBe(5);
    });

    it('should reject 1 cent over 50%', () => {
      const result = validateGemsDiscountRules({
        classPrice: 10,
        gemsToUse: 501, // $5.01 discount
        gemsBalance: 1000,
      });
      expect(result.isValid).toBe(false);
    });

    it('should reject 1 cent below $5 floor', () => {
      const result = validateGemsDiscountRules({
        classPrice: 10,
        gemsToUse: 501, // Would make price $4.99
        gemsBalance: 1000,
      });
      expect(result.isValid).toBe(false);
    });
  });
});
