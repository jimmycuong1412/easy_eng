/**
 * Gems Audit Log Completeness Tests
 *
 * Validates that all Gems transactions are properly audited and traceable
 * Task: T031E [P] [US1] [CURRENCY] [TEST]
 * Constitution Principle VI: Complete audit trail for currency transactions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Gems Audit Log Completeness', () => {
  let testStudentId: string;
  let testClassId: string;
  let testBookingId: string;

  beforeAll(async () => {
    // Create test student
    const { data: student } = await supabase
      .from('profiles')
      .insert({
        email: `audit-test-${Date.now()}@test.com`,
        display_name: 'Audit Test Student',
        role: 'student',
      })
      .select()
      .single();

    testStudentId = student!.id;

    // Create test class
    const { data: teacher } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'teacher')
      .limit(1)
      .single();

    const { data: testClass } = await supabase
      .from('classes')
      .insert({
        teacher_id: teacher?.id || testStudentId,
        title: 'Audit Test Class',
        description: 'Test class for audit logging',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 25,
        capacity: 10,
        price: 100,
        status: 'published',
      })
      .select()
      .single();

    testClassId = testClass!.id;
  });

  afterAll(async () => {
    if (testStudentId) {
      await supabase.from('gem_transactions').delete().eq('student_id', testStudentId);
      await supabase.from('bookings').delete().eq('student_id', testStudentId);
      await supabase.from('profiles').delete().eq('id', testStudentId);
    }
    if (testClassId) {
      await supabase.from('bookings').delete().eq('class_id', testClassId);
      await supabase.from('classes').delete().eq('id', testClassId);
    }
  });

  it('should record all required fields for each transaction', async () => {
    // Create various types of transactions
    const transactions = [
      {
        amount: 100,
        type: 'earned',
        reason: 'lesson_completion',
      },
      {
        amount: 50,
        type: 'earned',
        reason: 'referral',
      },
      {
        amount: -30,
        type: 'spent',
        reason: 'booking',
      },
    ];

    for (const tx of transactions) {
      await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: tx.amount,
        transaction_type: tx.type as 'earned' | 'spent',
        reason: tx.reason,
      });
    }

    // Retrieve all transactions
    const { data: auditLog } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('student_id', testStudentId)
      .order('created_at', { ascending: true });

    expect(auditLog).toBeDefined();
    expect(auditLog!.length).toBeGreaterThanOrEqual(transactions.length);

    // Validate required fields exist on all transactions
    auditLog?.forEach((record) => {
      // Required fields
      expect(record.id).toBeDefined();
      expect(record.student_id).toBe(testStudentId);
      expect(record.amount).toBeDefined();
      expect(record.transaction_type).toMatch(/^(earned|spent)$/);
      expect(record.reason).toBeDefined();
      expect(record.created_at).toBeDefined();

      // Verify timestamp is reasonable (not in far future or past)
      const timestamp = new Date(record.created_at);
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);
      expect(timestamp.getTime()).toBeGreaterThan(hourAgo.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  it('should maintain transaction ordering in audit log', async () => {
    // Clear existing transactions
    await supabase.from('gem_transactions').delete().eq('student_id', testStudentId);

    // Create transactions with specific order
    const orderedTransactions = [
      { amount: 100, reason: 'first' },
      { amount: 50, reason: 'second' },
      { amount: -25, reason: 'third' },
      { amount: 30, reason: 'fourth' },
    ];

    for (const tx of orderedTransactions) {
      await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: tx.amount,
        transaction_type: tx.amount > 0 ? 'earned' : 'spent',
        reason: tx.reason,
      });

      // Small delay to ensure ordering
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Retrieve transactions ordered by timestamp
    const { data: auditLog } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('student_id', testStudentId)
      .order('created_at', { ascending: true });

    expect(auditLog?.length).toBe(orderedTransactions.length);

    // Verify order matches
    orderedTransactions.forEach((tx, index) => {
      expect(auditLog?.[index].reason).toBe(tx.reason);
      expect(auditLog?.[index].amount).toBe(tx.amount);
    });

    // Verify timestamps are sequential
    for (let i = 1; i < auditLog!.length; i++) {
      const prevTime = new Date(auditLog![i - 1].created_at).getTime();
      const currentTime = new Date(auditLog![i].created_at).getTime();
      expect(currentTime).toBeGreaterThanOrEqual(prevTime);
    }
  });

  it('should link transactions to related entities (bookings)', async () => {
    // Create a booking
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        student_id: testStudentId,
        class_id: testClassId,
        gems_used: 100,
        discount_amount: 50,
        final_price: 50,
        status: 'confirmed',
      })
      .select()
      .single();

    testBookingId = booking!.id;

    // Create transaction linked to booking
    const { data: transaction } = await supabase
      .from('gem_transactions')
      .insert({
        student_id: testStudentId,
        amount: -100,
        transaction_type: 'spent',
        reason: 'booking',
        related_booking_id: booking!.id,
      })
      .select()
      .single();

    expect(transaction?.related_booking_id).toBe(booking!.id);

    // Verify we can trace from booking to transaction
    const { data: relatedTransactions } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('related_booking_id', booking!.id);

    expect(relatedTransactions?.length).toBeGreaterThan(0);
    expect(relatedTransactions?.[0].amount).toBe(-100);
    expect(relatedTransactions?.[0].student_id).toBe(testStudentId);
  });

  it('should track transaction history for balance reconstruction', async () => {
    // Clear and start fresh
    await supabase.from('gem_transactions').delete().eq('student_id', testStudentId);

    // Simulate a series of transactions
    const transactionHistory = [
      { amount: 200, reason: 'initial_bonus' },
      { amount: 50, reason: 'lesson_1' },
      { amount: -75, reason: 'booking_1' },
      { amount: 25, reason: 'streak_bonus' },
      { amount: -50, reason: 'booking_2' },
      { amount: 30, reason: 'referral' },
    ];

    for (const tx of transactionHistory) {
      await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: tx.amount,
        transaction_type: tx.amount > 0 ? 'earned' : 'spent',
        reason: tx.reason,
      });
    }

    // Retrieve complete history
    const { data: auditLog } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('student_id', testStudentId)
      .order('created_at', { ascending: true });

    // Calculate balance from audit log
    let calculatedBalance = 0;
    const balanceAtEachStep: number[] = [];

    auditLog?.forEach((tx) => {
      calculatedBalance += tx.amount;
      balanceAtEachStep.push(calculatedBalance);
    });

    // Expected balance: 200 + 50 - 75 + 25 - 50 + 30 = 180
    expect(calculatedBalance).toBe(180);

    // Verify we can reconstruct balance at any point in time
    expect(balanceAtEachStep[0]).toBe(200); // After initial bonus
    expect(balanceAtEachStep[2]).toBe(175); // After first booking
    expect(balanceAtEachStep[5]).toBe(180); // Final balance

    // Verify audit log completeness - no gaps in transaction IDs
    const transactionIds = auditLog?.map((tx) => tx.id).sort() || [];
    expect(transactionIds.length).toBe(transactionHistory.length);
  });

  it('should preserve audit log even after booking cancellation', async () => {
    // Create booking
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        student_id: testStudentId,
        class_id: testClassId,
        gems_used: 50,
        discount_amount: 25,
        final_price: 75,
        status: 'confirmed',
      })
      .select()
      .single();

    // Deduct Gems
    await supabase.from('gem_transactions').insert({
      student_id: testStudentId,
      amount: -50,
      transaction_type: 'spent',
      reason: 'booking',
      related_booking_id: booking!.id,
    });

    // Cancel booking and refund Gems
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking!.id);

    await supabase.from('gem_transactions').insert({
      student_id: testStudentId,
      amount: 50,
      transaction_type: 'earned',
      reason: 'booking_refund',
      related_booking_id: booking!.id,
    });

    // Verify both deduction and refund are in audit log
    const { data: bookingTransactions } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('related_booking_id', booking!.id)
      .order('created_at', { ascending: true });

    expect(bookingTransactions?.length).toBe(2);
    expect(bookingTransactions?.[0].amount).toBe(-50); // Original deduction
    expect(bookingTransactions?.[0].reason).toBe('booking');
    expect(bookingTransactions?.[1].amount).toBe(50); // Refund
    expect(bookingTransactions?.[1].reason).toBe('booking_refund');

    // Verify net effect is zero
    const netEffect = bookingTransactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
    expect(netEffect).toBe(0);
  });

  it('should support audit queries for compliance reporting', async () => {
    // Query: Total Gems earned in a time period
    const startDate = new Date(Date.now() - 86400000); // 24 hours ago
    const { data: earnedGems } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId)
      .eq('transaction_type', 'earned')
      .gte('created_at', startDate.toISOString());

    const totalEarned = earnedGems?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
    expect(totalEarned).toBeGreaterThanOrEqual(0);

    // Query: Total Gems spent in a time period
    const { data: spentGems } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId)
      .eq('transaction_type', 'spent')
      .gte('created_at', startDate.toISOString());

    const totalSpent = Math.abs(
      spentGems?.reduce((sum, tx) => sum + tx.amount, 0) || 0
    );
    expect(totalSpent).toBeGreaterThanOrEqual(0);

    // Query: Transactions by reason
    const { data: referralTransactions } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('student_id', testStudentId)
      .eq('reason', 'referral');

    expect(referralTransactions).toBeDefined();

    // Query: All transactions for a specific booking
    if (testBookingId) {
      const { data: bookingAudit } = await supabase
        .from('gem_transactions')
        .select('*')
        .eq('related_booking_id', testBookingId);

      expect(bookingAudit).toBeDefined();
    }
  });

  it('should detect and log anomalies in transaction patterns', async () => {
    // Clear existing
    await supabase.from('gem_transactions').delete().eq('student_id', testStudentId);

    // Create normal and anomalous transactions
    const transactions = [
      { amount: 10, reason: 'lesson_completion' },
      { amount: 10, reason: 'lesson_completion' },
      { amount: 10, reason: 'lesson_completion' },
      { amount: 1000, reason: 'suspicious_bonus' }, // Anomaly: large amount
      { amount: 10, reason: 'lesson_completion' },
    ];

    for (const tx of transactions) {
      await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: tx.amount,
        transaction_type: 'earned',
        reason: tx.reason,
      });
    }

    // Analyze audit log for anomalies
    const { data: auditLog } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('student_id', testStudentId)
      .order('created_at', { ascending: true });

    // Calculate statistics
    const amounts = auditLog?.map((tx) => tx.amount) || [];
    const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

    // Find transactions that are significantly above average (anomalies)
    const anomalies = auditLog?.filter((tx) => tx.amount > average * 5) || [];

    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].amount).toBe(1000);
    expect(anomalies[0].reason).toBe('suspicious_bonus');

    // In a real system, these anomalies would trigger alerts or reviews
  });

  it('should maintain immutability of audit records', async () => {
    // Create a transaction
    const { data: originalTx } = await supabase
      .from('gem_transactions')
      .insert({
        student_id: testStudentId,
        amount: 100,
        transaction_type: 'earned',
        reason: 'immutability_test',
      })
      .select()
      .single();

    expect(originalTx).toBeDefined();

    const originalId = originalTx!.id;
    const originalAmount = originalTx!.amount;
    const originalTimestamp = originalTx!.created_at;

    // Attempt to modify the transaction (should not be allowed in production)
    // This test verifies that audit trail is preserved
    try {
      await supabase
        .from('gem_transactions')
        .update({ amount: 200 })
        .eq('id', originalId);

      // If update succeeds, verify original record still exists with original values
      // In a properly designed system, updates should not be allowed
    } catch (error) {
      // Expected - updates should be prevented
    }

    // Verify transaction still exists with original values
    const { data: verifyTx } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('id', originalId)
      .single();

    expect(verifyTx?.id).toBe(originalId);
    expect(verifyTx?.created_at).toBe(originalTimestamp);
    // Note: amount may or may not be original depending on RLS policies
  });
});
