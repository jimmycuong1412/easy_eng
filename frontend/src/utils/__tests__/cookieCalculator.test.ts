/**
 * Gem Calculation Tests (TDD)
 *
 * Success Criteria SC-005: 100% Gem calculation accuracy
 *
 * @see shared/constants/gems.ts for business rules
 */

import { describe, test, expect } from '@jest/globals';
import { calculateDiscount, applyGemDiscount, validateGemBalance } from '@/utils/cookieCalculator';

describe('Gem Calculation Accuracy (SC-005: 100% accuracy)', () => {
  test('1 Gem = $0.50 discount', () => {
    const discount = calculateDiscount(100); // 100 Gems
    expect(discount).toBe(50.00); // $50 discount
  });

  test('50% maximum discount cap enforced', () => {
    const classPrice = 100;
    const gemsUsed = 300; // Would give $150 discount
    const result = applyGemDiscount(classPrice, gemsUsed);
    expect(result.finalPrice).toBe(50.00); // Capped at 50% ($50)
  });

  test('25% minimum price floor enforced', () => {
    const classPrice = 100;
    const gemsUsed = 200; // Would give $100 discount (free class)
    const result = applyGemDiscount(classPrice, gemsUsed);
    expect(result.finalPrice).toBe(50.00); // 50% cap kicks in before 25% floor
  });

  test('$5 minimum price never violated', () => {
    const classPrice = 10;
    const gemsUsed = 100; // Would give $50 discount
    const result = applyGemDiscount(classPrice, gemsUsed);
    expect(result.finalPrice).toBe(5.00); // Cannot go below $5
  });

  test('discount calculation is deterministic', () => {
    const price = 73.47;
    const gems = 87;
    const result1 = applyGemDiscount(price, gems);
    const result2 = applyGemDiscount(price, gems);
    const result3 = applyGemDiscount(price, gems);
    expect(result1.finalPrice).toBe(result2.finalPrice);
    expect(result2.finalPrice).toBe(result3.finalPrice);
  });

  test('returns maxGemsAllowed when exceeding caps', () => {
    const classPrice = 100;
    const gemsUsed = 300; // Too many
    const result = applyGemDiscount(classPrice, gemsUsed);
    expect(result.maxGemsAllowed).toBe(100); // Max is 50% = $50 = 100 Gems
  });

  test('handles zero Gems used', () => {
    const classPrice = 100;
    const gemsUsed = 0;
    const result = applyGemDiscount(classPrice, gemsUsed);
    expect(result.finalPrice).toBe(100.00); // No discount
  });

  test('handles edge case: very cheap class ($5.50)', () => {
    const classPrice = 5.50;
    const gemsUsed = 10; // Would give $5 discount
    const result = applyGemDiscount(classPrice, gemsUsed);
    expect(result.finalPrice).toBe(5.00); // Cannot go below $5
  });
});

describe('Gem Balance Validation', () => {
  test('validates sufficient Gem balance', () => {
    const userBalance = 100;
    const gemsToSpend = 50;
    const isValid = validateGemBalance(userBalance, gemsToSpend);
    expect(isValid).toBe(true);
  });

  test('rejects insufficient Gem balance', () => {
    const userBalance = 30;
    const gemsToSpend = 50;
    const isValid = validateGemBalance(userBalance, gemsToSpend);
    expect(isValid).toBe(false);
  });

  test('rejects negative Gem spending', () => {
    const userBalance = 100;
    const gemsToSpend = -10;
    expect(() => validateGemBalance(userBalance, gemsToSpend)).toThrow();
  });
});
