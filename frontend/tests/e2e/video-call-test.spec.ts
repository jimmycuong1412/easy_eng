/**
 * Video Call End-to-End Test
 * Tests the live video call flow for both student and teacher accounts.
 */
import { test, expect, chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const STUDENT_EMAIL = 'jimmycuong1413@gmail.com';
const STUDENT_PASS = '12345678';
const TEACHER_EMAIL = 'jimmycuong1414@gmail.com';
const TEACHER_PASS = '12345678';

const SCREENSHOT_DIR = 'test-screenshots/video-call';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function loginAs(page: Page, email: string, password: string, role: string) {
  console.log(`[${role}] Navigating to login page...`);
  await page.goto(`${BASE_URL}/en/auth/login`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${role}-01-login-page.png`, fullPage: true });

  // Fill in credentials
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${role}-02-credentials-filled.png`, fullPage: true });

  // Submit the form
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // Wait for navigation or dashboard
  await page.waitForURL(/\/(en|vi)\/(dashboard|student|teacher|admin)?/, { timeout: 15000 }).catch(() => {
    console.log(`[${role}] Login redirect did not happen as expected`);
  });

  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${role}-03-after-login.png`, fullPage: true });
  console.log(`[${role}] Current URL after login: ${page.url()}`);
}

async function captureConsoleErrors(page: Page, role: string) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[ERROR] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      errors.push(`[WARN] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`[PAGE_ERROR] ${err.message}`);
  });
  return errors;
}

