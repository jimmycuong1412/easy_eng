import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const screenshotDir = 'C:/Users/jimmy/Desktop/easy-eng-screenshots';
  try { fs.mkdirSync(screenshotDir, { recursive: true }); } catch(e) {}

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
  const dashPath = path.join(screenshotDir, 'dashboard.png');
  await page.screenshot({ path: dashPath, fullPage: true });
  console.log('Dashboard screenshot saved to:', dashPath);

  console.log('Step 8: Navigating to teachers page...');
  await page.goto('http://localhost:3000/en/dashboard/teachers');
  await page.waitForTimeout(4000);

  const teachPath = path.join(screenshotDir, 'teachers.png');
  await page.screenshot({ path: teachPath, fullPage: true });
  console.log('Teachers screenshot saved to:', teachPath);

  // Get full page text content to analyze what is visible
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== PAGE TEXT CONTENT ===');
  console.log(bodyText.substring(0, 3000));

  // Check for Teacher User
  const hasTeacherUser = bodyText.includes('Teacher User');
  console.log('"Teacher User" in page:', hasTeacherUser);

  await browser.close();
})();
