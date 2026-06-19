// Probe: capture full Calls SDK validation error during Start Class
import { chromium } from '@playwright/test';

const BASE = 'https://easyeng-dev.vercel.app';
const TEACHER_ID = '7a46e4e2-782c-471a-ba1b-cea449e75028';

async function login(page, email, pw) {
  await page.goto(`${BASE}/vi/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.fill("input[placeholder='you@example.com']", email);
  await page.fill("input[placeholder='••••••••']", pw);
  await page.click("button[type='submit']");
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
}

const main = async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  // booking 843fbe6a (2026-06-13 03:00) → class 76f7bb0c, resolved via SQL
  const made = { date: '2026-06-13', time: '03:00' };
  const classId = '76f7bb0c-92d1-4c17-b35b-6fe31191affe';

  // teacher starts the class with full console capture
  const tCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const tPage = await tCtx.newPage();
  tPage.on('console', async m => {
    const txt = m.text();
    if (/validation|call|Calls|token|session|cometchat/i.test(txt) && !/Failed to load resource/.test(txt)) {
      let vals = [];
      try { vals = await Promise.all(m.args().map(a => a.jsonValue().catch(() => '<unser>'))); } catch {}
      console.log(`[${m.type()}]`, txt.slice(0, 120), '||', JSON.stringify(vals).slice(0, 900));
    }
  });
  tPage.on('response', async r => {
    if (r.status() >= 400 && /cometchat/i.test(r.url())) {
      console.log(`[HTTP ${r.status()}]`, r.url().slice(0, 120), (await r.text().catch(() => '')).slice(0, 300));
    }
  });

  await login(tPage, 'jimmycuong1414@gmail.com', '123456');
  const slotEpoch = new Date(`${made.date}T${made.time}:00+07:00`).getTime() + 2 * 60 * 1000;
  await tPage.clock.install({ time: slotEpoch });
  await tPage.goto(`${BASE}/vi/class/${classId}/live`, { waitUntil: 'domcontentloaded' });
  await tPage.waitForTimeout(8000);
  tPage.once('dialog', d => d.accept());
  const btn = tPage.locator("button:has-text('Start Class'), button:has-text('Join Class')").first();
  if (await btn.count() > 0) {
    await btn.click();
    await tPage.waitForTimeout(20000);
    const call = await tPage.evaluate(() => {
      const el = document.querySelector('#cometchat-video-container');
      return { children: el?.children.length ?? -1, html: el?.innerHTML.slice(0, 300) ?? 'none' };
    });
    console.log('call container:', JSON.stringify(call));
    await tPage.screenshot({ path: 'e2e-results/probe-calls-final.png' });
  } else console.log('no start button');
  await browser.close();
};
main();
