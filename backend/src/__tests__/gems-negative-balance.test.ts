/**
 * Gems Negative Balance Prevention Tests
 * 
 * Ensures users can never have negative Gems balance
 * Critical for financial integrity and preventing fraud
 * 
 * Test-First Approach: These tests should FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { deductGems, addGems, getGemsBalance } from '../services/gems.service';
import { processBookingWithGems } from '../services/booking.service';
import { supabase } from '../lib/supabase';

describe('Gems Negative Balance Prevention', () => {
  const testUserId = 'test-user-negative-balance';

  beforeEach(async () => {
    // Reset test user's Gems balance to 1000
    await supabase.from('gem_transactions').delete().eq('user_id', testUserId);
    await addGems({
      userId: testUserId,
      amount: 1000,
      transactionType: 'test_setup',
      description: 'Initial balance for negative balance tests',
    });
  });

  describe('Direct Gems Deduction', () => {
    it('should allow deduction within available balance', async () => {
      const result = await deductGems({
        userId: testUserId,
        amount: 500,
        transactionType: 'test_deduction',
        description: 'Test deduction',
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(-500); // Deductions are negative

      const balance = await getGemsBalance(testUserId);
      expect(balance).toBe(500);
    });

    it('should reject deduction exceeding balance', async () => {
      await expect(
        deductGems({
          userId: testUserId,
          amount: 1500, // More than available 1000
          transactionType: 'test_overdraft',
        })
      ).rejects.toThrow('Insufficient Gems balance');

      // Balance should be unchanged
      const balance = await getGemsBalance(testUserId);
      expect(balance).toBe(1000);
    });

    it('should reject deduction to exact zero plus one', async () => {
      await expect(
        deductGems({
          userId: testUserId,
          amount: 1001,
          transactionType: 'test_overdraft',
        })
      ).rejects.toThrow('Insufficient Gems balance');
    });

    it('should allow deduction to exact zero', async () => {
      const result = await deductGems({
        userId: testUserId,
        amount: 1000,
        transactionType: 'test_exact_zero',
        description: 'Test exact zero balance',
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(-1000);

      const balance = await getGemsBalance(testUserId);
      expect(balance).toBe(0);
    });

    it('should handle floating point precision correctly', async () => {
      // Add fractional Gems
      await addGems({
        userId: testUserId,
        amount: 123.45,
        transactionType: 'test_fractional',
      });

      // Should have 1123.45 now
      let balance = await getGemsBalance(testUserId);
      expect(balance).toBe(1123.45);

      // Deduct slightly more
      await expect(
        deductGems({
          userId: testUserId,
          amount: 1123.46,
          transactionType: 'test_precision',
        })
      ).rejects.toThrow('Insufficient Gems balance');

      // Balance should be unchanged
      balance = await getGemsBalance(testUserId);
      expect(balance).toBe(1123.45);
    });
  });

  describe('Booking with Insufficient Gems', () => {
    it('should reject booking if Gems balance is insufficient', async () => {
      await expect(
        processBookingWithGems({
          userId: testUserId,
          classId: 'test-class-1',
          gemsToUse: 1500, // More than 1000 available
          paymentAmount: 5,
        })
      ).rejects.toThrow('Insufficient Gems balance');

      // Verify no booking was created
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', testUserId);

      expect(bookings || []).toHaveLength(0);
    });

    it('should reject booking if current balance is zero', async () => {
      // Deduct all Gems
      await deductGems({
        userId: testUserId,
        amount: 1000,
        transactionType: 'test_zero_balance',
        description: 'Deduct all Gems to test zero balance',
      });

      await expect(
        processBookingWithGems({
          userId: testUserId,
          classId: 'test-class-1',
          gemsToUse: 100,
          paymentAmount: 15,
        })
      ).rejects.toThrow('Insufficient Gems balance');
    });

    it('should handle race condition with concurrent bookings', async () => {
      // User has 1000 Gems, tries to book 2 classes using 600 Gems each
      const promises = [
        processBookingWithGems({
          userId: testUserId,
          classId: 'test-class-1',
          gemsToUse: 600,
          paymentAmount: 14,
        }),
        processBookingWithGems({
          userId: testUserId,
          classId: 'test-class-2',
          gemsToUse: 600,
          paymentAmount: 14,
        }),
      ];

      const results = await Promise.allSettled(promises);

      // Only one should succeed (600 Gems), the other should fail
      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(1);

      // Final balance should be 400 (1000 - 600)
      const finalBalance = await getGemsBalance(testUserId);
      expect(finalBalance).toBe(400);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce check constraint preventing negative balance', async () => {
      // Attempt to insert transaction that would make balance negative
      const { error } = await supabase
        .from('gem_transactions')
        .insert({
          user_id: testUserId,
          amount: -2000, // Would make balance -1000
          transaction_type: 'test_negative',
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('balance');
    });

    it('should maintain balance integrity through trigger/function', async () => {
      // Balance should be calculated from transactions, not stored
      const balance = await getGemsBalance(testUserId);
      expect(balance).toBe(1000);

      // Verify balance is derived, not stored
      const { data: user } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();

      // Profile should not have a gems_balance column
      expect(user).not.toHaveProperty('gems_balance');
    });
  });

  describe('Edge Cases', () => {
    it('should reject negative deduction amount', async () => {
      await expect(
        deductGems({
          userId: testUserId,
          amount: -100,
          transactionType: 'test_negative_amount',
        })
      ).rejects.toThrow('Amount must be positive');
    });

    it('should reject zero deduction', async () => {
      await expect(
        deductGems({
          userId: testUserId,
          amount: 0,
          transactionType: 'test_zero_amount',
        })
      ).rejects.toThrow('Amount must be greater than zero');
    });

    it('should handle very small balance correctly', async () => {
      // Deduct most Gems, leaving 0.01
      await deductGems({
        userId: testUserId,
        amount: 999.99,
        transactionType: 'test_small_balance',
        description: 'Deduct to leave small balance',
      });

      const balance = await getGemsBalance(testUserId);
      expect(balance).toBe(0.01);

      // Should reject deduction of 0.02
      await expect(
        deductGems({
          userId: testUserId,
          amount: 0.02,
          transactionType: 'test_overdraft_small',
        })
      ).rejects.toThrow('Insufficient Gems balance');
    });

    it('should handle user with no Gems history', async () => {
      const newUserId = 'user-with-no-gems';

      const balance = await getGemsBalance(newUserId);
      expect(balance).toBe(0);

      await expect(
        deductGems({
          userId: newUserId,
          amount: 1,
          transactionType: 'test_no_history',
        })
      ).rejects.toThrow('Insufficient Gems balance');
    });

    it('should maintain accuracy with many small transactions', async () => {
      // Perform 100 small deductions
      for (let i = 0; i < 100; i++) {
        await deductGems({
          userId: testUserId,
          amount: 5,
          transactionType: `test_small_tx`,
          description: `Small transaction ${i}`,
        });
      }

      // Should have 500 left (1000 - 100*5)
      const balance = await getGemsBalance(testUserId);
      expect(balance).toBe(500);

      // 101st deduction should fail
      await expect(
        deductGems({
          userId: testUserId,
          amount: 5,
          transactionType: 'test_overdraft_after_many',
        })
      ).rejects.toThrow('Insufficient Gems balance');
    });
  });

  describe('Error Recovery', () => {
    it('should rollback on database constraint violation', async () => {
      const initialBalance = await getGemsBalance(testUserId);

      // Attempt invalid operation
      await expect(
        deductGems({
          userId: testUserId,
          amount: 2000,
          transactionType: 'test_rollback',
        })
      ).rejects.toThrow();

      // Balance should be unchanged
      const finalBalance = await getGemsBalance(testUserId);
      expect(finalBalance).toBe(initialBalance);

      // No failed transaction should be recorded
      const { data: transactions } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('user_id', testUserId)
        .eq('transaction_type', 'test_rollback');

      expect(transactions || []).toHaveLength(0);
    });
  });
});
