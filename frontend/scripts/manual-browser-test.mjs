/**
 * Manual browser test using Playwright programmatically
 * Tests Teacher and Admin accounts
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, '../test-screenshots');

try {
  mkdirSync(screenshotsDir, { recursive: true });
} catch (e) {}

function log(step, url, note) {
  console.log(`\n--- ${step} ---`);
  console.log(`URL: ${url}`);
  console.log(`Note: ${note}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function safeGoto(page, url, waitMs = 5000) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (e) {
    console.log(`  [Navigation note] ${e.message.split('\n')[0]}`);
    // Even if navigation "fails", we might still be on the page
  }
  await sleep(waitMs);
  return page.url();
}

async function getPageInfo(page) {
  try {
    return await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      const title = document.title;
      const main = document.querySelector('main, [role="main"]');
      const nav = document.querySelector('nav, aside, [class*="sidebar"], [class*="nav"]');
      const errorEl = document.querySelector('[class*="error"], [class*="denied"], [class*="forbidden"]');
      return {
        h1: h1 ? h1.innerText.trim() : null,
        h2: h2 ? h2.innerText.trim() : null,
        title,
        mainText: main ? main.innerText.substring(0, 400) : document.body.innerText.substring(0, 400),
        navText: nav ? nav.innerText.substring(0, 500) : 'No nav found',
        errorText: errorEl ? errorEl.innerText.substring(0, 200) : null,
      };
    });
  } catch (e) {
    return { error: e.message };
  }
}

async function loginAndTest(browser, { email, password, role, steps }) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${role.toUpperCase()} ACCOUNT (${email})`);
  console.log('='.repeat(60));

  // Step 1: Navigate to login
  console.log('\nSTEP 1: Navigate to http://localhost:3000/en/auth/login');
  await safeGoto(page, 'http://localhost:3000/en/auth/login', 2000);
  console.log(`  URL: ${page.url()}`);
  await page.screenshot({ path: join(screenshotsDir, `${role}-01-login-page.png`), fullPage: true });
  console.log(`  Screenshot saved: ${role}-01-login-page.png`);

  // Step 2: Fill email — scroll down past Google button
  console.log(`\nSTEP 2: Fill email: ${email}`);
  await page.evaluate(() => window.scrollTo(0, 300));
  await sleep(300);

  // Try multiple selectors for email input
  let emailFilled = false;
  for (const selector of [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
    'input[id*="email" i]',
  ]) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        await el.fill(email);
        emailFilled = true;
        console.log(`  Filled email using selector: ${selector}`);
        break;
      }
    } catch (e) {}
  }
  if (!emailFilled) console.log('  WARNING: Could not find email input');

  // Step 3: Fill password
  console.log('\nSTEP 3: Fill password: 12345678');
  try {
    const passEl = page.locator('input[type="password"]').first();
    await passEl.fill(password);
    console.log('  Password filled');
  } catch (e) {
    console.log(`  WARNING: Could not fill password: ${e.message}`);
  }

  // Step 4: Click submit button inside form
  console.log('\nSTEP 4: Click form submit button');
  let submitted = false;
  for (const selector of [
    'form button[type="submit"]',
    'form input[type="submit"]',
    'button[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Login")',
    'button:has-text("Log in")',
  ]) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        await el.click();
        submitted = true;
        console.log(`  Clicked submit using selector: ${selector}`);
        break;
      }
    } catch (e) {}
  }
  if (!submitted) console.log('  WARNING: Could not find submit button');

  // Wait up to 8 seconds for redirect
  console.log('  Waiting 8 seconds for redirect...');
  await sleep(8000);

  // Step 5: Screenshot after login
  const urlAfterLogin = page.url();
  console.log(`\nSTEP 5: After login`);
  console.log(`  URL: ${urlAfterLogin}`);
  await page.screenshot({ path: join(screenshotsDir, `${role}-02-after-login.png`), fullPage: true });
  console.log(`  Screenshot saved: ${role}-02-after-login.png`);

  const loginInfo = await getPageInfo(page);
  console.log(`  Page Title: ${loginInfo.title}`);
  console.log(`  H1: ${loginInfo.h1}`);
  console.log(`  Navigation/Sidebar text preview:`);
  console.log(`  ${loginInfo.navText.substring(0, 300).replace(/\n/g, ' | ')}`);

  // Run role-specific navigation steps
  for (const step of steps) {
    console.log(`\n${'-'.repeat(50)}`);
    console.log(`STEP: Navigate to ${step.url}`);
    const currentUrl = await safeGoto(page, step.url, 5000);
    console.log(`  URL after navigation: ${currentUrl}`);
    console.log(`  ${step.description}`);

    await page.screenshot({ path: join(screenshotsDir, `${role}-${step.screenshotName}.png`), fullPage: true });
    console.log(`  Screenshot saved: ${role}-${step.screenshotName}.png`);

    const info = await getPageInfo(page);
    console.log(`  Page Title: ${info.title}`);
    console.log(`  H1: ${info.h1 || 'none'}`);
    if (info.h2) console.log(`  H2: ${info.h2}`);
    if (info.errorText) console.log(`  Error element text: ${info.errorText}`);
    console.log(`  Main content preview: ${info.mainText.substring(0, 300).replace(/\n/g, ' | ')}`);

    // Check if redirected away from intended URL
    if (!currentUrl.includes(new URL(step.url).pathname)) {
      console.log(`  REDIRECT DETECTED: Intended ${step.url} but ended up at ${currentUrl}`);
    } else {
      console.log(`  PAGE LOADED: Stayed at intended URL`);
    }
  }

  await context.close();
}

async function main() {
  console.log('Starting browser tests...');
  console.log(`Screenshots will be saved to: ${screenshotsDir}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // TEST 1: Teacher Account
    await loginAndTest(browser, {
      email: 'jimmycuong1414@gmail.com',
      password: '12345678',
      role: 'teacher',
      steps: [
        {
          url: 'http://localhost:3000/en/teacher/schedule',
          description: 'Does schedule page load or redirect?',
          screenshotName: '03-teacher-schedule',
        },
        {
          url: 'http://localhost:3000/en/teacher/quiz/create',
          description: 'Does quiz create page load?',
          screenshotName: '04-teacher-quiz-create',
        },
      ],
    });

    // TEST 2: Admin Account
    await loginAndTest(browser, {
      email: 'jimmycuong1412@gmail.com',
      password: '12345678',
      role: 'admin',
      steps: [
        {
          url: 'http://localhost:3000/en/dashboard/admin',
          description: 'Admin dashboard or access denied?',
          screenshotName: '03-admin-dashboard',
        },
        {
          url: 'http://localhost:3000/en/admin/analytics',
          description: 'Analytics page or redirect?',
          screenshotName: '04-admin-analytics',
        },
      ],
    });

  } finally {
    await browser.close();
    console.log(`\n${'='.repeat(60)}`);
    console.log('ALL TESTS COMPLETE');
    console.log(`Screenshots saved to: ${screenshotsDir}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
