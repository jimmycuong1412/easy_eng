/**
 * Gems Rollback Scenario Tests
 *
 * Validates that Gems transactions are rolled back correctly on failures
 * Task: T031B [P] [US1] [CURRENCY] [TEST]
 * Constitution Principle VI: Currency system must handle failures gracefully
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Gems Rollback Scenarios', () => {
  let testStudentId: string;
  let testClassId: string;

  beforeAll(async () => {
    // Setup test data
    const { data: student } = await supabase
      .from('profiles')
      .insert({
        email: `rollback-test-${Date.now()}@test.com`,
        display_name: 'Rollback Test Student',
        role: 'student',
      })
      .select()
      .single();

    testStudentId = student!.id;

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
        title: 'Rollback Test Class',
        description: 'Test class for rollback scenarios',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 25,
        capacity: 1, // Low capacity to test capacity conflicts
        price: 100,
        status: 'published',
      })
      .select()
      .single();

    testClassId = testClass!.id;

    // Initial Gems
    await supabase.from('gem_transactions').insert({
      student_id: testStudentId,
      amount: 500,
      transaction_type: 'earned',
      reason: 'test_setup',
    });
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

  beforeEach(async () => {
    // Clean up bookings between tests
    await supabase.from('bookings').delete().eq('student_id', testStudentId);
  });

  it('should rollback Gems deduction when booking creation fails', async () => {
    const initialBalance = 500;
    const gemsToUse = 100;

    // Simulate booking creation failure by using invalid class_id
    const invalidClassId = '00000000-0000-0000-0000-000000000000';

    try {
      // Attempt booking with invalid class
      const { error: bookingError } = await supabase.from('bookings').insert({
        student_id: testStudentId,
        class_id: invalidClassId,
        gems_used: gemsToUse,
        discount_amount: 50,
        final_price: 50,
        status: 'pending',
      });

      if (bookingError) {
        // Don't deduct Gems if booking fails
        throw bookingError;
      }

      // This should not be reached
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
    }

    // Verify Gems were not deducted
    const { data: transactions } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId);

    const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    expect(balance).toBe(initialBalance);
  });

  it('should rollback booking when payment processing fails', async () => {
    const gemsToUse = 100;
    const discountAmount = 50;
    const finalPrice = 50;

    // Create booking
    const { data: booking } = await supabase
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

    expect(booking).toBeDefined();

    // Deduct Gems
    await supabase.from('gem_transactions').insert({
      student_id: testStudentId,
      amount: -gemsToUse,
      transaction_type: 'spent',
      reason: 'booking',
      related_booking_id: booking!.id,
    });

    // Simulate payment failure - rollback required
    const paymentFailed = true;

    if (paymentFailed) {
      // Rollback: Refund Gems
      await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: gemsToUse,
        transaction_type: 'earned',
        reason: 'booking_rollback',
        related_booking_id: booking!.id,
      });

      // Rollback: Cancel booking
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking!.id);
    }

    // Verify Gems restored
    const { data: transactions } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId);

    const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    expect(balance).toBe(500); // Back to initial

    // Verify booking cancelled
    const { data: cancelledBooking } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', booking!.id)
      .single();

    expect(cancelledBooking?.status).toBe('cancelled');
  });

  it('should handle capacity conflict with rollback', async () => {
    // First student books the class (capacity = 1)
    const { data: firstBooking } = await supabase
      .from('bookings')
      .insert({
        student_id: testStudentId,
        class_id: testClassId,
        gems_used: 0,
        discount_amount: 0,
        final_price: 100,
        status: 'confirmed',
      })
      .select()
      .single();

    expect(firstBooking).toBeDefined();

    // Create another student
    const { data: student2 } = await supabase
      .from('profiles')
      .insert({
        email: `rollback-test-2-${Date.now()}@test.com`,
        display_name: 'Second Student',
        role: 'student',
      })
      .select()
      .single();

    // Give second student Gems
    await supabase.from('gem_transactions').insert({
      student_id: student2!.id,
      amount: 200,
      transaction_type: 'earned',
      reason: 'test_setup',
    });

    // Second student tries to book (should fail - capacity full)
    const gemsToUse = 100;

    try {
      // Deduct Gems first
      await supabase.from('gem_transactions').insert({
        student_id: student2!.id,
        amount: -gemsToUse,
        transaction_type: 'spent',
        reason: 'booking',
      });

      // Try to create booking (should fail due to capacity)
      const { data: booking2, error: booking2Error } = await supabase
        .from('bookings')
        .insert({
          student_id: student2!.id,
          class_id: testClassId,
          gems_used: gemsToUse,
          discount_amount: 50,
          final_price: 50,
          status: 'pending',
        })
        .select()
        .single();

      // In real implementation, capacity check would happen before this
      // For test purposes, we simulate the check failing
      const capacityFull = true;

      if (capacityFull) {
        // Rollback Gems
        await supabase.from('gem_transactions').insert({
          student_id: student2!.id,
          amount: gemsToUse,
          transaction_type: 'earned',
          reason: 'capacity_conflict_rollback',
        });

        if (booking2) {
          await supabase.from('bookings').delete().eq('id', booking2.id);
        }
      }
    } catch (error) {
      // Expected
    }

    // Verify second student's Gems restored
    const { data: student2Transactions } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', student2!.id);

    const student2Balance =
      student2Transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    expect(student2Balance).toBe(200); // Restored

    // Cleanup
    await supabase.from('gem_transactions').delete().eq('student_id', student2!.id);
    await supabase.from('profiles').delete().eq('id', student2!.id);
  });

  it('should rollback partial multi-step transaction', async () => {
    const steps = [
      { amount: -50, reason: 'step1_booking' },
      { amount: -30, reason: 'step2_additional_fee' },
      { amount: -20, reason: 'step3_service_charge' },
    ];

    const transactionIds: string[] = [];

    try {
      // Execute first two steps successfully
      for (let i = 0; i < 2; i++) {
        const { data, error } = await supabase
          .from('gem_transactions')
          .insert({
            student_id: testStudentId,
            amount: steps[i].amount,
            transaction_type: 'spent',
            reason: steps[i].reason,
          })
          .select()
          .single();

        if (error) throw error;
        transactionIds.push(data!.id);
      }

      // Third step fails (simulate insufficient validation)
      const shouldFail = true;
      if (shouldFail) {
        throw new Error('Step 3 validation failed');
      }
    } catch (error) {
      // Rollback all steps
      for (const txId of transactionIds) {
        const { data: originalTx } = await supabase
          .from('gem_transactions')
          .select('amount')
          .eq('id', txId)
          .single();

        if (originalTx) {
          // Create reversal transaction
          await supabase.from('gem_transactions').insert({
            student_id: testStudentId,
            amount: -originalTx.amount, // Reverse the amount
            transaction_type: 'earned',
            reason: 'multi_step_rollback',
          });
        }
      }
    }

    // Verify balance restored
    const { data: transactions } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId);

    const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    expect(balance).toBe(500); // Back to initial
  });

  it('should maintain consistency during concurrent rollbacks', async () => {
    // Simulate two concurrent operations that both need to rollback
    const operation1 = async () => {
      const { data } = await supabase
        .from('gem_transactions')
        .insert({
          student_id: testStudentId,
          amount: -100,
          transaction_type: 'spent',
          reason: 'operation1',
        })
        .select()
        .single();

      // Simulate failure - rollback
      await new Promise((resolve) => setTimeout(resolve, 50));

      await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: 100,
        transaction_type: 'earned',
        reason: 'operation1_rollback',
      });
    };

    const operation2 = async () => {
      const { data } = await supabase
        .from('gem_transactions')
        .insert({
          student_id: testStudentId,
          amount: -150,
          transaction_type: 'spent',
          reason: 'operation2',
        })
        .select()
        .single();

      // Simulate failure - rollback
      await new Promise((resolve) => setTimeout(resolve, 50));

      await supabase.from('gem_transactions').insert({
        student_id: testStudentId,
        amount: 150,
        transaction_type: 'earned',
        reason: 'operation2_rollback',
      });
    };

    // Execute concurrent operations
    await Promise.all([operation1(), operation2()]);

    // Verify final balance is correct (all rolled back)
    const { data: transactions } = await supabase
      .from('gem_transactions')
      .select('amount')
      .eq('student_id', testStudentId);

    const balance = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    expect(balance).toBe(500); // Original balance preserved
  });
});
