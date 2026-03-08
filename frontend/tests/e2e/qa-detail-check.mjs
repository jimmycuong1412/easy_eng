/**
 * Detailed check for specific pages - teacher schedule, quiz, admin analytics
 * Also checks what role/user each account actually sees
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'qa-detail-v2-screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true }).catch(() => {});
}

async function getText(page, limit = 1500) {
  return page.evaluate((lim) => document.body.innerText.trim().substring(0, lim), limit).catch(() => '');
}

async function loginAs(page, email, password) {
  await page.goto(`${BASE_URL}/en/auth/login`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await new Promise(r => setTimeout(r, 800));
  await page.fill('input[type="email"]', email).catch(() => {});
  await page.fill('input[type="password"]', password).catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
    if (!page.url().includes('/auth/login')) break;
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  return page.url();
}

const browser = await chromium.launch({ headless: true });

// ===============================
// Detailed Teacher Check
// ===============================
console.log('\n--- TEACHER DETAIL CHECK ---');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const url = await loginAs(page, 'jimmycuong1414@gmail.com', '12345678');
  console.log('Teacher login URL:', url);
  await shot(page, 'teacher-login-result');

  // Get full page text to determine role
  const loginBody = await getText(page, 2000);
  console.log('Teacher dashboard full text:\n', loginBody);

  // Visit teacher schedule
  await page.goto(`${BASE_URL}/en/teacher/schedule`, { timeout: 15000 }).catch(e => console.log('goto error:', e.message));
  await new Promise(r => setTimeout(r, 3000));
  const schedUrl = page.url();
  const schedBody = await getText(page, 2000);
  await shot(page, 'teacher-schedule-full');
  console.log('\n--- TEACHER SCHEDULE ---');
  console.log('URL:', schedUrl);
  console.log('Content:\n', schedBody);

  // Visit quiz create
  await page.goto(`${BASE_URL}/en/teacher/quiz/create`, { timeout: 15000 }).catch(e => console.log('goto error:', e.message));
  await new Promise(r => setTimeout(r, 3000));
  const quizUrl = page.url();
  const quizBody = await getText(page, 2000);
  await shot(page, 'teacher-quiz-create-full');
  console.log('\n--- TEACHER QUIZ CREATE ---');
  console.log('URL:', quizUrl);
  console.log('Content:\n', quizBody);

  await ctx.close();
}

// ===============================
// Detailed Admin Check
// ===============================
console.log('\n--- ADMIN DETAIL CHECK ---');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const url = await loginAs(page, 'jimmycuong1412@gmail.com', '12345678');
  console.log('Admin login URL:', url);
  await shot(page, 'admin-login-result');

  const loginBody = await getText(page, 2000);
  console.log('Admin dashboard full text:\n', loginBody);

  // Visit /en/dashboard/admin
  await page.goto(`${BASE_URL}/en/dashboard/admin`, { timeout: 15000 }).catch(e => console.log('goto error:', e.message));
  await new Promise(r => setTimeout(r, 3000));
  const admUrl = page.url();
  const admBody = await getText(page, 2000);
  await shot(page, 'admin-dashboard-admin-full');
  console.log('\n--- ADMIN /dashboard/admin ---');
  console.log('URL:', admUrl);
  console.log('Content:\n', admBody);

  // Visit /en/admin/analytics
  await page.goto(`${BASE_URL}/en/admin/analytics`, { timeout: 15000 }).catch(e => console.log('goto error:', e.message));
  await new Promise(r => setTimeout(r, 3000));
  const analytUrl = page.url();
  const analytBody = await getText(page, 2000);
  await shot(page, 'admin-analytics-full');
  console.log('\n--- ADMIN /admin/analytics ---');
  console.log('URL:', analytUrl);
  console.log('Content:\n', analytBody);

  await ctx.close();
}

// ===============================
// Student bookings detailed
// ===============================
console.log('\n--- STUDENT BOOKINGS DETAIL ---');
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await loginAs(page, 'jimmycuong1413@gmail.com', '12345678');

  await page.goto(`${BASE_URL}/en/student/bookings`, { timeout: 15000 }).catch(e => console.log('goto error:', e.message));
  await new Promise(r => setTimeout(r, 3000));
  const bkUrl = page.url();
  const bkBody = await getText(page, 2000);
  await shot(page, 'student-bookings-full');
  console.log('URL:', bkUrl);
  console.log('Content:\n', bkBody);

  // Check student classes catalog in more detail
  await page.goto(`${BASE_URL}/en/classes`, { timeout: 15000 }).catch(e => console.log('goto error:', e.message));
  await new Promise(r => setTimeout(r, 3000));
  const clUrl = page.url();
  const clBody = await getText(page, 2000);
  await shot(page, 'student-classes-full');
  console.log('\n--- STUDENT CLASSES ---');
  console.log('URL:', clUrl);
  console.log('Content:\n', clBody);

  await ctx.close();
}

await browser.close();
console.log('\nDetail screenshots saved to:', SHOT_DIR);
