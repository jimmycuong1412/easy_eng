/**
 * Gems Transaction Atomicity Tests
 * 
 * Ensures Gems transactions are atomic (all-or-nothing)
 * Critical for financial accuracy and preventing corruption
 * 
 * Test-First Approach: These tests should FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processBookingWithGems } from '../services/booking.service';
import { getGemsBalance, addGems } from '../services/gems.service';
import { supabase } from '../lib/supabase';

describe('Gems Transaction Atomicity', () => {
  const testUserId = 'test-user-atomicity';
  const testClassId = 'test-class-atomicity';

  beforeEach(async () => {
    // Setup test data - clean previous test data
    await supabase.from('gem_transactions').delete().eq('user_id', testUserId);
    await supabase.from('bookings').delete().eq('user_id', testUserId);

    // Give test user initial balance of 2000 Gems
    await addGems({
      userId: testUserId,
      amount: 2000,
      transactionType: 'test_setup',
      description: 'Initial balance for atomicity tests',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Booking with Gems Deduction', () => {
    it('should deduct Gems atomically with booking creation', async () => {
      const userId = testUserId;
      const classId = testClassId;
      const gemsToUse = 500;

      // Initial balance
      const initialBalance = await getGemsBalance(userId);

      // Process booking
      const result = await processBookingWithGems({
        userId,
        classId,
        gemsToUse,
        paymentAmount: 15, // $20 class - $5 Gems discount
      });

      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      expect(result.gemsTransaction).toBeDefined();

      // Verify Gems were deducted
      const finalBalance = await getGemsBalance(userId);
      expect(finalBalance).toBe(initialBalance - gemsToUse);

      // Verify booking was created
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', result.booking.id)
        .single();

      expect(booking).toBeDefined();
      expect(booking.gems_used).toBe(gemsToUse);
    });

    it('should rollback Gems deduction if booking creation fails', async () => {
      const userId = testUserId;
      const classId = 'non-existent-class'; // Will cause booking to fail
      const gemsToUse = 500;

      const initialBalance = await getGemsBalance(userId);

      // Attempt booking (should fail)
      await expect(
        processBookingWithGems({
          userId,
          classId,
          gemsToUse,
          paymentAmount: 15,
        })
      ).rejects.toThrow();

      // Verify Gems were NOT deducted (rollback occurred)
      const finalBalance = await getGemsBalance(userId);
      expect(finalBalance).toBe(initialBalance);

      // Verify no Gems transaction was recorded
      const { data: transactions } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('amount', -gemsToUse);

      expect(transactions).toHaveLength(0);
    });

    it('should rollback booking if Gems deduction fails', async () => {
      const userId = testUserId;
      const classId = testClassId;
      const gemsToUse = 999999; // More than user has

      // Attempt booking (should fail due to insufficient Gems)
      await expect(
        processBookingWithGems({
          userId,
          classId,
          gemsToUse,
          paymentAmount: 1,
        })
      ).rejects.toThrow('Insufficient Gems');

      // Verify no booking was created
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .eq('class_id', classId);

      expect(bookings).toHaveLength(0);
    });

    it('should rollback both if payment processing fails', async () => {
      const userId = testUserId;
      const classId = testClassId;
      const gemsToUse = 500;

      const initialBalance = await getGemsBalance(userId);

      // Mock payment failure
      vi.spyOn(require('../services/payment.service'), 'processPayment')
        .mockRejectedValue(new Error('Payment gateway error'));

      // Attempt booking (should fail at payment step)
      await expect(
        processBookingWithGems({
          userId,
          classId,
          gemsToUse,
          paymentAmount: 15,
        })
      ).rejects.toThrow('Payment gateway error');

      // Verify Gems were NOT deducted
      const finalBalance = await getGemsBalance(userId);
      expect(finalBalance).toBe(initialBalance);

      // Verify no booking was created
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .eq('class_id', classId);

      expect(bookings).toHaveLength(0);

      // Verify no Gems transaction was recorded
      const { data: transactions } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('amount', -gemsToUse);

      expect(transactions).toHaveLength(0);
    });
  });

  describe('Database Transaction Integrity', () => {
    it('should use database transactions for multi-table operations', async () => {
      const userId = testUserId;
      const classId = testClassId;
      const gemsToUse = 500;

      // Start a transaction spy
      const transactionSpy = vi.spyOn(supabase, 'rpc');

      await processBookingWithGems({
        userId,
        classId,
        gemsToUse,
        paymentAmount: 15,
      });

      // Verify transaction was used
      expect(transactionSpy).toHaveBeenCalled();
    });

    it('should handle concurrent booking attempts with proper locking', async () => {
      const userId = testUserId;
      const classId = testClassId;
      const gemsToUse = 500;

      // Attempt multiple simultaneous bookings
      const promises = [
        processBookingWithGems({ userId, classId, gemsToUse, paymentAmount: 15 }),
        processBookingWithGems({ userId, classId, gemsToUse, paymentAmount: 15 }),
      ];

      const results = await Promise.allSettled(promises);

      // Only one should succeed
      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(1);

      // Verify Gems were only deducted once
      const finalBalance = await getGemsBalance(userId);
      const expectedBalance = 2000 - gemsToUse; // Initial balance of 2000
      expect(finalBalance).toBe(expectedBalance);
    });

    it('should maintain Gems balance consistency during failures', async () => {
      const userId = testUserId;
      
      const initialBalance = await getGemsBalance(userId);

      // Attempt 10 bookings with various failures
      const promises = Array.from({ length: 10 }, (_, i) => 
        processBookingWithGems({
          userId,
          classId: i % 2 === 0 ? 'valid-class' : 'invalid-class',
          gemsToUse: 100,
          paymentAmount: 15,
        }).catch(() => null) // Swallow errors
      );

      await Promise.all(promises);

      // Calculate expected balance (only valid bookings should succeed)
      const { data: successfulBookings } = await supabase
        .from('bookings')
        .select('gems_used')
        .eq('user_id', userId);

      const totalGemsUsed = successfulBookings?.reduce(
        (sum, b) => sum + (b.gems_used || 0),
        0
      ) || 0;

      const finalBalance = await getGemsBalance(userId);
      expect(finalBalance).toBe(initialBalance - totalGemsUsed);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit log entry for every Gems transaction', async () => {
      const userId = testUserId;
      const classId = testClassId;
      const gemsToUse = 500;

      await processBookingWithGems({
        userId,
        classId,
        gemsToUse,
        paymentAmount: 15,
      });

      // Verify audit log entry exists
      const { data: auditLog } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('amount', -gemsToUse)
        .single();

      expect(auditLog).toBeDefined();
      expect(auditLog.transaction_type).toBe('booking_discount');
      expect(auditLog.metadata).toHaveProperty('class_id', classId);
      expect(auditLog.created_at).toBeDefined();
    });

    it('should NOT create audit entry if transaction rolls back', async () => {
      const userId = testUserId;
      const gemsToUse = 500;

      const initialCount = await supabase
        .from('gem_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Attempt failed booking
      await processBookingWithGems({
        userId,
        classId: 'invalid-class',
        gemsToUse,
        paymentAmount: 15,
      }).catch(() => null);

      const finalCount = await supabase
        .from('gem_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Count should be unchanged
      expect(finalCount.count).toBe(initialCount.count);
    });
  });

  describe('Idempotency', () => {
    it('should prevent duplicate booking with same idempotency key', async () => {
      const userId = testUserId;
      const classId = testClassId;
      const gemsToUse = 500;
      const idempotencyKey = 'unique-booking-123';

      // First booking
      const result1 = await processBookingWithGems({
        userId,
        classId,
        gemsToUse,
        paymentAmount: 15,
        idempotencyKey,
      });

      expect(result1.success).toBe(true);

      // Duplicate booking attempt (same key)
      const result2 = await processBookingWithGems({
        userId,
        classId,
        gemsToUse,
        paymentAmount: 15,
        idempotencyKey,
      });

      // Should return original booking, not create new one
      expect(result2.booking.id).toBe(result1.booking.id);
      expect(result2.isIdempotent).toBe(true);

      // Verify Gems were only deducted once
      const { data: transactions } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('amount', -gemsToUse);

      expect(transactions).toHaveLength(1);
    });
  });
});
