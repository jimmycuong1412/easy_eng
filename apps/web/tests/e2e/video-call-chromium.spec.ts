/**
 * Video Call End-to-End Test — Chromium only, detailed console capture
 */
import { test, expect, chromium } from '@playwright/test';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const STUDENT_EMAIL = 'jimmycuong1413@gmail.com';
const STUDENT_PASS = '12345678';
const TEACHER_EMAIL = 'jimmycuong1414@gmail.com';
const TEACHER_PASS = '12345678';
const SS = 'test-screenshots/video-call';

function ensureDir(d: string) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

// ---------------------------------------------------------------------------
// Helper: login and wait for redirect away from /auth/login
// ---------------------------------------------------------------------------
async function performLogin(page: any, email: string, password: string, label: string) {
  await page.goto(`${BASE_URL}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.screenshot({ path: `${SS}/${label}-login-filled.png`, fullPage: true });

  // Click the Log in button
  await page.locator('button[type="submit"]').first().click();

  // Wait up to 15s for the URL to leave /auth/login
  try {
    await page.waitForFunction(
      () => !window.location.pathname.includes('/auth/login'),
      { timeout: 15000 }
    );
  } catch {
    console.log(`[${label}] Login redirect timed out. Current URL: ${page.url()}`);
  }
  await page.waitForTimeout(2000);
  console.log(`[${label}] URL after login: ${page.url()}`);
  await page.screenshot({ path: `${SS}/${label}-after-login.png`, fullPage: true });
}

test.use({ browserName: 'chromium' });

// ---------------------------------------------------------------------------
// STUDENT TEST
// ---------------------------------------------------------------------------
test.describe('Video Call — Chromium', () => {
  test.setTimeout(180000);

  test('Student: find class and visit live page', async ({ browser }) => {
    ensureDir(SS);

    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();

    const consoleLogs: string[] = [];
    const networkLogs: string[] = [];

    page.on('console', msg => {
      const t = msg.type();
      const txt = msg.text();
      if (t === 'error' || t === 'warn') consoleLogs.push(`[${t.toUpperCase()}] ${txt}`);
      if (txt.toLowerCase().includes('cometchat') || txt.includes('startCall') ||
          txt.includes('auth-token') || txt.includes('LiveClass')) {
        consoleLogs.push(`[INFO] ${txt}`);
      }
    });
    page.on('pageerror', e => consoleLogs.push(`[PAGEERR] ${e.message}`));
    page.on('response', r => {
      const url = r.url();
      const status = r.status();
      if (url.includes('auth-token') || url.includes('cometchat') ||
          url.includes('class_sessions') || status >= 400) {
        networkLogs.push(`${status} ${url}`);
      }
    });

    // ---- Login ----
    await performLogin(page, STUDENT_EMAIL, STUDENT_PASS, 'student');
    const afterLoginUrl = page.url();
    console.log(`[student] Logged in. URL: ${afterLoginUrl}`);

    // ---- Find a class ----
    await page.goto(`${BASE_URL}/en/classes`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/student-classes.png`, fullPage: true });

    const classLinks = await page.locator('a[href*="/class"]').all();
    let classId = '';
    for (const link of classLinks) {
      const href = await link.getAttribute('href') || '';
      const m = href.match(/\/class(?:es)?\/([a-f0-9\-]{36})/);
      if (m) { classId = m[1]; break; }
    }

    // If not found on /classes, try /en/student/bookings
    if (!classId) {
      await page.goto(`${BASE_URL}/en/student/bookings`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SS}/student-bookings.png`, fullPage: true });
      const bLinks = await page.locator('a[href*="/class"]').all();
      for (const link of bLinks) {
        const href = await link.getAttribute('href') || '';
        const m = href.match(/\/class(?:es)?\/([a-f0-9\-]{36})/);
        if (m) { classId = m[1]; break; }
      }
    }

    // If still not found, use the Supabase API directly via fetch in the page
    if (!classId) {
      const result = await page.evaluate(async () => {
        try {
          const r = await fetch('/api/admin/classes?limit=3', { credentials: 'include' });
          return { status: r.status, body: await r.text() };
        } catch (e: any) { return { error: e.message }; }
      });
      console.log('[student] API /api/admin/classes result:', JSON.stringify(result).substring(0, 300));
    }

    console.log(`[student] classId found: "${classId}"`);

    if (!classId) {
      // Hard-code the class ID from the teacher report (we know it exists)
      classId = 'fde7bbf5-c6ec-431a-9506-9613c19d089f';
      console.log(`[student] Using fallback classId: ${classId}`);
    }

    // ---- Navigate to live page ----
    const liveUrl = `${BASE_URL}/en/class/${classId}/live`;
    console.log(`[student] Navigating to ${liveUrl}`);
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/student-live-3s.png`, fullPage: true });

    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SS}/student-live-8s.png`, fullPage: true });

    await page.waitForTimeout(7000);
    await page.screenshot({ path: `${SS}/student-live-15s.png`, fullPage: true });

    // ---- Inspect page state ----
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    const pageHTML = await page.content();
    const connectingVisible = pageHTML.includes('Connecting');
    const callErrorVisible = pageHTML.includes('Call Error') || pageHTML.includes('Failed to start call');
    const realTimeFallback = pageHTML.includes('Real-time features unavailable');
    const videoElements = await page.locator('video').count();
    const liveLabel = await page.locator('text=LIVE').count();
    const cometChatEl = await page.locator('[class*="cometchat"]').count();

    console.log('[student] === LIVE PAGE STATE ===');
    console.log(`  URL: ${page.url()}`);
    console.log(`  "Connecting" text: ${connectingVisible}`);
    console.log(`  "Call Error" visible: ${callErrorVisible}`);
    console.log(`  "Real-time fallback" notice: ${realTimeFallback}`);
    console.log(`  <video> elements: ${videoElements}`);
    console.log(`  LIVE badge: ${liveLabel}`);
    console.log(`  CometChat elements: ${cometChatEl}`);
    console.log(`  Body text: ${bodyText.substring(0, 400)}`);

    // ---- Test /api/cometchat/auth-token with POST ----
    const authTokenResult = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/cometchat/auth-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: null }),
          credentials: 'include',
        });
        const body = await r.text();
        return { status: r.status, body: body.substring(0, 500) };
      } catch (e: any) {
        return { error: e.message };
      }
    });
    console.log('[student] /api/cometchat/auth-token (POST):', JSON.stringify(authTokenResult));

    // ---- Save report ----
    const report = {
      role: 'student',
      classId,
      liveUrl,
      finalUrl: page.url(),
      connectingVisible,
      callErrorVisible,
      realTimeFallback,
      videoElements,
      liveLabel,
      cometChatEl,
      authTokenResult,
      consoleLogs: consoleLogs.slice(0, 60),
      networkLogs: networkLogs.slice(0, 60),
    };
    fs.writeFileSync(`${SS}/student-full-report.json`, JSON.stringify(report, null, 2));
    console.log('[student] Console logs:\n' + consoleLogs.join('\n'));
    console.log('[student] Network logs:\n' + networkLogs.join('\n'));

    await ctx.close();
  });

  // ---------------------------------------------------------------------------
  // TEACHER TEST
  // ---------------------------------------------------------------------------
  test('Teacher: visit live page for same class', async ({ browser }) => {
    ensureDir(SS);

    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();

    const consoleLogs: string[] = [];
    const networkLogs: string[] = [];

    page.on('console', msg => {
      const t = msg.type();
      const txt = msg.text();
      if (t === 'error' || t === 'warn') consoleLogs.push(`[${t.toUpperCase()}] ${txt}`);
      if (txt.toLowerCase().includes('cometchat') || txt.includes('startCall') ||
          txt.includes('auth-token') || txt.includes('LiveClass') ||
          txt.includes('calls') || txt.includes('initiateCall')) {
        consoleLogs.push(`[INFO] ${txt}`);
      }
    });
    page.on('pageerror', e => consoleLogs.push(`[PAGEERR] ${e.message}`));
    page.on('response', async r => {
      const url = r.url();
      const status = r.status();
      if (url.includes('auth-token') || url.includes('cometchat') ||
          url.includes('class_sessions') || status >= 400) {
        let body = '';
        if (status >= 400 && url.includes('cometchat')) {
          try { body = (await r.text()).substring(0, 300); } catch {}
        }
        networkLogs.push(`${status} ${url}${body ? ' | ' + body : ''}`);
      }
    });

    // ---- Login ----
    await performLogin(page, TEACHER_EMAIL, TEACHER_PASS, 'teacher');
    console.log(`[teacher] Logged in. URL: ${page.url()}`);

    const classId = 'fde7bbf5-c6ec-431a-9506-9613c19d089f';
    const liveUrl = `${BASE_URL}/en/class/${classId}/live`;
    console.log(`[teacher] Navigating to ${liveUrl}`);

    await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/teacher-live-3s.png`, fullPage: true });

    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SS}/teacher-live-8s.png`, fullPage: true });

    await page.waitForTimeout(7000);
    await page.screenshot({ path: `${SS}/teacher-live-15s.png`, fullPage: true });

    // ---- Inspect page state ----
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    const pageHTML = await page.content();
    const connectingVisible = pageHTML.includes('Connecting');
    const callErrorVisible = pageHTML.includes('Call Error') || pageHTML.includes('Failed to start call');
    const realTimeFallback = pageHTML.includes('Real-time features unavailable');
    const videoElements = await page.locator('video').count();
    const liveLabel = await page.locator('text=LIVE').count();

    console.log('[teacher] === LIVE PAGE STATE ===');
    console.log(`  URL: ${page.url()}`);
    console.log(`  "Connecting" text: ${connectingVisible}`);
    console.log(`  "Call Error" visible: ${callErrorVisible}`);
    console.log(`  "Real-time fallback" notice: ${realTimeFallback}`);
    console.log(`  <video> elements: ${videoElements}`);
    console.log(`  LIVE badge: ${liveLabel}`);
    console.log(`  Body text: ${bodyText.substring(0, 400)}`);

    // ---- Test /api/cometchat/auth-token ----
    const authTokenResult = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/cometchat/auth-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: null }),
          credentials: 'include',
        });
        const body = await r.text();
        return { status: r.status, body: body.substring(0, 500) };
      } catch (e: any) {
        return { error: e.message };
      }
    });
    console.log('[teacher] /api/cometchat/auth-token (POST):', JSON.stringify(authTokenResult));

    // ---- Test initiateCall directly via CometChat ----
    const callTestResult = await page.evaluate(async (remoteUserId: string) => {
      try {
        // @ts-ignore
        const CC = window.CometChat;
        if (!CC) return { error: 'CometChat not on window' };
        const loggedIn = await CC.getLoggedinUser();
        if (!loggedIn) return { error: 'Not logged in to CometChat' };
        const uid = loggedIn.getUid();
        // Try to create a call object
        const call = new CC.Call(remoteUserId, CC.CALL_TYPE.VIDEO, CC.RECEIVER_TYPE.USER);
        return { loggedInUid: uid, callCreated: !!call, callReceiverId: remoteUserId };
      } catch (e: any) {
        return { error: e.message };
      }
    }, classId);
    console.log('[teacher] CometChat call test:', JSON.stringify(callTestResult));

    // ---- Save report ----
    const report = {
      role: 'teacher',
      classId,
      liveUrl,
      finalUrl: page.url(),
      connectingVisible,
      callErrorVisible,
      realTimeFallback,
      videoElements,
      liveLabel,
      authTokenResult,
      callTestResult,
      consoleLogs: consoleLogs.slice(0, 80),
      networkLogs: networkLogs.slice(0, 80),
    };
    fs.writeFileSync(`${SS}/teacher-full-report.json`, JSON.stringify(report, null, 2));
    console.log('[teacher] Console logs:\n' + consoleLogs.join('\n'));
    console.log('[teacher] Network logs:\n' + networkLogs.join('\n'));

    await ctx.close();
  });
});
