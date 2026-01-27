
import { test, expect } from '@playwright/test';

test.describe('Booking System', () => {
    let email = '';
    const password = 'Password123!';

    test.beforeEach(async ({ page }) => {
        const timestamp = Date.now();
        email = `bookinguser${timestamp}@example.com`;

        await page.goto('/vi/auth/signup');
        await page.getByLabel('Họ và tên').fill('Booking User');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
        await page.getByLabel('Xác nhận mật khẩu').fill(password);
        await page.getByRole('button', { name: /Đăng ký/i }).click();
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('Test 5.1: View Bookings (Student) - Mock Data', async ({ page }) => {
        // Navigate to bookings
        await page.goto('/vi/student/bookings');

        // Verify page title
        await expect(page.getByRole('heading', { name: /Lớp học của tôi/i, exact: false })).toBeVisible();

        // The page uses Mock Data.
        // Expect to see "Business English: Meeting Skills"
        await expect(page.getByText('Business English: Meeting Skills')).toBeVisible();

        // Verify tabs
        await expect(page.getByRole('tab', { name: /Sắp tới/i })).toBeVisible();
    });
});
