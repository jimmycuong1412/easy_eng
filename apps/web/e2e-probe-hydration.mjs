// Probe v3: instrument window.fetch to trace every supabase call on hard load
import { chromium } from '@playwright/test';
const BASE = 'https://easyeng-dev.vercel.app';

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    window.__flog = [];
    const orig = window.fetch;
    window.fetch = async (...args) => {
      const url = String(args[0]?.url ?? args[0]);
      if (url.includes('supabase.co')) {
        const init = args[1] ?? {};
        let auth = init.headers?.Authorization ?? init.headers?.authorization;
        if (!auth && args[0]?.headers?.get) auth = args[0].headers.get('Authorization');
        if (!auth && init.headers instanceof Headers) auth = init.headers.get('Authorization');
        const entry = { t: Date.now() % 100000, url: url.slice(28, 110), auth: auth ? auth.slice(7, 25) + '…' : 'NONE', result: 'pending' };
        window.__flog.push(entry);
        try {
          const r = await orig(...args);
          entry.result = 'HTTP ' + r.status;
          return r;
        } catch (e) {
          entry.result = 'THREW ' + String(e).slice(0, 60);
          throw e;
        }
      }
      return orig(...args);
    };
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/vi/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.fill("input[placeholder='you@example.com']", 'jimmycuong1413@gmail.com');
  await page.fill("input[placeholder='••••••••']", '123456');
  await page.click("button[type='submit']");
  await page.waitForURL('**/dashboard**', { timeout: 20000 });
  console.log('--- logged in; HARD LOAD /vi/dashboard ---');

  await page.goto(`${BASE}/vi/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(12000);

  const flog = await page.evaluate(() => window.__flog);
  console.log('supabase fetch log:');
  for (const e of flog) console.log(`  t=${e.t} ${e.result.padEnd(10)} auth=${e.auth.padEnd(20)} ${e.url}`);
  const ui = await page.evaluate(() => document.body.innerText.slice(0, 100).replace(/\n+/g, ' | '));
  console.log('UI:', ui);
  await browser.close();
};
main();
