
import { test, expect } from '@playwright/test';

test.describe('User Preferences', () => {
    let email = '';
    const password = 'Password123!';

    test.beforeEach(async ({ page }) => {
        const timestamp = Date.now();
        email = `prefuser${timestamp}@example.com`;

        await page.goto('/vi/auth/signup');
        await page.getByLabel('Họ và tên').fill('Preference User');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
        await page.getByLabel('Xác nhận mật khẩu').fill(password);
        await page.getByRole('button', { name: /Đăng ký/i }).click();
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('Test 3.1: Profile Settings (Mock Data)', async ({ page }) => {
        await page.goto('/vi/settings/profile');

        // The page uses Mock Data: 'Nguyễn Văn An'
        // Verification of UI rendering mock data
        await expect(page.getByLabel('Họ và tên')).toHaveValue('Nguyễn Văn An');
        // Email in mock data: 'an.nguyen@example.com'
        await expect(page.getByLabel('Email')).toHaveValue('an.nguyen@example.com');

        // Test Edit Flow
        await page.getByLabel('Họ và tên').fill('Updated User Name');
        await page.getByRole('button', { name: /Lưu/i }).click();

        // Verify success message
        await expect(page.getByText('Đã lưu thay đổi', { exact: false })).toBeVisible({ timeout: 10000 });

        // Note: Since it's mock data and local state, reload might reset it or not?
        // Code says: "Simulate API call... Reset saved state". 
        // It does NOT persist to DB.
        // So reload will probably revert to mock data.
        // We won't test persistence on reload for mock pages.
    });

    test('Test 3.2: Language & Region Preferences', async ({ page }) => {
        await page.goto('/vi/settings/preferences');

        await expect(page.getByText('Tiếng Việt', { exact: false })).toBeVisible();
        await expect(page.getByText('(GMT+7) Hồ Chí Minh', { exact: false })).toBeVisible();
        await expect(page.getByText('VND', { exact: false })).toBeVisible();
    });
});
