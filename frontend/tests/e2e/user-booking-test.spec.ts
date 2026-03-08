/**
 * User-specific Booking Test
 * Tests booking functionality with provided credentials
 */

import { test, expect } from '@playwright/test';

test.describe('Booking Test - Jimmycuong1413', () => {
    const email = 'Jimmycuong1413@gmail.com';
    const password = '12345678';

    test('Login and view student bookings', async ({ page }) => {
        // Step 1: Navigate to login page
        await page.goto('/vi/auth/login');

        // Step 2: Fill login form
        const emailInput = page.locator('input[name="email"], input[type="email"]');
        const passwordInput = page.locator('input[name="password"], input[type="password"]');

        await emailInput.fill(email);
        await passwordInput.fill(password);

        // Step 3: Submit login (use exact button text)
        await page.click('button:has-text("Đăng nhập")');

        // Step 4: Wait for redirect to dashboard
        await expect(page).toHaveURL(/\/(dashboard|student|vi)/i, { timeout: 15000 });

        // Step 5: Navigate to student bookings
        await page.goto('/vi/student/bookings');

        // Step 6: Verify bookings page loaded
        await expect(page.getByRole('heading', { name: /Lớp học|Bookings|Classes/i })).toBeVisible({ timeout: 10000 });

        // Log what's visible on the page
        console.log('=== Booking Page Content ===');

        // Check for booking cards
        const bookingCards = page.locator('[class*="card"], [class*="booking"]');
        const cardCount = await bookingCards.count();
        console.log(`Found ${cardCount} booking cards`);

        // Check tabs
        const tabs = page.locator('[role="tab"]');
        const tabCount = await tabs.count();
        console.log(`Found ${tabCount} tabs`);

        // Take screenshot for verification
        await page.screenshot({ path: 'test-results/booking-page.png', fullPage: true });
    });

    test('Test booking a new class', async ({ page }) => {
        // Login first
        await page.goto('/vi/auth/login');
        await page.locator('input[name="email"], input[type="email"]').fill(email);
        await page.locator('input[name="password"], input[type="password"]').fill(password);
        await page.click('button:has-text("Đăng nhập")');
        await expect(page).toHaveURL(/\/(dashboard|student|vi)/i, { timeout: 15000 });

        // Navigate to classes/teachers page to book a class
        await page.goto('/vi/teachers');

        // Check if teacher profiles are visible
        const teacherCards = page.locator('[class*="teacher"], [class*="card"]');
        const teacherCount = await teacherCards.count();
        console.log(`Found ${teacherCount} teacher cards`);

        // If there are teachers, try clicking on one
        if (teacherCount > 0) {
            await teacherCards.first().click();

            // Wait for teacher detail page
            await page.waitForTimeout(2000);

            // Look for booking button
            const bookButton = page.getByRole('button', { name: /Book|Đặt lịch|Schedule/i });
            if (await bookButton.isVisible()) {
                console.log('Book button found!');
                await page.screenshot({ path: 'test-results/teacher-detail.png', fullPage: true });
            }
        }

        await page.screenshot({ path: 'test-results/teachers-page.png', fullPage: true });
    });
});
