// Probe: CometChat auth-token API + SDK init state
import { chromium } from '@playwright/test';
const BASE = 'https://easyeng-dev.vercel.app';

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  await page.goto(`${BASE}/vi/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.fill("input[placeholder='you@example.com']", 'jimmycuong1414@gmail.com');
  await page.fill("input[placeholder='••••••••']", '123456');
  await page.click("button[type='submit']");
  await page.waitForURL('**/dashboard**', { timeout: 20000 });

  const probe = await page.evaluate(async () => {
    const r = await fetch('/api/cometchat/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    });
    return { status: r.status, body: (await r.text()).slice(0, 500) };
  });
  console.log('auth-token API:', JSON.stringify(probe, null, 2));
  await browser.close();
};
main();
