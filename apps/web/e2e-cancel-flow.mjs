// E2E: student gems display on hard loads + booking + cancellation flow
import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'https://easyeng-dev.vercel.app';
const TEACHER_ID = '7a46e4e2-782c-471a-ba1b-cea449e75028';
const OUT = 'e2e-results';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const log = (step, status, detail = '') => {
  console.log(`[${status}] ${step}${detail ? ' — ' + detail : ''}`);
  results.push({ step, status, detail });
};
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, timeout: 10000 }).catch(() => {});

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  try {
    // login
    await page.goto(`${BASE}/vi/auth/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.fill("input[placeholder='you@example.com']", 'jimmycuong1413@gmail.com');
    await page.fill("input[placeholder='••••••••']", '123456');
    await page.click("button[type='submit']");
    await page.waitForURL('**/dashboard**', { timeout: 20000 });
    log('Login', 'PASS');

    /* ── G1: gems badge on HARD page load ── */
    await page.goto(`${BASE}/vi/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000); // allow retry/backoff to settle
    const gemText = await page.evaluate(() => {
      // sidebar gem badge is near the 💎 icon at top of sidebar
      const m = document.body.innerText.match(/💎\s*\n?\s*([\d.,]+)/);
      return m?.[1] ?? null;
    });
    const gems = Number((gemText ?? '0').replace(/[.,]/g, ''));
    log('G1 gems badge after hard load', gems > 0 ? 'PASS' : 'FAIL', `shows ${gemText}`);
    await shot(page, 'c01-dashboard-gems');

    /* ── G2: teachers list on HARD page load ── */
    await page.goto(`${BASE}/vi/dashboard/teachers`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000);
    const teacherCount = await page.evaluate(() =>
      document.body.innerText.match(/(\d+) giáo viên/)?.[1] ?? '?');
    log('G2 teachers list after hard load', Number(teacherCount) > 0 ? 'PASS' : 'FAIL', `${teacherCount} teachers`);
    await shot(page, 'c02-teachers-hardload');

    /* ── B1: book a fresh slot via UI ── */
    const card = page.locator("a[href*='/vi/dashboard/teachers/']").first();
    if (await card.count() === 0) throw new Error('no teacher card');
    await card.click();
    await page.waitForURL('**/dashboard/teachers/**', { timeout: 15000 });
    await page.waitForTimeout(4000);

    let bookingDone = false; let bookedTime = null;
    for (let attempt = 0; attempt < 6 && !bookingDone; attempt++) {
      const slots = page.locator('td button:not([disabled])');
      const n = await slots.count();
      if (n === 0) throw new Error('no slots');
      const idx = (20 + attempt * 13) % n;
      await slots.nth(idx).click();
      await page.click("button:has-text('Xác nhận đặt lịch')");
      await page.waitForURL('**/bookings/confirm**', { timeout: 15000 });
      bookedTime = new URL(page.url()).searchParams.get('time');
      const respP = page.waitForResponse(r => r.url().includes('/api/bookings/book-slot'), { timeout: 20000 });
      await page.click("button:has-text('Xác nhận & Đặt lịch')");
      const resp = await respP;
      if (resp.status() === 201) { bookingDone = true; log('B1 booking created', 'PASS', `201 slot ${bookedTime}`); }
      else {
        const back = page.locator("button:has-text('Quay lại')");
        if (await back.count() > 0) await back.click(); else await page.goBack();
        await page.waitForURL('**/dashboard/teachers/**', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(3000);
      }
    }
    if (!bookingDone) throw new Error('could not book a slot');

    /* ── B2: bookings list shows Hủy button ── */
    await page.waitForURL('**/student/bookings**', { timeout: 15000 }).catch(() => {});
    let cancelLinks = [];
    for (let i = 0; i < 5 && cancelLinks.length === 0; i++) {
      await page.waitForTimeout(3000);
      cancelLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a[href*='/bookings/cancel/']")).map(a => a.getAttribute('href')));
    }
    log('B2 Hủy buttons on upcoming bookings', cancelLinks.length > 0 ? 'PASS' : 'FAIL', `${cancelLinks.length} cancel links`);
    await shot(page, 'c03-bookings-cancel-buttons');
    if (cancelLinks.length === 0) throw new Error('no cancel links');

    /* ── C1: open cancel page for the newest booking ── */
    await page.click(`a[href='${cancelLinks[0]}']`);
    await page.waitForURL('**/bookings/cancel/**', { timeout: 15000 });
    await page.waitForTimeout(5000);
    const previewText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    const pctMatch = previewText.match(/Hoàn lại:\s*(\d+)%\s*\((\d+)\s*\/\s*(\d+)/);
    if (pctMatch) log('C1 refund preview', 'PASS', `refund ${pctMatch[1]}% = ${pctMatch[2]}/${pctMatch[3]} gems`);
    else log('C1 refund preview', /Không thể hủy/.test(previewText) ? 'FAIL' : 'WARN', previewText.replace(/\n+/g, ' | ').slice(0, 120));
    await shot(page, 'c04-cancel-preview');

    /* ── C2: confirm cancellation through the modal ── */
    await page.click("button:has-text('Hủy lớp học này')");
    await page.waitForTimeout(1500);
    const reasonBox = page.locator('textarea');
    if (await reasonBox.count() > 0) await reasonBox.fill('E2E test cancellation');
    const respP = page.waitForResponse(r => r.url().includes('/api/bookings/cancel') && r.request().method() === 'POST', { timeout: 20000 });
    await page.click("button:has-text('Xác nhận hủy')");
    const cResp = await respP;
    const cBody = await cResp.json().catch(() => ({}));
    if (cResp.status() === 200) log('C2 cancellation API', 'PASS', `refund ${cBody.refundPercentage}% → +${cBody.gemsRefunded} gems`);
    else log('C2 cancellation API', 'FAIL', `HTTP ${cResp.status()} ${JSON.stringify(cBody)}`);
    await page.waitForTimeout(2000);
    const doneText = await page.evaluate(() => document.body.innerText.slice(0, 300));
    log('C3 success screen', /Đã hủy lớp học/.test(doneText) ? 'PASS' : 'WARN', doneText.replace(/\n+/g, ' | ').slice(0, 100));
    await shot(page, 'c05-cancelled');

    /* ── C4: redirected to bookings; booking in Đã hủy tab ── */
    await page.waitForURL('**/student/bookings**', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(4000);
    const tabText = await page.evaluate(() => document.body.innerText.match(/Đã hủy \((\d+)\)/)?.[1] ?? '?');
    log('C4 cancelled tab count', Number(tabText) > 0 ? 'PASS' : 'WARN', `Đã hủy (${tabText})`);
    await shot(page, 'c06-bookings-after-cancel');

    /* ── C5: double-cancel guard ── */
    const dup = await page.evaluate(async (href) => {
      const id = href.match(/cancel\/([0-9a-f-]+)/)?.[1];
      const r = await fetch('/api/bookings/cancel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }), credentials: 'include',
      });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    }, cancelLinks[0]);
    log('C5 double-cancel guard', dup.status === 409 ? 'PASS' : 'FAIL', `HTTP ${dup.status} ${JSON.stringify(dup.body).slice(0, 80)}`);
  } catch (e) {
    log('FATAL', 'FAIL', e.message);
    await shot(page, 'c99-crash');
  } finally {
    await browser.close();
    console.log('\n===== SUMMARY =====');
    for (const r of results) console.log(`${r.status.padEnd(5)} ${r.step}${r.detail ? ' — ' + r.detail : ''}`);
  }
};
main();
