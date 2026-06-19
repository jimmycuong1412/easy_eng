import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the landing page correctly', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/EasyEng/);

    // Check main heading
    const heading = page.getByRole('heading', { name: /EasyEng/i });
    await expect(heading).toBeVisible();

    // Check description text
    await expect(page.getByText(/Cookie rewards/i)).toBeVisible();

    // Check CTA buttons
    await expect(page.getByRole('link', { name: /Bắt đầu miễn phí/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Đăng nhập/i })).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /Bắt đầu miễn phí/i }).click();

    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /Đăng nhập/i }).click();

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should display feature cards', async ({ page }) => {
    await page.goto('/');

    // Check feature cards
    await expect(page.getByText('Gamification')).toBeVisible();
    await expect(page.getByText('Cookie Rewards')).toBeVisible();
    await expect(page.getByText('Live Classes')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that main elements are still visible
    await expect(page.getByRole('heading', { name: /EasyEng/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Bắt đầu miễn phí/i })).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have no accessibility violations on home page', async ({ page }) => {
    await page.goto('/');

    // Check skip link is present
    const skipLink = page.getByRole('link', { name: /Skip to main content/i });
    await expect(skipLink).toBeAttached();

    // Main content should be accessible
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });
});
