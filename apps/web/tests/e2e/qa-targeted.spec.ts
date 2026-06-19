/**
 * Targeted QA Test - Handles disabled-initially login forms
 * Waits for Supabase client to initialize before interacting with form
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, 'qa-targeted-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const BASE = 'http://localhost:3000';

async function ss(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
  console.log(`[SS] ${name}.png`);
}

async function getState(page: Page) {
  const url = page.url();
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 600));
  const hasError = bodyText.includes('Something went wrong') || bodyText.includes('An error occurred');
  const has404 = bodyText.includes('This page could not be found') || title.includes('404');
  return { url, title, bodyText, hasError, has404 };
}

async function loginAs(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto(`${BASE}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Wait for form to be enabled (Supabase client initializes and sets isLoading=false)
  try {
    await page.waitForSelector('input[type="email"]:not([disabled])', { timeout: 10000 });
  } catch {
    console.log('[WARN] Email input did not become enabled within 10s');
  }

  await page.waitForTimeout(500);

  try {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await ss(page, 'login-filled-' + email.split('@')[0]);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 15000 });
    return true;
  } catch (e: any) {
    console.log('[FAIL] Login failed: ' + (e.message || '').slice(0, 100));
    return false;
  }
}

// ============================================================
// PART 1: ENV CHECK
// ============================================================
test('PART1: Login page renders (env check)', async ({ page }) => {
  await page.goto(`${BASE}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await ss(page, '00-login-page');

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));
  const hasErrorBoundary = bodyText.includes('Something went wrong');

  if (hasErrorBoundary) {
    console.log('[FAIL] CRITICAL: Error boundary on login page - DEV SERVER ENV NOT LOADED');
    console.log('Body: ' + bodyText.slice(0, 200));
  } else {
    console.log('[PASS] Login page renders without error boundary');
    console.log('Title: ' + (await page.title()));
  }

  const emailVisible = await page.locator('input[type="email"]').isVisible({ timeout: 2000 }).catch(() => false);
  const pwVisible = await page.locator('input[type="password"]').isVisible({ timeout: 2000 }).catch(() => false);
  const btnVisible = await page.locator('button[type="submit"]').isVisible({ timeout: 2000 }).catch(() => false);

  console.log(`[${emailVisible ? 'PASS' : 'FAIL'}] Email input visible`);
  console.log(`[${pwVisible ? 'PASS' : 'FAIL'}] Password input visible`);
  console.log(`[${btnVisible ? 'PASS' : 'FAIL'}] Submit button visible`);

  expect(hasErrorBoundary).toBe(false);
});

// ============================================================
// PART 2: STUDENT ACCOUNT
// ============================================================
test.describe('PART2: Student Account', () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
  });

  test.afterAll(async () => { await ctx.close(); });

  test('S01: Student login', async () => {
    const success = await loginAs(page, 'jimmycuong1413@gmail.com', '12345678');
    await ss(page, 's01-after-login');
    const url = page.url();
    console.log(`[${success ? 'PASS' : 'FAIL'}] Student login -> ${url}`);
    expect(success).toBe(true);
  });

  test('S02: Dashboard', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 's02-dashboard');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Dashboard | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 300));
  });

  test('S03: Classes /en/classes', async () => {
    await page.goto(`${BASE}/en/classes`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 's03-classes');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Classes | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 200));
  });

  test('S04: Student bookings /en/student/bookings', async () => {
    await page.goto(`${BASE}/en/student/bookings`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 's04-bookings');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Bookings | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 200));
  });

  test('S05: Student progress /en/student/progress', async () => {
    await page.goto(`${BASE}/en/student/progress`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 's05-progress');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Progress | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 200));
  });

  test('S06: Leaderboard /en/leaderboard', async () => {
    await page.goto(`${BASE}/en/leaderboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await ss(page, 's06-leaderboard');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Leaderboard | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 200));
  });

  test('S07: Learning path /en/learning-path', async () => {
    await page.goto(`${BASE}/en/learning-path`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 's07-learning-path');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Learning path | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 200));
  });

  test('S08: Gem history /en/student/gems/history', async () => {
    await page.goto(`${BASE}/en/student/gems/history`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 's08-gems');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Gems | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 200));
  });

  test('S09: Notifications /en/notifications', async () => {
    await page.goto(`${BASE}/en/notifications`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 's09-notifications');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Notifications | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 200));
  });

  test('S10: Sign out', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const logoutBtn = page.locator('button:has-text("Log out"), a:has-text("Log out"), button:has-text("Sign out"), a:has-text("Sign out")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(3000);
      await ss(page, 's10-signout');
      console.log('[PASS] Student signed out -> ' + page.url());
    } else {
      await ss(page, 's10-signout-notfound');
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
      console.log('[WARN] Logout button not found. Body: ' + bodyText);
    }
  });
});

// ============================================================
// PART 3: TEACHER ACCOUNT
// ============================================================
test.describe('PART3: Teacher Account', () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
  });

  test.afterAll(async () => { await ctx.close(); });

  test('T01: Teacher login', async () => {
    const success = await loginAs(page, 'jimmycuong1414@gmail.com', '12345678');
    await ss(page, 't01-after-login');
    console.log(`[${success ? 'PASS' : 'FAIL'}] Teacher login -> ${page.url()}`);
    expect(success).toBe(true);
  });

  test('T02: Teacher dashboard', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 't02-dashboard');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Teacher dashboard | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 300));
  });

  test('T03: Teacher schedule /en/teacher/schedule', async () => {
    await page.goto(`${BASE}/en/teacher/schedule`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 't03-schedule');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Teacher schedule | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 200));
  });

  test('T04: Teacher quiz create /en/teacher/quiz/create', async () => {
    await page.goto(`${BASE}/en/teacher/quiz/create`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 't04-quiz-create');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Quiz create | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 200));
  });

  test('T05: Teacher sign out', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const logoutBtn = page.locator('button:has-text("Log out"), a:has-text("Log out")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 't05-signout');
      console.log('[PASS] Teacher signed out -> ' + page.url());
    } else {
      console.log('[WARN] Teacher logout button not found');
      await ss(page, 't05-signout-notfound');
    }
  });
});

// ============================================================
// PART 4: ADMIN ACCOUNT
// ============================================================
test.describe('PART4: Admin Account', () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
  });

  test.afterAll(async () => { await ctx.close(); });

  test('A01: Admin login', async () => {
    const success = await loginAs(page, 'jimmycuong1412@gmail.com', '12345678');
    await ss(page, 'a01-after-login');
    console.log(`[${success ? 'PASS' : 'FAIL'}] Admin login -> ${page.url()}`);
    expect(success).toBe(true);
  });

  test('A02: Admin dashboard /en/dashboard/admin', async () => {
    await page.goto(`${BASE}/en/dashboard/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 'a02-admin-dashboard');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Admin dashboard | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 300));
  });

  test('A03: Admin analytics /en/admin/analytics', async () => {
    await page.goto(`${BASE}/en/admin/analytics`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);
    await ss(page, 'a03-analytics');
    const state = await getState(page);
    console.log(`[${!state.hasError && !state.has404 ? 'PASS' : 'FAIL'}] Analytics | url=${state.url}`);
    console.log('Body: ' + state.bodyText.slice(0, 300));
  });

  test('A04: Admin sign out', async () => {
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const logoutBtn = page.locator('button:has-text("Log out"), a:has-text("Log out")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'a04-signout');
      console.log('[PASS] Admin signed out -> ' + page.url());
    } else {
      console.log('[WARN] Admin logout button not found');
      await ss(page, 'a04-signout-notfound');
    }
  });
});
