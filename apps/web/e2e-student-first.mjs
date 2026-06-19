// E2E: student opens live page BEFORE teacher → waiting screen → teacher opens → student auto-advances
// Also: teacher schedule page shows "Lớp sắp tới" with Vào lớp button
import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'https://easyeng-dev.vercel.app';
const CLASS_ID = 'b78bdcea-31ac-4b98-a1fe-44a43b05545b'; // booking a41b1511, 2026-06-15 10:30
const SLOT_EPOCH = new Date('2026-06-15T10:30:00+07:00').getTime() + 2 * 60 * 1000;
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
const sPage = await (await browser.newContext({ permissions: ['camera', 'microphone'] })).newPage();
const tPage = await (await browser.newContext({ permissions: ['camera', 'microphone'] })).newPage();

await login(sPage, 'jimmycuong1413@gmail.com');
await login(tPage, 'jimmycuong1414@gmail.com');
log('Logins', 'PASS');

/* 1. STUDENT first → must see waiting screen, not error */
await sPage.clock.install({ time: SLOT_EPOCH });
await sPage.goto(`${BASE}/vi/class/${CLASS_ID}/live`, { waitUntil: 'domcontentloaded' });
await sPage.waitForTimeout(8000);
const sText1 = await sPage.evaluate(() => document.body.innerText.slice(0, 400));
if (/Đang chờ giáo viên/.test(sText1)) log('1 student-first waiting screen', 'PASS', 'shows "Đang chờ giáo viên bắt đầu lớp học"');
else if (/Class session not found|Unable to join/.test(sText1)) log('1 student-first waiting screen', 'FAIL', sText1.replace(/\n+/g, ' | ').slice(0, 120));
else log('1 student-first waiting screen', 'WARN', sText1.replace(/\n+/g, ' | ').slice(0, 120));
await sPage.screenshot({ path: 'e2e-results/sf1-student-waiting.png' });

/* 2. TEACHER schedule page shows Lớp sắp tới with Vào lớp */
await tPage.goto(`${BASE}/vi/teacher/schedule`, { waitUntil: 'domcontentloaded' });
await tPage.waitForTimeout(10000);
const schedText = await tPage.evaluate(() => ({
  hasSection: document.body.innerText.includes('Lớp sắp tới'),
  joinLinks: Array.from(document.querySelectorAll("a[href*='/live']")).map(a => a.getAttribute('href')).slice(0, 5),
}));
if (schedText.hasSection && schedText.joinLinks.length > 0)
  log('2 teacher schedule Lớp sắp tới', 'PASS', `${schedText.joinLinks.length} Vào lớp link(s), first: ${schedText.joinLinks[0]}`);
else log('2 teacher schedule Lớp sắp tới', 'FAIL', JSON.stringify(schedText).slice(0, 150));
await tPage.screenshot({ path: 'e2e-results/sf2-teacher-schedule.png' });

/* 3. TEACHER opens the live room (via the page they can now find) */
await tPage.clock.install({ time: SLOT_EPOCH });
await tPage.goto(`${BASE}/vi/class/${CLASS_ID}/live`, { waitUntil: 'domcontentloaded' });
await tPage.waitForTimeout(8000);
const tText = await tPage.evaluate(() => document.body.innerText.slice(0, 300));
log('3 teacher live page', /Waiting Room|Start Class/.test(tText) ? 'PASS' : 'WARN', tText.replace(/\n+/g, ' | ').slice(0, 100));

/* 4. STUDENT auto-advances from waiting screen via poll (≤ ~16s) */
await sPage.waitForTimeout(16000);
const sText2 = await sPage.evaluate(() => document.body.innerText.slice(0, 400));
if (/Waiting Room|Join Class/.test(sText2)) log('4 student auto-advanced to WaitingRoom', 'PASS');
else if (/Đang chờ giáo viên/.test(sText2)) log('4 student auto-advanced', 'FAIL', 'still on waiting screen after teacher opened');
else log('4 student auto-advanced', 'WARN', sText2.replace(/\n+/g, ' | ').slice(0, 120));
await sPage.screenshot({ path: 'e2e-results/sf4-student-advanced.png' });

await browser.close();
