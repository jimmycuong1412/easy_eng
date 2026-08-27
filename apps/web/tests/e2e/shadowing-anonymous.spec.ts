/**
 * Anonymous shadowing journey.
 *
 * Guards the property the whole feature depends on: a visitor with NO session
 * can reach a pack page and practise. Mic and SpeechRecognition are stubbed —
 * this asserts routing, rendering, and the wall, not audio quality.
 */

import { test, expect } from '@playwright/test';

const PACK_SLUG = 'job-interview';

test.describe('anonymous shadowing', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('hub is reachable without a session', async ({ page }) => {
    await page.goto('/vi/shadowing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luyện nói theo');
  });

  test('pack page renders clips without a session', async ({ page }) => {
    await page.goto(`/vi/shadowing/${PACK_SLUG}`);
    await expect(page.getByTestId('rep-record')).toBeVisible();
    await expect(page.getByTestId('rep-play')).toBeVisible();
    // Server-rendered transcript is present for SEO.
    await expect(page.getByText('Các câu trong gói này')).toBeVisible();
  });

  test('does not redirect anonymous visitors to login', async ({ page }) => {
    const response = await page.goto(`/vi/shadowing/${PACK_SLUG}`);
    await expect(page).not.toHaveURL(/\/auth\/login/);
    // The URL check alone also passes on a 500, which would make a broken page
    // indistinguishable from a working one. Assert the page actually served.
    expect(response?.status()).toBeLessThan(400);
  });

  test('shows the signup wall once the daily limit is stored', async ({ page }) => {
    await page.goto(`/vi/shadowing/${PACK_SLUG}`);

    await page.evaluate(() => {
      // Vietnam-local date, matching anonProgress.today() (see Task 7).
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      window.localStorage.setItem(
        'easyeng.shadowing.anon',
        JSON.stringify({
          date: today,
          attempts: [
            { clipId: 'a', overall: 80 },
            { clipId: 'b', overall: 70 },
            { clipId: 'c', overall: 90 },
          ],
        }),
      );
    });

    await page.reload();
    await expect(page.getByTestId('wall-signup')).toBeVisible();
    await expect(page.getByText('90%')).toBeVisible();
  });

  test('shows no signed-in progress UI to an anonymous visitor', async ({ page }) => {
    // Phase B added a progress strip and attempt recording. Neither may appear
    // for a visitor with no session — the anonymous path is the ad landing
    // surface and must stay exactly as it was.
    await page.goto(`/vi/shadowing/${PACK_SLUG}`);
    await expect(page.getByTestId('progress-count')).toHaveCount(0);
    await expect(page.getByTestId('progress-carried')).toHaveCount(0);
  });
});
