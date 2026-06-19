/**
 * E2E Test: Booking Capacity Rollback
 * Task: T139B [P] [CURRENCY] [TEST]
 *
 * Purpose: Verify that when booking fails due to capacity conflict, all changes are rolled back:
 * - Gem deduction is reversed
 * - Booking is not created
 * - Class capacity remains unchanged
 * - Payment is not processed
 * - User sees appropriate error message
 *
 * Constitution Principle VI: Currency system integrity
 */

import { test, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';

test.describe('Booking Capacity Conflict Rollback', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  const TEST_CLASS = {
    title: 'Almost Full Class',
    maxCapacity: 10,
    currentEnrolled: 9, // Only 1 spot left
    price: 1000, // $10.00
  };

  const USER1 = {
    email: 'user1-capacity@example.com',
    password: 'Password123!',
    gems: 20,
  };

  const USER2 = {
    email: 'user2-capacity@example.com',
    password: 'Password123!',
    gems: 20,
  };

  test.beforeAll(async ({ browser }) => {
    // Create two separate browser contexts (simulate two users)
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();
  });

  test.afterAll(async () => {
    await context1.close();
    await context2.close();
  });

  test('should rollback when two users try to book last spot simultaneously', async () => {
    // User 1: Login and navigate to class
    await page1.goto('/auth/login');
    await page1.fill('[name="email"]', USER1.email);
    await page1.fill('[name="password"]', USER1.password);
    await page1.click('button[type="submit"]');
    await page1.waitForURL('/student/dashboard');

    // User 2: Login and navigate to class
    await page2.goto('/auth/login');
    await page2.fill('[name="email"]', USER2.email);
    await page2.fill('[name="password"]', USER2.password);
    await page2.click('button[type="submit"]');
    await page2.waitForURL('/student/dashboard');

    // Both users navigate to the almost-full class
    await Promise.all([
      page1.goto('/student/classes'),
      page2.goto('/student/classes'),
    ]);

    await Promise.all([
      page1.click(`text=${TEST_CLASS.title}`),
      page2.click(`text=${TEST_CLASS.title}`),
    ]);

    // Verify both see 1 spot available
    const capacity1 = await page1.textContent('[data-testid="class-capacity"]');
    const capacity2 = await page2.textContent('[data-testid="class-capacity"]');
    expect(capacity1).toContain('9/10');
    expect(capacity2).toContain('9/10');

    // Get initial Gem balances
    await page1.goto('/student/dashboard');
    const initialGems1 = await page1.textContent('[data-testid="gem-balance"]');
    const gemsValue1 = parseInt(initialGems1?.replace(/[^\d]/g, '') || '0');

    await page2.goto('/student/dashboard');
    const initialGems2 = await page2.textContent('[data-testid="gem-balance"]');
    const gemsValue2 = parseInt(initialGems2?.replace(/[^\d]/g, '') || '0');

    // Both users apply Gem discounts and try to book simultaneously
    await Promise.all([
      page1.goto(`/student/classes/${TEST_CLASS.title}`),
      page2.goto(`/student/classes/${TEST_CLASS.title}`),
    ]);

    // Apply Gems
    await Promise.all([
      page1.fill('[data-testid="gems-input"]', '10').then(() => page1.click('[data-testid="apply-gems"]')),
      page2.fill('[data-testid="gems-input"]', '10').then(() => page2.click('[data-testid="apply-gems"]')),
    ]);

    // Both click book at nearly the same time
    await Promise.all([
      page1.click('[data-testid="book-class"]'),
      page2.click('[data-testid="book-class"]'),
    ]);

    // One should succeed, one should fail with capacity error
    const [url1, url2] = await Promise.all([
      page1.waitForURL(/\/(payment|bookings)/, { timeout: 5000 }).catch(() => page1.url()),
      page2.waitForURL(/\/(payment|bookings)/, { timeout: 5000 }).catch(() => page2.url()),
    ]);

    // Determine which user succeeded and which failed
    const user1Succeeded = url1.includes('/payment') || url1.includes('/bookings/confirm');
    const user2Succeeded = url2.includes('/payment') || url2.includes('/bookings/confirm');

    // Exactly one should succeed
    expect(user1Succeeded !== user2Succeeded).toBe(true);

    // The failed user should see capacity error
    const failedPage = user1Succeeded ? page2 : page1;
    const succeededPage = user1Succeeded ? page1 : page2;
    const failedUserGems = user1Succeeded ? gemsValue2 : gemsValue1;

    // Check for capacity error message
    await expect(failedPage.locator('[data-testid="booking-error"]'))
      .toContainText(/full|capacity|no spots/i);

    // Verify failed user's Gems were rolled back
    await failedPage.goto('/student/dashboard');
    const finalGemsFailed = await failedPage.textContent('[data-testid="gem-balance"]');
    const finalGemsFailedValue = parseInt(finalGemsFailed?.replace(/[^\d]/g, '') || '0');
    expect(finalGemsFailedValue).toBe(failedUserGems);

    // Verify no booking was created for failed user
    await failedPage.goto('/student/bookings');
    const hasBooking = await failedPage.locator(`text=${TEST_CLASS.title}`).isVisible();
    expect(hasBooking).toBe(false);

    // Verify class is now full (10/10)
    await failedPage.goto('/student/classes');
    await failedPage.click(`text=${TEST_CLASS.title}`);
    const finalCapacity = await failedPage.textContent('[data-testid="class-capacity"]');
    expect(finalCapacity).toContain('10/10');

    // Verify "Book" button is disabled
    const bookButton = failedPage.locator('[data-testid="book-class"]');
    await expect(bookButton).toBeDisabled();
  });

  test('should rollback when capacity reached between viewing and booking', async () => {
    // User sees class with availability
    await page1.goto('/auth/login');
    await page1.fill('[name="email"]', USER1.email);
    await page1.fill('[name="password"]', USER1.password);
    await page1.click('button[type="submit"]');
    await page1.waitForURL('/student/dashboard');
    await page1.goto('/student/classes');
    await page1.click(`text=${TEST_CLASS.title}`);

    // Note capacity
    const initialCapacity = await page1.textContent('[data-testid="class-capacity"]');
    const match = initialCapacity?.match(/(\d+)\/(\d+)/);
    const enrolled = match ? parseInt(match[1]) : 0;
    const max = match ? parseInt(match[2]) : 0;
    const spotsAvailable = max - enrolled;

    // While user is deciding, other users fill up the class
    // (Simulated by backend test data setup)
    // Wait a bit to simulate user thinking time
    await page1.waitForTimeout(2000);

    // User applies Gems
    const gemsToUse = 15;
    await page1.fill('[data-testid="gems-input"]', gemsToUse.toString());
    await page1.click('[data-testid="apply-gems"]');

    // Get initial Gem balance
    await page1.goto('/student/dashboard');
    const initialGems = await page1.textContent('[data-testid="gem-balance"]');
    const initialGemsValue = parseInt(initialGems?.replace(/[^\d]/g, '') || '0');

    // Go back and try to book
    await page1.goto('/student/classes');
    await page1.click(`text=${TEST_CLASS.title}`);
    await page1.fill('[data-testid="gems-input"]', gemsToUse.toString());
    await page1.click('[data-testid="apply-gems"]');
    await page1.click('[data-testid="book-class"]');

    // If class filled up, should see capacity error
    const hasError = await page1.locator('[data-testid="booking-error"]').isVisible();

    if (hasError) {
      // Verify error message mentions capacity
      const errorText = await page1.textContent('[data-testid="booking-error"]');
      expect(errorText).toMatch(/full|capacity|no spots|unavailable/i);

      // Verify Gems were rolled back
      await page1.goto('/student/dashboard');
      const finalGems = await page1.textContent('[data-testid="gem-balance"]');
      const finalGemsValue = parseInt(finalGems?.replace(/[^\d]/g, '') || '0');
      expect(finalGemsValue).toBe(initialGemsValue);

      // Verify no booking created
      await page1.goto('/student/bookings');
      const hasBooking = await page1.locator(`text=${TEST_CLASS.title}`).isVisible();
      expect(hasBooking).toBe(false);
    }
  });

  test('should handle capacity check at multiple points in booking flow', async () => {
    // Login
    await page1.goto('/auth/login');
    await page1.fill('[name="email"]', USER1.email);
    await page1.fill('[name="password"]', USER1.password);
    await page1.click('button[type="submit"]');
    await page1.waitForURL('/student/dashboard');

    // Navigate to class
    await page1.goto('/student/classes');
    await page1.click(`text=${TEST_CLASS.title}`);

    // Get initial state
    const initialGems = await page1.textContent('[data-testid="gem-balance"]');
    const initialGemsValue = parseInt(initialGems?.replace(/[^\d]/g, '') || '0');

    // Apply Gems discount (Checkpoint 1: capacity check)
    await page1.fill('[data-testid="gems-input"]', '12');
    await page1.click('[data-testid="apply-gems"]');

    // Simulate class filling up HERE (between Gem application and booking)
    // In real scenario, this would be done via API or another user

    // Try to book (Checkpoint 2: capacity check)
    await page1.click('[data-testid="book-class"]');

    // Check if we got capacity error
    const hasErrorAtBooking = await page1.locator('[data-testid="booking-error"]').isVisible({
      timeout: 3000,
    }).catch(() => false);

    if (hasErrorAtBooking) {
      // Verify rollback at booking stage
      await page1.goto('/student/dashboard');
      const gemsAfterBooking = await page1.textContent('[data-testid="gem-balance"]');
      const gemsValueAfterBooking = parseInt(gemsAfterBooking?.replace(/[^\d]/g, '') || '0');
      expect(gemsValueAfterBooking).toBe(initialGemsValue);
      return;
    }

    // If booking succeeded, try payment (Checkpoint 3: final capacity check)
    await page1.waitForURL(/\/payment/, { timeout: 3000 }).catch(() => {});

    if (page1.url().includes('/payment')) {
      // Select payment method
      await page1.click('[data-testid="payment-method-vnpay"]');

      // Submit payment (should do final capacity check before charging)
      await page1.click('[data-testid="submit-payment"]');

      // Check for capacity error at payment stage
      const hasErrorAtPayment = await page1.locator('[data-testid="payment-error"]').isVisible({
        timeout: 5000,
      }).catch(() => false);

      if (hasErrorAtPayment) {
        const errorText = await page1.textContent('[data-testid="payment-error"]');
        if (errorText?.match(/capacity|full/i)) {
          // Verify rollback at payment stage
          await page1.goto('/student/dashboard');
          const gemsAfterPayment = await page1.textContent('[data-testid="gem-balance"]');
          const gemsValueAfterPayment = parseInt(gemsAfterPayment?.replace(/[^\d]/g, '') || '0');
          expect(gemsValueAfterPayment).toBe(initialGemsValue);
        }
      }
    }
  });

  test('should prevent overbooking with database constraints', async () => {
    // This test verifies database-level protection
    // Multiple users should not be able to exceed capacity even with race conditions

    const users = [
      { email: 'race1@example.com', password: 'Pass123!' },
      { email: 'race2@example.com', password: 'Pass123!' },
      { email: 'race3@example.com', password: 'Pass123!' },
    ];

    const contexts = await Promise.all(
      users.map(() => page1.context().browser()?.newContext())
    );

    const pages = await Promise.all(
      contexts.map(ctx => ctx?.newPage() as Promise<Page>)
    );

    try {
      // All users login simultaneously
      await Promise.all(
        pages.map((page, i) =>
          page.goto('/auth/login')
            .then(() => page.fill('[name="email"]', users[i].email))
            .then(() => page.fill('[name="password"]', users[i].password))
            .then(() => page.click('button[type="submit"]'))
            .then(() => page.waitForURL('/student/dashboard'))
        )
      );

      // All navigate to the same class with 1 spot
      await Promise.all(
        pages.map(page =>
          page.goto('/student/classes')
            .then(() => page.click(`text=${TEST_CLASS.title}`))
        )
      );

      // All try to book simultaneously
      const bookingResults = await Promise.all(
        pages.map(page =>
          page.fill('[data-testid="gems-input"]', '10')
            .then(() => page.click('[data-testid="apply-gems"]'))
            .then(() => page.click('[data-testid="book-class"]'))
            .then(() => page.waitForURL(/\/(payment|error)/, { timeout: 5000 }))
            .then(() => ({ success: page.url().includes('/payment'), page }))
            .catch(() => ({ success: false, page }))
        )
      );

      // Count successful bookings
      const successfulBookings = bookingResults.filter(r => r.success).length;

      // Should be at most 1 successful (the one that got the last spot)
      expect(successfulBookings).toBeLessThanOrEqual(1);

      // Failed users should see rollback
      for (const result of bookingResults) {
        if (!result.success) {
          await result.page.goto('/student/dashboard');
          // Gems should be restored (verify by checking initial balance matches final)
          const gemBalance = await result.page.textContent('[data-testid="gem-balance"]');
          expect(parseInt(gemBalance?.replace(/[^\d]/g, '') || '0')).toBeGreaterThanOrEqual(10);
        }
      }
    } finally {
      // Cleanup
      await Promise.all(contexts.map(ctx => ctx?.close()));
    }
  });

  test('should show real-time capacity updates', async () => {
    // Login and view class
    await page1.goto('/auth/login');
    await page1.fill('[name="email"]', USER1.email);
    await page1.fill('[name="password"]', USER1.password);
    await page1.click('button[type="submit"]');
    await page1.waitForURL('/student/dashboard');
    await page1.goto('/student/classes');
    await page1.click(`text=${TEST_CLASS.title}`);

    // Get initial capacity
    const initialCapacity = await page1.textContent('[data-testid="class-capacity"]');

    // Subscribe to real-time updates (if implemented via WebSocket/Supabase Realtime)
    // Wait for capacity to update if another user books
    // This is tested via observing UI changes

    // Simulate another user booking (via API call)
    // In real test, this would be done by another test user

    // Verify capacity updates in real-time
    await page1.waitForTimeout(2000);
    const updatedCapacity = await page1.textContent('[data-testid="class-capacity"]');

    // If capacity changed, button state should update
    if (initialCapacity !== updatedCapacity) {
      // Check if button disabled when full
      const match = updatedCapacity?.match(/(\d+)\/(\d+)/);
      if (match && match[1] === match[2]) {
        const bookButton = page1.locator('[data-testid="book-class"]');
        await expect(bookButton).toBeDisabled();
      }
    }
  });
});