test.describe('Video Call Flow', () => {
  test.setTimeout(120000);

  let classId: string = '';
  const screenshotDir = SCREENSHOT_DIR;

  test.beforeAll(async () => {
    ensureDir(screenshotDir);
  });

  test('Step 1: Student login and find a class', async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[ERROR] ${msg.text()}`);
    });
    page.on('pageerror', (err) => consoleErrors.push(`[PAGE_ERROR] ${err.message}`));

    await loginAs(page, STUDENT_EMAIL, STUDENT_PASS, 'student');

    // Navigate to classes page
    console.log('[student] Navigating to /en/classes...');
    await page.goto(`${BASE_URL}/en/classes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/student-04-classes-page.png`, fullPage: true });

    // Try to find a class card and get its ID
    const classLinks = await page.locator('a[href*="/classes/"], a[href*="/class/"]').all();
    console.log(`[student] Found ${classLinks.length} class links`);

    for (const link of classLinks) {
      const href = await link.getAttribute('href');
      console.log(`[student] Class link href: ${href}`);
      const match = href?.match(/\/class(?:es)?\/([^/?#]+)/);
      if (match && match[1]) {
        classId = match[1];
        console.log(`[student] Found class ID: ${classId}`);
        break;
      }
    }

    if (!classId) {
      // Try to navigate to student bookings
      console.log('[student] No classes found on /en/classes, trying /en/student/bookings...');
      await page.goto(`${BASE_URL}/en/student/bookings`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${screenshotDir}/student-04b-bookings-page.png`, fullPage: true });

      const bookingLinks = await page.locator('a[href*="/class/"]').all();
      for (const link of bookingLinks) {
        const href = await link.getAttribute('href');
        const match = href?.match(/\/class\/([^/?#]+)/);
        if (match && match[1]) {
          classId = match[1];
          console.log(`[student] Found class ID from bookings: ${classId}`);
          break;
        }
      }
    }

    if (!classId) {
      // Try DB API query to get a class ID
      console.log('[student] Still no class ID, trying API...');
      const response = await page.request.get(`${BASE_URL}/api/classes?limit=5`);
      if (response.ok()) {
        const data = await response.json();
        console.log('[student] API classes response:', JSON.stringify(data).substring(0, 500));
      }
    }

    console.log(`[student] Final classId: "${classId}"`);
    await page.screenshot({ path: `${screenshotDir}/student-05-class-search-done.png`, fullPage: true });

    if (consoleErrors.length > 0) {
      console.log('[student] Console errors so far:', consoleErrors.join('\n'));
    }

    await context.close();
  });

  test('Step 2: Student navigates to live class page', async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') consoleErrors.push(`[ERROR] ${text}`);
      else if (msg.type() === 'warning') consoleErrors.push(`[WARN] ${text}`);
      else if (text.includes('CometChat') || text.includes('cometchat') || text.includes('startCall') || text.includes('auth-token')) {
        consoleErrors.push(`[LOG] ${text}`);
      }
    });
    page.on('pageerror', (err) => consoleErrors.push(`[PAGE_ERROR] ${err.message}`));
    page.on('response', (response) => {
      if (response.url().includes('auth-token') || response.url().includes('cometchat')) {
        networkErrors.push(`[RESPONSE] ${response.status()} ${response.url()}`);
      }
      if (response.status() >= 400) {
        networkErrors.push(`[HTTP_ERROR] ${response.status()} ${response.url()}`);
      }
    });

    await loginAs(page, STUDENT_EMAIL, STUDENT_PASS, 'student');

    // Use a known test class or try to find one from the DB
    // First check if we have a classId from step 1 — if not, we need to find it
    let targetClassId = classId;
    if (!targetClassId) {
      // Try to get from the classes page directly
      await page.goto(`${BASE_URL}/en/classes`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const links = await page.locator('a[href*="/class"]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        const match = href?.match(/\/class(?:es)?\/([^/?#]+)/);
        if (match && match[1] && match[1] !== 'live' && match[1] !== 'feedback') {
          targetClassId = match[1];
          classId = targetClassId;
          break;
        }
      }
    }

    if (!targetClassId) {
      // Try teacher's class list
      console.log('[student] No class found, trying a known UUID pattern...');
      // Screenshot what we have
      await page.screenshot({ path: `${screenshotDir}/student-no-class-found.png`, fullPage: true });
      await context.close();
      return;
    }

    const liveUrl = `${BASE_URL}/en/class/${targetClassId}/live`;
    console.log(`[student] Navigating to live class page: ${liveUrl}`);

    await page.goto(liveUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${screenshotDir}/student-06-live-page-initial.png`, fullPage: true });

    // Wait a bit more for CometChat to initialize
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/student-07-live-page-5s.png`, fullPage: true });

    // Wait even more
    await page.waitForTimeout(7000);
    await page.screenshot({ path: `${screenshotDir}/student-08-live-page-12s.png`, fullPage: true });

    // Check for specific elements
    const loadingText = await page.locator('text=Connecting').count();
    const errorText = await page.locator('text=Error, text=error, text=failed, text=Failed').count();
    const videoElements = await page.locator('video').count();
    const cometChatElements = await page.locator('[class*="cometchat"], [id*="cometchat"]').count();

    console.log('[student] Live page check:');
    console.log(`  - "Connecting" text found: ${loadingText}`);
    console.log(`  - Error text found: ${errorText}`);
    console.log(`  - <video> elements: ${videoElements}`);
    console.log(`  - CometChat elements: ${cometChatElements}`);
    console.log(`  - Current URL: ${page.url()}`);

    // Check auth-token API response
    console.log('[student] Testing /api/cometchat/auth-token endpoint...');
    const authTokenResponse = await page.request.get(`${BASE_URL}/api/cometchat/auth-token`);
    console.log(`[student] auth-token status: ${authTokenResponse.status()}`);
    try {
      const authTokenBody = await authTokenResponse.text();
      console.log(`[student] auth-token body (first 500 chars): ${authTokenBody.substring(0, 500)}`);
      networkErrors.push(`[AUTH_TOKEN] ${authTokenResponse.status()} - ${authTokenBody.substring(0, 200)}`);
    } catch (e) {
      console.log('[student] Could not read auth-token response body');
    }

    // Get page HTML for diagnosis
    const pageContent = await page.content();
    const relevantContent = pageContent.substring(0, 2000);
    console.log('[student] Page content snippet:', relevantContent);

    // Save detailed report
    const report = {
      url: page.url(),
      classId: targetClassId,
      loadingTextCount: loadingText,
      errorTextCount: errorText,
      videoElements,
      cometChatElements,
      consoleErrors,
      networkErrors,
      pageTitle: await page.title(),
    };

    fs.writeFileSync(
      `${screenshotDir}/student-report.json`,
      JSON.stringify(report, null, 2)
    );

    console.log('[student] Network errors/responses:', networkErrors.join('\n'));
    console.log('[student] Console errors:', consoleErrors.join('\n'));

    await context.close();
  });

  test('Step 3: Teacher navigates to same live class page', async ({ browser }) => {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') consoleErrors.push(`[ERROR] ${text}`);
      else if (text.includes('CometChat') || text.includes('cometchat') || text.includes('startCall') || text.includes('auth-token')) {
        consoleErrors.push(`[LOG] ${text}`);
      }
    });
    page.on('pageerror', (err) => consoleErrors.push(`[PAGE_ERROR] ${err.message}`));
    page.on('response', (response) => {
      if (response.url().includes('auth-token') || response.url().includes('cometchat')) {
        networkErrors.push(`[RESPONSE] ${response.status()} ${response.url()}`);
      }
      if (response.status() >= 400) {
        networkErrors.push(`[HTTP_ERROR] ${response.status()} ${response.url()}`);
      }
    });

    await loginAs(page, TEACHER_EMAIL, TEACHER_PASS, 'teacher');

    // Teacher looks at their classes
    await page.goto(`${BASE_URL}/en/dashboard/teacher`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/teacher-04-dashboard.png`, fullPage: true });

    // Try to find a class from teacher dashboard
    let targetClassId = classId;
    if (!targetClassId) {
      const links = await page.locator('a[href*="/class"]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        const match = href?.match(/\/class(?:es)?\/([^/?#]+)/);
        if (match && match[1] && match[1] !== 'live' && match[1] !== 'feedback') {
          targetClassId = match[1];
          classId = targetClassId;
          console.log(`[teacher] Found class ID: ${targetClassId}`);
          break;
        }
      }
    }

    // Try the classes page
    if (!targetClassId) {
      await page.goto(`${BASE_URL}/en/classes`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const links = await page.locator('a[href*="/class"]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        const match = href?.match(/\/class(?:es)?\/([^/?#]+)/);
        if (match && match[1] && match[1] !== 'live' && match[1] !== 'feedback') {
          targetClassId = match[1];
          classId = targetClassId;
          break;
        }
      }
    }

    if (!targetClassId) {
      console.log('[teacher] No class ID found, cannot test live page');
      await page.screenshot({ path: `${screenshotDir}/teacher-no-class-found.png`, fullPage: true });
      await context.close();
      return;
    }

    const liveUrl = `${BASE_URL}/en/class/${targetClassId}/live`;
    console.log(`[teacher] Navigating to live class page: ${liveUrl}`);

    await page.goto(liveUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${screenshotDir}/teacher-05-live-page-initial.png`, fullPage: true });

    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/teacher-06-live-page-5s.png`, fullPage: true });

    await page.waitForTimeout(7000);
    await page.screenshot({ path: `${screenshotDir}/teacher-07-live-page-12s.png`, fullPage: true });

    const loadingText = await page.locator('text=Connecting').count();
    const errorText = await page.locator('text=Error').count();
    const videoElements = await page.locator('video').count();
    const cometChatElements = await page.locator('[class*="cometchat"], [id*="cometchat"]').count();

    console.log('[teacher] Live page check:');
    console.log(`  - "Connecting" text found: ${loadingText}`);
    console.log(`  - Error text found: ${errorText}`);
    console.log(`  - <video> elements: ${videoElements}`);
    console.log(`  - CometChat elements: ${cometChatElements}`);
    console.log(`  - Current URL: ${page.url()}`);

    // Check auth-token endpoint
    const authTokenResponse = await page.request.get(`${BASE_URL}/api/cometchat/auth-token`);
    console.log(`[teacher] auth-token status: ${authTokenResponse.status()}`);
    try {
      const authTokenBody = await authTokenResponse.text();
      console.log(`[teacher] auth-token body (first 500 chars): ${authTokenBody.substring(0, 500)}`);
      networkErrors.push(`[AUTH_TOKEN] ${authTokenResponse.status()} - ${authTokenBody.substring(0, 200)}`);
    } catch (e) {}

    const report = {
      url: page.url(),
      classId: targetClassId,
      loadingTextCount: loadingText,
      errorTextCount: errorText,
      videoElements,
      cometChatElements,
      consoleErrors,
      networkErrors,
      pageTitle: await page.title(),
    };

    fs.writeFileSync(
      `${screenshotDir}/teacher-report.json`,
      JSON.stringify(report, null, 2)
    );

    console.log('[teacher] Network errors/responses:', networkErrors.join('\n'));
    console.log('[teacher] Console errors:', consoleErrors.join('\n'));

    await context.close();
  });
});
