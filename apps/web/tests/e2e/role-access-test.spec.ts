import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'test-screenshots');

test.describe('Role Access Tests', () => {
  test.setTimeout(60000);

  test('Test 1 — Teacher account access', async ({ browser }) => {
    // Fresh browser context (no shared cookies/storage)
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('\n=== TEST 1: TEACHER ===');

    // Step 1: Navigate to login
    await page.goto('http://localhost:3000/en/auth/login');
    await page.waitForLoadState('networkidle');
    console.log('Login page loaded:', page.url());

    // Step 2: Fill email/password form (ignore Google button at top)
    await page.fill('input[type="email"]', 'jimmycuong1414@gmail.com');
    await page.fill('input[type="password"]', '12345678');

    // Click the submit button inside the email/password form
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 15000 });
    const afterLoginUrl = page.url();
    console.log('After login URL:', afterLoginUrl);

    // Step 3: Navigate to teacher schedule
    await page.goto('http://localhost:3000/en/teacher/schedule');
    await page.waitForTimeout(5000);
    const scheduleUrl = page.url();
    console.log('Teacher schedule URL:', scheduleUrl);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'teacher-schedule.png'), fullPage: true });

    const scheduleContent = await page.content();
    const scheduleHasAccess = !scheduleContent.includes('Access Denied') && !scheduleContent.includes('access-denied');
    console.log('Teacher schedule — PASS:', scheduleHasAccess, '| URL:', scheduleUrl);

    // Step 4: Navigate to teacher quiz create
    await page.goto('http://localhost:3000/en/teacher/quiz/create');
    await page.waitForTimeout(5000);
    const quizUrl = page.url();
    console.log('Teacher quiz/create URL:', quizUrl);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'teacher-quiz-create.png'), fullPage: true });

    const quizContent = await page.content();
    const quizHasAccess = !quizContent.includes('Access Denied') && !quizContent.includes('access-denied');
    console.log('Teacher quiz/create — PASS:', quizHasAccess, '| URL:', quizUrl);

    await context.close();
  });

  test('Test 2 — Admin account access', async ({ browser }) => {
    // Fresh browser context
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('\n=== TEST 2: ADMIN ===');

    // Step 1: Navigate to login
    await page.goto('http://localhost:3000/en/auth/login');
    await page.waitForLoadState('networkidle');
    console.log('Login page loaded:', page.url());

    // Step 2: Fill email/password form
    await page.fill('input[type="email"]', 'jimmycuong1412@gmail.com');
    await page.fill('input[type="password"]', '12345678');

    // Click the submit button inside the email/password form
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 15000 });
    const afterLoginUrl = page.url();
    console.log('After login URL:', afterLoginUrl);

    // Step 3: Navigate to admin dashboard
    await page.goto('http://localhost:3000/en/dashboard/admin');
    await page.waitForTimeout(5000);
    const adminDashUrl = page.url();
    console.log('Admin dashboard URL:', adminDashUrl);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-dashboard.png'), fullPage: true });

    const adminDashContent = await page.content();
    const adminDashHasAccess = !adminDashContent.includes('Access Denied') && !adminDashContent.includes('access-denied');
    const hasAccessDeniedText = adminDashContent.toLowerCase().includes('access denied');
    console.log('Admin dashboard — PASS:', adminDashHasAccess, '| Shows "Access Denied":', hasAccessDeniedText, '| URL:', adminDashUrl);

    // Step 4: Navigate to admin analytics
    await page.goto('http://localhost:3000/en/admin/analytics');
    await page.waitForTimeout(5000);
    const analyticsUrl = page.url();
    console.log('Admin analytics URL:', analyticsUrl);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-analytics.png'), fullPage: true });

    const analyticsContent = await page.content();
    const analyticsHasAccess = !analyticsContent.includes('Access Denied') && !analyticsContent.includes('access-denied');
    console.log('Admin analytics — PASS:', analyticsHasAccess, '| URL:', analyticsUrl);

    await context.close();
  });
});
