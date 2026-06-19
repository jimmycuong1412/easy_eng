// Probe: capture every >=400 response while teacher starts the class
import { chromium } from '@playwright/test';

const BASE = 'https://easyeng-dev.vercel.app';
const CLASS_ID = 'd97b8569-ea1a-4ade-b319-acf73ddb1fd4'; // 17:00 booking
const SLOT_EPOCH = new Date('2026-06-12T17:00:00+07:00').getTime() + 2 * 60 * 1000;

const main = async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();

  page.on('response', async r => {
    if (r.status() >= 400) {
      const body = await r.text().catch(() => '');
      console.log(`\n[${r.status()}] ${r.request().method()} ${r.url().slice(0, 130)}`);
      if (r.request().postData()) console.log(`  req: ${r.request().postData().slice(0, 250)}`);
      console.log(`  res: ${body.slice(0, 350)}`);
    }
  });
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('status of')) console.log('console:', m.text().slice(0, 200)); });
  page.on('requestfailed', r => console.log(`REQUEST FAILED: ${r.method()} ${r.url().slice(0, 140)} — ${r.failure()?.errorText}`));

  await page.goto(`${BASE}/vi/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.fill("input[placeholder='you@example.com']", 'jimmycuong1414@gmail.com');
  await page.fill("input[placeholder='••••••••']", '123456');
  await page.click("button[type='submit']");
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
  console.log('teacher logged in');

  await page.clock.install({ time: SLOT_EPOCH });
  await page.goto(`${BASE}/vi/class/${CLASS_ID}/live`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);

  page.once('dialog', d => d.accept());
  const start = page.locator("button:has-text('Start Class'), button:has-text('Join Class')").first();
  if (await start.count() > 0) {
    console.log('\nclicking Start Class...');
    await start.click();
    await page.waitForTimeout(15000);
  }
  console.log('\nfinal text:', (await page.evaluate(() => document.body.innerText.slice(0, 300))).replace(/\n+/g, ' | '));
  await page.screenshot({ path: 'e2e-results/probe-teacher-final.png' });
  await browser.close();
};
main();
