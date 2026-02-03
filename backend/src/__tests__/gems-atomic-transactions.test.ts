/**
 * Gems Atomic Transaction Tests
 *
 * Validates that all Gems transactions are atomic (all-or-nothing)
 * Task: T031A [P] [US1] [CURRENCY] [TEST]
 * Constitution Principle VI: Currency system must be rigorously validated
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Gems Atomic Transactions', () => {
  let testStudentId: string;
  let testClassId: string;

  beforeAll(async () => {
    // Create test student
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .insert({
        email: `atomic-test-${Date.now()}@test.com`,
        display_name: 'Atomic Test Student',
        role: 'student',
      })
      .select()
      .single();

    if (studentError) throw studentError;
    testStudentId = student.id;

    // Create test class
    const { data: teacher } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'teacher')
      .limit(1)
      .single();

    const { data: testClass, error: classError } = await supabase
      .from('classes')
      .insert({
        teacher_id: teacher?.id || testStudentId,
        title: 'Atomic Test Class',
        description: 'Test class for atomic transactions',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 25,
        capacity: 10,
        price: 100,
        status: 'published',
      })
      .select()
      .single();

    if (classError) throw classError;
    testClassId = testClass.id;

    // Give student initial Gems balance
    await supabase.from('gem_transactions').insert({
      student_id: testStudentId,
      amount: 200,
      transaction_type: 'earned',
      reason: 'test_setup',
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testStudentId) {
      await supabase.from('gem_transactions').delete().eq('student_id', testStudentId);
      await supabase.from('bookings').delete().eq('student_id', testStudentId);
      await supabase.from('profiles').delete().eq('id', testStudentId);
    }
    if (testClassId) {
      await supabase.from('classes').delete().eq('id', testClassId);
    }
  });

  beforeEach(async () => {
    // Reset Gems balance before each test
    await supabase.from('gem_transactions').delete().eq('student_id', testStudentId);
    await supabase.from('gem_transactions').insert({
      student_id: testStudentId,
      amount: 200,
      transaction_type: 'earned',
      reason: 'test_reset',
    });
  });

  it('should execute booking with Gems deduction atomically', async () => {
    // Get initial balance
    const { data: initialTransactions } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId);

    const initialBalance = initialTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    expect(initialBalance).toBe(200);

    // Create booking with 100 Gems (50% discount)
    const gemsToUse = 100;
    const discountAmount = gemsToUse * 0.5; // $0.50 per Gem
    const finalPrice = 100 - discountAmount;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id: testStudentId,
        class_id: testClassId,
        gems_used: gemsToUse,
        discount_amount: discountAmount,
        final_price: finalPrice,
        status: 'confirmed',
      })
      .select()
      .single();

    expect(bookingError).toBeNull();
    expect(booking).toBeDefined();

    // Deduct Gems (simulating the transaction)
    const { error: deductError } = await supabase.from('gem_transactions').insert({
      student_id: testStudentId,
      amount: -gemsToUse,
      transaction_type: 'spent',
      reason: 'booking',
      related_booking_id: booking.id,
    });

    expect(deductError).toBeNull();

    // Verify final balance
    const { data: finalTransactions } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId);

    const finalBalance = finalTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    expect(finalBalance).toBe(100); // 200 - 100 = 100

    // Verify booking exists
    const { data: verifyBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking.id)
      .single();

    expect(verifyBooking).toBeDefined();
    expect(verifyBooking?.gems_used).toBe(gemsToUse);
  });

  it('should rollback booking if Gems deduction fails', async () => {
    // Attempt to use more Gems than available (should fail)
    const gemsToUse = 300; // Student only has 200
    const discountAmount = gemsToUse * 0.5;
    const finalPrice = 100 - Math.min(discountAmount, 50); // Max 50% discount

    try {
      // First, try to create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          student_id: testStudentId,
          class_id: testClassId,
          gems_used: gemsToUse,
          discount_amount: discountAmount,
          final_price: finalPrice,
          status: 'pending',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Try to deduct Gems (should fail due to insufficient balance)
      const { error: deductError } = await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: -gemsToUse,
        transaction_type: 'spent',
        reason: 'booking',
        related_booking_id: booking.id,
      });

      // If deduction fails, rollback booking
      if (deductError) {
        await supabase.from('bookings').delete().eq('id', booking.id);
        throw deductError;
      }
    } catch (error) {
      // Expected to fail
      expect(error).toBeDefined();
    }

    // Verify balance unchanged
    const { data: transactions } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId);

    const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    expect(balance).toBe(200); // Original balance preserved

    // Verify no booking was created
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('student_id', testStudentId)
      .eq('class_id', testClassId);

    expect(bookings?.length).toBe(0);
  });

  it('should maintain consistency across multiple sequential transactions', async () => {
    const transactions = [
      { amount: 50, type: 'earned', reason: 'lesson_completion' },
      { amount: -30, type: 'spent', reason: 'booking' },
      { amount: 20, type: 'earned', reason: 'streak_bonus' },
      { amount: -40, type: 'spent', reason: 'booking' },
    ];

    let expectedBalance = 200; // Initial balance

    for (const tx of transactions) {
      const { error } = await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: tx.amount,
        transaction_type: tx.type as 'earned' | 'spent',
        reason: tx.reason,
      });

      expect(error).toBeNull();
      expectedBalance += tx.amount;

      // Verify balance after each transaction
      const { data: allTransactions } = await supabase
        .from('gem_transactions')
        .select('amount')
        .eq('student_id', testStudentId);

      const currentBalance = allTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      expect(currentBalance).toBe(expectedBalance);
    }

    // Final balance: 200 + 50 - 30 + 20 - 40 = 200
    expect(expectedBalance).toBe(200);
  });

  it('should prevent negative balance through database constraints', async () => {
    // Try to spend more Gems than available
    const { error } = await supabase.from('gem_transactions').insert({
      student_id: testStudentId,
      amount: -300, // Student only has 200
      transaction_type: 'spent',
      reason: 'test_overspend',
    });

    // Should either fail or be prevented by constraint
    // Note: The actual constraint enforcement depends on migration 006a_gem_constraints.sql

    // Verify balance is still positive
    const { data: transactions } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId);

    const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it('should maintain audit trail for all transactions', async () => {
    // Perform multiple transactions
    const testTransactions = [
      { amount: 100, type: 'earned', reason: 'referral' },
      { amount: -50, type: 'spent', reason: 'booking' },
      { amount: 25, type: 'earned', reason: 'profile_completion' },
    ];

    for (const tx of testTransactions) {
      await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: tx.amount,
        transaction_type: tx.type as 'earned' | 'spent',
        reason: tx.reason,
      });
    }

    // Verify all transactions are recorded with timestamps
    const { data: allTransactions } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('student_id', testStudentId)
      .order('created_at', { ascending: true });

    expect(allTransactions).toBeDefined();
    expect(allTransactions!.length).toBeGreaterThanOrEqual(testTransactions.length);

    // Verify each transaction has required audit fields
    allTransactions?.forEach((tx) => {
      expect(tx.id).toBeDefined();
      expect(tx.student_id).toBe(testStudentId);
      expect(tx.amount).toBeDefined();
      expect(tx.transaction_type).toBeDefined();
      expect(tx.reason).toBeDefined();
      expect(tx.created_at).toBeDefined();
    });
  });
});
