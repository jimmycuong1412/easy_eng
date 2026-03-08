/**
 * QA Report Test Suite
 * Tests all major features for student, teacher, and admin accounts.
 * Loads .env.local via dotenv to ensure NEXT_PUBLIC_* vars are available.
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load env vars from .env.local so NEXT_PUBLIC_* are available
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const SCREENSHOTS_DIR = path.join(__dirname, 'qa-report-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const BASE = 'http://localhost:3000';

async function screenshot(page: Page, name: string) {
  await page.waitForTimeout(1500);
  const fp = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: fp, fullPage: false });
  console.log(`[SS] ${name}.png`);
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait for form to be interactive
  await page.waitForSelector('input[type="email"]:not([disabled])', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login
  await page.waitForURL(url => !url.includes('/auth/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 });
}

async function visitAndCapture(page: Page, path_: string, name: string): Promise<{
  url: string;
  title: string;
  hasError: boolean;
  errorText: string;
}> {
  await page.goto(`${BASE}${path_}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);
  await screenshot(page, name);

  const url = page.url();
  const title = await page.title();

  // Check for error indicators
  const errorIndicators = [
    page.locator('text="Something went wrong"').first(),
    page.locator('text="An error occurred"').first(),
    page.locator('text="404"').first(),
    page.locator('text="500"').first(),
    page.locator('[data-error-boundary]').first(),
  ];

  let hasError = false;
  let errorText = '';

  for (const el of errorIndicators) {
    if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
      hasError = true;
      errorText = await el.textContent() || 'Error detected';
      break;
    }
  }

  // Also check page title
  if (title.includes('404') || title.includes('500') || title.includes('Error')) {
    hasError = true;
    errorText = `Page title: ${title}`;
  }

  console.log(`[${hasError ? 'FAIL' : 'PASS'}] ${path_} -> ${url} | title="${title}"`);
  return { url, title, hasError, errorText };
}

// ============================================================
// STUDENT TESTS
// ============================================================
test.describe('Student Account', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('S01: Root redirect (unauthenticated)', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, 's01-root');
    const url = page.url();
    console.log(`[INFO] Root -> ${url}`);
    // Should redirect to either landing or login
    expect(url).toMatch(/localhost:3000/);
  });

  test('S02: Login page renders', async () => {
    await page.goto(`${BASE}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    await screenshot(page, 's02-login-page');
    // Check if error boundary triggered
    const errorVisible = await page.locator('text="Something went wrong"').isVisible({ timeout: 2000 }).catch(() => false);
    if (errorVisible) {
      console.log('[FAIL] Login page shows error boundary - env vars not injected into client');
    } else {
      console.log('[PASS] Login page renders');
    }
  });

  test('S03: Student login and dashboard', async () => {
    try {
      await login(page, 'jimmycuong1413@gmail.com', '12345678');
      await screenshot(page, 's03-after-login');
      console.log(`[INFO] After student login: ${page.url()}`);

      // Navigate to dashboard
      await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      await screenshot(page, 's03b-student-dashboard');

      const result = await visitAndCapture(page, '/en/dashboard', 's03c-dashboard-check');
      expect(result.hasError).toBe(false);
    } catch (e: any) {
      await screenshot(page, 's03-login-failed');
      console.log(`[FAIL] Student login failed: ${e.message}`);
      throw e;
    }
  });

  test('S04: Class catalog /en/classes', async () => {
    const result = await visitAndCapture(page, '/en/classes', 's04-classes');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Classes page`);
  });

  test('S05: Student bookings /en/student/bookings', async () => {
    const result = await visitAndCapture(page, '/en/student/bookings', 's05-bookings');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Bookings page`);
  });

  test('S06: Student progress /en/student/progress', async () => {
    const result = await visitAndCapture(page, '/en/student/progress', 's06-progress');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Progress page`);
  });

  test('S07: Leaderboard /en/leaderboard', async () => {
    const result = await visitAndCapture(page, '/en/leaderboard', 's07-leaderboard');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Leaderboard page`);
  });

  test('S08: Learning path /en/learning-path', async () => {
    const result = await visitAndCapture(page, '/en/learning-path', 's08-learning-path');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Learning path page`);
  });

  test('S09: Student gems history /en/student/gems/history', async () => {
    const result = await visitAndCapture(page, '/en/student/gems/history', 's09-gems-history');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Gems history page`);
  });

  test('S10: Sign out', async () => {
    // Try sidebar/header sign out
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Look for logout button anywhere on page
    const logoutBtn = page.locator('button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Log out"), a:has-text("Sign out")').first();
    const logoutVisible = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!logoutVisible) {
      // Try clicking user avatar/menu
      const userAvatar = page.locator('button[aria-label*="user" i], button[aria-label*="profile" i], [data-testid="user-menu"], .user-menu, button img[alt*="avatar" i]').first();
      if (await userAvatar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userAvatar.click();
        await page.waitForTimeout(500);
      }
    }

    const finalLogout = page.locator('button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Log out"), a:has-text("Sign out")').first();
    if (await finalLogout.isVisible({ timeout: 2000 }).catch(() => false)) {
      await finalLogout.click();
      await page.waitForTimeout(3000);
      await screenshot(page, 's10-after-signout');
      const urlAfter = page.url();
      console.log(`[INFO] After signout: ${urlAfter}`);
      const onLoginOrHome = urlAfter.includes('/auth/login') || urlAfter.includes('/en') || urlAfter === BASE + '/';
      console.log(`[${onLoginOrHome ? 'PASS' : 'WARN'}] Signout redirect: ${urlAfter}`);
    } else {
      await screenshot(page, 's10-signout-not-found');
      console.log('[WARN] Could not find signout button');
    }
  });
});

// ============================================================
// TEACHER TESTS
// ============================================================
test.describe('Teacher Account', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('T01: Teacher login', async () => {
    try {
      await login(page, 'jimmycuong1414@gmail.com', '12345678');
      await screenshot(page, 't01-teacher-after-login');
      console.log(`[INFO] Teacher after login: ${page.url()}`);
    } catch (e: any) {
      await screenshot(page, 't01-teacher-login-failed');
      console.log(`[FAIL] Teacher login failed: ${e.message}`);
      throw e;
    }
  });

  test('T02: Teacher dashboard', async () => {
    const result = await visitAndCapture(page, '/en/dashboard', 't02-teacher-dashboard');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Teacher dashboard`);
  });

  test('T03: Teacher schedule /en/teacher/schedule', async () => {
    const result = await visitAndCapture(page, '/en/teacher/schedule', 't03-teacher-schedule');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Teacher schedule`);
  });

  test('T04: Teacher quiz create /en/teacher/quiz/create', async () => {
    const result = await visitAndCapture(page, '/en/teacher/quiz/create', 't04-quiz-create');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Teacher quiz create`);
  });

  test('T05: Teacher sign out', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const logoutBtn = page.locator('button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Log out"), a:has-text("Sign out")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, 't05-teacher-signout');
      console.log(`[INFO] Teacher signout: ${page.url()}`);
    } else {
      console.log('[WARN] Teacher signout button not found');
    }
  });
});

// ============================================================
// ADMIN TESTS
// ============================================================
test.describe('Admin Account', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('A01: Admin login', async () => {
    try {
      await login(page, 'jimmycuong1412@gmail.com', '12345678');
      await screenshot(page, 'a01-admin-after-login');
      console.log(`[INFO] Admin after login: ${page.url()}`);
    } catch (e: any) {
      await screenshot(page, 'a01-admin-login-failed');
      console.log(`[FAIL] Admin login failed: ${e.message}`);
      throw e;
    }
  });

  test('A02: Admin dashboard /en/dashboard/admin', async () => {
    const result = await visitAndCapture(page, '/en/dashboard/admin', 'a02-admin-dashboard');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Admin dashboard`);
  });

  test('A03: Admin analytics /en/admin/analytics', async () => {
    const result = await visitAndCapture(page, '/en/admin/analytics', 'a03-admin-analytics');
    console.log(`[${result.hasError ? 'FAIL' : 'PASS'}] Admin analytics`);
  });

  test('A04: Admin sign out', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const logoutBtn = page.locator('button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Log out"), a:has-text("Sign out")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'a04-admin-signout');
      console.log(`[INFO] Admin signout: ${page.url()}`);
    } else {
      console.log('[WARN] Admin signout button not found');
    }
  });
});
