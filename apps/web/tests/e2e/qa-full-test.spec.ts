import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '../../qa-screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/en/auth/login`);
  await page.waitForLoadState('networkidle');

  // Fill email
  await page.fill('input[type="email"]', email);
  // Fill password
  await page.fill('input[type="password"]', password);
  // Click the form submit button (not Google)
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

async function signOut(page: Page) {
  try {
    // Try clicking profile/avatar menu first
    const profileBtn = page.locator('[data-testid="user-menu"], [aria-label="User menu"], button:has-text("Sign out"), button:has-text("Log out"), button:has-text("Logout"), button:has-text("Sign Out")').first();
    if (await profileBtn.isVisible({ timeout: 2000 })) {
      await profileBtn.click();
      await page.waitForTimeout(500);
    }

    // Look for logout link/button
    const logoutBtn = page.locator('a:has-text("Sign out"), a:has-text("Log out"), a:has-text("Logout"), button:has-text("Sign out"), button:has-text("Log out"), [href*="logout"], [href*="signout"]').first();
    if (await logoutBtn.isVisible({ timeout: 2000 })) {
      await logoutBtn.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Navigate directly to signout
      await page.goto(`${BASE_URL}/en/auth/login`);
    }
  } catch {
    await page.goto(`${BASE_URL}/en/auth/login`);
  }
}

async function visitPage(page: Page, url: string, screenshotName: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const screenshotPath = await takeScreenshot(page, screenshotName);
  const currentUrl = page.url();
  const title = await page.title();

  // Check for error states
  const hasErrorBoundary = await page.locator('text=Something went wrong, text=Error, text=500, text=404').first().isVisible({ timeout: 500 }).catch(() => false);
  const isBlank = (await page.evaluate(() => document.body.innerText.trim().length)) < 50;

  return { currentUrl, title, screenshotPath, hasErrorBoundary, isBlank };
}

// ============================================================
// STUDENT TESTS
// ============================================================
test.describe('Student Account Tests', () => {
  test('Student: Login', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/auth/login`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '01-student-login-page');

    await page.fill('input[type="email"]', 'jimmycuong1413@gmail.com');
    await page.fill('input[type="password"]', '12345678');
    await takeScreenshot(page, '02-student-login-filled');

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    await takeScreenshot(page, '03-student-after-login');
    console.log(`[Student Login] URL after login: ${currentUrl}`);

    // Verify we're not on login page anymore (or at least didn't get an error)
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log(`[Student Login] Page content snippet: ${pageText.substring(0, 200)}`);
  });

  test('Student: Dashboard', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1413@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/dashboard`, '04-student-dashboard');
    console.log(`[Student Dashboard] URL: ${result.currentUrl}`);
    console.log(`[Student Dashboard] Title: ${result.title}`);
    console.log(`[Student Dashboard] Has error: ${result.hasErrorBoundary}, Is blank: ${result.isBlank}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Student Dashboard] Content: ${bodyText}`);
  });

  test('Student: Classes Catalog', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1413@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/classes`, '05-student-classes');
    console.log(`[Student Classes] URL: ${result.currentUrl}`);
    console.log(`[Student Classes] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Student Classes] Content: ${bodyText}`);
  });

  test('Student: Bookings', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1413@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/student/bookings`, '06-student-bookings');
    console.log(`[Student Bookings] URL: ${result.currentUrl}`);
    console.log(`[Student Bookings] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Student Bookings] Content: ${bodyText}`);
  });

  test('Student: Progress', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1413@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/student/progress`, '07-student-progress');
    console.log(`[Student Progress] URL: ${result.currentUrl}`);
    console.log(`[Student Progress] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Student Progress] Content: ${bodyText}`);
  });

  test('Student: Leaderboard', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1413@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/leaderboard`, '08-student-leaderboard');
    console.log(`[Student Leaderboard] URL: ${result.currentUrl}`);
    console.log(`[Student Leaderboard] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Student Leaderboard] Content: ${bodyText}`);
  });

  test('Student: Learning Path', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1413@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/learning-path`, '09-student-learning-path');
    console.log(`[Student Learning Path] URL: ${result.currentUrl}`);
    console.log(`[Student Learning Path] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Student Learning Path] Content: ${bodyText}`);
  });

  test('Student: Notifications', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1413@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/notifications`, '10-student-notifications');
    console.log(`[Student Notifications] URL: ${result.currentUrl}`);
    console.log(`[Student Notifications] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Student Notifications] Content: ${bodyText}`);
  });

  test('Student: Gem History', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1413@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/student/gems/history`, '11-student-gem-history');
    console.log(`[Student Gem History] URL: ${result.currentUrl}`);
    console.log(`[Student Gem History] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Student Gem History] Content: ${bodyText}`);
  });
});

// ============================================================
// TEACHER TESTS
// ============================================================
test.describe('Teacher Account Tests', () => {
  test('Teacher: Login and Dashboard', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1414@gmail.com', '12345678');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    await takeScreenshot(page, '12-teacher-after-login');
    console.log(`[Teacher Login] URL after login: ${currentUrl}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Teacher Login] Content: ${bodyText}`);
  });

  test('Teacher: Schedule', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1414@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/teacher/schedule`, '13-teacher-schedule');
    console.log(`[Teacher Schedule] URL: ${result.currentUrl}`);
    console.log(`[Teacher Schedule] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Teacher Schedule] Content: ${bodyText}`);
  });

  test('Teacher: Quiz Create', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1414@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/teacher/quiz/create`, '14-teacher-quiz-create');
    console.log(`[Teacher Quiz Create] URL: ${result.currentUrl}`);
    console.log(`[Teacher Quiz Create] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Teacher Quiz Create] Content: ${bodyText}`);
  });
});

// ============================================================
// ADMIN TESTS
// ============================================================
test.describe('Admin Account Tests', () => {
  test('Admin: Login and Dashboard', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1412@gmail.com', '12345678');
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    await takeScreenshot(page, '15-admin-after-login');
    console.log(`[Admin Login] URL after login: ${currentUrl}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Admin Login] Content: ${bodyText}`);
  });

  test('Admin: Analytics', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1412@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/admin/analytics`, '16-admin-analytics');
    console.log(`[Admin Analytics] URL: ${result.currentUrl}`);
    console.log(`[Admin Analytics] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Admin Analytics] Content: ${bodyText}`);
  });

  test('Admin: Dashboard Admin', async ({ page }) => {
    await loginWithEmail(page, 'jimmycuong1412@gmail.com', '12345678');
    const result = await visitPage(page, `${BASE_URL}/en/dashboard/admin`, '17-admin-dashboard-admin');
    console.log(`[Admin Dashboard] URL: ${result.currentUrl}`);
    console.log(`[Admin Dashboard] Title: ${result.title}`);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log(`[Admin Dashboard] Content: ${bodyText}`);
  });
});
