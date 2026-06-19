import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '../../qa-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

test('Debug: Inspect login form', async ({ page }) => {
  await page.goto(`${BASE_URL}/en/auth/login`);
  await page.waitForLoadState('networkidle');
  await takeScreenshot(page, 'debug-01-login-page');

  // List all inputs and buttons
  const inputs = await page.evaluate(() => {
    const all = document.querySelectorAll('input');
    return Array.from(all).map(el => ({
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      'aria-label': el.getAttribute('aria-label'),
    }));
  });
  console.log('[Debug] Inputs:', JSON.stringify(inputs, null, 2));

  const buttons = await page.evaluate(() => {
    const all = document.querySelectorAll('button');
    return Array.from(all).map(el => ({
      type: el.type,
      text: el.innerText.trim(),
      id: el.id,
      'aria-label': el.getAttribute('aria-label'),
    }));
  });
  console.log('[Debug] Buttons:', JSON.stringify(buttons, null, 2));

  // Check the form HTML
  const formHtml = await page.evaluate(() => {
    const form = document.querySelector('form');
    return form ? form.outerHTML.substring(0, 2000) : 'No form found';
  });
  console.log('[Debug] Form HTML:', formHtml);
});

test('Debug: Attempt login with slow fill', async ({ page }) => {
  await page.goto(`${BASE_URL}/en/auth/login`);
  await page.waitForLoadState('networkidle');

  // Get all input elements
  const inputCount = await page.locator('input').count();
  console.log(`[Debug] Total inputs: ${inputCount}`);

  // Fill first input (email)
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill('jimmycuong1413@gmail.com');
  await page.waitForTimeout(500);

  // Fill password
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('12345678');
  await page.waitForTimeout(500);

  await takeScreenshot(page, 'debug-02-filled-form');

  // Find and log all buttons
  const buttonCount = await page.locator('button').count();
  console.log(`[Debug] Total buttons: ${buttonCount}`);

  for (let i = 0; i < buttonCount; i++) {
    const btn = page.locator('button').nth(i);
    const text = await btn.innerText();
    const type = await btn.getAttribute('type');
    console.log(`[Debug] Button ${i}: type="${type}", text="${text.trim()}"`);
  }

  // Click the submit button
  const submitBtn = page.locator('button[type="submit"]').first();
  const submitText = await submitBtn.innerText();
  console.log(`[Debug] Submit button text: "${submitText}"`);
  await submitBtn.click();

  // Wait for response
  await page.waitForTimeout(3000);
  const newUrl = page.url();
  console.log(`[Debug] URL after click: ${newUrl}`);

  await takeScreenshot(page, 'debug-03-after-submit');

  // Check for error messages
  const errorText = await page.evaluate(() => {
    const alerts = document.querySelectorAll('[role="alert"], .error, [class*="error"], [class*="Error"]');
    return Array.from(alerts).map(el => el.textContent?.trim()).filter(Boolean);
  });
  console.log('[Debug] Error messages:', errorText);

  // Full page text
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('[Debug] Page content after submit:', bodyText);
});

test('Debug: Check network on login', async ({ page }) => {
  const responses: any[] = [];
  page.on('response', response => {
    if (response.url().includes('auth') || response.url().includes('login') || response.url().includes('supabase')) {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    }
  });

  await page.goto(`${BASE_URL}/en/auth/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', 'jimmycuong1413@gmail.com');
  await page.fill('input[type="password"]', '12345678');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000);

  console.log('[Debug] Auth/login-related responses:', JSON.stringify(responses, null, 2));
  console.log('[Debug] Final URL:', page.url());
  await takeScreenshot(page, 'debug-04-after-network-login');
});
