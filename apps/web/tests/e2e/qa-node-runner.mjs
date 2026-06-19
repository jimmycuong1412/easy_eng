/**
 * Node.js Playwright runner - sequential QA test
 * Run: node tests/e2e/qa-node-runner.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'qa-node-screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

async function shot(page, name) {
  const p = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
  return p;
}

async function getText(page, limit = 700) {
  return page.evaluate((lim) => document.body.innerText.trim().substring(0, lim), limit).catch(() => '');
}

async function loginAs(page, email, password) {
  await page.goto(`${BASE_URL}/en/auth/login`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await new Promise(r => setTimeout(r, 800));

  await page.fill('input[type="email"]', email).catch(() => {});
  await page.fill('input[type="password"]', password).catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});

  // Wait up to 10s for redirect away from login
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
    const url = page.url();
    if (!url.includes('/auth/login')) break;
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  return page.url();
}

async function visit(page, pagePath, shotName) {
  try {
    const resp = await page.goto(`${BASE_URL}${pagePath}`, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));
  } catch (e) {
    // continue
  }

  const url = page.url();
  const title = await page.title().catch(() => '');
  const body = await getText(page);
  await shot(page, shotName);

  const redirectedToLogin = url.includes('/auth/login');
  const has404 = body.includes('404') || title.includes('404') || body.includes('Page not found');
  const hasServerError = body.includes('500') || (body.includes('Something went wrong') && !body.includes('Error Recovery'));
  const isBlank = body.length < 30;

  let status;
  if (redirectedToLogin) status = 'REDIRECT_TO_LOGIN';
  else if (has404) status = 'FAIL_404';
  else if (hasServerError) status = 'FAIL_500';
  else if (isBlank) status = 'FAIL_BLANK';
  else status = 'PASS';

  return { url, title, body, status };
}

async function signOut(page) {
  // sidebar has a "Log out" button
  try {
    const btn = page.locator('button:has-text("Log out"), a:has-text("Log out"), button:has-text("Sign out"), a:has-text("Sign out")').first();
    const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
    if (visible) {
      await btn.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      return page.url();
    }
  } catch {}

  // fallback
  await page.goto(`${BASE_URL}/en/auth/login`);
  return page.url();
}

function pad(str, len = 35) {
  return str.padEnd(len, ' ');
}

function statusEmoji(status) {
  if (status === 'PASS') return '✅ PASS';
  if (status === 'REDIRECT_TO_LOGIN') return '❌ FAIL (redirected to login)';
  if (status === 'FAIL_404') return '❌ FAIL (404)';
  if (status === 'FAIL_500') return '❌ FAIL (500 error)';
  if (status === 'FAIL_BLANK') return '❌ FAIL (blank page)';
  return `⚠️ ${status}`;
}

const results = { student: [], teacher: [], admin: [] };

const browser = await chromium.launch({ headless: true });

// =====================================================
// STUDENT
// =====================================================
console.log('\n' + '='.repeat(60));
console.log('  STUDENT ACCOUNT TESTS');
console.log('='.repeat(60));

{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const loginUrl = await loginAs(page, 'jimmycuong1413@gmail.com', '12345678');
  await shot(page, 's-00-after-login');
  const loginBody = await getText(page);
  console.log(`\n[LOGIN] Redirected to: ${loginUrl}`);
  console.log(`[LOGIN] Page content:\n${loginBody}\n`);

  const pages = [
    { path: '/en/dashboard', shot: 's-01-dashboard' },
    { path: '/en/classes', shot: 's-02-classes' },
    { path: '/en/student/bookings', shot: 's-03-bookings' },
    { path: '/en/student/progress', shot: 's-04-progress' },
    { path: '/en/leaderboard', shot: 's-05-leaderboard' },
    { path: '/en/learning-path', shot: 's-06-learning-path' },
    { path: '/en/notifications', shot: 's-07-notifications' },
  ];

  for (const p of pages) {
    const r = await visit(page, p.path, p.shot);
    results.student.push({ path: p.path, ...r });
    console.log(`${pad(p.path)} ${statusEmoji(r.status)}`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Content snippet: ${r.body.substring(0, 150).replace(/\n/g, ' ')}`);
    console.log();
  }

  const logoutUrl = await signOut(page);
  await shot(page, 's-08-logout');
  console.log(`[LOGOUT] URL after sign-out: ${logoutUrl}`);
  await ctx.close();
}

// =====================================================
// TEACHER
// =====================================================
console.log('\n' + '='.repeat(60));
console.log('  TEACHER ACCOUNT TESTS');
console.log('='.repeat(60));

{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const loginUrl = await loginAs(page, 'jimmycuong1414@gmail.com', '12345678');
  await shot(page, 't-00-after-login');
  const loginBody = await getText(page);
  console.log(`\n[LOGIN] Redirected to: ${loginUrl}`);
  console.log(`[LOGIN] Page content:\n${loginBody}\n`);

  const pages = [
    { path: '/en/dashboard', shot: 't-01-dashboard' },
    { path: '/en/teacher/schedule', shot: 't-02-schedule' },
    { path: '/en/teacher/quiz/create', shot: 't-03-quiz-create' },
  ];

  for (const p of pages) {
    const r = await visit(page, p.path, p.shot);
    results.teacher.push({ path: p.path, ...r });
    console.log(`${pad(p.path)} ${statusEmoji(r.status)}`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Content snippet: ${r.body.substring(0, 150).replace(/\n/g, ' ')}`);
    console.log();
  }

  const logoutUrl = await signOut(page);
  await shot(page, 't-04-logout');
  console.log(`[LOGOUT] URL after sign-out: ${logoutUrl}`);
  await ctx.close();
}

// =====================================================
// ADMIN
// =====================================================
console.log('\n' + '='.repeat(60));
console.log('  ADMIN ACCOUNT TESTS');
console.log('='.repeat(60));

{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const loginUrl = await loginAs(page, 'jimmycuong1412@gmail.com', '12345678');
  await shot(page, 'a-00-after-login');
  const loginBody = await getText(page);
  console.log(`\n[LOGIN] Redirected to: ${loginUrl}`);
  console.log(`[LOGIN] Page content:\n${loginBody}\n`);

  const pages = [
    { path: '/en/dashboard', shot: 'a-01-dashboard' },
    { path: '/en/dashboard/admin', shot: 'a-02-dashboard-admin' },
    { path: '/en/admin/analytics', shot: 'a-03-analytics' },
  ];

  for (const p of pages) {
    const r = await visit(page, p.path, p.shot);
    results.admin.push({ path: p.path, ...r });
    console.log(`${pad(p.path)} ${statusEmoji(r.status)}`);
    console.log(`  URL: ${r.url}`);
    console.log(`  Content snippet: ${r.body.substring(0, 150).replace(/\n/g, ' ')}`);
    console.log();
  }

  const logoutUrl = await signOut(page);
  await shot(page, 'a-04-logout');
  console.log(`[LOGOUT] URL after sign-out: ${logoutUrl}`);
  await ctx.close();
}

await browser.close();

// Save results
fs.writeFileSync(
  path.join(SHOT_DIR, 'results.json'),
  JSON.stringify(results, null, 2)
);
console.log(`\nScreenshots saved to: ${SHOT_DIR}`);
console.log('Results saved to: ' + path.join(SHOT_DIR, 'results.json'));
