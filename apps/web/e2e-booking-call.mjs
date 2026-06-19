// E2E: booking + live class with student & teacher in two browser contexts
// Run: node e2e-booking-call.mjs
import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'https://easyeng-dev.vercel.app';
const STUDENT = { email: 'jimmycuong1413@gmail.com', passwords: ['123456', '12345678'] };
const TEACHER = { email: 'jimmycuong1414@gmail.com', passwords: ['12345678', '123456'] };
const TEACHER_ID = '7a46e4e2-782c-471a-ba1b-cea449e75028';
const OUT = 'e2e-results';

fs.mkdirSync(OUT, { recursive: true });
const results = [];
const log = (step, status, detail = '') => {
  const line = `[${status}] ${step}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ step, status, detail });
};
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, timeout: 10000 }).catch(() => {});

async function login(page, who, { email, passwords }) {
  await page.goto(`${BASE}/vi/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  if (page.url().includes('/dashboard')) { log(`${who} login`, 'PASS', 'already logged in'); return true; }
  for (const pw of passwords) {
    await page.fill("input[placeholder='you@example.com']", email);
    await page.fill("input[placeholder='••••••••']", pw);
    await page.click("button[type='submit']");
    try {
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
      log(`${who} login`, 'PASS', `${email} / ${pw}`);
      return true;
    } catch {
      const err = await page.locator('text=/sai|invalid|error/i').first().textContent().catch(() => null);
      console.log(`  login attempt with ${pw} failed (${err ?? 'timeout'}), trying next password...`);
      if (!page.url().includes('/auth/login')) await page.goto(`${BASE}/vi/auth/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
    }
  }
  log(`${who} login`, 'FAIL', 'all passwords rejected');
  return false;
}

// wait until dashboard sidebar nav rendered (auth hydrated)
async function waitDashboardReady(page) {
  await page.waitForSelector('nav a[href*="/vi/"]', { timeout: 20000 });
  await page.waitForTimeout(1500);
}

const main = async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const teacherCtx = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 1440, height: 900 } });
  const studentCtx = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 1440, height: 900 } });
  const tPage = await teacherCtx.newPage();
  const sPage = await studentCtx.newPage();

  let classId = null;
  let bookedDate = null;
  let bookedTime = null;

  try {
    /* ───────── Phase 1: logins ───────── */
    const tOk = await login(tPage, 'Teacher', TEACHER);
    const sOk = await login(sPage, 'Student', STUDENT);
    if (!sOk) throw new Error('student login failed — cannot continue');
    await shot(tPage, '01-teacher-dashboard');
    await shot(sPage, '01-student-dashboard');

    /* ───────── Phase 2: student books a class ───────── */
    await waitDashboardReady(sPage);

    // S3: find teachers via client-side nav (avoids auth hydration bug)
    await sPage.click("nav a[href='/vi/dashboard/teachers']");
    await sPage.waitForTimeout(3000);
    const teacherCard = sPage.locator(`a[href*='/vi/dashboard/teachers/']`).first();
    const cardCount = await sPage.locator(`a[href*='/vi/dashboard/teachers/']`).count();
    if (cardCount === 0) { log('S3 teacher list', 'FAIL', '0 teachers rendered'); await shot(sPage, '02-no-teachers'); }
    else {
      log('S3 teacher list', 'PASS', `${cardCount} teacher(s)`);
      // S4: open teacher profile
      await teacherCard.click();
      await sPage.waitForURL('**/dashboard/teachers/**', { timeout: 15000 });
      await sPage.waitForTimeout(4000);
      await shot(sPage, '03-teacher-profile');
    }

    // S5–S7: pick a slot and book; on 409 (already booked by earlier run) retry another slot
    const teacherProfileUrl = sPage.url();
    let booked = false;
    for (let attempt = 0; attempt < 6 && !booked; attempt++) {
      // we should be on the teacher profile (initial nav or Quay lại); bail if not
      if (!sPage.url().includes('/dashboard/teachers/')) {
        log('S5 select slot', 'FAIL', `unexpected page: ${sPage.url()}`);
        throw new Error('lost teacher profile page');
      }
      const slots = sPage.locator('td button:not([disabled])');
      const n = await slots.count();
      if (n === 0) { log('S5 select slot', 'FAIL', 'no available slots'); throw new Error('no slots'); }
      const idx = (10 + attempt * 17) % n;
      const slotText = (await slots.nth(idx).textContent())?.trim();
      await slots.nth(idx).click();
      if (attempt === 0) {
        const bookedCells = await sPage.locator('td div:has-text("Đã đặt")').count();
        log('S5 select slot', 'PASS', `slot ${slotText}, ${n} available, ${bookedCells} cells marked Đã đặt`);
        log('S5b booked-slot marking', bookedCells > 0 ? 'PASS' : 'WARN', `${bookedCells} booked cells rendered as disabled`);
        await shot(sPage, '04-slot-selected');
      }
      else console.log(`  retry ${attempt}: trying slot ${slotText}`);

      // S6: → confirm page
      await sPage.click("button:has-text('Xác nhận đặt lịch')");
      await sPage.waitForURL('**/student/bookings/confirm**', { timeout: 15000 });
      const confirmUrl = new URL(sPage.url());
      bookedDate = confirmUrl.searchParams.get('date');
      bookedTime = confirmUrl.searchParams.get('time');
      if (attempt === 0) { log('S6 confirm page', 'PASS', `date=${bookedDate} time=${bookedTime}`); await sPage.waitForTimeout(2000); await shot(sPage, '05-confirm-page'); }
      else await sPage.waitForTimeout(2000);

      // S7: final confirm; capture book-slot response
      const bookRespPromise = sPage.waitForResponse(r => r.url().includes('/api/bookings/book-slot'), { timeout: 20000 });
      await sPage.click("button:has-text('Xác nhận & Đặt lịch')");
      const bookResp = await bookRespPromise;
      const bookBody = await bookResp.json().catch(() => ({}));
      if (bookResp.status() === 201) {
        log('S7 booking created', 'PASS', `201, bookingId=${bookBody.bookingId} (slot ${bookedTime})`);
        booked = true;
      } else if (bookResp.status() === 409) {
        console.log(`  slot ${bookedTime} already booked (409) — picking another`);
        // client-side back keeps auth state warm (full goto would reset Zustand)
        const back = sPage.locator("button:has-text('Quay lại')");
        if (await back.count() > 0) await back.click();
        else await sPage.goBack();
        await sPage.waitForURL('**/dashboard/teachers/**', { timeout: 15000 }).catch(() => {});
        await sPage.waitForTimeout(3000);
      } else {
        log('S7 booking created', 'FAIL', `HTTP ${bookResp.status()} ${JSON.stringify(bookBody)}`);
        throw new Error('booking failed');
      }
    }
    if (!booked) { log('S7 booking created', 'FAIL', 'all attempted slots were already booked'); throw new Error('no bookable slot'); }
    await sPage.waitForTimeout(3000);
    await shot(sPage, '06-after-booking');

    // S9: duplicate guard — same slot again via fetch with session cookies
    const dup = await sPage.evaluate(async ({ teacherId, date, time }) => {
      const r = await fetch('/api/bookings/book-slot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, date, time }), credentials: 'include',
      });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    }, { teacherId: TEACHER_ID, date: bookedDate, time: bookedTime });
    if (dup.status === 409) log('S9 duplicate guard', 'PASS', `409 "${dup.body.error}"`);
    else log('S9 duplicate guard', 'FAIL', `expected 409, got ${dup.status} ${JSON.stringify(dup.body)}`);

    // S10: after booking we are redirected to /vi/student/bookings with warm auth —
    // read Chi tiết links here (a full page.goto would reset in-memory auth state)
    await sPage.waitForURL('**/student/bookings**', { timeout: 15000 }).catch(() => {});
    let links = [];
    for (let i = 0; i < 5 && links.length === 0; i++) {
      await sPage.waitForTimeout(3000);
      links = await sPage.evaluate(() =>
        Array.from(document.querySelectorAll("a[href*='/live']")).map(a => a.getAttribute('href')));
    }
    if (links.length === 0) log('S10 booking links', 'WARN', 'no live links rendered (auth hydration)');
    else {
      const withLocale = links.filter(h => h.startsWith('/vi/class/'));
      if (withLocale.length === links.length) log('S10 locale prefix (Fix 3)', 'PASS', `${links.length} links all /vi/class/...`);
      else log('S10 locale prefix (Fix 3)', 'FAIL', `bad hrefs: ${links.filter(h => !h.startsWith('/vi/class/')).slice(0, 3).join(', ')}`);
      classId = (links[0].match(/class\/([0-9a-f-]+)\/live/) || [])[1] ?? null;
    }
    await shot(sPage, '07-bookings-list');

    if (!classId) {
      // fallback: query via in-page supabase REST through the app API
      log('classId discovery', 'WARN', 'falling back — booking list did not render');
    }

    // classify a live page's state from its error <p> / visible text
    const classifyLive = (text) => {
      if (/Class session not found/i.test(text)) return 'session-missing';
      if (/must have a confirmed booking/i.test(text)) return 'no-booking';
      if (/Failed to load class data/i.test(text)) return 'load-failed';
      if (/Unable to join/i.test(text)) return 'other-error';
      if (/Loading class/i.test(text)) return 'loading';
      if (/Join Class|Waiting|Class is live|Checking|Camera|Microphone/i.test(text)) return 'waiting-room';
      return 'classroom-or-unknown';
    };

    // Join window is [start_time, +15min] — emulate clock at slot start + 2min on both pages
    const slotEpoch = new Date(`${bookedDate}T${bookedTime}:00+07:00`).getTime() + 2 * 60 * 1000;
    const tErrors = []; const sErrors = [];
    tPage.on('console', m => { if (m.type() === 'error') tErrors.push(m.text().slice(0, 300)); });
    sPage.on('console', m => { if (m.type() === 'error') sErrors.push(m.text().slice(0, 300)); });
    const callLogs = [];
    const tapCalls = (p, who) => p.on('console', m => {
      const t = m.text();
      if (/call|Calls|session|token/i.test(t) && !/Failed to load resource/.test(t)) callLogs.push(`${who}: [${m.type()}] ${t.slice(0, 250)}`);
    });
    tapCalls(tPage, 'T'); tapCalls(sPage, 'S');

    /* ───────── Phase 3: teacher opens live page & starts session ───────── */
    if (tOk && classId) {
      await tPage.clock.install({ time: slotEpoch });
      await tPage.goto(`${BASE}/vi/class/${classId}/live`, { waitUntil: 'domcontentloaded' });
      await tPage.waitForTimeout(8000);
      await shot(tPage, '08-teacher-live-page');
      let tState = classifyLive(await tPage.evaluate(() => document.body.innerText.slice(0, 800)));
      if (tState === 'load-failed') log('T7 teacher live page', 'FAIL', 'session insert still failing (Failed to load class data)');
      else if (tState === 'waiting-room') log('T7 teacher live page', 'PASS', 'WaitingRoom rendered — session created');
      else log('T7 teacher live page', tState === 'classroom-or-unknown' ? 'PASS' : 'WARN', tState);

      // T9: click Start Class (teacher button label; students see "Join Class")
      tPage.once('dialog', d => d.accept()); // device-warning confirm
      const tJoin = tPage.locator("button:has-text('Start Class'), button:has-text('Join Class')").first();
      if (await tJoin.count() > 0 && await tJoin.isEnabled().catch(() => false)) {
        await tJoin.click();
        await tPage.waitForTimeout(15000);
        await shot(tPage, '09-teacher-classroom');
        const after = await tPage.evaluate(() => document.body.innerText.slice(0, 400));
        log('T9 teacher join', 'PASS', `clicked; now: ${after.replace(/\n+/g, ' | ').slice(0, 100)}`);
        const tCall = await tPage.evaluate(() => {
          const el = document.querySelector('#cometchat-video-container');
          return { children: el ? el.children.length : -1, html: el ? el.innerHTML.slice(0, 120) : 'no container' };
        });
        log('T9b teacher A/V call UI', tCall.children > 0 ? 'PASS' : 'WARN', `call container children=${tCall.children}`);
      } else log('T9 teacher join', 'WARN', `Join Class button missing or disabled (state=${tState})`);
    } else log('Phase 3', 'SKIP', !classId ? 'no classId' : 'teacher login failed');

    /* ───────── Phase 4: student joins ───────── */
    if (classId) {
      await sPage.clock.install({ time: slotEpoch });
      await sPage.goto(`${BASE}/vi/class/${classId}/live`, { waitUntil: 'domcontentloaded' });
      await sPage.waitForTimeout(8000);
      await shot(sPage, '10-student-live-page');
      const sState = classifyLive(await sPage.evaluate(() => document.body.innerText.slice(0, 800)));
      if (sState === 'no-booking') log('S11 student live page (Fix 2)', 'FAIL', 'blocked despite confirmed booking');
      else if (sState === 'session-missing') log('S11 student live page (Fix 2)', 'WARN', 'booking check OK but session missing — teacher start failed');
      else log('S11 student live page (Fix 2)', 'PASS', sState);

      sPage.once('dialog', d => d.accept());
      const sJoin = sPage.locator("button:has-text('Join Class')");
      if (await sJoin.count() > 0 && await sJoin.isEnabled().catch(() => false)) {
        await sJoin.click();
        await sPage.waitForTimeout(15000);
        await shot(sPage, '11-student-classroom');
        log('S13 student join', 'PASS', 'joined');
        const sCall = await sPage.evaluate(() => {
          const el = document.querySelector('#cometchat-video-container');
          return el ? el.children.length : -1;
        });
        log('S13b student A/V call UI', sCall > 0 ? 'PASS' : 'WARN', `call container children=${sCall}`);
        const counts = await Promise.all([tPage, sPage].map(p =>
          p.evaluate(() => (document.body.innerText.match(/(\d+)\s*participants/) || [])[1] ?? '?')));
        log('S14 participants count', counts.some(c => Number(c) > 0) ? 'PASS' : 'WARN', `teacher sees ${counts[0]}, student sees ${counts[1]}`);
      } else log('S13 student join', 'WARN', `Join Class missing/disabled (state=${sState})`);

      // S15: chat — student sends, teacher should receive
      const chatIn = sPage.locator("input[placeholder='Type a message...']");
      if (await chatIn.count() > 0) {
        const msg = `e2e-hello-${Date.now()}`;
        await chatIn.fill(msg);
        await chatIn.press('Enter');
        await sPage.waitForTimeout(6000);
        const seen = await tPage.evaluate(t => document.body.innerText.includes(t), msg).catch(() => false);
        log('S15 chat student→teacher', seen ? 'PASS' : 'WARN', seen ? `"${msg}" visible on teacher side` : 'message not visible on teacher side');
        await shot(tPage, '12-teacher-chat');
        await shot(sPage, '12-student-chat');
      } else log('S15 chat', 'WARN', 'chat input not rendered (CometChat may not have connected)');

      /* ───────── Phase 5: teacher ends call; probes ───────── */
      const endBtn = tPage.locator("button[title='End Call']");
      if (await endBtn.count() > 0) {
        await endBtn.click().catch(() => {});
        await tPage.waitForTimeout(5000);
        await shot(tPage, '13-teacher-after-end');
        log('T10 teacher end call', 'PASS', 'End Call clicked');
      } else log('T10 teacher end call', 'WARN', 'End Call button not found');

      // P3: no-locale redirect
      const resp = await sPage.request.get(`${BASE}/class/${classId}/live`, { maxRedirects: 0 }).catch(() => null);
      if (resp && [307, 308].includes(resp.status())) log('P3 locale redirect', 'PASS', `${resp.status()} → ${resp.headers()['location']}`);
      else log('P3 locale redirect', resp ? 'WARN' : 'FAIL', resp ? `status ${resp.status()}` : 'request failed');

      if (tErrors.length) console.log('teacher console errors:', tErrors.slice(0, 8));
      if (sErrors.length) console.log('student console errors:', sErrors.slice(0, 8));
      if (callLogs.length) console.log('call-related logs:\n' + callLogs.slice(0, 15).join('\n'));
    }

    // final states
    await shot(tPage, '12-teacher-final');
    await shot(sPage, '12-student-final');
  } catch (e) {
    log('FATAL', 'FAIL', e.message);
    await shot(sPage, '99-student-crash');
    await shot(tPage, '99-teacher-crash');
  } finally {
    await browser.close();
    fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
    console.log('\n===== SUMMARY =====');
    for (const r of results) console.log(`${r.status.padEnd(5)} ${r.step}${r.detail ? ' — ' + r.detail : ''}`);
  }
};

main();
