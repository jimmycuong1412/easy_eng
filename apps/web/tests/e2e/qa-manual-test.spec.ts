import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, 'qa-screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`Screenshot saved: ${name}.png`);
  return filePath;
}

async function checkForErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  // Check for error text on page
  const errorTexts = ['Error', '500', '404', 'Something went wrong', 'Not Found'];
  const title = await page.title();

  for (const errorText of errorTexts) {
    if (title.includes(errorText)) {
      errors.push(`Page title contains error: ${title}`);
    }
  }

  // Check for visible error elements
  const errorEl = page.locator('[data-testid="error"], .error-boundary, [class*="error-page"]');
  if (await errorEl.count() > 0) {
    errors.push('Error boundary or error page detected');
  }

  return errors;
}

test.describe('EasyEng QA Testing Suite', () => {
  test.setTimeout(120000);

  // ========================================
  // STUDENT ACCOUNT TESTS
  // ========================================
  test.describe('Student Account Tests', () => {
    let page: Page;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      page.on('console', msg => {
        if (msg.type() === 'error') console.log(`Browser error: ${msg.text()}`);
      });
    });

    test.afterEach(async () => {
      await page.close();
    });

    test('S01 - Root redirect', async () => {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
      await takeScreenshot(page, 's01-root-redirect');
      const url = page.url();
      console.log(`Redirected to: ${url}`);
      // Should redirect to locale-prefixed URL
      expect(url).toMatch(/localhost:3000\/(en|vi)/);
    });

    test('S02 - Student Login', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await takeScreenshot(page, 's02-login-page');

      // Fill credentials
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await takeScreenshot(page, 's02b-login-filled');

      // Submit
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await takeScreenshot(page, 's02c-after-login');
      const url = page.url();
      console.log(`After login URL: ${url}`);
    });

    test('S03 - Student Dashboard', async () => {
      // Login first
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Navigate to dashboard
      await page.goto('http://localhost:3000/en/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 's03-student-dashboard');

      const errors = await checkForErrors(page);
      const url = page.url();
      console.log(`Dashboard URL: ${url}`);
      console.log(`Dashboard errors: ${errors.join(', ') || 'none'}`);

      // Check for gem balance widget
      const gemWidget = page.locator('[data-testid*="gem"], [class*="gem"], text=/gem/i').first();
      const hasGemWidget = await gemWidget.isVisible().catch(() => false);
      console.log(`Gem widget visible: ${hasGemWidget}`);
    });

    test('S04 - Class Catalog', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/classes', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 's04-class-catalog');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Classes URL: ${url}`);
      console.log(`Classes errors: ${errors.join(', ') || 'none'}`);
    });

    test('S05 - Student Bookings', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/student/bookings', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 's05-student-bookings');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Bookings URL: ${url}`);
      console.log(`Bookings errors: ${errors.join(', ') || 'none'}`);
    });

    test('S06 - Student Progress', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/student/progress', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 's06-student-progress');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Progress URL: ${url}`);
      console.log(`Progress errors: ${errors.join(', ') || 'none'}`);
    });

    test('S07 - Leaderboard', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/leaderboard', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 's07-leaderboard');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Leaderboard URL: ${url}`);
      console.log(`Leaderboard errors: ${errors.join(', ') || 'none'}`);
    });

    test('S08 - Learning Path', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/learning-path', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 's08-learning-path');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Learning path URL: ${url}`);
      console.log(`Learning path errors: ${errors.join(', ') || 'none'}`);
    });

    test('S09 - Sign Out (Student)', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Try to find sign out button
      const signOutSelectors = [
        'button:has-text("Sign out")',
        'button:has-text("Log out")',
        'button:has-text("Logout")',
        'a:has-text("Sign out")',
        '[data-testid="signout"]',
        '[data-testid="logout"]',
      ];

      let signedOut = false;
      for (const selector of signOutSelectors) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(3000);
          signedOut = true;
          break;
        }
      }

      if (!signedOut) {
        // Try user menu first
        const userMenu = page.locator('[data-testid="user-menu"], button[aria-label*="user"], button[aria-label*="profile"], .avatar').first();
        if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userMenu.click();
          await page.waitForTimeout(500);
          for (const selector of signOutSelectors) {
            const btn = page.locator(selector).first();
            if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await btn.click();
              await page.waitForTimeout(3000);
              signedOut = true;
              break;
            }
          }
        }
      }

      await takeScreenshot(page, 's09-after-signout');
      const url = page.url();
      console.log(`After signout URL: ${url}`);
      console.log(`Signed out: ${signedOut}`);
    });
  });

  // ========================================
  // TEACHER ACCOUNT TESTS
  // ========================================
  test.describe('Teacher Account Tests', () => {
    let page: Page;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
    });

    test.afterEach(async () => {
      await page.close();
    });

    test('T01 - Teacher Login', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1414@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await takeScreenshot(page, 't01-teacher-after-login');
      const url = page.url();
      console.log(`Teacher after login URL: ${url}`);
    });

    test('T02 - Teacher Dashboard', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1414@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 't02-teacher-dashboard');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Teacher dashboard URL: ${url}`);
      console.log(`Teacher dashboard errors: ${errors.join(', ') || 'none'}`);
    });

    test('T03 - Teacher Schedule', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1414@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/teacher/schedule', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 't03-teacher-schedule');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Teacher schedule URL: ${url}`);
      console.log(`Teacher schedule errors: ${errors.join(', ') || 'none'}`);
    });

    test('T04 - Teacher Quiz Create', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1414@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/teacher/quiz/create', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 't04-teacher-quiz-create');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Quiz create URL: ${url}`);
      console.log(`Quiz create errors: ${errors.join(', ') || 'none'}`);
    });
  });

  // ========================================
  // ADMIN ACCOUNT TESTS
  // ========================================
  test.describe('Admin Account Tests', () => {
    let page: Page;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
    });

    test.afterEach(async () => {
      await page.close();
    });

    test('A01 - Admin Login', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1412@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await takeScreenshot(page, 'a01-admin-after-login');
      const url = page.url();
      console.log(`Admin after login URL: ${url}`);
    });

    test('A02 - Admin Dashboard', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1412@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/dashboard/admin', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'a02-admin-dashboard');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Admin dashboard URL: ${url}`);
      console.log(`Admin dashboard errors: ${errors.join(', ') || 'none'}`);
    });

    test('A03 - Admin Analytics', async () => {
      await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1412@gmail.com');
      await page.fill('input[type="password"], input[name="password"]', '12345678');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      await page.goto('http://localhost:3000/en/admin/analytics', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'a03-admin-analytics');

      const url = page.url();
      const errors = await checkForErrors(page);
      console.log(`Admin analytics URL: ${url}`);
      console.log(`Admin analytics errors: ${errors.join(', ') || 'none'}`);
    });
  });
});
