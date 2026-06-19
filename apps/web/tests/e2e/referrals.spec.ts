
import { test, expect } from '@playwright/test';

test.describe('Referral System', () => {
    let email = '';
    const password = 'Password123!';

    test.beforeEach(async ({ page }) => {
        const timestamp = Date.now();
        email = `referraluser${timestamp}@example.com`;

        await page.goto('/vi/auth/signup');
        await page.getByLabel('Họ và tên').fill('Referral User');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
        await page.getByLabel('Xác nhận mật khẩu').fill(password);
        await page.getByRole('button', { name: /Đăng ký/i }).click();
        // Increase timeout or handle Verify Email redirect if needed
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    test('Test 9.1 & 9.2: Referral Link and History (UI Check)', async ({ page }) => {
        await page.goto('/vi/student/referral');

        // Verify Header
        await expect(page.getByRole('heading', { name: /Giới thiệu bạn bè/i })).toBeVisible({ timeout: 10000 });

        // Verify Link Input (assuming input with readonly)
        // Or copy button "Sao chép"
        await expect(page.getByText('Sao chép')).toBeVisible();

        // Verify History / Stats
        // "Tổng số người giới thiệu"
        await expect(page.getByText('Tổng số người giới thiệu')).toBeVisible();
    });
});
