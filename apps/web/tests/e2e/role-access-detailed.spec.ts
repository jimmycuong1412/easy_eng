import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'test-screenshots');

// Ensure screenshot dir exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Role Access Detailed Tests', () => {
  test.setTimeout(90000);

  test('Test 1 — Teacher account detailed', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

    console.log('\n=== TEST 1: TEACHER (jimmycuong1414@gmail.com) ===');

    // Step 1: Navigate to login page
    await page.goto('http://localhost:3000/en/auth/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-teacher-login-page.png'), fullPage: true });
    console.log('[1] Login page URL:', page.url());

    // Log visible buttons to understand the form structure
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.innerText().catch(() => '');
      const type = await btn.getAttribute('type').catch(() => '');
      console.log('  Button found:', JSON.stringify(text.trim()), 'type:', type);
    }

    // Step 2: Fill and submit login form
    await page.fill('input[type="email"]', 'jimmycuong1414@gmail.com');
    await page.fill('input[type="password"]', '12345678');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-teacher-form-filled.png'), fullPage: true });

    await page.click('button[type="submit"]');
    console.log('[2] Clicked submit, waiting for redirect...');

    try {
      await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 20000 });
    } catch (e) {
      console.log('[2] WARNING: Still on login page after 20s');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-teacher-after-login.png'), fullPage: true });
    console.log('[2] After login URL:', page.url());

    // Check for error messages on login page
    const errorText = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').first().innerText().catch(() => 'none');
    console.log('[2] Error text if any:', errorText);

    // Step 3: Teacher schedule
    console.log('\n[3] Navigating to teacher/schedule...');
    await page.goto('http://localhost:3000/en/teacher/schedule');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-teacher-schedule.png'), fullPage: true });
    const scheduleUrl = page.url();
    const scheduleTitle = await page.title();
    const scheduleH1 = await page.locator('h1').first().innerText().catch(() => 'none');
    const scheduleBodyText = await page.locator('body').innerText().catch(() => '');
    console.log('[3] Teacher schedule URL:', scheduleUrl);
    console.log('[3] Page title:', scheduleTitle);
    console.log('[3] H1:', scheduleH1);
    console.log('[3] Contains "Access Denied":', scheduleBodyText.toLowerCase().includes('access denied'));
    console.log('[3] Contains "unauthorized":', scheduleBodyText.toLowerCase().includes('unauthorized'));
    console.log('[3] Contains "schedule":', scheduleBodyText.toLowerCase().includes('schedule'));

    const schedulePass = scheduleUrl.includes('/teacher/schedule');
    console.log('[3] RESULT: Teacher schedule —', schedulePass ? 'PASS' : 'FAIL', '| Expected /teacher/schedule, got:', scheduleUrl);

    // Step 4: Teacher quiz create
    console.log('\n[4] Navigating to teacher/quiz/create...');
    await page.goto('http://localhost:3000/en/teacher/quiz/create');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-teacher-quiz-create.png'), fullPage: true });
    const quizUrl = page.url();
    const quizTitle = await page.title();
    const quizH1 = await page.locator('h1').first().innerText().catch(() => 'none');
    const quizBodyText = await page.locator('body').innerText().catch(() => '');
    console.log('[4] Teacher quiz URL:', quizUrl);
    console.log('[4] Page title:', quizTitle);
    console.log('[4] H1:', quizH1);
    console.log('[4] Contains "Access Denied":', quizBodyText.toLowerCase().includes('access denied'));
    console.log('[4] Contains "quiz":', quizBodyText.toLowerCase().includes('quiz'));

    const quizPass = quizUrl.includes('/teacher/quiz/create');
    console.log('[4] RESULT: Teacher quiz/create —', quizPass ? 'PASS' : 'FAIL', '| Expected /teacher/quiz/create, got:', quizUrl);

    // Print relevant console logs
    console.log('\n[Console logs from page]:');
    consoleLogs.filter(l => !l.includes('Download') && !l.includes('chunk')).slice(-20).forEach(l => console.log(' ', l));

    await context.close();
  });

  test('Test 2 — Admin account detailed', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

    console.log('\n=== TEST 2: ADMIN (jimmycuong1412@gmail.com) ===');

    // Step 1: Login
    await page.goto('http://localhost:3000/en/auth/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-admin-login-page.png'), fullPage: true });
    console.log('[1] Login page URL:', page.url());

    await page.fill('input[type="email"]', 'jimmycuong1412@gmail.com');
    await page.fill('input[type="password"]', '12345678');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-admin-form-filled.png'), fullPage: true });

    await page.click('button[type="submit"]');
    console.log('[2] Clicked submit, waiting for redirect...');

    try {
      await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 20000 });
    } catch (e) {
      console.log('[2] WARNING: Still on login page after 20s');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-admin-after-login.png'), fullPage: true });
    const afterLoginUrl = page.url();
    console.log('[2] After login URL:', afterLoginUrl);

    // Check for error
    const errorText = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').first().innerText().catch(() => 'none');
    console.log('[2] Error text if any:', errorText);

    // Step 3: Admin dashboard
    console.log('\n[3] Navigating to dashboard/admin...');
    await page.goto('http://localhost:3000/en/dashboard/admin');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-admin-dashboard.png'), fullPage: true });
    const adminUrl = page.url();
    const adminTitle = await page.title();
    const adminH1 = await page.locator('h1').first().innerText().catch(() => 'none');
    const adminBodyText = await page.locator('body').innerText().catch(() => '');
    console.log('[3] Admin dashboard URL:', adminUrl);
    console.log('[3] Page title:', adminTitle);
    console.log('[3] H1:', adminH1);
    console.log('[3] Contains "Access Denied":', adminBodyText.toLowerCase().includes('access denied'));
    console.log('[3] Contains "unauthorized":', adminBodyText.toLowerCase().includes('unauthorized'));
    console.log('[3] Contains "admin":', adminBodyText.toLowerCase().includes('admin'));
    console.log('[3] First 500 chars of body:', adminBodyText.substring(0, 500));

    const adminPass = adminUrl.includes('/dashboard/admin');
    console.log('[3] RESULT: Admin dashboard —', adminPass ? 'PASS' : 'FAIL', '| Expected /dashboard/admin, got:', adminUrl);

    // Step 4: Admin analytics
    console.log('\n[4] Navigating to admin/analytics...');
    await page.goto('http://localhost:3000/en/admin/analytics');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-admin-analytics.png'), fullPage: true });
    const analyticsUrl = page.url();
    const analyticsTitle = await page.title();
    const analyticsH1 = await page.locator('h1').first().innerText().catch(() => 'none');
    const analyticsBodyText = await page.locator('body').innerText().catch(() => '');
    console.log('[4] Admin analytics URL:', analyticsUrl);
    console.log('[4] Page title:', analyticsTitle);
    console.log('[4] H1:', analyticsH1);
    console.log('[4] Contains "Access Denied":', analyticsBodyText.toLowerCase().includes('access denied'));
    console.log('[4] Contains "analytics":', analyticsBodyText.toLowerCase().includes('analytics'));

    const analyticsPass = analyticsUrl.includes('/admin/analytics');
    console.log('[4] RESULT: Admin analytics —', analyticsPass ? 'PASS' : 'FAIL', '| Expected /admin/analytics, got:', analyticsUrl);

    // Print console logs
    console.log('\n[Console logs from page]:');
    consoleLogs.filter(l => !l.includes('Download') && !l.includes('chunk') && !l.includes('webpack')).slice(-30).forEach(l => console.log(' ', l));

    await context.close();
  });
});
