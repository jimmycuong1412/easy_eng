/**
 * Stress Test: Concurrent Rollback Operations
 * Task: T139D [P] [CURRENCY] [TEST]
 *
 * Purpose: Stress test the Gem system under high concurrency with rollbacks:
 * - Multiple users performing simultaneous transactions
 * - High-frequency rollback operations
 * - Database lock contention
 * - Race condition detection
 * - System stability under load
 *
 * Constitution Principle VI: Currency system integrity
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Stress test configuration
const CONFIG = {
  CONCURRENT_USERS: 50, // Number of simultaneous users
  TRANSACTIONS_PER_USER: 10, // Number of transactions each user will attempt
  ROLLBACK_PERCENTAGE: 0.5, // 50% of transactions will be rolled back
  MAX_TIMEOUT: 30000, // 30 second timeout for stress tests
};

describe('Concurrent Rollback Stress Tests', () => {
  let supabase: SupabaseClient;
  let testUserIds: string[] = [];
  let testClassId: string;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create multiple test users
    console.log(`Creating ${CONFIG.CONCURRENT_USERS} test users...`);
    for (let i = 0; i < CONFIG.CONCURRENT_USERS; i++) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: `stress-test-user-${i}-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      if (!error && data.user) {
        testUserIds.push(data.user.id);

        // Grant initial Gems
        await supabase.from('gem_transactions').insert({
          user_id: data.user.id,
          amount: 1000,
          transaction_type: 'admin_grant',
          status: 'completed',
          description: 'Initial stress test balance',
        });
      }
    }

    console.log(`Created ${testUserIds.length} test users`);

    // Create test class
    const { data: classData } = await supabase
      .from('classes')
      .insert({
        title: 'Stress Test Class',
        description: 'Class for concurrent rollback testing',
        price: 1000,
        max_capacity: 100,
        teacher_id: testUserIds[0],
      })
      .select()
      .single();

    testClassId = classData!.id;
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    console.log('Cleaning up test data...');

    // Delete all test user data
    for (const userId of testUserIds) {
      await supabase.from('bookings').delete().eq('user_id', userId);
      await supabase.from('gem_transactions').delete().eq('user_id', userId);
      await supabase.auth.admin.deleteUser(userId);
    }

    // Delete test class
    await supabase.from('classes').delete().eq('id', testClassId);

    console.log('Cleanup complete');
  }, 60000);

  it(
    'should handle high-volume concurrent deductions and rollbacks',
    async () => {
      console.log(
        `Starting stress test: ${CONFIG.CONCURRENT_USERS} users × ${CONFIG.TRANSACTIONS_PER_USER} transactions`
      );

      const startTime = Date.now();
      const results = {
        successful: 0,
        failed: 0,
        rolledBack: 0,
        errors: [] as string[],
      };

      // Execute concurrent transactions
      const allTransactions = testUserIds.flatMap(userId =>
        Array.from({ length: CONFIG.TRANSACTIONS_PER_USER }, (_, i) => ({
          userId,
          index: i,
          shouldRollback: Math.random() < CONFIG.ROLLBACK_PERCENTAGE,
        }))
      );

      console.log(`Total transactions to process: ${allTransactions.length}`);

      // Process all transactions concurrently
      await Promise.all(
        allTransactions.map(async ({ userId, index, shouldRollback }) => {
          const idempotencyKey = `stress-${userId}-${index}-${Date.now()}`;

          try {
            // Deduct Gems
            const { error: deductError } = await supabase.rpc('process_gem_transaction', {
              p_user_id: userId,
              p_amount: -10,
              p_transaction_type: 'booking_discount',
              p_idempotency_key: idempotencyKey,
              p_description: `Stress test transaction ${index}`,
            });

            if (deductError) {
              results.failed++;
              results.errors.push(`Deduction failed: ${deductError.message}`);
              return;
            }

            results.successful++;

            // Rollback if flagged
            if (shouldRollback) {
              const { error: rollbackError } = await supabase.rpc(
                'process_gem_transaction',
                {
                  p_user_id: userId,
                  p_amount: 10,
                  p_transaction_type: 'booking_refund',
                  p_idempotency_key: `${idempotencyKey}-rollback`,
                  p_description: `Rollback stress test ${index}`,
                }
              );

              if (rollbackError) {
                results.errors.push(`Rollback failed: ${rollbackError.message}`);
              } else {
                results.rolledBack++;
              }
            }
          } catch (err) {
            results.failed++;
            results.errors.push(`Exception: ${(err as Error).message}`);
          }
        })
      );

      const duration = Date.now() - startTime;

      console.log(`Stress test completed in ${duration}ms`);
      console.log(`Results:`, results);

      // Verify results
      expect(results.successful).toBeGreaterThan(0);
      expect(results.errors.length).toBeLessThan(allTransactions.length * 0.1); // < 10% error rate

      // Verify all user balances are consistent
      const balanceChecks = await Promise.all(
        testUserIds.map(async userId => {
          const balance = await getGemBalance(userId);
          const expectedDeductions =
            CONFIG.TRANSACTIONS_PER_USER * (1 - CONFIG.ROLLBACK_PERCENTAGE);
          const expectedBalance = 1000 - expectedDeductions * 10;

          // Allow some tolerance due to concurrency
          const tolerance = 50;
          return Math.abs(balance - expectedBalance) <= tolerance;
        })
      );

      const consistentBalances = balanceChecks.filter(Boolean).length;
      expect(consistentBalances).toBeGreaterThan(testUserIds.length * 0.9); // 90% consistency
    },
    CONFIG.MAX_TIMEOUT
  );

  it(
    'should prevent double-spending under concurrent load',
    async () => {
      const testUser = testUserIds[0];
      const initialBalance = await getGemBalance(testUser);

      console.log(`Testing double-spend prevention with balance: ${initialBalance}`);

      // Attempt the same transaction 100 times concurrently (same idempotency key)
      const idempotencyKey = `double-spend-test-${Date.now()}`;
      const attempts = 100;

      const results = await Promise.all(
        Array.from({ length: attempts }, () =>
          supabase.rpc('process_gem_transaction', {
            p_user_id: testUser,
            p_amount: -50,
            p_transaction_type: 'booking_discount',
            p_idempotency_key: idempotencyKey,
            p_description: 'Double-spend prevention test',
          })
        )
      );

      const successCount = results.filter(r => !r.error).length;
      console.log(`${successCount} out of ${attempts} attempts succeeded`);

      // Only ONE should actually deduct (idempotency)
      const finalBalance = await getGemBalance(testUser);
      const actualDeduction = initialBalance - finalBalance;

      expect(actualDeduction).toBe(50); // Exactly one deduction

      // Verify only one transaction record
      const { data: transactions } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('idempotency_key', idempotencyKey);

      expect(transactions).toBeTruthy();
      expect(transactions!.length).toBe(1);

      console.log('Double-spend prevention verified');
    },
    CONFIG.MAX_TIMEOUT
  );

  it(
    'should maintain consistency with rapid rollbacks',
    async () => {
      const testUser = testUserIds[1];
      const initialBalance = await getGemBalance(testUser);

      console.log('Testing rapid rollback consistency...');

      // Perform 50 deduction-rollback pairs rapidly
      const operations = 50;
      const results: Array<{ deduct: boolean; rollback: boolean }> = [];

      for (let i = 0; i < operations; i++) {
        const key = `rapid-rollback-${i}-${Date.now()}`;

        // Deduct
        const { error: deductError } = await supabase.rpc('process_gem_transaction', {
          p_user_id: testUser,
          p_amount: -20,
          p_transaction_type: 'booking_discount',
          p_idempotency_key: key,
          p_description: `Rapid test ${i}`,
        });

        // Immediate rollback
        const { error: rollbackError } = await supabase.rpc('process_gem_transaction', {
          p_user_id: testUser,
          p_amount: 20,
          p_transaction_type: 'booking_refund',
          p_idempotency_key: `${key}-rollback`,
          p_description: `Rapid rollback ${i}`,
        });

        results.push({
          deduct: !deductError,
          rollback: !rollbackError,
        });
      }

      const successfulPairs = results.filter(r => r.deduct && r.rollback).length;
      console.log(`Completed ${successfulPairs} deduction-rollback pairs`);

      // Balance should be unchanged
      const finalBalance = await getGemBalance(testUser);
      expect(finalBalance).toBe(initialBalance);

      expect(successfulPairs).toBeGreaterThan(operations * 0.95); // 95% success rate
    },
    CONFIG.MAX_TIMEOUT
  );

  it(
    'should handle database lock contention gracefully',
    async () => {
      // Use single user to maximize lock contention
      const testUser = testUserIds[2];
      const initialBalance = await getGemBalance(testUser);

      console.log('Testing database lock handling...');

      // Fire 200 transactions at the same user simultaneously
      const concurrentOps = 200;

      const results = await Promise.all(
        Array.from({ length: concurrentOps }, (_, i) =>
          supabase.rpc('process_gem_transaction', {
            p_user_id: testUser,
            p_amount: -5,
            p_transaction_type: 'booking_discount',
            p_idempotency_key: `lock-test-${i}-${Date.now()}`,
            p_description: `Lock contention test ${i}`,
          })
        )
      );

      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;

      console.log(`Successful: ${successCount}, Failed: ${errorCount}`);

      // Some may fail due to locks, but system should remain consistent
      const finalBalance = await getGemBalance(testUser);
      const expectedBalance = initialBalance - successCount * 5;

      expect(finalBalance).toBe(expectedBalance);

      // Verify no transactions were lost
      const { data: transactions } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('user_id', testUser)
        .ilike('description', 'Lock contention test%');

      expect(transactions!.length).toBe(successCount);
    },
    CONFIG.MAX_TIMEOUT
  );

  it(
    'should maintain audit log integrity under stress',
    async () => {
      const testUser = testUserIds[3];

      console.log('Testing audit log integrity under load...');

      const operations = 100;
      const transactionKeys: string[] = [];

      // Perform many transactions
      await Promise.all(
        Array.from({ length: operations }, async (_, i) => {
          const key = `audit-stress-${i}-${Date.now()}`;
          transactionKeys.push(key);

          await supabase.rpc('process_gem_transaction', {
            p_user_id: testUser,
            p_amount: -3,
            p_transaction_type: 'booking_discount',
            p_idempotency_key: key,
            p_description: `Audit test ${i}`,
          });

          // Random rollbacks
          if (Math.random() < 0.3) {
            await supabase.rpc('process_gem_transaction', {
              p_user_id: testUser,
              p_amount: 3,
              p_transaction_type: 'booking_refund',
              p_idempotency_key: `${key}-rollback`,
              p_description: `Audit rollback ${i}`,
            });
          }
        })
      );

      // Verify audit log has entries for all transactions
      const { data: auditLogs, count } = await supabase
        .from('gem_transaction_audit_log')
        .select('*', { count: 'exact' })
        .eq('user_id', testUser)
        .ilike('action', '%booking%');

      console.log(`Audit log entries: ${count}`);
      expect(count).toBeGreaterThan(operations); // At least one per transaction
    },
    CONFIG.MAX_TIMEOUT
  );

  it(
    'should recover from partial failures',
    async () => {
      console.log('Testing partial failure recovery...');

      // Simulate scenario where some operations fail mid-transaction
      const testUser = testUserIds[4];
      const initialBalance = await getGemBalance(testUser);

      const operations = 50;
      const results = {
        success: 0,
        failed: 0,
        partialFailure: 0,
      };

      await Promise.all(
        Array.from({ length: operations }, async (_, i) => {
          const key = `partial-fail-${i}-${Date.now()}`;

          try {
            // Deduct
            const { error: deductError } = await supabase.rpc('process_gem_transaction', {
              p_user_id: testUser,
              p_amount: -15,
              p_transaction_type: 'booking_discount',
              p_idempotency_key: key,
              p_description: `Partial failure test ${i}`,
            });

            if (deductError) {
              results.failed++;
              return;
            }

            // Simulate random failures before rollback
            if (Math.random() < 0.2) {
              // 20% chance of partial failure
              results.partialFailure++;
              // Don't rollback - simulate system crash
              return;
            }

            // Normal rollback
            const { error: rollbackError } = await supabase.rpc('process_gem_transaction', {
              p_user_id: testUser,
              p_amount: 15,
              p_transaction_type: 'booking_refund',
              p_idempotency_key: `${key}-rollback`,
              p_description: `Recovery rollback ${i}`,
            });

            if (!rollbackError) {
              results.success++;
            }
          } catch (err) {
            results.failed++;
          }
        })
      );

      console.log('Partial failure results:', results);

      // Verify system is still consistent
      const finalBalance = await getGemBalance(testUser);
      const isConsistent = finalBalance >= 0 && finalBalance <= initialBalance;

      expect(isConsistent).toBe(true);

      // All transactions should be in audit log
      const { count } = await supabase
        .from('gem_transaction_audit_log')
        .select('*', { count: 'exact' })
        .eq('user_id', testUser)
        .ilike('description', 'Partial failure test%');

      expect(count).toBeGreaterThan(0);
    },
    CONFIG.MAX_TIMEOUT
  );

  it(
    'should handle mixed transaction types concurrently',
    async () => {
      console.log('Testing mixed concurrent transaction types...');

      const testUser = testUserIds[5];
      const initialBalance = await getGemBalance(testUser);

      // Mix of different transaction types
      const mixedOps = [
        ...Array(30).fill('booking_discount'),
        ...Array(20).fill('class_reward'),
        ...Array(15).fill('referral_bonus'),
        ...Array(25).fill('admin_grant'),
        ...Array(10).fill('purchase'),
      ];

      const results = await Promise.all(
        mixedOps.map(async (type, i) => {
          const amount = type === 'booking_discount' || type === 'purchase' ? -10 : 10;
          const key = `mixed-${type}-${i}-${Date.now()}`;

          return supabase.rpc('process_gem_transaction', {
            p_user_id: testUser,
            p_amount: amount,
            p_transaction_type: type,
            p_idempotency_key: key,
            p_description: `Mixed test ${type} ${i}`,
          });
        })
      );

      const successCount = results.filter(r => !r.error).length;
      console.log(`Mixed operations: ${successCount}/${mixedOps.length} successful`);

      // Verify balance is consistent
      const finalBalance = await getGemBalance(testUser);
      expect(typeof finalBalance).toBe('number');
      expect(finalBalance).toBeGreaterThanOrEqual(0);

      // Verify audit log has all transaction types
      const { data: auditLogs } = await supabase
        .from('gem_transaction_audit_log')
        .select('action')
        .eq('user_id', testUser);

      const uniqueTypes = new Set(auditLogs?.map(log => log.action) || []);
      expect(uniqueTypes.size).toBeGreaterThan(3); // Multiple transaction types logged
    },
    CONFIG.MAX_TIMEOUT
  );
});

/**
 * Helper: Get Gem balance
 */
async function getGemBalance(userId: string): Promise<number> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc('calculate_gem_balance', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Failed to get balance:', error);
    return 0;
  }

  return data || 0;
}
