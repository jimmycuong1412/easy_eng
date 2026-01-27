
import { test, expect } from '@playwright/test';

test.describe('Teacher Profiles', () => {
    let email = '';
    const password = 'Password123!';

    test.beforeEach(async ({ page }) => {
        const timestamp = Date.now();
        email = `teacheruser${timestamp}@example.com`;

        await page.goto('/vi/auth/signup');
        await page.getByLabel('Họ và tên').fill('Teacher User');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
        await page.getByLabel('Xác nhận mật khẩu').fill(password);
        await page.getByRole('button', { name: /Đăng ký/i }).click();
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('Test 6.1 & 6.2: Teacher Directory and Booking Flow (Mock Data)', async ({ page }) => {
        await page.goto('/vi/dashboard/teachers');

        // Test 6.1: Directory
        // Ensure cards are loaded
        await expect(page.getByText('Sarah Johnson')).toBeVisible({ timeout: 10000 });

        // Test 6.2: Booking
        // Click on Sarah Johnson. Using locator filter to be precise.
        // Use click which matches the text "Sarah Johnson"
        await page.getByText('Sarah Johnson').click();

        // Verify detail page
        await expect(page).toHaveURL(/\/dashboard\/teachers\/1/);
        await expect(page.locator('h1')).toHaveText('Sarah Johnson');

        // Select Date (Thứ 2)
        // The date buttons are simple buttons with text "Thứ 2"
        await page.click('button:has-text("Thứ 2")');

        // Select Time (08:00)
        await page.click('button:has-text("08:00")');

        // Click Book Button
        // It should now say "Đặt lịch Thứ 2 08:00"
        await page.click('button:has-text("Đặt lịch")');

        // Verify redirect to booking confirmation
        // router.push -> /dashboard/book/1?date=...
        // We expect the URL to contain /dashboard/book/1
        await expect(page).toHaveURL(/dashboard\/book\/1/);
    });
});
