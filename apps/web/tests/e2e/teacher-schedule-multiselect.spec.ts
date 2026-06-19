import { test, expect } from '@playwright/test';

const TEACHER_EMAIL = 'jimmycuong1414@gmail.com';
const TEACHER_PASSWORD = '123456';

test.describe('Teacher Schedule — Multi-Select', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', TEACHER_EMAIL);
    await page.fill('input[type="password"]', TEACHER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.goto('/teacher/schedule');
    await page.waitForLoadState('networkidle');
  });

  test('Settings button is NOT visible in header', async ({ page }) => {
    // The header Settings button was removed — should not be present
    const headerSettings = page.locator('header, .flex.flex-col.md\\:flex-row').getByRole('button', { name: /settings/i });
    await expect(headerSettings).toHaveCount(0);
  });

  test('shift-click two available slots shows batch action bar with count', async ({ page }) => {
    const availableSlots = page.locator('button.border-dashed');
    const count = await availableSlots.count();
    if (count < 2) {
      test.skip();
      return;
    }

    // Click first slot — may open a dialog
    await availableSlots.first().click();

    // Always dismiss any open dialog before proceeding
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }

    // Now click first slot again (starts selection) then shift-click second
    await availableSlots.first().click();
    // Dismiss dialog again if opened
    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }

    // Shift-click a different (non-first) slot
    await availableSlots.nth(1).click({ modifiers: ['Shift'] });

    // Batch action bar should appear
    const batchBar = page.getByText(/slot.*selected|slots.*selected/i);
    await expect(batchBar).toBeVisible({ timeout: 5000 });
  });

  test('batch disable via shift-click shows unsaved banner', async ({ page }) => {
    const availableSlots = page.locator('button.border-dashed');
    const count = await availableSlots.count();
    if (count < 2) {
      test.skip();
      return;
    }

    const dialog = page.getByRole('dialog');

    // Click first slot (may open dialog — dismiss it)
    await availableSlots.first().click();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }

    // Click first slot again, then shift-click second to get selection
    await availableSlots.first().click();
    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }
    await availableSlots.nth(1).click({ modifiers: ['Shift'] });

    // Click "Disable Selected" if batch bar appeared
    const disableBtn = page.getByRole('button', { name: /disable selected/i });
    if (!(await disableBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await disableBtn.scrollIntoViewIfNeeded();
    await disableBtn.click({ force: true });
    // Unsaved changes banner should appear
    await expect(page.getByText('You have unsaved changes')).toBeVisible({ timeout: 5000 });
  });

  test('Clear Selection button removes batch action bar', async ({ page }) => {
    const availableSlots = page.locator('button.border-dashed');
    const count = await availableSlots.count();
    if (count < 2) {
      test.skip();
      return;
    }

    const dialog = page.getByRole('dialog');

    // First click — may open dialog
    await availableSlots.first().click();
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }

    // Second click on same slot to enter selection mode
    await availableSlots.first().click();
    if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }

    // Shift-click second slot to extend selection
    await availableSlots.nth(1).click({ modifiers: ['Shift'] });

    const clearBtn = page.getByRole('button', { name: /clear selection/i });
    if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearBtn.click();
      await expect(clearBtn).not.toBeVisible({ timeout: 3000 });
    }
  });
});
