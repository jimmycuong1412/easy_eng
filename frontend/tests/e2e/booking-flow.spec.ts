/**
 * End-to-End Booking Flow Test
 * 
 * Tests the complete booking journey from class browsing
 * to payment confirmation with Gems discount
 * 
 * Test-First Approach: This test should FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test';

test.describe('Student Class Booking with Gems Discount', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'student@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should complete full booking flow with Gems discount', async ({ page }) => {
    // Step 1: Navigate to class catalog
    await page.click('text=Classes');
    await expect(page).toHaveURL(/\/classes/);

    // Verify Gems balance is visible
    const gemsBalance = page.locator('[data-testid="gems-balance"]');
    await expect(gemsBalance).toBeVisible();
    const initialGems = await gemsBalance.textContent();
    expect(initialGems).toContain('Gems');

    // Step 2: Browse and filter classes
    await page.fill('input[placeholder*="Search"]', 'conversation');
    await page.selectOption('select[name="level"]', 'advanced');
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="class-card"]');
    
    const classCards = page.locator('[data-testid="class-card"]');
    expect(await classCards.count()).toBeGreaterThan(0);

    // Step 3: Select a class
    const firstClass = classCards.first();
    await expect(firstClass.locator('text=/Advanced/')).toBeVisible();
    
    // Get class price
    const priceText = await firstClass.locator('[data-testid="class-price"]').textContent();
    const classPrice = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');
    expect(classPrice).toBeGreaterThan(5); // Above minimum

    await firstClass.click();

    // Step 4: View class details
    await expect(page).toHaveURL(/\/classes\/[a-z0-9-]+/);
    await expect(page.locator('h1')).toContainText('Advanced');
    
    // Click book button
    await page.click('button:has-text("Book Class")');

    // Step 5: Booking form with Gems discount
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
    
    // Verify price display
    await expect(page.locator('[data-testid="original-price"]')).toContainText(`$${classPrice}`);
    
    // Adjust Gems slider
    const gemsSlider = page.locator('input[type="range"][name="gemsToUse"]');
    await expect(gemsSlider).toBeVisible();
    
    // Use 500 Gems ($5 discount)
    await gemsSlider.fill('500');
    
    // Verify discount calculation
    await expect(page.locator('[data-testid="gems-discount"]')).toContainText('$5.00');
    await expect(page.locator('[data-testid="final-price"]')).toContainText(`$${classPrice - 5}`);
    
    // Verify savings message
    await expect(page.locator('text=/You save.*\$5/i')).toBeVisible();

    // Step 6: Enter payment details
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="expiry"]', '12/25');
    await page.fill('input[name="cvc"]', '123');
    await page.fill('input[name="zipCode"]', '12345');

    // Step 7: Confirm booking
    await page.click('button:has-text("Confirm Booking")');
    
    // Verify loading state
    await expect(page.locator('[data-testid="booking-spinner"]')).toBeVisible();

    // Step 8: Verify success
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Booking Confirmed/i')).toBeVisible();
    
    // Verify booking details
    await expect(page.locator('[data-testid="booking-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-gems-used"]')).toContainText('500');
    await expect(page.locator('[data-testid="confirmation-amount-paid"]')).toContainText(`$${classPrice - 5}`);

    // Step 9: Verify Gems were deducted
    const newGemsBalance = page.locator('[data-testid="gems-balance"]');
    await expect(newGemsBalance).toBeVisible();
    
    // Should show reduced balance (exact amount depends on initial balance)
    const newGems = await newGemsBalance.textContent();
    expect(newGems).not.toBe(initialGems);

    // Step 10: Navigate to bookings page
    await page.click('text=My Bookings');
    await expect(page).toHaveURL(/\/bookings/);
    
    // Verify booking appears in list
    const bookingsList = page.locator('[data-testid="bookings-list"]');
    await expect(bookingsList.locator('[data-testid="booking-item"]').first()).toBeVisible();
  });

  test('should respect 50% discount cap', async ({ page }) => {
    await page.goto('/classes');
    
    // Find a $20 class
    const classCard = page.locator('[data-testid="class-card"]').filter({ hasText: '$20' }).first();
    await classCard.click();
    await page.click('button:has-text("Book Class")');

    // Try to use 1500 Gems ($15 = 75%)
    const gemsSlider = page.locator('input[type="range"][name="gemsToUse"]');
    await gemsSlider.fill('1500');

    // Should be automatically reduced to 1000 (50%)
    await expect(page.locator('[data-testid="gems-used"]')).toContainText('1,000');
    await expect(page.locator('[data-testid="gems-discount"]')).toContainText('$10.00');
    await expect(page.locator('[data-testid="final-price"]')).toContainText('$10.00');

    // Should show warning message
    await expect(page.locator('text=/maximum.*50%/i')).toBeVisible();
  });

  test('should respect $5 minimum price floor', async ({ page }) => {
    await page.goto('/classes');
    
    // Find a cheap class ($8)
    const classCard = page.locator('[data-testid="class-card"]').filter({ hasText: '$8' }).first();
    await classCard.click();
    await page.click('button:has-text("Book Class")');

    // Try to use 500 Gems ($5 discount, would make price $3)
    const gemsSlider = page.locator('input[type="range"][name="gemsToUse"]');
    await gemsSlider.fill('500');

    // Should be reduced to 300 Gems (price stays at $5)
    await expect(page.locator('[data-testid="gems-used"]')).toContainText('300');
    await expect(page.locator('[data-testid="final-price"]')).toContainText('$5.00');

    // Should show floor warning
    await expect(page.locator('text=/minimum price.*\$5/i')).toBeVisible();
  });

  test('should handle insufficient Gems gracefully', async ({ page }) => {
    // Mock user with only 200 Gems
    await page.route('**/api/gems/balance', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ balance: 200 }),
      });
    });

    await page.goto('/classes');
    const classCard = page.locator('[data-testid="class-card"]').first();
    await classCard.click();
    await page.click('button:has-text("Book Class")');

    // Gems slider should be limited to 200
    const gemsSlider = page.locator('input[type="range"][name="gemsToUse"]');
    await expect(gemsSlider).toHaveAttribute('max', '200');

    // Try to set higher value
    await gemsSlider.fill('500');

    // Should cap at 200
    await expect(page.locator('[data-testid="gems-used"]')).toContainText('200');
    
    // Should show insufficient Gems warning
    await expect(page.locator('text=/Only 200 Gems available/i')).toBeVisible();
  });

  test('should handle payment failure with rollback', async ({ page }) => {
    // Mock payment failure
    await page.route('**/api/bookings/process', async (route) => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({
          success: false,
          error: 'Payment declined',
        }),
      });
    });

    await page.goto('/classes');
    const classCard = page.locator('[data-testid="class-card"]').first();
    await classCard.click();
    await page.click('button:has-text("Book Class")');

    // Use Gems
    const gemsSlider = page.locator('input[type="range"][name="gemsToUse"]');
    await gemsSlider.fill('500');

    // Get initial Gems balance
    const initialBalance = await page.locator('[data-testid="gems-balance"]').textContent();

    // Enter payment and submit
    await page.fill('input[name="cardNumber"]', '4000000000000002'); // Declined card
    await page.click('button:has-text("Confirm Booking")');

    // Should show error
    await expect(page.locator('[role="alert"]')).toContainText('Payment declined');

    // Gems balance should be unchanged
    const currentBalance = await page.locator('[data-testid="gems-balance"]').textContent();
    expect(currentBalance).toBe(initialBalance);

    // Form should still be editable (not closed)
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible();
    
    // User can retry
    await expect(page.locator('button:has-text("Confirm Booking")')).toBeEnabled();
  });

  test('should prevent double submission', async ({ page }) => {
    let requestCount = 0;
    
    // Count booking requests
    await page.route('**/api/bookings/process', async (route) => {
      requestCount++;
      // Delay to simulate slow processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/classes');
    const classCard = page.locator('[data-testid="class-card"]').first();
    await classCard.click();
    await page.click('button:has-text("Book Class")');

    const submitButton = page.locator('button:has-text("Confirm Booking")');
    
    // Click multiple times rapidly
    await Promise.all([
      submitButton.click(),
      submitButton.click(),
      submitButton.click(),
    ]);

    // Button should be disabled
    await expect(submitButton).toBeDisabled();
    
    // Should show processing state
    await expect(page.locator('text=/Processing/i')).toBeVisible();

    // Only one request should be made
    await page.waitForTimeout(3000);
    expect(requestCount).toBe(1);
  });

  test('should show Gems earning opportunities when balance is low', async ({ page }) => {
    // Mock low balance
    await page.route('**/api/gems/balance', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ balance: 50 }),
      });
    });

    await page.goto('/classes');
    const classCard = page.locator('[data-testid="class-card"]').first();
    await classCard.click();
    await page.click('button:has-text("Book Class")');

    // Should show earn Gems CTA
    await expect(page.locator('text=/Earn more Gems/i')).toBeVisible();
    await expect(page.locator('a[href*="/gems"]')).toBeVisible();
  });

  test('should display correct timezone for class schedule', async ({ page }) => {
    await page.goto('/classes');
    const classCard = page.locator('[data-testid="class-card"]').first();
    await classCard.click();

    // Schedule should show with timezone
    const schedule = page.locator('[data-testid="class-schedule"]');
    await expect(schedule).toBeVisible();
    
    // Should include date, time, and timezone
    const scheduleText = await schedule.textContent();
    expect(scheduleText).toMatch(/\d{1,2}:\d{2}/); // Time
    expect(scheduleText).toMatch(/[A-Z]{3}/); // Timezone abbreviation
  });
});
