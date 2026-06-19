/**
 * QA Detail Test - Get detailed content for all pages
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, 'qa-detail-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const BASE = 'http://localhost:3000';

async function ss(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: true });
}

async function getDetail(page: Page) {
  const url = page.url();
  const bodyText = await page.evaluate(() => document.body.innerText.trim().substring(0, 800));
  const hasErrorBoundary = bodyText.includes('Something went wrong') || bodyText.includes('unexpected error');
  const has404 = bodyText.includes('404') || bodyText.includes('This page could not be found');
  const isLoginPage = url.includes('/auth/login');
  const isUnauthorized = url.includes('/unauthorized');
  return { url, bodyText, hasErrorBoundary, has404, isLoginPage, isUnauthorized };
}

async function attemptLogin(page: Page, email: string, pw: string): Promise<boolean> {
  await page.goto(`${BASE}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pw);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 12000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// STUDENT
// ─────────────────────────────────────────────────────────
test.describe('STUDENT - Detailed Page Checks', () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
    const ok = await attemptLogin(page, 'jimmycuong1413@gmail.com', '12345678');
    console.log(`[STUDENT] Login: ${ok ? 'SUCCESS' : 'FAILED'} -> ${page.url()}`);
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test('S02 /en/dashboard', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'S02-student-dashboard');
    const d = await getDetail(page);
    console.log(`[S02 Dashboard]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('S03 /en/classes', async () => {
    await page.goto(`${BASE}/en/classes`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'S03-student-classes');
    const d = await getDetail(page);
    console.log(`[S03 Classes]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('S04 /en/student/bookings', async () => {
    await page.goto(`${BASE}/en/student/bookings`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'S04-student-bookings');
    const d = await getDetail(page);
    console.log(`[S04 Bookings]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('S05 /en/student/progress', async () => {
    await page.goto(`${BASE}/en/student/progress`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'S05-student-progress');
    const d = await getDetail(page);
    console.log(`[S05 Progress]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('S06 /en/leaderboard', async () => {
    await page.goto(`${BASE}/en/leaderboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'S06-student-leaderboard');
    const d = await getDetail(page);
    console.log(`[S06 Leaderboard]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('S07 /en/learning-path', async () => {
    await page.goto(`${BASE}/en/learning-path`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'S07-student-learning-path');
    const d = await getDetail(page);
    console.log(`[S07 Learning Path]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('S08 /en/notifications', async () => {
    await page.goto(`${BASE}/en/notifications`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'S08-student-notifications');
    const d = await getDetail(page);
    console.log(`[S08 Notifications]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('S09 /en/student/gems/history', async () => {
    await page.goto(`${BASE}/en/student/gems/history`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'S09-student-gems-history');
    const d = await getDetail(page);
    console.log(`[S09 Gem History]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('S10 Sign Out', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const logoutBtn = page.locator('a:has-text("Log out"), button:has-text("Log out")').first();
    const visible = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      console.log(`[S10 Sign Out] SUCCESS -> ${page.url()}`);
    } else {
      console.log(`[S10 Sign Out] Logout button not found`);
    }
    await ss(page, 'S10-student-signout');
  });
});

// ─────────────────────────────────────────────────────────
// TEACHER
// ─────────────────────────────────────────────────────────
test.describe('TEACHER - Detailed Page Checks', () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
    const ok = await attemptLogin(page, 'jimmycuong1414@gmail.com', '12345678');
    console.log(`[TEACHER] Login: ${ok ? 'SUCCESS' : 'FAILED'} -> ${page.url()}`);
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test('T01 Dashboard after login', async () => {
    const d = await getDetail(page);
    await ss(page, 'T01-teacher-dashboard');
    console.log(`[T01 Dashboard]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('T02 /en/teacher/schedule', async () => {
    await page.goto(`${BASE}/en/teacher/schedule`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'T02-teacher-schedule');
    const d = await getDetail(page);
    console.log(`[T02 Schedule]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('T03 /en/teacher/quiz/create', async () => {
    await page.goto(`${BASE}/en/teacher/quiz/create`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'T03-teacher-quiz-create');
    const d = await getDetail(page);
    console.log(`[T03 Quiz Create]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('T04 Sign Out', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const logoutBtn = page.locator('a:has-text("Log out"), button:has-text("Log out")').first();
    const visible = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      console.log(`[T04 Sign Out] SUCCESS -> ${page.url()}`);
    } else {
      console.log(`[T04 Sign Out] Logout button not found`);
    }
    await ss(page, 'T04-teacher-signout');
  });
});

// ─────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────
test.describe('ADMIN - Detailed Page Checks', () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
    const ok = await attemptLogin(page, 'jimmycuong1412@gmail.com', '12345678');
    console.log(`[ADMIN] Login: ${ok ? 'SUCCESS' : 'FAILED'} -> ${page.url()}`);
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test('A01 Dashboard after login', async () => {
    const d = await getDetail(page);
    await ss(page, 'A01-admin-post-login');
    console.log(`[A01 Post-Login]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('A02 /en/admin/analytics', async () => {
    await page.goto(`${BASE}/en/admin/analytics`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'A02-admin-analytics');
    const d = await getDetail(page);
    console.log(`[A02 Analytics]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Content: ${d.bodyText}`);
  });

  test('A03 /en/dashboard/admin', async () => {
    await page.goto(`${BASE}/en/dashboard/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'A03-admin-dashboard-admin');
    const d = await getDetail(page);
    console.log(`[A03 Admin Dashboard]\n  URL: ${d.url}\n  Error: ${d.hasErrorBoundary}\n  Unauthorized: ${d.isUnauthorized}\n  Content: ${d.bodyText}`);
  });

  test('A04 Sign Out', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const logoutBtn = page.locator('a:has-text("Log out"), button:has-text("Log out")').first();
    const visible = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      console.log(`[A04 Sign Out] SUCCESS -> ${page.url()}`);
    } else {
      console.log(`[A04 Sign Out] Logout button not found`);
    }
    await ss(page, 'A04-admin-signout');
  });
});
