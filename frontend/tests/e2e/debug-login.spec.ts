import { test } from '@playwright/test';

test('debug login errors', async ({ page }) => {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  await page.goto('http://localhost:3000/en/auth/login', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  
  console.log('=== PAGE ERRORS ===');
  for (const e of errors) {
    console.log('ERROR:', e.slice(0, 300));
  }
  
  console.log('=== CONSOLE ERRORS ===');
  for (const e of consoleErrors) {
    console.log('CONSOLE:', e.slice(0, 300));
  }
  
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log('BODY:', bodyText);
  
  const url = page.url();
  console.log('URL:', url);
});
