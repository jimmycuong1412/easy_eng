
import { test, expect } from '@playwright/test';

test.describe('Edge Cases', () => {
    test('Test 10.1: 404 Page', async ({ page }) => {
        // Navigate to non-existent page
        await page.goto('/vi/non-existent-page-' + Date.now());

        // Verify 404 content
        // Usually "Không tìm thấy trang" or "Page Not Found"
        // Checking for commonly used text or title
        await expect(page.getByRole('heading', { name: /Không tìm thấy/i, exact: false }).or(page.getByText('404'))).toBeVisible();

        // Check "Trang chủ" link exists to go back
        await expect(page.getByRole('link', { name: /Trang chủ/i })).toBeVisible();
    });
});
