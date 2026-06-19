
import { test, expect } from '@playwright/test';

test.describe('Cookie System', () => {
    let email = '';
    const password = 'Password123!';

    test.beforeEach(async ({ page }) => {
        const timestamp = Date.now();
        email = `cookieuser${timestamp}@example.com`;

        await page.goto('/vi/auth/signup');
        await page.getByLabel('Họ và tên').fill('Cookie User');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
        await page.getByLabel('Xác nhận mật khẩu').fill(password);
        await page.getByRole('button', { name: /Đăng ký/i }).click();
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('Test 4.1 & 4.2: Cookie Balance & Transactions Display - Mock Data', async ({ page }) => {
        // Navigate to rewards/cookies page
        await page.goto('/vi/student/rewards');

        // Verify headers
        await expect(page.getByRole('heading', { name: /Phần thưởng hoạt động/i })).toBeVisible();

        // Mock data expects 124 cookies
        await expect(page.getByText('124')).toBeVisible();

        // Mock data expects a streak of 3
        await expect(page.getByText('Streak hiện tại')).toBeVisible();
        await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
    });
});
