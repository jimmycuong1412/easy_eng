/**
 * QA Sequential Test - runs all account tests in a single test with persistent session
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'qa-sequential-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
}

async function getBodyText(page: Page, limit = 600): Promise<string> {
  return page.evaluate((lim) => document.body.innerText.trim().substring(0, lim), limit).catch(() => '');
}

async function loginAs(page: Page, email: string, password: string): Promise<string> {
  await page.goto(`${BASE_URL}/en/auth/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await shot(page, `login-${email.split('@')[0]}`);

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait up to 10 seconds for redirect away from login
  try {
    await page.waitForURL((url) => !url.toString().includes('/auth/login'), { timeout: 10000 });
  } catch {}
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  const url = page.url();
  await shot(page, `after-login-${email.split('@')[0]}`);
  return url;
}

async function visitAndReport(page: Page, pagePath: string, screenshotName: string) {
  await page.goto(`${BASE_URL}${pagePath}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  const url = page.url();
  const title = await page.title().catch(() => '');
  const bodyText = await getBodyText(page);
  await shot(page, screenshotName);

  const redirectedToLogin = url.includes('/auth/login');
  const has404 = bodyText.includes('404') || bodyText.includes('Page not found') || title.includes('404');
  const hasError = (bodyText.includes('Something went wrong') || bodyText.includes('500')) && !bodyText.includes('Error Recovery');
  const isBlank = bodyText.length < 30;

  let status: string;
  if (redirectedToLogin) {
    status = 'REDIRECT_TO_LOGIN';
  } else if (has404) {
    status = 'FAIL_404';
  } else if (hasError) {
    status = 'FAIL_ERROR';
  } else if (isBlank) {
    status = 'FAIL_BLANK';
  } else {
    status = 'PASS';
  }

  return { url, title, bodyText, status };
}

async function signOut(page: Page): Promise<string> {
  // Try direct logout button first (visible in sidebar)
  const directLogout = page.locator('button:has-text("Log out"), a:has-text("Log out"), button:has-text("Sign out"), a:has-text("Sign out")').first();
  if (await directLogout.isVisible({ timeout: 2000 }).catch(() => false)) {
    await directLogout.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    return page.url();
  }

  // Try opening a user/profile menu
  const menuTrigger = page.locator('[data-testid="user-menu"], [aria-label*="user" i], [aria-label*="profile" i], [aria-label*="account" i]').first();
  if (await menuTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
    await menuTrigger.click();
    await page.waitForTimeout(500);
    const logoutInMenu = page.locator('button:has-text("Log out"), a:has-text("Log out"), button:has-text("Sign out"), a:has-text("Sign out"), [role="menuitem"]:has-text("Log out"), [role="menuitem"]:has-text("Sign out")').first();
    if (await logoutInMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutInMenu.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1000);
      return page.url();
    }
  }

  // Fallback: navigate to login directly
  await page.goto(`${BASE_URL}/en/auth/login`);
  return page.url();
}

// ===================================================================
// STUDENT
// ===================================================================
test('STUDENT: Full account test', async ({ page }) => {
  console.log('\n========== STUDENT ACCOUNT TESTS ==========');

  const loginUrl = await loginAs(page, 'jimmycuong1413@gmail.com', '12345678');
  console.log(`[STUDENT] Login redirect URL: ${loginUrl}`);
  const loginBodyText = await getBodyText(page);
  console.log(`[STUDENT] Dashboard content after login:\n${loginBodyText}\n`);

  const studentPages = [
    { path: '/en/dashboard', name: 's-01-dashboard' },
    { path: '/en/classes', name: 's-02-classes' },
    { path: '/en/student/bookings', name: 's-03-bookings' },
    { path: '/en/student/progress', name: 's-04-progress' },
    { path: '/en/leaderboard', name: 's-05-leaderboard' },
    { path: '/en/learning-path', name: 's-06-learning-path' },
    { path: '/en/notifications', name: 's-07-notifications' },
  ];

  for (const p of studentPages) {
    const result = await visitAndReport(page, p.path, p.name);
    console.log(`[STUDENT] ${p.path}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  URL: ${result.url}`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Content: ${result.bodyText.substring(0, 200)}\n`);
  }

  const logoutUrl = await signOut(page);
  await shot(page, 's-08-after-logout');
  console.log(`[STUDENT] After sign-out URL: ${logoutUrl}`);
});

// ===================================================================
// TEACHER
// ===================================================================
test('TEACHER: Full account test', async ({ page }) => {
  console.log('\n========== TEACHER ACCOUNT TESTS ==========');

  const loginUrl = await loginAs(page, 'jimmycuong1414@gmail.com', '12345678');
  console.log(`[TEACHER] Login redirect URL: ${loginUrl}`);
  const loginBodyText = await getBodyText(page);
  console.log(`[TEACHER] Content after login:\n${loginBodyText}\n`);

  const teacherPages = [
    { path: '/en/dashboard', name: 't-01-dashboard' },
    { path: '/en/teacher/schedule', name: 't-02-schedule' },
    { path: '/en/teacher/quiz/create', name: 't-03-quiz-create' },
  ];

  for (const p of teacherPages) {
    const result = await visitAndReport(page, p.path, p.name);
    console.log(`[TEACHER] ${p.path}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  URL: ${result.url}`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Content: ${result.bodyText.substring(0, 200)}\n`);
  }

  const logoutUrl = await signOut(page);
  await shot(page, 't-04-after-logout');
  console.log(`[TEACHER] After sign-out URL: ${logoutUrl}`);
});

// ===================================================================
// ADMIN
// ===================================================================
test('ADMIN: Full account test', async ({ page }) => {
  console.log('\n========== ADMIN ACCOUNT TESTS ==========');

  const loginUrl = await loginAs(page, 'jimmycuong1412@gmail.com', '12345678');
  console.log(`[ADMIN] Login redirect URL: ${loginUrl}`);
  const loginBodyText = await getBodyText(page);
  console.log(`[ADMIN] Content after login:\n${loginBodyText}\n`);

  const adminPages = [
    { path: '/en/dashboard', name: 'a-01-dashboard' },
    { path: '/en/dashboard/admin', name: 'a-02-dashboard-admin' },
    { path: '/en/admin/analytics', name: 'a-03-analytics' },
  ];

  for (const p of adminPages) {
    const result = await visitAndReport(page, p.path, p.name);
    console.log(`[ADMIN] ${p.path}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  URL: ${result.url}`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Content: ${result.bodyText.substring(0, 200)}\n`);
  }

  const logoutUrl = await signOut(page);
  await shot(page, 'a-04-after-logout');
  console.log(`[ADMIN] After sign-out URL: ${logoutUrl}`);
});
