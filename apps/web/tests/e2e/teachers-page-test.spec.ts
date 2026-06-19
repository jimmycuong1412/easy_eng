import { test, expect } from '@playwright/test';

test.setTimeout(60000);

test('Teachers page test', async ({ page }) => {
  // Step 1: Navigate to login page
  await page.goto('http://localhost:3000/en/auth/login');

  // Step 2: Wait 2 seconds for the page to fully load
  await page.waitForTimeout(2000);

  // Step 3: Fill email using id="email"
  await page.locator('#email').fill('jimmycuong1413@gmail.com');

  // Step 4: Fill password using id="password"
  await page.locator('#password').fill('123456');

  // Step 5: Click the form submit button (Log in)
  await page.locator('form button[type="submit"]').click();

  // Step 6: Wait 3 seconds for redirect to complete
  await page.waitForTimeout(3000);

  // Step 7: Take a screenshot of dashboard
  await page.screenshot({ path: 'tests/screenshots/after-login.png', fullPage: true });
  console.log('Current URL after login:', page.url());

  // Step 8: Navigate to teachers page
  await page.goto('http://localhost:3000/en/dashboard/teachers');

  // Step 9: Wait 4 seconds for the page and data to fully load
  await page.waitForTimeout(4000);

  // Step 10: Take a screenshot of teachers page
  await page.screenshot({ path: 'tests/screenshots/teachers-page.png', fullPage: true });
  console.log('Teachers page URL:', page.url());

  // Step 11: Report findings
  const allText = await page.locator('body').innerText();
  const lines = allText.split('\n').filter(line => line.trim().length > 0);

  console.log('=== PAGE TEXT (first 100 lines) ===');
  lines.slice(0, 100).forEach(line => console.log(' -', line.trim()));

  // Check for "Teacher User" text
  const teacherUserCount = await page.locator('text=Teacher User').count();
  console.log('\n=== KEY FINDINGS ===');
  console.log('1. Teacher User text occurrences:', teacherUserCount);

  if (teacherUserCount > 0) {
    console.log('   -> "Teacher User" IS visible on the page');
  } else {
    console.log('   -> "Teacher User" is NOT visible on the page');
  }

  // Look for specific count patterns
  const countLine = lines.find(line => /\d+\s*(matching|teacher|giáo viên)/i.test(line));
  console.log('3. Count line:', countLine || 'Not found');

  // Check heading
  const h1Text = await page.locator('h1').allInnerTexts();
  console.log('5. H1 texts:', h1Text);

  // Check for any "p" tag near h1
  const pTexts = await page.locator('p').allInnerTexts();
  const shortP = pTexts.filter(t => t.trim() && t.trim().length < 100);
  console.log('6. Short paragraph texts:', shortP.slice(0, 10));
});
