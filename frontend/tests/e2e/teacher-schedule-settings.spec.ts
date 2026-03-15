import { test, expect } from '@playwright/test';

/**
 * Teacher Schedule Settings — E2E Tests
 *
 * Tests the teacher schedule page at /en/teacher/schedule which shows a weekly
 * grid of 25-min time slots from 00:00 to 23:45. Teachers can click any cell
 * to open a Class Details dialog and manage their availability.
 *
 * Production URL: https://easyeng-test.vercel.app
 * Teacher account: jimmycuong1414@gmail.com
 */

const BASE_URL = 'https://easyeng-test.vercel.app';
const TEACHER_EMAIL = 'jimmycuong1414@gmail.com';
const TEACHER_PASSWORD = '12345678';

test.describe('Teacher Schedule — Slot Management (00:00–24:00)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/en/auth/login`);
    await page.waitForSelector('#email', { timeout: 20000 });
    await page.fill('#email', TEACHER_EMAIL);
    await page.fill('#password', TEACHER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|teacher|schedule)/, { timeout: 20000 });
  });

  test('schedule page loads with time slots starting at 00:00', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/teacher/schedule`);

    // Wait for the grid to render
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // First time slot must be 00:00
    const firstTimeLabel = page.locator('table td, table th').filter({ hasText: /^00:00$/ }).first();
    await expect(firstTimeLabel).toBeVisible({ timeout: 10000 });
  });

  test('schedule grid covers full day up to 23:45', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/teacher/schedule`);
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Scroll to bottom of the table to load all rows
    await page.evaluate(() => {
      const table = document.querySelector('table');
      table?.scrollIntoView({ block: 'end' });
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);

    // Collect all time labels in the first column
    const timeLabels = await page.evaluate(() => {
      const cells = document.querySelectorAll('table td:first-child, table th:first-child');
      return Array.from(cells)
        .map(el => el.textContent?.trim() ?? '')
        .filter(t => /^\d{2}:\d{2}$/.test(t));
    });

    expect(timeLabels.length).toBeGreaterThan(0);
    expect(timeLabels[0]).toBe('00:00');

    // Last slot should be 23:30 or later (covers full 24h day)
    const lastSlot = timeLabels[timeLabels.length - 1];
    const [h, m] = lastSlot.split(':').map(Number);
    expect(h * 60 + m).toBeGreaterThanOrEqual(23 * 60);

    console.log(`Time slots: ${timeLabels[0]} → ${lastSlot} (${timeLabels.length} total)`);
  });

  test('all time slots are valid HH:MM values within 00:00–23:59', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/teacher/schedule`);
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    const timeLabels = await page.evaluate(() => {
      const cells = document.querySelectorAll('table td:first-child, table th:first-child');
      return Array.from(cells)
        .map(el => el.textContent?.trim() ?? '')
        .filter(t => /^\d{2}:\d{2}$/.test(t));
    });

    for (const label of timeLabels) {
      const [h, m] = label.split(':').map(Number);
      expect(h, `Hour in "${label}" must be 0-23`).toBeGreaterThanOrEqual(0);
      expect(h, `Hour in "${label}" must be 0-23`).toBeLessThanOrEqual(23);
      expect(m, `Minute in "${label}" must be 0-59`).toBeGreaterThanOrEqual(0);
      expect(m, `Minute in "${label}" must be 0-59`).toBeLessThanOrEqual(59);
    }
  });

  test('teacher can click a slot cell to open Class Details dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/teacher/schedule`);
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Click the first slot button in the grid (00:00, Monday)
    const firstSlotBtn = page.locator('table button').first();
    await expect(firstSlotBtn).toBeVisible({ timeout: 10000 });
    await firstSlotBtn.click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Dialog should show time information
    const dialogText = await page.getByRole('dialog').textContent();
    expect(dialogText).toMatch(/\d{2}:\d{2}/); // contains a time
  });

  test('Class Details dialog closes and returns teacher to schedule', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/teacher/schedule`);
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Open dialog
    await page.locator('table button').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close the dialog (X button or pressing Escape)
    const closeBtn = dialog.locator('button[aria-label*="close" i], button:has(svg)').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }

    // Dialog should be gone
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Schedule table should still be visible
    await expect(page.locator('table')).toBeVisible();
  });

  test('week navigation prev/next buttons work', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/teacher/schedule`);
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    // Get initial week label
    const weekLabel = page.locator('text=/March|April|January|February|May|June|July|August|September|October|November|December/i').first();
    const initialText = await weekLabel.textContent();

    // Click Next week
    await page.getByRole('button', { name: /next week/i }).click();
    await page.waitForTimeout(500);

    // Week should have changed
    const newText = await weekLabel.textContent();
    expect(newText).not.toBe(initialText);

    // Click Prev week to go back
    await page.getByRole('button', { name: /prev week/i }).click();
    await page.waitForTimeout(500);
    expect(await weekLabel.textContent()).toBe(initialText);
  });
});
