// Capture the redesigned classroom: teacher (with textbook picker) + student
import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'https://easyeng-dev.vercel.app';
const CLASS_ID = 'ab4b0ced-700a-4c6f-a4db-b7305207dbf9';
const SLOT_EPOCH = new Date('2026-06-15T12:00:00+07:00').getTime() + 2 * 60 * 1000;
fs.mkdirSync('e2e-results', { recursive: true });
const log = (s, st, d = '') => console.log(`[${st}] ${s}${d ? ' — ' + d : ''}`);

async function login(page, email) {
  await page.goto(`${BASE}/vi/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.fill("input[placeholder='you@example.com']", email);
  await page.fill("input[placeholder='••••••••']", '123456');
  await page.click("button[type='submit']");
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const tPage = await (await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 1440, height: 860 } })).newPage();
const sPage = await (await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 1440, height: 860 } })).newPage();

await login(tPage, 'jimmycuong1414@gmail.com');
await login(sPage, 'jimmycuong1413@gmail.com');
log('Logins', 'PASS');

// Teacher opens + starts class
await tPage.clock.install({ time: SLOT_EPOCH });
await tPage.goto(`${BASE}/vi/class/${CLASS_ID}/live`, { waitUntil: 'domcontentloaded' });
await tPage.waitForTimeout(8000);
tPage.once('dialog', d => d.accept());
const tStart = tPage.locator("button:has-text('Start Class'), button:has-text('Join Class')").first();
if (await tStart.count() > 0 && await tStart.isEnabled().catch(() => false)) {
  await tStart.click();
  await tPage.waitForTimeout(12000);
}
const layout = await tPage.evaluate(() => ({
  hasTextbook: document.body.innerText.includes('giáo trình') || document.body.innerText.includes('Giáo trình'),
  hasChange: document.body.innerText.includes('Đổi giáo trình'),
  hasLive: document.body.innerText.includes('Đang diễn ra'),
  callChildren: document.querySelector('#cometchat-video-container')?.children.length ?? -1,
}));
log('Teacher classroom layout', (layout.hasTextbook && layout.hasChange) ? 'PASS' : 'WARN', JSON.stringify(layout));
await tPage.screenshot({ path: 'e2e-results/rd1-teacher-classroom.png' });

// Open the textbook picker and choose a material
const change = tPage.locator("button:has-text('Đổi giáo trình'), button:has-text('Chọn giáo trình')").first();
if (await change.count() > 0) {
  await change.click();
  await tPage.waitForTimeout(4000);
  await tPage.screenshot({ path: 'e2e-results/rd2-textbook-picker.png' });
  const items = tPage.locator("button:has-text('phút')");
  const n = await items.count();
  if (n > 0) {
    await items.first().click();
    await tPage.waitForTimeout(5000);
    const bodyLen = await tPage.evaluate(() => document.querySelector('.ed-prose')?.textContent?.length ?? 0);
    log('Textbook picker + material render', bodyLen > 50 ? 'PASS' : 'WARN', `picker had ${n} items, body chars=${bodyLen}`);
    await tPage.screenshot({ path: 'e2e-results/rd3-teacher-with-material.png' });
  } else log('Textbook picker', 'WARN', 'no material items found');
}

// Student joins to confirm they see the same layout
await sPage.clock.install({ time: SLOT_EPOCH });
await sPage.goto(`${BASE}/vi/class/${CLASS_ID}/live`, { waitUntil: 'domcontentloaded' });
await sPage.waitForTimeout(8000);
sPage.once('dialog', d => d.accept());
const sJoin = sPage.locator("button:has-text('Join Class')").first();
if (await sJoin.count() > 0 && await sJoin.isEnabled().catch(() => false)) {
  await sJoin.click();
  await sPage.waitForTimeout(12000);
}
const sLayout = await sPage.evaluate(() => ({
  hasTextbook: document.body.innerText.includes('Giáo trình') || document.body.innerText.includes('giáo trình'),
  hasChange: document.body.innerText.includes('Đổi giáo trình'), // should be FALSE for student
  callChildren: document.querySelector('#cometchat-video-container')?.children.length ?? -1,
}));
log('Student classroom layout', (sLayout.hasTextbook && !sLayout.hasChange) ? 'PASS' : 'WARN', JSON.stringify(sLayout));
await sPage.screenshot({ path: 'e2e-results/rd4-student-classroom.png' });

await browser.close();
