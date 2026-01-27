
import { test, expect } from '@playwright/test';

test.describe('Video Class', () => {
    let email = '';
    const password = 'Password123!';

    test.beforeEach(async ({ page }) => {
        const timestamp = Date.now();
        email = `videouser${timestamp}@example.com`;

        await page.goto('/vi/auth/signup');
        await page.getByLabel('Họ và tên').fill('Video User');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
        await page.getByLabel('Xác nhận mật khẩu').fill(password);
        await page.getByRole('button', { name: /Đăng ký/i }).click();
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test('Test 8.1 & 8.2: Device Check and Live Class (Mock)', async ({ page }) => {
        // Navigate to pre-check page (Mock class ID 1)
        await page.goto('/vi/class/class-1/pre-check');

        // Verify Mock Data Topic
        await expect(page.getByRole('heading', { name: 'Business English: Meeting Skills' })).toBeVisible();

        // Wait for device checks to complete (Checking -> Success/Error)
        // The "Vào lớp học" button is disabled initially, then enabled.
        const joinButton = page.getByRole('button', { name: /Vào lớp học/i });

        // Wait for it to be enabled. This implies checks finished.
        // It might take a few seconds.
        await expect(joinButton).toBeEnabled({ timeout: 15000 });

        // Join Class
        await joinButton.click();

        // Verify Live Class Page
        await expect(page).toHaveURL(/\/class\/class-1\/live/);

        // Verify Header
        await expect(page.getByText('Business English: Meeting Skills')).toBeVisible();
        await expect(page.getByText('LIVE')).toBeVisible();

        // Verify Chat Panel (mock messages)
        await expect(page.getByText('Chào bạn! Hôm nay chúng ta sẽ học về Meeting Skills nhé.')).toBeVisible();

        // Verify Video Container (Fallback or CometChat)
        // Fallback has "Teacher Name" in overlay
        // Or just check for the teacher's name in the main area
        await expect(page.getByText('Nguyễn Minh Anh')).toBeVisible();
    });
});
