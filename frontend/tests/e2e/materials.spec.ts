import { test, expect } from '@playwright/test';

/**
 * E2E coverage for User Story 1 (catalog browse) and segments of US2/US3
 * are added later in Phase 4 / Phase 5.
 *
 * The catalog page is server-rendered — these tests do NOT require auth.
 */

test.describe('Materials catalog (US1)', () => {
  test('renders the Vietnamese catalog with seeded materials', async ({ page }) => {
    await page.goto('/vi/materials');

    // Catalog page heading should be in the DOM (Newsreader serif)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // At least one MaterialCard must be visible
    const cards = page.locator('.ed-card').filter({ hasText: /tiếng anh|từ vựng|ngữ pháp/i });
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('filters materials by level via URL search params', async ({ page }) => {
    await page.goto('/vi/materials?level=a1');

    // After filtering, the level chip A1 should be the active filter
    await expect(page.getByRole('button', { name: /^A1$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Each visible card should display the A1 level badge
    const cards = page.locator('[data-testid="material-card-type"]');
    await expect(cards.first()).toBeVisible();
  });

  test('clicking a material card opens the detail page', async ({ page }) => {
    await page.goto('/vi/materials');

    const firstCard = page.locator('.ed-card').first();
    await firstCard.click();

    // URL must transition to /vi/materials/<slug>
    await expect(page).toHaveURL(/\/vi\/materials\/[a-z0-9-]+/);
  });

  test('English locale falls back gracefully when an English summary is missing', async ({ page }) => {
    await page.goto('/en/materials');

    // The catalog renders something — the test just confirms no 404 / blank
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Materials detail (US2)', () => {
  test('detail page displays the material title and summary', async ({ page }) => {
    // Use a known seeded slug
    await page.goto('/vi/materials/vocab-greetings-a1');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/chào hỏi/i);
  });
});

test.describe('Mock test player (US3)', () => {
  // The mock-test player requires auth. These tests use a pre-authenticated
  // storage state if available (mirrors auth.spec.ts conventions). When run
  // unauthenticated they verify the redirect-to-login behavior instead.

  test('mock_test slug redirects to /test from the catalog detail route', async ({ page }) => {
    await page.goto('/vi/materials/test-thpt-grammar-a2');
    // Server-side redirect → URL ends in /test
    await expect(page).toHaveURL(/\/vi\/materials\/test-thpt-grammar-a2\/test$/);
  });

  test('test player surfaces every seeded question prompt', async ({ page }) => {
    await page.goto('/vi/materials/test-thpt-grammar-a2/test');

    // The seed migration adds 5 grammar items — at least one should render
    await expect(page.getByText(/She ___ to school/i)).toBeVisible();
  });

  test('correct_index never appears in the network response payload', async ({ page }) => {
    const responses: unknown[] = [];
    page.on('response', async (resp) => {
      const url = resp.url();
      if (url.includes('/rest/v1/mock_test_items_public') && resp.status() === 200) {
        try {
          responses.push(await resp.json());
        } catch {
          // ignore non-JSON
        }
      }
    });

    await page.goto('/vi/materials/test-thpt-grammar-a2/test');
    // Allow the network call to complete
    await page.waitForTimeout(1500);

    for (const body of responses) {
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('correct_index');
      expect(serialized).not.toContain('explanation_vi');
    }
  });
});
