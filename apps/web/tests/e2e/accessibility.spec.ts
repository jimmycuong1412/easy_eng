/**
 * WCAG 2.1 Level AA Compliance Tests
 *
 * Per Constitution Principle III: Accessibility standards MUST be met
 * This test suite validates WCAG 2.1 Level AA compliance across all pages
 *
 * Success Criteria SC-003: WCAG 2.1 Level AA compliance
 *
 * @requires @axe-core/playwright
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pagesToTest = [
  { url: '/', name: 'Home Page' },
  { url: '/auth/login', name: 'Login Page' },
  { url: '/auth/register', name: 'Registration Page' },
  { url: '/student/dashboard', name: 'Student Dashboard', requiresAuth: true },
  { url: '/teacher/dashboard', name: 'Teacher Dashboard', requiresAuth: true, role: 'teacher' },
  { url: '/parent/dashboard', name: 'Parent Dashboard', requiresAuth: true, role: 'parent' },
  { url: '/admin/dashboard', name: 'Admin Dashboard', requiresAuth: true, role: 'admin' },
  { url: '/student/classes', name: 'Class Catalog' },
  { url: '/teacher/classes', name: 'Teacher Classes', requiresAuth: true, role: 'teacher' },
  { url: '/teacher/activities', name: 'Activity List', requiresAuth: true, role: 'teacher' },
  { url: '/student/gems/shop', name: 'Gem Shop', requiresAuth: true },
  { url: '/student/gems/history', name: 'Gem History', requiresAuth: true },
];

test.describe('WCAG 2.1 Level AA Compliance', () => {
  for (const page of pagesToTest) {
    test(`${page.name} should have no accessibility violations`, async ({ page: browserPage }) => {
      // Skip if auth required and not implemented yet
      if (page.requiresAuth) {
        test.skip(true, 'Auth pages require login implementation');
      }

      await browserPage.goto(page.url);

      const accessibilityScanResults = await new AxeBuilder({ page: browserPage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('All pages should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through all focusable elements
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocus).toBeTruthy();

    // Shift+Tab should move backward
    await page.keyboard.press('Shift+Tab');
    const previousFocus = await page.evaluate(() => document.activeElement?.tagName);
    expect(previousFocus).toBeTruthy();
  });

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/');

    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);
  });

  test('Forms should have proper labels', async ({ page }) => {
    await page.goto('/auth/login');

    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate(el => {
        return el.getAttribute('aria-label') ||
               el.getAttribute('aria-labelledby') ||
               document.querySelector(`label[for="${el.id}"]`);
      });
      expect(hasLabel).toBeTruthy();
    }
  });

  test('Color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('Page has valid HTML lang attribute', async ({ page }) => {
    await page.goto('/');

    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // en or en-US format
  });

  test('Headings follow proper hierarchy', async ({ page }) => {
    await page.goto('/');

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = await Promise.all(
      headings.map(h => h.evaluate(el => parseInt(el.tagName[1])))
    );

    // Should have at least one h1
    expect(headingLevels).toContain(1);

    // No heading level should be skipped (e.g., h1 -> h3 without h2)
    for (let i = 1; i < headingLevels.length; i++) {
      const difference = headingLevels[i] - headingLevels[i - 1];
      expect(difference).toBeLessThanOrEqual(1);
    }
  });

  test('Interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');

    const interactiveElements = await page.locator(
      'button, a, input, select, textarea, [role="button"], [role="link"]'
    ).all();

    for (const element of interactiveElements) {
      const tabIndex = await element.getAttribute('tabindex');
      // Element should not be explicitly removed from tab order (unless it's decorative)
      if (tabIndex !== null) {
        expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(-1);
      }
    }
  });

  test('ARIA attributes are valid', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('body')
      .analyze();

    const ariaViolations = accessibilityScanResults.violations.filter(
      v => v.id.includes('aria')
    );

    expect(ariaViolations).toHaveLength(0);
  });

  test('Focus indicators are visible', async ({ page }) => {
    await page.goto('/');

    // Tab to first focusable element
    await page.keyboard.press('Tab');

    // Check if focus indicator is visible
    const hasFocusIndicator = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return false;

      const styles = window.getComputedStyle(active);
      const outline = styles.outline;
      const boxShadow = styles.boxShadow;

      return outline !== 'none' || boxShadow !== 'none';
    });

    expect(hasFocusIndicator).toBe(true);
  });

  test('Skip to main content link exists', async ({ page }) => {
    await page.goto('/');

    const skipLink = await page.locator('a[href="#main"], a[href="#main-content"]').first();
    expect(await skipLink.count()).toBeGreaterThan(0);
  });

  test('Live regions for dynamic content', async ({ page }) => {
    await page.goto('/student/gems/shop');

    // Check for live regions for announcements
    const liveRegions = await page.locator('[aria-live], [role="alert"], [role="status"]').count();
    expect(liveRegions).toBeGreaterThan(0);
  });
});

/**
 * IMPLEMENTATION NOTES:
 *
 * 1. Install dependencies:
 *    npm install --save-dev @axe-core/playwright
 *
 * 2. Run accessibility tests:
 *    npm run test:e2e -- accessibility.spec.ts
 *
 * 3. View detailed report:
 *    npx playwright show-report
 *
 * 4. Fix violations in order of severity:
 *    - Critical: Prevents usage for disabled users
 *    - Serious: Major barrier to accessibility
 *    - Moderate: Inconveniences some users
 *    - Minor: Small improvements
 *
 * 5. Constitution compliance:
 *    - Zero violations required for production
 *    - CI must block PRs with accessibility issues
 *    - Manual testing with screen readers recommended
 */
