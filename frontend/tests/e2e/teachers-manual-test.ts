import { chromium } from '@playwright/test';
import * as fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 800 });

  const screenshotDir = '/f/Git/easy_eng/frontend/test-screenshots';
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('Step 1: Navigating to login page...');
  await page.goto('http://localhost:3000/en/auth/login');

  console.log('Step 2: Waiting 2 seconds for page to load...');
  await page.waitForTimeout(2000);

  console.log('Step 3: Filling email...');
  await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');

  console.log('Step 4: Filling password...');
  await page.fill('input[type="password"], input[name="password"]', '123456');

  console.log('Step 5: Clicking submit...');
  await page.click('button[type="submit"]');

  console.log('Step 6: Waiting 3 seconds for redirect...');
  await page.waitForTimeout(3000);

  console.log('Step 7: Taking dashboard screenshot...');
  await page.screenshot({ path: `${screenshotDir}/dashboard.png`, fullPage: true });
  console.log('Dashboard URL:', page.url());
  console.log('Dashboard title:', await page.title());

  console.log('Step 8: Navigating to teachers page...');
  await page.goto('http://localhost:3000/en/dashboard/teachers');

  console.log('Step 9: Waiting 4 seconds for data to load...');
  await page.waitForTimeout(4000);

  console.log('Step 10: Taking teachers screenshot...');
  await page.screenshot({ path: `${screenshotDir}/teachers.png`, fullPage: true });

  console.log('Step 11: Analyzing page content...');
  const pageTitle = await page.textContent('h1');
  const subtitle = await page.textContent('p.text-text-secondary, h1 + p');
  const teacherCards = await page.$$('.grid > div > a');
  const teacherNames = await page.$$eval('h3', (els) => els.map(el => el.textContent?.trim()));
  const hasTeacherUser = teacherNames.some(n => n?.includes('Teacher User'));

  console.log('=== RESULTS ===');
  console.log('Page title (h1):', pageTitle);
  console.log('Subtitle:', subtitle);
  console.log('Number of teacher cards:', teacherCards.length);
  console.log('Teacher names found:', JSON.stringify(teacherNames));
  console.log('"Teacher User" visible:', hasTeacherUser);

  // Check for any "no results" text
  const noResults = await page.$('.text-text-muted');
  if (noResults) {
    console.log('No results text:', await noResults.textContent());
  }

  await browser.close();
  console.log('Done.');
})();
