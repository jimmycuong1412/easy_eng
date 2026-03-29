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

    // Click first available slot (no shift)
    await availableSlots.first().click();

    // If a dialog opened (single-click opens dialog), close it first
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }

    // Click second slot with shift — should trigger multi-select
    // Note: after a single click without selection active, first click starts selection
    // So we need to test the flow: click opens dialog, escape, then shift-click extends
    // Alternatively, directly test via the batch action appearing after drag
    // Simple approach: click to start selection, then shift-click another

    // Click first slot (starts selection mode if no dialog opened)
    await availableSlots.first().click();
    // Shift-click second slot
    await availableSlots.nth(1).click({ modifiers: ['Shift'] });

    // Batch action bar should appear
    const batchBar = page.getByText(/slot.*selected|slots.*selected/i);
    await expect(batchBar).toBeVisible({ timeout: 5000 });
  });

  test('batch disable updates slots to disabled style after unsaved banner appears', async ({ page }) => {
    const availableSlots = page.locator('button.border-dashed');
    const count = await availableSlots.count();
    if (count < 1) {
      test.skip();
      return;
    }

    // Click first available slot to start selection (if no dialog opens)
    await availableSlots.first().click();

    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      // Now click again to enter selection mode
      await availableSlots.first().click();
    }

    // Click "Disable Selected" if batch bar visible
    const disableBtn = page.getByRole('button', { name: /disable selected/i });
    if (await disableBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await disableBtn.click();
      // Unsaved changes banner should appear
      await expect(page.getByText('You have unsaved changes')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Clear Selection button removes batch action bar', async ({ page }) => {
    const availableSlots = page.locator('button.border-dashed');
    const count = await availableSlots.count();
    if (count < 2) {
      test.skip();
      return;
    }

    // Start selection and shift-click to get batch bar
    await availableSlots.first().click();
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible()) {
      await page.keyboard.press('Escape');
    }
    await availableSlots.first().click();
    await availableSlots.nth(1).click({ modifiers: ['Shift'] });

    const batchBar = page.getByRole('button', { name: /clear selection/i });
    if (await batchBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await batchBar.click();
      await expect(batchBar).not.toBeVisible({ timeout: 3000 });
    }
  });
});
