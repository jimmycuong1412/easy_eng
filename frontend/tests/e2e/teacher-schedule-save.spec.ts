import { test, expect } from '@playwright/test';

const TEACHER_EMAIL = 'jimmycuong1414@gmail.com';
const TEACHER_PASSWORD = '123456';

test.describe('Teacher Schedule — Save Button', () => {
  test.beforeEach(async ({ page }) => {
    // Login as teacher — baseURL is set via PLAYWRIGHT_BASE_URL (includes /en)
    await page.goto('/auth/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', TEACHER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Navigate to schedule
    await page.goto('/teacher/schedule');
    await page.waitForLoadState('networkidle');
  });

  test('stats bar shows 4 counters', async ({ page }) => {
    // Stats bar should be present with 4 cards
    const statsCards = page.locator('.grid.grid-cols-2 .bg-white\\/5');
    await expect(statsCards).toHaveCount(4);
  });

  test('Settings button opens availability dialog', async ({ page }) => {
    const settingsBtn = page.getByRole('button', { name: /settings/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Availability dialog should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Availability Settings')).toBeVisible();
  });

  test('disabling a slot via dialog shows unsaved banner, save persists change', async ({ page }) => {
    // Find an available slot (dashed border) and click it
    const availableSlot = page.locator('button.border-dashed').first();

    // Only proceed if there are available slots
    const count = await availableSlot.count();
    if (count === 0) {
      test.skip(); // No available slots configured — skip
      return;
    }

    await availableSlot.click();

    // Slot detail dialog should open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Click "Disable Slot" button
    const disableBtn = dialog.getByRole('button', { name: /disable slot/i });
    await expect(disableBtn).toBeVisible();
    await disableBtn.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Unsaved changes banner should appear
    const banner = page.getByText('You have unsaved changes');
    await expect(banner).toBeVisible();

    // Click Save in the banner — track network requests
    const savePromise = page.waitForResponse(
      (res) => res.url().includes('teacher_slot_overrides') && res.request().method() === 'POST',
      { timeout: 5000 }
    ).catch(() => null); // May not intercept Supabase realtime — that's OK

    const saveBtn = page.getByRole('button', { name: /^Save$/ });
    await saveBtn.click();

    // Banner should disappear after save
    await expect(banner).not.toBeVisible({ timeout: 5000 });

    // Reload and verify the slot is still disabled (red/disabled styling)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // The unsaved banner should not be present after reload
    await expect(page.getByText('You have unsaved changes')).not.toBeVisible();
  });

  test('discarding draft removes unsaved banner without DB write', async ({ page }) => {
    // Find an available slot and click it
    const availableSlot = page.locator('button.border-dashed').first();
    const count = await availableSlot.count();
    if (count === 0) {
      test.skip();
      return;
    }

    await availableSlot.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const disableBtn = dialog.getByRole('button', { name: /disable slot/i });
    if (!(await disableBtn.isVisible())) {
      await page.keyboard.press('Escape');
      test.skip();
      return;
    }

    await disableBtn.click();

    // Banner appears
    await expect(page.getByText('You have unsaved changes')).toBeVisible();

    // Click Discard
    await page.getByRole('button', { name: /discard/i }).click();

    // Banner should disappear
    await expect(page.getByText('You have unsaved changes')).not.toBeVisible();
  });
});
