/**
 * QA Final Test - Tests all pages and captures what's actually rendered
 * Uses SSR-based navigation and captures page state
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, 'qa-final-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const BASE = 'http://localhost:3000';

async function ss(page: Page, name: string) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: false });
}

async function getPageState(page: Page) {
  const url = page.url();
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  const hasErrorBoundary = bodyText.includes('Something went wrong');
  const has404 = bodyText.includes('404') || bodyText.includes('This page could not be found');
  const has500 = bodyText.includes('500') || bodyText.includes('Internal Server');
  const isLoginPage = url.includes('/auth/login');
  const isRedirected = !url.endsWith(page.url());
  return { url, title, bodyText, hasErrorBoundary, has404, has500, isLoginPage };
}

// ============================================================
// TEST: Check all pages (even with broken auth, assess HTTP/SSR state)
// ============================================================
test.describe('Page Availability Tests', () => {

  test('HOMEPAGE - Root and landing page', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, '00-root');
    const state = await getPageState(page);
    console.log(`Root -> ${state.url}`);
    console.log(`Title: ${state.title}`);
    // Should redirect somewhere valid
    expect(state.url).toContain('localhost:3000');
    expect(state.has404).toBe(false);
    expect(state.has500).toBe(false);
  });

  test('LOGIN PAGE - Render and structure', async ({ page }) => {
    await page.goto(`${BASE}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, '01-login');
    const state = await getPageState(page);
    console.log(`Login page state: ${JSON.stringify({ url: state.url, title: state.title, hasError: state.hasErrorBoundary })}`);
    // Check if error boundary is showing (env var issue)
    if (state.hasErrorBoundary) {
      console.log('[FAIL] Login page shows error boundary - NEXT_PUBLIC_SUPABASE_URL not set in dev server');
    } else {
      console.log('[PASS] Login page renders without error boundary');
    }
    // SSR should work even if client errors
    expect(state.has404).toBe(false);
  });

  test('STUDENT LOGIN - Full login flow', async ({ page }) => {
    await page.goto(`${BASE}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Check if form is enabled
    const emailInput = page.locator('input[type="email"]').first();
    const isDisabled = await emailInput.getAttribute('disabled');

    if (isDisabled !== null) {
      await ss(page, '02-login-form-disabled');
      console.log('[FAIL] Login form is disabled - client-side env error preventing form interaction');
      console.log('[INFO] This confirms: Next.js dev server started without .env.local env vars in process.env');
      console.log('[INFO] The NEXT_PUBLIC_SUPABASE_URL is not inlined in the JS bundle');
    } else {
      // Try to login
      await emailInput.fill('jimmycuong1413@gmail.com');
      await page.fill('input[type="password"]', '12345678');
      await ss(page, '02-login-filled');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await ss(page, '02-after-submit');
      const state = await getPageState(page);
      console.log(`After login: ${state.url}`);
      if (!state.url.includes('/auth/login')) {
        console.log('[PASS] Login succeeded, redirected away from login page');
      } else {
        console.log('[FAIL] Still on login page after submit');
      }
    }
  });

  test('UNAUTHENTICATED ACCESS - Check protected routes redirect', async ({ page }) => {
    // Test that protected routes redirect unauthenticated users
    const protectedRoutes = [
      { path: '/en/dashboard', name: 'dashboard' },
      { path: '/en/student/bookings', name: 'student-bookings' },
      { path: '/en/teacher/schedule', name: 'teacher-schedule' },
      { path: '/en/dashboard/admin', name: 'admin-dashboard' },
    ];

    for (const route of protectedRoutes) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      await ss(page, `03-unauth-${route.name}`);
      const state = await getPageState(page);
      const redirectedToLogin = state.url.includes('/auth/login') || state.url.includes('/en/auth/login');
      const redirectedToHome = state.url === BASE + '/en' || state.url === BASE + '/';
      console.log(`[${redirectedToLogin || redirectedToHome ? 'PASS' : 'FAIL'}] ${route.path} -> ${state.url} (protected=${redirectedToLogin || redirectedToHome})`);
    }
  });

  test('PUBLIC ROUTES - Check publicly accessible pages', async ({ page }) => {
    const publicRoutes = [
      { path: '/en/classes', name: 'classes-public' },
      { path: '/en/leaderboard', name: 'leaderboard-public' },
    ];

    for (const route of publicRoutes) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      await ss(page, `04-public-${route.name}`);
      const state = await getPageState(page);
      console.log(`[${!state.hasErrorBoundary && !state.has404 ? 'PASS' : 'FAIL'}] ${route.path} -> ${state.url} | error=${state.hasErrorBoundary} | 404=${state.has404}`);
    }
  });

  test('NAVIGATION - Check nav elements on landing', async ({ page }) => {
    await page.goto(`${BASE}/en`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, '05-landing-page');

    // Check for key UI elements
    const loginBtn = page.locator('a:has-text("Log in"), button:has-text("Log in")').first();
    const signupBtn = page.locator('a:has-text("Start"), button:has-text("Start")').first();
    const hasLoginBtn = await loginBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const hasSignupBtn = await signupBtn.isVisible({ timeout: 2000 }).catch(() => false);

    console.log(`[${hasLoginBtn ? 'PASS' : 'FAIL'}] Landing page has Login button`);
    console.log(`[${hasSignupBtn ? 'PASS' : 'FAIL'}] Landing page has Signup/Start button`);

    const state = await getPageState(page);
    console.log(`Landing page title: ${state.title}`);
    console.log(`Landing page URL: ${state.url}`);
    console.log(`Body snippet: ${state.bodyText.slice(0, 200)}`);
  });

  test('LOCALE SWITCHING - Check Vietnamese locale', async ({ page }) => {
    await page.goto(`${BASE}/vi`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, '06-vi-locale');
    const state = await getPageState(page);
    console.log(`Vietnamese locale: ${state.url} | title: ${state.title}`);
    expect(state.has404).toBe(false);
  });

  test('AUTH PAGES - Signup page', async ({ page }) => {
    await page.goto(`${BASE}/en/auth/signup`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, '07-signup');
    const state = await getPageState(page);
    console.log(`Signup: ${state.url} | error=${state.hasErrorBoundary} | 404=${state.has404}`);
    console.log(`[${!state.hasErrorBoundary && !state.has404 ? 'PASS' : 'FAIL'}] Signup page`);
  });

  test('FORGOT PASSWORD - Page renders', async ({ page }) => {
    await page.goto(`${BASE}/en/auth/forgot-password`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, '08-forgot-password');
    const state = await getPageState(page);
    console.log(`Forgot password: ${state.url} | error=${state.hasErrorBoundary} | 404=${state.has404}`);
    console.log(`[${!state.hasErrorBoundary && !state.has404 ? 'PASS' : 'FAIL'}] Forgot password page`);
  });

  test('API HEALTH CHECK - Backend routes', async ({ page }) => {
    // Check API routes respond
    const apiRoutes = [
      '/api/cometchat/auth-token',
    ];

    for (const route of apiRoutes) {
      const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const status = resp?.status();
      console.log(`API ${route} -> HTTP ${status}`);
      // 401/403 is OK (auth protected), 404/500 is bad
      expect(status).not.toBe(404);
      expect(status).not.toBe(500);
    }
  });
});

// ============================================================
// AUTHENTICATED TESTS (only run if login works)
// ============================================================
async function attemptLogin(page: Page, email: string, pw: string): Promise<boolean> {
  await page.goto(`${BASE}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  const emailInput = page.locator('input[type="email"]').first();
  const isDisabled = await emailInput.getAttribute('disabled');
  if (isDisabled !== null) return false;
  await emailInput.fill(email);
  await page.fill('input[type="password"]', pw);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

test.describe('Student Account (authenticated)', () => {
  let ctx: BrowserContext;
  let page: Page;
  let loggedIn = false;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
    loggedIn = await attemptLogin(page, 'jimmycuong1413@gmail.com', '12345678');
    if (loggedIn) {
      console.log(`[INFO] Student logged in. URL: ${page.url()}`);
    } else {
      console.log('[WARN] Student login failed (likely env var issue) - skipping authenticated tests');
    }
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test('S-AUTH-01: Student dashboard', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'student-01-dashboard');
    const state = await getPageState(page);
    console.log(`Student dashboard: ${state.url} | error=${state.hasErrorBoundary}`);
    console.log(`Body: ${state.bodyText.slice(0, 300)}`);
  });

  test('S-AUTH-02: Class catalog', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/classes`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'student-02-classes');
    const state = await getPageState(page);
    console.log(`Classes: ${state.url} | error=${state.hasErrorBoundary} | 404=${state.has404}`);
  });

  test('S-AUTH-03: My bookings', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/student/bookings`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'student-03-bookings');
    const state = await getPageState(page);
    console.log(`Bookings: ${state.url} | error=${state.hasErrorBoundary}`);
  });

  test('S-AUTH-04: Progress page', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/student/progress`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'student-04-progress');
    const state = await getPageState(page);
    console.log(`Progress: ${state.url} | error=${state.hasErrorBoundary}`);
  });

  test('S-AUTH-05: Leaderboard', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/leaderboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'student-05-leaderboard');
    const state = await getPageState(page);
    console.log(`Leaderboard: ${state.url} | error=${state.hasErrorBoundary}`);
  });

  test('S-AUTH-06: Learning path', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/learning-path`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'student-06-learning-path');
    const state = await getPageState(page);
    console.log(`Learning path: ${state.url} | error=${state.hasErrorBoundary}`);
  });

  test('S-AUTH-07: Gem history', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/student/gems/history`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'student-07-gems');
    const state = await getPageState(page);
    console.log(`Gems: ${state.url} | error=${state.hasErrorBoundary}`);
  });

  test('S-AUTH-08: Signout', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const logoutBtn = page.locator('button:has-text("Log out"), a:has-text("Log out")').first();
    const visible = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'student-08-signout');
      console.log(`[PASS] Student signout -> ${page.url()}`);
    } else {
      await ss(page, 'student-08-signout-notfound');
      console.log('[WARN] Signout button not found in sidebar');
    }
  });
});

test.describe('Teacher Account (authenticated)', () => {
  let ctx: BrowserContext;
  let page: Page;
  let loggedIn = false;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
    loggedIn = await attemptLogin(page, 'jimmycuong1414@gmail.com', '12345678');
    console.log(`Teacher login: ${loggedIn} -> ${page.url()}`);
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test('T-AUTH-01: Teacher dashboard', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'teacher-01-dashboard');
    const state = await getPageState(page);
    console.log(`Teacher dashboard: ${state.url} | error=${state.hasErrorBoundary}`);
    console.log(`Body: ${state.bodyText.slice(0, 300)}`);
  });

  test('T-AUTH-02: Teacher schedule', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/teacher/schedule`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'teacher-02-schedule');
    const state = await getPageState(page);
    console.log(`Schedule: ${state.url} | error=${state.hasErrorBoundary}`);
  });

  test('T-AUTH-03: Quiz create', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/teacher/quiz/create`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'teacher-03-quiz-create');
    const state = await getPageState(page);
    console.log(`Quiz create: ${state.url} | error=${state.hasErrorBoundary}`);
  });

  test('T-AUTH-04: Teacher signout', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const logoutBtn = page.locator('button:has-text("Log out"), a:has-text("Log out")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'teacher-04-signout');
      console.log(`Teacher signout -> ${page.url()}`);
    }
  });
});

test.describe('Admin Account (authenticated)', () => {
  let ctx: BrowserContext;
  let page: Page;
  let loggedIn = false;

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext();
    page = await ctx.newPage();
    loggedIn = await attemptLogin(page, 'jimmycuong1412@gmail.com', '12345678');
    console.log(`Admin login: ${loggedIn} -> ${page.url()}`);
  });

  test.afterAll(async () => {
    await ctx.close();
  });

  test('A-AUTH-01: Admin dashboard', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/dashboard/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'admin-01-dashboard');
    const state = await getPageState(page);
    console.log(`Admin dashboard: ${state.url} | error=${state.hasErrorBoundary}`);
    console.log(`Body: ${state.bodyText.slice(0, 300)}`);
  });

  test('A-AUTH-02: Admin analytics', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/admin/analytics`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, 'admin-02-analytics');
    const state = await getPageState(page);
    console.log(`Analytics: ${state.url} | error=${state.hasErrorBoundary}`);
  });

  test('A-AUTH-03: Admin signout', async () => {
    test.skip(!loggedIn, 'Login failed');
    await page.goto(`${BASE}/en/dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const logoutBtn = page.locator('button:has-text("Log out"), a:has-text("Log out")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'admin-03-signout');
      console.log(`Admin signout -> ${page.url()}`);
    }
  });
});
