import { chromium } from '@playwright/test';
import * as fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const screenshotDir = '/f/Git/easy_eng/frontend/test-screenshots';
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('Step 1: Navigating to login page...');
  await page.goto('http://localhost:3000/en/auth/login');
  await page.waitForTimeout(2000);

  console.log('Step 3: Filling email...');
  await page.fill('input[type="email"], input[name="email"]', 'jimmycuong1413@gmail.com');

  console.log('Step 4: Filling password...');
  await page.fill('input[type="password"], input[name="password"]', '123456');

  console.log('Step 5: Clicking submit...');
  await page.click('button[type="submit"]');

  console.log('Step 6: Waiting 3 seconds for redirect...');
  await page.waitForTimeout(3000);

  console.log('Dashboard URL:', page.url());
  await page.screenshot({ path: `${screenshotDir}/dashboard.png`, fullPage: true });
  console.log('Dashboard screenshot saved.');

  console.log('Step 8: Navigating to teachers page...');
  await page.goto('http://localhost:3000/en/dashboard/teachers');
  await page.waitForTimeout(4000);

  await page.screenshot({ path: `${screenshotDir}/teachers.png`, fullPage: true });
  console.log('Teachers screenshot saved.');

  // Get full page text content to analyze what is visible
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT CONTENT ===');
  console.log(bodyText.substring(0, 3000));

  // Count teacher cards
  const cardCount = await page.evaluate(() => {
    const grid = document.querySelector('.grid');
    if (!grid) return 0;
    return grid.querySelectorAll(':scope > div').length;
  });
  console.log('Teacher card divs in grid:', cardCount);

  // Check for Teacher User
  const hasTeacherUser = bodyText.includes('Teacher User');
  console.log('"Teacher User" in page:', hasTeacherUser);

  // Check current URL
  console.log('Current URL:', page.url());

  await browser.close();
})();
