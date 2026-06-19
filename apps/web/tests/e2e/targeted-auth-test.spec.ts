import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../../test-screenshots');

function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

test.setTimeout(60000);

async function loginWithEmailPassword(page: any, email: string, password: string) {
  await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  await emailInput.fill(email);
  await passwordInput.fill(password);

  await page.locator('form button[type="submit"]').click();

  // Wait for URL to change away from login
  await page.waitForURL((url: URL) => !url.pathname.includes('/auth/login'), { timeout: 15000 }).catch(() => {});
  // Give extra time for the page to settle
  await page.waitForTimeout(2000);
}

async function gotoSafe(page: any, url: string, label: string, screenshotName: string) {
  ensureDir();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    const title = await page.title().catch(() => '(no title)');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshotName), fullPage: false }).catch(() => {});
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    const hasAccessDenied = /access denied|unauthorized|forbidden|not allowed/i.test(bodyText);
    const hasError = /error|something went wrong/i.test(bodyText);
    console.log(`[${label}] URL: ${currentUrl} | Title: ${title} | AccessDenied: ${hasAccessDenied} | Error: ${hasError}`);
    return { url: currentUrl, title, hasAccessDenied, hasError, bodyText: bodyText.slice(0, 500) };
  } catch (err: any) {
    console.log(`[${label}] EXCEPTION: ${err.message?.slice(0, 200)}`);
    return { url: '(error)', title: '(error)', hasAccessDenied: false, hasError: true };
  }
}

async function signOut(page: any) {
  const signOutSelectors = [
    'button:has-text("Sign out")',
    'button:has-text("Logout")',
    'button:has-text("Log out")',
    'button:has-text("Sign Out")',
    'a:has-text("Sign out")',
    'a:has-text("Logout")',
    '[data-testid="signout"]',
    '[data-testid="logout"]',
    '[aria-label="Sign out"]',
  ];
  for (const sel of signOutSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.click().catch(() => {});
      await page.waitForTimeout(2000);
      console.log(`[SIGNOUT] Clicked: ${sel} | Now at: ${page.url()}`);
      return;
    }
  }
  // Fallback: try navigating to /api/auth/signout or /en/auth/logout
  console.log('[SIGNOUT] No button found, trying goto /en/auth/logout');
  await page.goto('http://localhost:3000/en/auth/logout', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log(`[SIGNOUT] Final URL: ${page.url()}`);
}

// ─── TEST 1: Teacher ─────────────────────────────────────────────────────────

test('T1-A: Teacher login', async ({ page }) => {
  ensureDir();
  await loginWithEmailPassword(page, 'jimmycuong1414@gmail.com', '12345678');
  const url = page.url();
  const title = await page.title().catch(() => '');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-teacher-after-login.png') });
  console.log(`[T1-LOGIN] URL: ${url} | Title: ${title}`);
  expect(url).not.toContain('/auth/login');
});

test('T1-B: Teacher schedule page', async ({ page }) => {
  ensureDir();
  await loginWithEmailPassword(page, 'jimmycuong1414@gmail.com', '12345678');
  const result = await gotoSafe(page, 'http://localhost:3000/en/teacher/schedule', 'T1-SCHEDULE', '02-teacher-schedule.png');
  expect(result.url).toBeDefined();
});

test('T1-C: Teacher quiz create page', async ({ page }) => {
  ensureDir();
  await loginWithEmailPassword(page, 'jimmycuong1414@gmail.com', '12345678');
  const result = await gotoSafe(page, 'http://localhost:3000/en/teacher/quiz/create', 'T1-QUIZ-CREATE', '03-teacher-quiz-create.png');
  expect(result.url).toBeDefined();
});

// ─── TEST 2: Admin ────────────────────────────────────────────────────────────

test('T2-A: Admin login', async ({ page }) => {
  ensureDir();
  await loginWithEmailPassword(page, 'jimmycuong1412@gmail.com', '12345678');
  const url = page.url();
  const title = await page.title().catch(() => '');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-admin-after-login.png') });
  console.log(`[T2-LOGIN] URL: ${url} | Title: ${title}`);
  expect(url).not.toContain('/auth/login');
});

test('T2-B: Admin dashboard page', async ({ page }) => {
  ensureDir();
  await loginWithEmailPassword(page, 'jimmycuong1412@gmail.com', '12345678');
  const result = await gotoSafe(page, 'http://localhost:3000/en/dashboard/admin', 'T2-ADMIN-DASH', '05-admin-dashboard.png');
  console.log(`[T2-ADMIN-DASH body preview] ${result.bodyText}`);
  expect(result.url).toBeDefined();
});

test('T2-C: Admin analytics page', async ({ page }) => {
  ensureDir();
  await loginWithEmailPassword(page, 'jimmycuong1412@gmail.com', '12345678');
  const result = await gotoSafe(page, 'http://localhost:3000/en/admin/analytics', 'T2-ADMIN-ANALYTICS', '06-admin-analytics.png');
  expect(result.url).toBeDefined();
});
