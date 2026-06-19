import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const SCREENSHOT_DIR = './test-screenshots';
const results = [];

function log(step, url, description) {
  const entry = { step, url, description };
  results.push(entry);
  console.log(`[${step}] URL: ${url}`);
  console.log(`        ${description}`);
}

async function clearCookies(context, page) {
  await context.clearCookies();
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(';').forEach(c =>
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/')
      );
    } catch(e) {}
  });
  await context.clearCookies();
}

async function login(page, email, password) {
  await page.goto('http://localhost:3000/en/auth/login');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[id*="password"]').first();
  await passwordInput.fill(password);

  // Click submit
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // Wait 8 seconds
  await page.waitForTimeout(8000);
}

async function getSidebarRole(page) {
  const text = await page.evaluate(() => {
    const body = document.body.innerText;
    // Look for role indicators
    const roleMatches = body.match(/\b(Admin|Teacher|Student|Giáo viên|Học sinh|Quản trị)\b/gi);
    return roleMatches ? roleMatches.slice(0, 5).join(', ') : 'No role found';
  });
  return text;
}

async function getPageTitle(page) {
  return await page.title();
}

async function getHeadings(page) {
  return await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 5);
    return headings.map(h => h.innerText.trim()).filter(t => t).join(' | ');
  });
}

async function getNavItems(page) {
  return await page.evaluate(() => {
    const nav = document.querySelector('nav, aside, [role="navigation"]');
    if (!nav) return 'No nav found';
    const links = Array.from(nav.querySelectorAll('a, button')).slice(0, 10);
    return links.map(l => l.innerText.trim()).filter(t => t).join(', ');
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

// =============================================
// TEST 1: TEACHER ACCOUNT
// =============================================
console.log('\n========== TEACHER ACCOUNT TESTS ==========\n');

// Step 1: Clear cookies
await clearCookies(context, page);
log('T-CLEAR', 'about:blank', 'Cookies and storage cleared');

// Step 2: Login
await login(page, 'jimmycuong1414@gmail.com', '12345678');
const teacherLoginUrl = page.url();
const teacherLoginTitle = await getPageTitle(page);
const teacherLoginHeadings = await getHeadings(page);
const teacherLoginRole = await getSidebarRole(page);
const teacherNavItems = await getNavItems(page);
await page.screenshot({ path: `${SCREENSHOT_DIR}/01-teacher-after-login.png`, fullPage: false });
log('T-LOGIN', teacherLoginUrl, `Title: "${teacherLoginTitle}" | Headings: "${teacherLoginHeadings}" | Role keywords: "${teacherLoginRole}" | Nav: "${teacherNavItems}"`);

// Step 3: Teacher schedule
await page.goto('http://localhost:3000/en/teacher/schedule');
await page.waitForTimeout(5000);
const teacherScheduleUrl = page.url();
const teacherScheduleTitle = await getPageTitle(page);
const teacherScheduleHeadings = await getHeadings(page);
const teacherScheduleContent = await page.evaluate(() => document.body.innerText.substring(0, 500));
await page.screenshot({ path: `${SCREENSHOT_DIR}/02-teacher-schedule.png`, fullPage: false });
log('T-SCHEDULE', teacherScheduleUrl, `Title: "${teacherScheduleTitle}" | Headings: "${teacherScheduleHeadings}" | Content: "${teacherScheduleContent.replace(/\n/g, ' ').substring(0, 200)}"`);

// Step 4: Teacher quiz create
await page.goto('http://localhost:3000/en/teacher/quiz/create');
await page.waitForTimeout(5000);
const teacherQuizUrl = page.url();
const teacherQuizTitle = await getPageTitle(page);
const teacherQuizHeadings = await getHeadings(page);
const teacherQuizContent = await page.evaluate(() => document.body.innerText.substring(0, 500));
await page.screenshot({ path: `${SCREENSHOT_DIR}/03-teacher-quiz-create.png`, fullPage: false });
log('T-QUIZ', teacherQuizUrl, `Title: "${teacherQuizTitle}" | Headings: "${teacherQuizHeadings}" | Content: "${teacherQuizContent.replace(/\n/g, ' ').substring(0, 200)}"`);

// =============================================
// TEST 2: ADMIN ACCOUNT
// =============================================
console.log('\n========== ADMIN ACCOUNT TESTS ==========\n');

// Step 1: Clear cookies
await clearCookies(context, page);
log('A-CLEAR', 'about:blank', 'Cookies and storage cleared');

// Step 2: Login as admin
await login(page, 'jimmycuong1412@gmail.com', '12345678');
const adminLoginUrl = page.url();
const adminLoginTitle = await getPageTitle(page);
const adminLoginHeadings = await getHeadings(page);
const adminLoginRole = await getSidebarRole(page);
const adminNavItems = await getNavItems(page);
await page.screenshot({ path: `${SCREENSHOT_DIR}/04-admin-after-login.png`, fullPage: false });
log('A-LOGIN', adminLoginUrl, `Title: "${adminLoginTitle}" | Headings: "${adminLoginHeadings}" | Role keywords: "${adminLoginRole}" | Nav: "${adminNavItems}"`);

// Step 3: Admin dashboard
await page.goto('http://localhost:3000/en/dashboard/admin');
await page.waitForTimeout(5000);
const adminDashUrl = page.url();
const adminDashTitle = await getPageTitle(page);
const adminDashHeadings = await getHeadings(page);
const adminDashContent = await page.evaluate(() => document.body.innerText.substring(0, 500));
await page.screenshot({ path: `${SCREENSHOT_DIR}/05-admin-dashboard.png`, fullPage: false });
log('A-DASH', adminDashUrl, `Title: "${adminDashTitle}" | Headings: "${adminDashHeadings}" | Content: "${adminDashContent.replace(/\n/g, ' ').substring(0, 200)}"`);

// Step 4: Admin analytics
await page.goto('http://localhost:3000/en/admin/analytics');
await page.waitForTimeout(5000);
const adminAnalyticsUrl = page.url();
const adminAnalyticsTitle = await getPageTitle(page);
const adminAnalyticsHeadings = await getHeadings(page);
const adminAnalyticsContent = await page.evaluate(() => document.body.innerText.substring(0, 500));
await page.screenshot({ path: `${SCREENSHOT_DIR}/06-admin-analytics.png`, fullPage: false });
log('A-ANALYTICS', adminAnalyticsUrl, `Title: "${adminAnalyticsTitle}" | Headings: "${adminAnalyticsHeadings}" | Content: "${adminAnalyticsContent.replace(/\n/g, ' ').substring(0, 200)}"`);

await browser.close();

console.log('\n========== SUMMARY ==========\n');
results.forEach(r => {
  console.log(`Step: ${r.step}`);
  console.log(`URL:  ${r.url}`);
  console.log(`Info: ${r.description}`);
  console.log('---');
});

writeFileSync('./test-results.json', JSON.stringify(results, null, 2));
console.log('\nScreenshots saved to ./test-screenshots/');
console.log('Results saved to ./test-results.json');
