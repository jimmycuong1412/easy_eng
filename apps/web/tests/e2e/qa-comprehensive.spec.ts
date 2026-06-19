import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '../../qa-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function loginWithEmail(page: Page, email: string, password: string): Promise<string> {
  await page.goto(`${BASE_URL}/en/auth/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page
  await page.waitForURL(url => !url.href.includes('/auth/login'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  return page.url();
}

async function signOut(page: Page) {
  try {
    // Try clicking the logout link directly
    const logoutLink = page.locator('a:has-text("Log out"), a:has-text("Sign out"), button:has-text("Log out"), button:has-text("Sign out")').first();
    if (await logoutLink.isVisible({ timeout: 2000 })) {
      await logoutLink.click();
      await page.waitForLoadState('networkidle');
      return;
    }
  } catch {}
  // Navigate directly to logged-out state
  await page.goto(`${BASE_URL}/en/auth/login`);
  await page.waitForLoadState('networkidle');
}

interface PageResult {
  url: string;
  targetUrl: string;
  title: string;
  redirectedToLogin: boolean;
  hasError: boolean;
  isBlank: boolean;
  content: string;
  apiErrors: string[];
  screenshotPath: string;
}

async function visitAndCapture(page: Page, targetUrl: string, screenshotName: string): Promise<PageResult> {
  const apiErrors: string[] = [];

  // Listen for failed responses
  const responseHandler = (response: any) => {
    if ((response.status() >= 400) && response.url().includes('supabase')) {
      apiErrors.push(`${response.status()} ${response.url().split('?')[0].split('/rest/v1/')[1] || response.url()}`);
    }
  };
  page.on('response', responseHandler);

  await page.goto(targetUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  page.off('response', responseHandler);

  const currentUrl = page.url();
  const title = await page.title();
  const redirectedToLogin = currentUrl.includes('/auth/login');
  const bodyText = await page.evaluate(() => document.body.innerText.trim().substring(0, 600));
  const isBlank = bodyText.length < 50;

  const hasError = await page.locator('text=Something went wrong').first().isVisible({ timeout: 300 }).catch(() => false)
    || await page.locator('[class*="error-boundary"]').first().isVisible({ timeout: 300 }).catch(() => false);

  const screenshotPath = await takeScreenshot(page, screenshotName);

  return {
    url: currentUrl,
    targetUrl,
    title,
    redirectedToLogin,
    hasError,
    isBlank,
    content: bodyText,
    apiErrors,
    screenshotPath,
  };
}

// ============================================================
// STUDENT ACCOUNT - single sequential test for shared auth
// ============================================================
test.describe.serial('STUDENT ACCOUNT TESTS', () => {
  let studentPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    studentPage = await context.newPage();
  });

  test.afterAll(async () => {
    await studentPage.context().close();
  });

  test('S01: Login as Student', async () => {
    const url = await loginWithEmail(studentPage, 'jimmycuong1413@gmail.com', '12345678');
    await takeScreenshot(studentPage, 'S01-student-after-login');
    const bodyText = await studentPage.evaluate(() => document.body.innerText.substring(0, 400));
    console.log(`[S01 Login] Redirected to: ${url}`);
    console.log(`[S01 Login] Content: ${bodyText}`);
    expect(url).not.toContain('/auth/login');
  });

  test('S02: Dashboard /en/dashboard', async () => {
    const result = await visitAndCapture(studentPage, `${BASE_URL}/en/dashboard`, 'S02-student-dashboard');
    console.log(`[S02 Dashboard] URL: ${result.url}`);
    console.log(`[S02 Dashboard] Content: ${result.content}`);
    console.log(`[S02 Dashboard] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('S03: Classes /en/classes', async () => {
    const result = await visitAndCapture(studentPage, `${BASE_URL}/en/classes`, 'S03-student-classes');
    console.log(`[S03 Classes] URL: ${result.url}`);
    console.log(`[S03 Classes] Content: ${result.content}`);
    console.log(`[S03 Classes] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('S04: Bookings /en/student/bookings', async () => {
    const result = await visitAndCapture(studentPage, `${BASE_URL}/en/student/bookings`, 'S04-student-bookings');
    console.log(`[S04 Bookings] URL: ${result.url}`);
    console.log(`[S04 Bookings] Content: ${result.content}`);
    console.log(`[S04 Bookings] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('S05: Progress /en/student/progress', async () => {
    const result = await visitAndCapture(studentPage, `${BASE_URL}/en/student/progress`, 'S05-student-progress');
    console.log(`[S05 Progress] URL: ${result.url}`);
    console.log(`[S05 Progress] Content: ${result.content}`);
    console.log(`[S05 Progress] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('S06: Leaderboard /en/leaderboard', async () => {
    const result = await visitAndCapture(studentPage, `${BASE_URL}/en/leaderboard`, 'S06-student-leaderboard');
    console.log(`[S06 Leaderboard] URL: ${result.url}`);
    console.log(`[S06 Leaderboard] Content: ${result.content}`);
    console.log(`[S06 Leaderboard] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('S07: Learning Path /en/learning-path', async () => {
    const result = await visitAndCapture(studentPage, `${BASE_URL}/en/learning-path`, 'S07-student-learning-path');
    console.log(`[S07 Learning Path] URL: ${result.url}`);
    console.log(`[S07 Learning Path] Content: ${result.content}`);
    console.log(`[S07 Learning Path] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('S08: Notifications /en/notifications', async () => {
    const result = await visitAndCapture(studentPage, `${BASE_URL}/en/notifications`, 'S08-student-notifications');
    console.log(`[S08 Notifications] URL: ${result.url}`);
    console.log(`[S08 Notifications] Content: ${result.content}`);
    console.log(`[S08 Notifications] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('S09: Gem History /en/student/gems/history', async () => {
    const result = await visitAndCapture(studentPage, `${BASE_URL}/en/student/gems/history`, 'S09-student-gem-history');
    console.log(`[S09 Gem History] URL: ${result.url}`);
    console.log(`[S09 Gem History] Content: ${result.content}`);
    console.log(`[S09 Gem History] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('S10: Sign Out', async () => {
    await signOut(studentPage);
    const finalUrl = studentPage.url();
    await takeScreenshot(studentPage, 'S10-student-signed-out');
    console.log(`[S10 Sign Out] Final URL: ${finalUrl}`);
  });
});

// ============================================================
// TEACHER ACCOUNT
// ============================================================
test.describe.serial('TEACHER ACCOUNT TESTS', () => {
  let teacherPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    teacherPage = await context.newPage();
  });

  test.afterAll(async () => {
    await teacherPage.context().close();
  });

  test('T01: Login as Teacher', async () => {
    const url = await loginWithEmail(teacherPage, 'jimmycuong1414@gmail.com', '12345678');
    await takeScreenshot(teacherPage, 'T01-teacher-after-login');
    const bodyText = await teacherPage.evaluate(() => document.body.innerText.substring(0, 400));
    console.log(`[T01 Login] Redirected to: ${url}`);
    console.log(`[T01 Login] Content: ${bodyText}`);
    expect(url).not.toContain('/auth/login');
  });

  test('T02: Teacher Schedule /en/teacher/schedule', async () => {
    const result = await visitAndCapture(teacherPage, `${BASE_URL}/en/teacher/schedule`, 'T02-teacher-schedule');
    console.log(`[T02 Schedule] URL: ${result.url}`);
    console.log(`[T02 Schedule] Content: ${result.content}`);
    console.log(`[T02 Schedule] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('T03: Teacher Quiz Create /en/teacher/quiz/create', async () => {
    const result = await visitAndCapture(teacherPage, `${BASE_URL}/en/teacher/quiz/create`, 'T03-teacher-quiz-create');
    console.log(`[T03 Quiz Create] URL: ${result.url}`);
    console.log(`[T03 Quiz Create] Content: ${result.content}`);
    console.log(`[T03 Quiz Create] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('T04: Sign Out', async () => {
    await signOut(teacherPage);
    const finalUrl = teacherPage.url();
    await takeScreenshot(teacherPage, 'T04-teacher-signed-out');
    console.log(`[T04 Sign Out] Final URL: ${finalUrl}`);
  });
});

// ============================================================
// ADMIN ACCOUNT
// ============================================================
test.describe.serial('ADMIN ACCOUNT TESTS', () => {
  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    adminPage = await context.newPage();
  });

  test.afterAll(async () => {
    await adminPage.context().close();
  });

  test('A01: Login as Admin', async () => {
    const url = await loginWithEmail(adminPage, 'jimmycuong1412@gmail.com', '12345678');
    await takeScreenshot(adminPage, 'A01-admin-after-login');
    const bodyText = await adminPage.evaluate(() => document.body.innerText.substring(0, 400));
    console.log(`[A01 Login] Redirected to: ${url}`);
    console.log(`[A01 Login] Content: ${bodyText}`);
    expect(url).not.toContain('/auth/login');
  });

  test('A02: Admin Analytics /en/admin/analytics', async () => {
    const result = await visitAndCapture(adminPage, `${BASE_URL}/en/admin/analytics`, 'A02-admin-analytics');
    console.log(`[A02 Analytics] URL: ${result.url}`);
    console.log(`[A02 Analytics] Content: ${result.content}`);
    console.log(`[A02 Analytics] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('A03: Admin Dashboard /en/dashboard/admin', async () => {
    const result = await visitAndCapture(adminPage, `${BASE_URL}/en/dashboard/admin`, 'A03-admin-dashboard');
    console.log(`[A03 Dashboard] URL: ${result.url}`);
    console.log(`[A03 Dashboard] Content: ${result.content}`);
    console.log(`[A03 Dashboard] API Errors: ${result.apiErrors.join(', ') || 'none'}`);
    expect(result.redirectedToLogin).toBe(false);
  });

  test('A04: Sign Out', async () => {
    await signOut(adminPage);
    const finalUrl = adminPage.url();
    await takeScreenshot(adminPage, 'A04-admin-signed-out');
    console.log(`[A04 Sign Out] Final URL: ${finalUrl}`);
  });
});
