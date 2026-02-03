/**
 * E2E Test: Payment Failure Rollback
 * Task: T139A [P] [CURRENCY] [TEST]
 *
 * Purpose: Verify that when a payment fails during booking, all changes are rolled back:
 * - Gem deduction is reversed
 * - Booking is not created
 * - Class capacity is not reduced
 * - User sees appropriate error message
 *
 * Constitution Principle VI: Currency system integrity
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test data
const TEST_USER = {
  email: 'rollback-test@example.com',
  password: 'TestPassword123!',
  displayName: 'Rollback Test User',
};

const TEST_CLASS = {
  title: 'Test Class for Payment Rollback',
  price: 2000, // $20.00
  gemsDiscount: 10, // Use 10 Gems for $5 discount
};

test.describe('Payment Failure Rollback', () => {
  let page: Page;
  let initialGemBalance: number;
  let initialClassCapacity: number;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Login as test user
    await page.goto('/auth/login');
    await page.fill('[name="email"]', TEST_USER.email);
    await page.fill('[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/student/dashboard');

    // Get initial Gem balance
    const gemBalanceText = await page.textContent('[data-testid="gem-balance"]');
    initialGemBalance = parseInt(gemBalanceText?.replace(/[^\d]/g, '') || '0');

    // Navigate to test class
    await page.goto('/student/classes');
    await page.click(`text=${TEST_CLASS.title}`);
    await page.waitForURL(/\/student\/classes\/\d+/);

    // Get initial class capacity
    const capacityText = await page.textContent('[data-testid="class-capacity"]');
    const match = capacityText?.match(/(\d+)\s*\/\s*(\d+)/);
    initialClassCapacity = match ? parseInt(match[1]) : 0;
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should rollback Gem deduction when payment gateway fails', async () => {
    // Apply Gem discount
    await page.fill('[data-testid="gems-input"]', TEST_CLASS.gemsDiscount.toString());
    await page.click('[data-testid="apply-gems"]');

    // Verify Gems were deducted from UI (optimistic update)
    const tempBalance = await page.textContent('[data-testid="gem-balance"]');
    const tempBalanceValue = parseInt(tempBalance?.replace(/[^\d]/g, '') || '0');
    expect(tempBalanceValue).toBe(initialGemBalance - TEST_CLASS.gemsDiscount);

    // Click book/pay button
    await page.click('[data-testid="book-class"]');
    await page.waitForURL(/\/student\/bookings\/payment/);

    // Select payment method that will fail (test mode)
    await page.click('[data-testid="payment-method-test-fail"]');

    // Submit payment (this will trigger failure)
    await page.click('[data-testid="submit-payment"]');

    // Wait for error message
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]'))
      .toContainText('Payment failed');

    // Verify rollback: Navigate back to dashboard
    await page.goto('/student/dashboard');

    // Check that Gem balance was restored
    const finalBalance = await page.textContent('[data-testid="gem-balance"]');
    const finalBalanceValue = parseInt(finalBalance?.replace(/[^\d]/g, '') || '0');
    expect(finalBalanceValue).toBe(initialGemBalance);

    // Verify booking was not created
    await page.goto('/student/bookings');
    const bookingExists = await page.locator(`text=${TEST_CLASS.title}`).count();
    expect(bookingExists).toBe(0);

    // Verify class capacity was not reduced
    await page.goto('/student/classes');
    await page.click(`text=${TEST_CLASS.title}`);
    const finalCapacityText = await page.textContent('[data-testid="class-capacity"]');
    const finalMatch = finalCapacityText?.match(/(\d+)\s*\/\s*(\d+)/);
    const finalCapacity = finalMatch ? parseInt(finalMatch[1]) : 0;
    expect(finalCapacity).toBe(initialClassCapacity);
  });

  test('should rollback when payment gateway times out', async () => {
    // Apply Gem discount
    await page.fill('[data-testid="gems-input"]', '20');
    await page.click('[data-testid="apply-gems"]');

    // Proceed to payment
    await page.click('[data-testid="book-class"]');
    await page.waitForURL(/\/student\/bookings\/payment/);

    // Select payment method that will timeout
    await page.click('[data-testid="payment-method-test-timeout"]');

    // Submit payment
    await page.click('[data-testid="submit-payment"]');

    // Wait for timeout error (with longer timeout for this test)
    await expect(page.locator('[data-testid="payment-error"]'))
      .toBeVisible({ timeout: 35000 }); // 35s timeout

    // Verify error message
    await expect(page.locator('[data-testid="payment-error"]'))
      .toContainText(/timeout|timed out/i);

    // Check Gem balance restored
    await page.goto('/student/dashboard');
    const finalBalance = await page.textContent('[data-testid="gem-balance"]');
    const finalBalanceValue = parseInt(finalBalance?.replace(/[^\d]/g, '') || '0');
    expect(finalBalanceValue).toBe(initialGemBalance);

    // Verify no booking created
    await page.goto('/student/bookings');
    const hasBooking = await page.locator(`text=${TEST_CLASS.title}`).isVisible();
    expect(hasBooking).toBe(false);
  });

  test('should handle payment network errors with rollback', async () => {
    // Apply Gems
    await page.fill('[data-testid="gems-input"]', '15');
    await page.click('[data-testid="apply-gems"]');

    // Record initial state
    const gemsBefore = await page.textContent('[data-testid="gem-balance"]');
    const gemsBeforeValue = parseInt(gemsBefore?.replace(/[^\d]/g, '') || '0');

    // Proceed to payment
    await page.click('[data-testid="book-class"]');
    await page.waitForURL(/\/student\/bookings\/payment/);

    // Simulate network error by going offline
    await page.context().setOffline(true);

    // Try to submit payment
    await page.click('[data-testid="submit-payment"]');

    // Wait for network error
    await expect(page.locator('[data-testid="payment-error"]'))
      .toBeVisible({ timeout: 10000 });

    // Restore network
    await page.context().setOffline(false);

    // Navigate to dashboard
    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify Gems were restored
    const gemsAfter = await page.textContent('[data-testid="gem-balance"]');
    const gemsAfterValue = parseInt(gemsAfter?.replace(/[^\d]/g, '') || '0');
    expect(gemsAfterValue).toBe(initialGemBalance);
  });

  test('should rollback when payment is declined by bank', async () => {
    // Apply Gem discount
    await page.fill('[data-testid="gems-input"]', '25');
    await page.click('[data-testid="apply-gems"]');

    // Navigate to payment
    await page.click('[data-testid="book-class"]');
    await page.waitForURL(/\/student\/bookings\/payment/);

    // Select card that will be declined
    await page.click('[data-testid="payment-method-stripe"]');
    await page.fill('[data-testid="card-number"]', '4000000000000002'); // Test card that gets declined
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');

    // Submit payment
    await page.click('[data-testid="submit-payment"]');

    // Wait for declined message
    await expect(page.locator('[data-testid="payment-error"]'))
      .toContainText(/declined|rejected/i);

    // Verify rollback
    await page.goto('/student/dashboard');
    const finalBalance = await page.textContent('[data-testid="gem-balance"]');
    const finalBalanceValue = parseInt(finalBalance?.replace(/[^\d]/g, '') || '0');
    expect(finalBalanceValue).toBe(initialGemBalance);

    // Check audit log recorded the rollback
    // Note: This would require API access or database query
    // For E2E test, we verify the user-visible state
  });

  test('should show detailed error message and recovery options', async () => {
    // Apply Gems
    await page.fill('[data-testid="gems-input"]', '30');
    await page.click('[data-testid="apply-gems"]');

    // Proceed to payment
    await page.click('[data-testid="book-class"]');
    await page.waitForURL(/\/student\/bookings\/payment/);

    // Trigger payment failure
    await page.click('[data-testid="payment-method-test-fail"]');
    await page.click('[data-testid="submit-payment"]');

    // Wait for error
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();

    // Verify error contains helpful information
    const errorText = await page.textContent('[data-testid="payment-error"]');
    expect(errorText).toContain('Payment failed');

    // Verify recovery options are presented
    await expect(page.locator('[data-testid="try-again-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="choose-different-method"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-booking"]')).toBeVisible();

    // Test "Try Again" flow
    await page.click('[data-testid="try-again-button"]');

    // Verify we're still on payment page with form reset
    expect(page.url()).toContain('/payment');

    // Verify Gems were rolled back (form should show original amount available)
    const availableGems = await page.textContent('[data-testid="available-gems"]');
    expect(parseInt(availableGems?.replace(/[^\d]/g, '') || '0')).toBe(initialGemBalance);
  });

  test('should maintain idempotency - prevent duplicate deductions', async () => {
    // Apply Gems
    await page.fill('[data-testid="gems-input"]', '10');
    await page.click('[data-testid="apply-gems"]');

    // Proceed to payment
    await page.click('[data-testid="book-class"]');
    await page.waitForURL(/\/student\/bookings\/payment/);

    // Select payment method
    await page.click('[data-testid="payment-method-vnpay"]');

    // Get idempotency key from request (intercept network)
    let idempotencyKey: string = '';
    page.on('request', request => {
      if (request.url().includes('/api/bookings/create')) {
        const headers = request.headers();
        idempotencyKey = headers['idempotency-key'] || '';
      }
    });

    // Submit payment
    await page.click('[data-testid="submit-payment"]');

    // Simulate payment failure
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();

    // Get Gem balance after rollback
    await page.goto('/student/dashboard');
    const balanceAfterFirstAttempt = await page.textContent('[data-testid="gem-balance"]');
    const balanceValue1 = parseInt(balanceAfterFirstAttempt?.replace(/[^\d]/g, '') || '0');

    // Try the SAME booking again (should use idempotency to prevent duplicate)
    await page.goto('/student/classes');
    await page.click(`text=${TEST_CLASS.title}`);
    await page.fill('[data-testid="gems-input"]', '10');
    await page.click('[data-testid="apply-gems"]');
    await page.click('[data-testid="book-class"]');

    // Balance should still be the same (idempotency prevents duplicate deduction)
    await page.goto('/student/dashboard');
    const balanceAfterSecondAttempt = await page.textContent('[data-testid="gem-balance"]');
    const balanceValue2 = parseInt(balanceAfterSecondAttempt?.replace(/[^\d]/g, '') || '0');

    expect(balanceValue2).toBe(balanceValue1);
    expect(balanceValue2).toBe(initialGemBalance); // Both should equal initial balance
  });
});

/**
 * Test Helper: Verify audit log
 * This would typically be done via API call in a real test
 */
async function verifyAuditLog(
  page: Page,
  userId: string,
  expectedAction: string
): Promise<boolean> {
  // In production, this would query the gem_transaction_audit_log table
  // For E2E tests, we verify the visible state and trust the backend
  // Backend unit tests should cover audit log creation
  return true;
}

/**
 * Test Helper: Get current Gem balance from API
 */
async function getGemBalanceFromAPI(page: Page, userId: string): Promise<number> {
  const response = await page.request.get(`/api/gems/balance/${userId}`);
  const data = await response.json();
  return data.balance || 0;
}
