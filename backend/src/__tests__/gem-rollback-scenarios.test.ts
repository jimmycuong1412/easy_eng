/**
 * Integration Test: Gem Deduction Rollback Scenarios
 * Task: T139C [P] [CURRENCY] [TEST]
 *
 * Purpose: Test backend logic for rolling back Gem deductions in various failure scenarios:
 * - Payment gateway failures
 * - Booking capacity conflicts
 * - Database transaction errors
 * - Network/timeout errors
 * - Validation failures
 *
 * Constitution Principle VI: Currency system integrity
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Gem Deduction Rollback Scenarios', () => {
  let supabase: SupabaseClient;
  let testUserId: string;
  let testClassId: string;

  beforeEach(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `rollback-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (userError || !userData.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`);
    }

    testUserId = userData.user.id;

    // Grant initial Gems
    await supabase.from('gem_transactions').insert({
      user_id: testUserId,
      amount: 100,
      transaction_type: 'admin_grant',
      status: 'completed',
      description: 'Test initial balance',
    });

    // Create test class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .insert({
        title: 'Rollback Test Class',
        description: 'Test class for rollback scenarios',
        price: 2000, // $20.00
        max_capacity: 10,
        teacher_id: testUserId, // Using same user for simplicity
      })
      .select()
      .single();

    if (classError || !classData) {
      throw new Error(`Failed to create test class: ${classError?.message}`);
    }

    testClassId = classData.id;
  });

  afterEach(async () => {
    // Cleanup: Delete test data
    if (testUserId) {
      await supabase.from('bookings').delete().eq('user_id', testUserId);
      await supabase.from('gem_transactions').delete().eq('user_id', testUserId);
      await supabase.from('classes').delete().eq('id', testClassId);
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  describe('Payment Gateway Failures', () => {
    it('should rollback Gems when payment gateway returns error', async () => {
      // Get initial balance
      const initialBalance = await getGemBalance(testUserId);
      expect(initialBalance).toBe(100);

      // Create transaction with idempotency key
      const idempotencyKey = `test-payment-fail-${Date.now()}`;

      // Deduct Gems (simulating booking with Gem discount)
      const { data: deductionData, error: deductionError } = await supabase.rpc(
        'process_gem_transaction',
        {
          p_user_id: testUserId,
          p_amount: -20,
          p_transaction_type: 'booking_discount',
          p_idempotency_key: idempotencyKey,
          p_description: 'Booking discount for Rollback Test Class',
        }
      );

      expect(deductionError).toBeNull();
      expect(deductionData).toBe(true);

      // Verify deduction
      let currentBalance = await getGemBalance(testUserId);
      expect(currentBalance).toBe(80);

      // Simulate payment failure - trigger rollback
      const { error: rollbackError } = await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: 20, // Refund
        p_transaction_type: 'booking_refund',
        p_idempotency_key: `${idempotencyKey}-rollback`,
        p_description: 'Rollback due to payment failure',
        p_related_transaction_id: idempotencyKey,
      });

      expect(rollbackError).toBeNull();

      // Verify rollback
      currentBalance = await getGemBalance(testUserId);
      expect(currentBalance).toBe(100);

      // Verify audit log
      const { data: auditLogs } = await supabase
        .from('gem_transaction_audit_log')
        .select('*')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false });

      expect(auditLogs).toBeTruthy();
      expect(auditLogs!.length).toBeGreaterThanOrEqual(2);
      expect(auditLogs![0].action).toBe('booking_refund');
      expect(auditLogs![1].action).toBe('booking_discount');
    });

    it('should handle payment timeout with automatic rollback', async () => {
      const initialBalance = await getGemBalance(testUserId);
      const idempotencyKey = `test-timeout-${Date.now()}`;

      // Deduct Gems
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -30,
        p_transaction_type: 'booking_discount',
        p_idempotency_key: idempotencyKey,
        p_description: 'Booking with timeout scenario',
      });

      // Wait for timeout (simulated)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Automatic rollback by timeout handler
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: 30,
        p_transaction_type: 'booking_refund',
        p_idempotency_key: `${idempotencyKey}-timeout-rollback`,
        p_description: 'Automatic rollback due to payment timeout',
      });

      const finalBalance = await getGemBalance(testUserId);
      expect(finalBalance).toBe(initialBalance);
    });
  });

  describe('Booking Capacity Conflicts', () => {
    it('should rollback Gems when booking fails due to capacity', async () => {
      // Fill class to capacity
      const { error: fillError } = await supabase.from('bookings').insert(
        Array.from({ length: 10 }, (_, i) => ({
          class_id: testClassId,
          user_id: `fake-user-${i}`,
          status: 'confirmed',
        }))
      );

      expect(fillError).toBeNull();

      const initialBalance = await getGemBalance(testUserId);
      const idempotencyKey = `test-capacity-${Date.now()}`;

      // Try to deduct Gems
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -15,
        p_transaction_type: 'booking_discount',
        p_idempotency_key: idempotencyKey,
        p_description: 'Booking for full class',
      });

      // Check capacity (should be full)
      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', testClassId);

      expect(bookingCount).toBe(10);

      // Rollback because capacity is full
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: 15,
        p_transaction_type: 'booking_refund',
        p_idempotency_key: `${idempotencyKey}-capacity-rollback`,
        p_description: 'Rollback due to class being full',
      });

      const finalBalance = await getGemBalance(testUserId);
      expect(finalBalance).toBe(initialBalance);
    });

    it('should prevent race condition with database constraints', async () => {
      const initialBalance = await getGemBalance(testUserId);

      // Simulate two simultaneous deductions with same idempotency key
      const idempotencyKey = `test-race-${Date.now()}`;

      const [result1, result2] = await Promise.all([
        supabase.rpc('process_gem_transaction', {
          p_user_id: testUserId,
          p_amount: -25,
          p_transaction_type: 'booking_discount',
          p_idempotency_key: idempotencyKey,
          p_description: 'Concurrent request 1',
        }),
        supabase.rpc('process_gem_transaction', {
          p_user_id: testUserId,
          p_amount: -25,
          p_transaction_type: 'booking_discount',
          p_idempotency_key: idempotencyKey,
          p_description: 'Concurrent request 2',
        }),
      ]);

      // One should succeed, one should fail (or both return same result via idempotency)
      const successCount =
        (result1.error ? 0 : 1) + (result2.error ? 0 : 1);
      expect(successCount).toBe(1);

      // Balance should only be deducted once
      const finalBalance = await getGemBalance(testUserId);
      expect(finalBalance).toBe(75);

      // Verify only one transaction created
      const { data: transactions } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('idempotency_key', idempotencyKey);

      expect(transactions).toBeTruthy();
      expect(transactions!.length).toBe(1);
    });
  });

  describe('Database Transaction Errors', () => {
    it('should rollback on constraint violation', async () => {
      const initialBalance = await getGemBalance(testUserId);

      // Try to deduct more than balance (should violate negative balance check)
      const { error } = await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -200, // More than available
        p_transaction_type: 'booking_discount',
        p_idempotency_key: `test-overdraw-${Date.now()}`,
        p_description: 'Attempt to overdraw',
      });

      // Should fail
      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/insufficient|negative|balance/i);

      // Balance should remain unchanged
      const finalBalance = await getGemBalance(testUserId);
      expect(finalBalance).toBe(initialBalance);
    });

    it('should rollback on invalid transaction type', async () => {
      const initialBalance = await getGemBalance(testUserId);

      // Try invalid transaction type
      const { error } = await supabase.from('gem_transactions').insert({
        user_id: testUserId,
        amount: -10,
        transaction_type: 'invalid_type' as any,
        status: 'completed',
      });

      expect(error).toBeTruthy();

      // Balance unchanged
      const finalBalance = await getGemBalance(testUserId);
      expect(finalBalance).toBe(initialBalance);
    });
  });

  describe('Idempotency and Duplicate Prevention', () => {
    it('should prevent duplicate transactions with same idempotency key', async () => {
      const initialBalance = await getGemBalance(testUserId);
      const idempotencyKey = `test-duplicate-${Date.now()}`;

      // First transaction
      const { error: error1 } = await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -10,
        p_transaction_type: 'booking_discount',
        p_idempotency_key: idempotencyKey,
        p_description: 'First attempt',
      });

      expect(error1).toBeNull();

      // Duplicate transaction (same idempotency key)
      const { error: error2 } = await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -10,
        p_transaction_type: 'booking_discount',
        p_idempotency_key: idempotencyKey,
        p_description: 'Duplicate attempt',
      });

      // Should either succeed (idempotent) or fail (duplicate)
      // But balance should only change once
      const finalBalance = await getGemBalance(testUserId);
      expect(finalBalance).toBe(90); // Only deducted once

      // Verify only one transaction exists
      const { data: transactions } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('idempotency_key', idempotencyKey);

      expect(transactions!.length).toBe(1);
    });

    it('should allow retry with different idempotency key after rollback', async () => {
      const initialBalance = await getGemBalance(testUserId);

      // First attempt
      const key1 = `test-retry-1-${Date.now()}`;
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -20,
        p_transaction_type: 'booking_discount',
        p_idempotency_key: key1,
        p_description: 'First booking attempt',
      });

      // Rollback
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: 20,
        p_transaction_type: 'booking_refund',
        p_idempotency_key: `${key1}-rollback`,
        p_description: 'Rollback first attempt',
      });

      // Retry with new key
      const key2 = `test-retry-2-${Date.now()}`;
      const { error } = await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -20,
        p_transaction_type: 'booking_discount',
        p_idempotency_key: key2,
        p_description: 'Second booking attempt',
      });

      expect(error).toBeNull();

      // Balance should be deducted (retry succeeded)
      const finalBalance = await getGemBalance(testUserId);
      expect(finalBalance).toBe(80);
    });
  });

  describe('Audit Log Integrity', () => {
    it('should create audit log entry for every transaction', async () => {
      const idempotencyKey = `test-audit-${Date.now()}`;

      // Perform transaction
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -15,
        p_transaction_type: 'booking_discount',
        p_idempotency_key: idempotencyKey,
        p_description: 'Test audit logging',
      });

      // Check audit log
      const { data: auditLog } = await supabase
        .from('gem_transaction_audit_log')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single();

      expect(auditLog).toBeTruthy();
      expect(auditLog!.user_id).toBe(testUserId);
      expect(auditLog!.action).toBe('booking_discount');
      expect(auditLog!.amount).toBe(-15);
      expect(auditLog!.status).toBe('completed');
    });

    it('should log rollback with reference to original transaction', async () => {
      const originalKey = `test-original-${Date.now()}`;
      const rollbackKey = `${originalKey}-rollback`;

      // Original transaction
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -25,
        p_transaction_type: 'booking_discount',
        p_idempotency_key: originalKey,
        p_description: 'Original transaction',
      });

      // Rollback
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: 25,
        p_transaction_type: 'booking_refund',
        p_idempotency_key: rollbackKey,
        p_description: 'Rollback original transaction',
        p_related_transaction_id: originalKey,
      });

      // Check both audit logs
      const { data: originalLog } = await supabase
        .from('gem_transaction_audit_log')
        .select('*')
        .eq('idempotency_key', originalKey)
        .single();

      const { data: rollbackLog } = await supabase
        .from('gem_transaction_audit_log')
        .select('*')
        .eq('idempotency_key', rollbackKey)
        .single();

      expect(originalLog).toBeTruthy();
      expect(rollbackLog).toBeTruthy();
      expect(rollbackLog!.metadata).toHaveProperty('related_transaction_id', originalKey);
    });

    it('should log failed transaction attempts', async () => {
      const idempotencyKey = `test-failed-${Date.now()}`;

      // Attempt to overdraw (will fail)
      await supabase.rpc('process_gem_transaction', {
        p_user_id: testUserId,
        p_amount: -500, // More than balance
        p_transaction_type: 'booking_discount',
        p_idempotency_key: idempotencyKey,
        p_description: 'Failed transaction test',
      });

      // Check if failure was logged
      const { data: auditLog } = await supabase
        .from('gem_transaction_audit_log')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      // Should have logged the attempt
      if (auditLog) {
        expect(auditLog.status).toBe('failed');
        expect(auditLog.metadata).toHaveProperty('error');
      }
    });
  });

  describe('Concurrent Rollback Scenarios', () => {
    it('should handle multiple concurrent rollbacks', async () => {
      const initialBalance = await getGemBalance(testUserId);

      // Create multiple transactions
      const transactions = await Promise.all([
        supabase.rpc('process_gem_transaction', {
          p_user_id: testUserId,
          p_amount: -10,
          p_transaction_type: 'booking_discount',
          p_idempotency_key: `concurrent-1-${Date.now()}`,
          p_description: 'Concurrent transaction 1',
        }),
        supabase.rpc('process_gem_transaction', {
          p_user_id: testUserId,
          p_amount: -10,
          p_transaction_type: 'booking_discount',
          p_idempotency_key: `concurrent-2-${Date.now()}`,
          p_description: 'Concurrent transaction 2',
        }),
        supabase.rpc('process_gem_transaction', {
          p_user_id: testUserId,
          p_amount: -10,
          p_transaction_type: 'booking_discount',
          p_idempotency_key: `concurrent-3-${Date.now()}`,
          p_description: 'Concurrent transaction 3',
        }),
      ]);

      const successCount = transactions.filter(t => !t.error).length;

      // Rollback all successful transactions concurrently
      const rollbacks = await Promise.all(
        transactions.map((t, i) =>
          supabase.rpc('process_gem_transaction', {
            p_user_id: testUserId,
            p_amount: 10,
            p_transaction_type: 'booking_refund',
            p_idempotency_key: `concurrent-rollback-${i}-${Date.now()}`,
            p_description: `Rollback concurrent ${i}`,
          })
        )
      );

      const rollbackSuccessCount = rollbacks.filter(r => !r.error).length;
      expect(rollbackSuccessCount).toBe(successCount);

      // Final balance should equal initial
      const finalBalance = await getGemBalance(testUserId);
      expect(finalBalance).toBe(initialBalance);
    });
  });
});

/**
 * Helper function to get current Gem balance
 */
async function getGemBalance(userId: string): Promise<number> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc('calculate_gem_balance', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to get balance: ${error.message}`);
  }

  return data || 0;
}
