/**
 * Gems Calculator Utility Tests
 * 
 * Tests for Gems-to-USD conversion and discount calculations
 * 
 * Test-First Approach: These tests should FAIL until implementation is complete
 */

import { describe, it, expect } from '@jest/globals';
import {
  convertGemsToUSD,
  calculateGemsDiscount,
  calculateMaxGemsUsable,
  calculateFinalPrice,
  validateGemsUsage,
} from '../gemCalculator';

describe('Gems Calculator Utilities', () => {
  describe('convertGemsToUSD', () => {
    it('should convert 100 Gems to $1 USD', () => {
      expect(convertGemsToUSD(100)).toBe(1);
    });

    it('should convert 1000 Gems to $10 USD', () => {
      expect(convertGemsToUSD(1000)).toBe(10);
    });

    it('should handle decimal conversion correctly', () => {
      expect(convertGemsToUSD(150)).toBe(1.5);
    });

    it('should return 0 for 0 Gems', () => {
      expect(convertGemsToUSD(0)).toBe(0);
    });

    it('should handle negative Gems as 0', () => {
      expect(convertGemsToUSD(-100)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      expect(convertGemsToUSD(333)).toBe(3.33);
    });
  });

  describe('calculateGemsDiscount', () => {
    it('should calculate discount for 500 Gems ($5)', () => {
      const result = calculateGemsDiscount(500);
      expect(result.gemsUsed).toBe(500);
      expect(result.discountAmount).toBe(5);
    });

    it('should cap discount at 50% of class price', () => {
      const classPrice = 20;
      const result = calculateGemsDiscount(2000, classPrice); // $20 in Gems
      expect(result.discountAmount).toBe(10); // Max 50%
      expect(result.gemsUsed).toBe(1000); // Only use enough for 50%
    });

    it('should maintain $5 minimum final price', () => {
      const classPrice = 10;
      const result = calculateGemsDiscount(800, classPrice); // $8 in Gems
      expect(result.discountAmount).toBe(5); // $10 - $5 minimum
      expect(result.gemsUsed).toBe(500); // Only $5 discount allowed
    });

    it('should handle zero Gems', () => {
      const result = calculateGemsDiscount(0, 20);
      expect(result.discountAmount).toBe(0);
      expect(result.gemsUsed).toBe(0);
    });

    it('should respect both 50% cap AND $5 floor', () => {
      const classPrice = 8; // Edge case: 50% is $4, but floor is $5
      const result = calculateGemsDiscount(500, classPrice); // $5 in Gems
      expect(result.discountAmount).toBe(3); // Can only discount $3 (8-5=3)
      expect(result.gemsUsed).toBe(300);
    });
  });

  describe('calculateMaxGemsUsable', () => {
    it('should calculate max Gems for $20 class (50% = $10)', () => {
      expect(calculateMaxGemsUsable(20)).toBe(1000); // $10 = 1000 Gems
    });

    it('should calculate max Gems for $10 class ($5 max discount)', () => {
      expect(calculateMaxGemsUsable(10)).toBe(500); // $5 = 500 Gems
    });

    it('should handle $5 class (no discount allowed)', () => {
      expect(calculateMaxGemsUsable(5)).toBe(0); // Already at floor
    });

    it('should calculate max Gems for $100 class (50% = $50)', () => {
      expect(calculateMaxGemsUsable(100)).toBe(5000); // $50 = 5000 Gems
    });

    it('should handle $8 class (can only discount $3)', () => {
      expect(calculateMaxGemsUsable(8)).toBe(300); // $8 - $5 floor = $3
    });
  });

  describe('calculateFinalPrice', () => {
    it('should calculate final price after Gems discount', () => {
      const classPrice = 20;
      const gemsToUse = 500; // $5 discount
      expect(calculateFinalPrice(classPrice, gemsToUse)).toBe(15);
    });

    it('should not go below $5 minimum', () => {
      const classPrice = 10;
      const gemsToUse = 1000; // $10 discount (too much)
      expect(calculateFinalPrice(classPrice, gemsToUse)).toBe(5);
    });

    it('should return original price if no Gems used', () => {
      expect(calculateFinalPrice(25, 0)).toBe(25);
    });

    it('should respect 50% cap', () => {
      const classPrice = 50;
      const gemsToUse = 5000; // $50 discount (too much)
      expect(calculateFinalPrice(classPrice, gemsToUse)).toBe(25); // 50% off
    });
  });

  describe('validateGemsUsage', () => {
    it('should validate sufficient Gems balance', () => {
      const result = validateGemsUsage({
        gemsToUse: 500,
        gemsBalance: 1000,
        classPrice: 20,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject insufficient Gems balance', () => {
      const result = validateGemsUsage({
        gemsToUse: 500,
        gemsBalance: 300,
        classPrice: 20,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Insufficient Gems balance');
    });

    it('should reject negative Gems', () => {
      const result = validateGemsUsage({
        gemsToUse: -100,
        gemsBalance: 1000,
        classPrice: 20,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Gems amount must be positive');
    });

    it('should reject exceeding 50% discount', () => {
      const result = validateGemsUsage({
        gemsToUse: 1500, // $15, but 50% of $20 is $10
        gemsBalance: 2000,
        classPrice: 20,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Gems discount cannot exceed 50% of class price');
    });

    it('should reject going below $5 floor', () => {
      const result = validateGemsUsage({
        gemsToUse: 600, // $6 discount on $10 class
        gemsBalance: 1000,
        classPrice: 10,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Final price must be at least $5');
    });

    it('should allow valid discount within constraints', () => {
      const result = validateGemsUsage({
        gemsToUse: 1000, // $10 discount (50% of $20)
        gemsBalance: 1500,
        classPrice: 20,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large class prices', () => {
      const maxGems = calculateMaxGemsUsable(1000);
      expect(maxGems).toBe(50000); // 50% of $1000 = $500 = 50000 Gems
    });

    it('should handle fractional Gems amounts', () => {
      expect(convertGemsToUSD(123.45)).toBe(1.23);
    });

    it('should prevent discount on $5 class', () => {
      const result = validateGemsUsage({
        gemsToUse: 100,
        gemsBalance: 1000,
        classPrice: 5,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Final price must be at least $5');
    });

    it('should handle exact 50% discount', () => {
      const classPrice = 30;
      const gemsToUse = 1500; // Exactly 50%
      const result = validateGemsUsage({
        gemsToUse,
        gemsBalance: 2000,
        classPrice,
      });
      expect(result.isValid).toBe(true);
      expect(calculateFinalPrice(classPrice, gemsToUse)).toBe(15);
    });
  });
});
