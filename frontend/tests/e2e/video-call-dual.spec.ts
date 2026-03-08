/**
 * Dual-browser video call test — student + teacher simultaneously
 *
 * Tests the real CometChat video call flow:
 *   1. Both users log in
 *   2. Both navigate to the same class live page
 *   3. Teacher waits for incoming call (isIncoming=true)
 *   4. Student initiates call to teacherId
 *   5. Verify CometChat login, auth-token API, and call initiation
 */
import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const STUDENT_EMAIL = 'jimmycuong1413@gmail.com';
const STUDENT_PASS = '12345678';
const TEACHER_EMAIL = 'jimmycuong1414@gmail.com';
const TEACHER_PASS = '12345678';
const SS_DIR = 'test-screenshots/video-call-dual';

// The class we'll test — teacher's class that was confirmed to exist
// Will be auto-discovered from the teacher's schedule page
let TEST_CLASS_ID = '';
let TEST_TEACHER_SUPABASE_ID = '';

function ensureDir(d: string) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function log(label: string, msg: string) {
  const ts = new Date().toISOString().substring(11, 23);
  console.log(`[${ts}] [${label}] ${msg}`);
}

async function login(page: Page, email: string, password: string, label: string) {
  log(label, `Logging in as ${email}`);
  await page.goto(`${BASE_URL}/en/auth/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);

  // Fill credentials
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.screenshot({ path: `${SS_DIR}/${label}-01-credentials.png` });

  await page.locator('button[type="submit"]').click();

  // Wait for redirect away from login
  try {
    await page.waitForFunction(
      () => !window.location.pathname.includes('/auth/login'),
      { timeout: 15000 }
    );
  } catch {
    log(label, `Login redirect timed out. URL: ${page.url()}`);
  }
  await page.waitForTimeout(2000);
  log(label, `After login URL: ${page.url()}`);
  await page.screenshot({ path: `${SS_DIR}/${label}-02-dashboard.png` });
}

async function collectLogs(page: Page, label: string) {
  const errors: string[] = [];
  const info: string[] = [];
  const network: string[] = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') errors.push(`[ERR] ${text}`);
    if (
      text.includes('CometChat') ||
      text.includes('cometchat') ||
      text.includes('LiveClass') ||
      text.includes('auth-token') ||
      text.includes('startCall') ||
      text.includes('logged in') ||
      text.includes('Login')
    ) {
      info.push(`[${type.toUpperCase()}] ${text}`);
    }
  });

  page.on('pageerror', (e) => errors.push(`[PAGEERR] ${e.message}`));

  page.on('response', async (r) => {
    const url = r.url();
    const status = r.status();
    if (
      url.includes('auth-token') ||
      url.includes('cometchat') ||
      url.includes('class_sessions') ||
      status >= 400
    ) {
      let body = '';
      if (url.includes('cometchat') && status >= 400) {
        try { body = ` | ${(await r.text()).substring(0, 200)}`; } catch {}
      }
      network.push(`${status} ${url.replace(BASE_URL, '')}${body}`);
    }
  });

  return { errors, info, network };
}

// ---------------------------------------------------------------------------
// Test: discover a class ID from the teacher's schedule
// ---------------------------------------------------------------------------
test('Step 1: Discover class ID from teacher schedule', async ({ browser }) => {
  ensureDir(SS_DIR);
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  await login(page, TEACHER_EMAIL, TEACHER_PASS, 'teacher-discover');

  // Go to teacher schedule page
  await page.goto(`${BASE_URL}/en/teacher/schedule`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SS_DIR}/teacher-discover-schedule.png`, fullPage: true });

  // Try to extract classId from page links
  const links = await page.locator('a[href*="/class"]').all();
  for (const link of links) {
    const href = await link.getAttribute('href') || '';
    const m = href.match(/\/class(?:es)?\/([a-f0-9-]{36})/);
    if (m) {
      TEST_CLASS_ID = m[1];
      log('teacher-discover', `Found class ID from link: ${TEST_CLASS_ID}`);
      break;
    }
  }

  // Also try to extract teacher's Supabase user ID via API
  const teacherInfo = await page.evaluate(async () => {
    try {
      const { createClient } = await import('/src/lib/supabase/client');
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      return user ? { id: user.id, email: user.email } : null;
    } catch {
      // fallback: read from window or zustand store
      const store = (window as any).__auth_store__;
      return store ? store : null;
    }
  });
  log('teacher-discover', `Teacher info from page: ${JSON.stringify(teacherInfo)}`);

  // Get teacher's Supabase ID via the auth-token API response (it includes userId)
  const tokenResp = await page.evaluate(async () => {
    const r = await fetch('/api/cometchat/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: null }),
      credentials: 'include',
    });
    return r.json();
  });
  log('teacher-discover', `Auth token response: ${JSON.stringify(tokenResp)}`);
  if (tokenResp?.userId) {
    TEST_TEACHER_SUPABASE_ID = tokenResp.userId;
  }

  // Fallback: get classes from Supabase directly via the page context
  if (!TEST_CLASS_ID) {
    const classResult = await page.evaluate(async () => {
      try {
        const r = await fetch(
          `${location.origin.replace('3000', '3000')}/api/cometchat/auth-token`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', credentials: 'include' }
        );
        const data = await r.json();
        return { authToken: data };
      } catch (e: any) {
        return { error: e.message };
      }
    });
    log('teacher-discover', `Fallback result: ${JSON.stringify(classResult)}`);
  }

  log('teacher-discover', `=== DISCOVERY RESULT ===`);
  log('teacher-discover', `classId: "${TEST_CLASS_ID}"`);
  log('teacher-discover', `teacherSupabaseId: "${TEST_TEACHER_SUPABASE_ID}"`);

  fs.writeFileSync(`${SS_DIR}/discovery.json`, JSON.stringify({
    classId: TEST_CLASS_ID,
    teacherSupabaseId: TEST_TEACHER_SUPABASE_ID,
    tokenResp,
  }, null, 2));

  await ctx.close();
});

// ---------------------------------------------------------------------------
// Test: Student visits live page — check CometChat login + call initiation
// ---------------------------------------------------------------------------
test('Step 2a: Student visits live class page', async ({ browser }) => {
  ensureDir(SS_DIR);

  // Load discovery data
  let classId = TEST_CLASS_ID;
  let teacherId = TEST_TEACHER_SUPABASE_ID;
  try {
    const d = JSON.parse(fs.readFileSync(`${SS_DIR}/discovery.json`, 'utf8'));
    if (!classId) classId = d.classId;
    if (!teacherId) teacherId = d.teacherSupabaseId;
  } catch {}

  // Use known fallback class ID
  if (!classId) classId = 'fde7bbf5-c6ec-431a-9506-9613c19d089f';
  log('student', `Using classId: ${classId}, teacherId: ${teacherId}`);

  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ['camera', 'microphone'],
  });
  const page = await ctx.newPage();
  const { errors, info, network } = await collectLogs(page, 'student');

  await login(page, STUDENT_EMAIL, STUDENT_PASS, 'student');

  // Navigate to live page
  const liveUrl = `${BASE_URL}/en/class/${classId}/live`;
  log('student', `Navigating to ${liveUrl}`);
  await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.screenshot({ path: `${SS_DIR}/student-live-01-initial.png`, fullPage: true });

  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${SS_DIR}/student-live-02-4s.png`, fullPage: true });

  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${SS_DIR}/student-live-03-10s.png`, fullPage: true });

  // Inspect page state
  const html = await page.content();
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
  const videoCount = await page.locator('video').count();
  const liveCount = await page.locator('text=LIVE').count();
  const connectingCount = await page.locator('text=Connecting').count();
  const callErrCount = await page.locator('text=Call Error').count();
  const fallbackCount = await page.locator('text=Real-time features unavailable').count();
  const cometEls = await page.locator('[class*="cometchat"], [data-cometchat]').count();

  // Check CometChat login status via JS
  const ccStatus = await page.evaluate(async () => {
    try {
      const CC = (window as any).CometChat;
      if (!CC) return { error: 'CometChat not on window' };
      const user = await CC.getLoggedinUser();
      return user ? { uid: user.getUid(), name: user.getName() } : { error: 'not logged in' };
    } catch (e: any) {
      return { error: e.message };
    }
  });

  // Test auth-token API as student
  const studentToken = await page.evaluate(async (tId: string) => {
    const r = await fetch('/api/cometchat/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: tId || null }),
      credentials: 'include',
    });
    return r.json();
  }, teacherId);

  const studentReport = {
    role: 'student',
    classId,
    teacherId,
    finalUrl: page.url(),
    videoCount,
    liveCount,
    connectingCount,
    callErrCount,
    fallbackCount,
    cometEls,
    ccStatus,
    studentToken,
    bodyText: bodyText.substring(0, 400),
    errors: errors.slice(0, 40),
    info: info.slice(0, 40),
    network: network.slice(0, 40),
  };

  log('student', `=== LIVE PAGE STATE ===`);
  log('student', `URL: ${page.url()}`);
  log('student', `<video> elements: ${videoCount}`);
  log('student', `LIVE badge: ${liveCount}`);
  log('student', `Connecting: ${connectingCount}`);
  log('student', `Call Error: ${callErrCount}`);
  log('student', `Fallback notice: ${fallbackCount}`);
  log('student', `CometChat elements: ${cometEls}`);
  log('student', `CometChat JS status: ${JSON.stringify(ccStatus)}`);
  log('student', `Student auth token: ${JSON.stringify(studentToken)}`);
  log('student', `\nErrors:\n${errors.join('\n')}`);
  log('student', `\nCometChat info:\n${info.join('\n')}`);
  log('student', `\nNetwork:\n${network.join('\n')}`);

  fs.writeFileSync(`${SS_DIR}/student-report.json`, JSON.stringify(studentReport, null, 2));

  // Assertions
  expect(page.url()).toContain('/class/');
  expect(page.url()).toContain('/live');

  await ctx.close();
});

// ---------------------------------------------------------------------------
// Test: Teacher visits live page — check waiting-for-call state
// ---------------------------------------------------------------------------
test('Step 2b: Teacher visits live class page', async ({ browser }) => {
  ensureDir(SS_DIR);

  let classId = TEST_CLASS_ID;
  let teacherId = TEST_TEACHER_SUPABASE_ID;
  try {
    const d = JSON.parse(fs.readFileSync(`${SS_DIR}/discovery.json`, 'utf8'));
    if (!classId) classId = d.classId;
    if (!teacherId) teacherId = d.teacherSupabaseId;
  } catch {}
  if (!classId) classId = 'fde7bbf5-c6ec-431a-9506-9613c19d089f';
  log('teacher', `Using classId: ${classId}`);

  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ['camera', 'microphone'],
  });
  const page = await ctx.newPage();
  const { errors, info, network } = await collectLogs(page, 'teacher');

  await login(page, TEACHER_EMAIL, TEACHER_PASS, 'teacher');

  const liveUrl = `${BASE_URL}/en/class/${classId}/live`;
  log('teacher', `Navigating to ${liveUrl}`);
  await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.screenshot({ path: `${SS_DIR}/teacher-live-01-initial.png`, fullPage: true });

  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${SS_DIR}/teacher-live-02-4s.png`, fullPage: true });

  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${SS_DIR}/teacher-live-03-10s.png`, fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
  const videoCount = await page.locator('video').count();
  const liveCount = await page.locator('text=LIVE').count();
  const callErrCount = await page.locator('text=Call Error').count();
  const fallbackCount = await page.locator('text=Real-time features unavailable').count();

  // Check CometChat login
  const ccStatus = await page.evaluate(async () => {
    try {
      const CC = (window as any).CometChat;
      if (!CC) return { error: 'CometChat not on window' };
      const user = await CC.getLoggedinUser();
      return user ? { uid: user.getUid(), name: user.getName() } : { error: 'not logged in' };
    } catch (e: any) {
      return { error: e.message };
    }
  });

  // Auth token for teacher
  const teacherToken = await page.evaluate(async () => {
    const r = await fetch('/api/cometchat/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: null }),
      credentials: 'include',
    });
    return r.json();
  });

  log('teacher', `=== LIVE PAGE STATE ===`);
  log('teacher', `URL: ${page.url()}`);
  log('teacher', `<video> elements: ${videoCount}`);
  log('teacher', `LIVE badge: ${liveCount}`);
  log('teacher', `Call Error: ${callErrCount}`);
  log('teacher', `Fallback notice: ${fallbackCount}`);
  log('teacher', `CometChat JS: ${JSON.stringify(ccStatus)}`);
  log('teacher', `Teacher token: ${JSON.stringify(teacherToken)}`);
  log('teacher', `\nErrors:\n${errors.join('\n')}`);
  log('teacher', `\nCometChat info:\n${info.join('\n')}`);
  log('teacher', `\nNetwork:\n${network.join('\n')}`);

  fs.writeFileSync(`${SS_DIR}/teacher-report.json`, JSON.stringify({
    role: 'teacher',
    classId,
    finalUrl: page.url(),
    videoCount, liveCount, callErrCount, fallbackCount,
    ccStatus, teacherToken,
    bodyText: bodyText.substring(0, 400),
    errors: errors.slice(0, 40),
    info: info.slice(0, 40),
    network: network.slice(0, 40),
  }, null, 2));

  expect(page.url()).toContain('/class/');
  expect(page.url()).toContain('/live');

  await ctx.close();
});

// ---------------------------------------------------------------------------
// Test: Dual context — student + teacher simultaneously, check call initiation
// ---------------------------------------------------------------------------
test('Step 3: Dual context — student calls teacher simultaneously', async ({ browser }) => {
  ensureDir(SS_DIR);

  let classId = TEST_CLASS_ID;
  let teacherSupabaseId = TEST_TEACHER_SUPABASE_ID;
  try {
    const d = JSON.parse(fs.readFileSync(`${SS_DIR}/discovery.json`, 'utf8'));
    if (!classId) classId = d.classId;
    if (!teacherSupabaseId) teacherSupabaseId = d.teacherSupabaseId;
  } catch {}
  if (!classId) classId = 'fde7bbf5-c6ec-431a-9506-9613c19d089f';

  log('dual', `classId: ${classId}, teacherSupabaseId: ${teacherSupabaseId}`);

  // --- Open teacher context first ---
  const teacherCtx = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ['camera', 'microphone'],
  });
  const teacherPage = await teacherCtx.newPage();
  const teacherLogs: string[] = [];
  teacherPage.on('console', (msg) => {
    const txt = msg.text();
    if (
      msg.type() === 'error' ||
      txt.includes('CometChat') || txt.includes('LiveClass') ||
      txt.includes('call') || txt.includes('Call')
    ) {
      teacherLogs.push(`[${msg.type().toUpperCase()}] ${txt.substring(0, 200)}`);
    }
  });
  teacherPage.on('pageerror', (e) => teacherLogs.push(`[PAGEERR] ${e.message}`));

  // --- Open student context ---
  const studentCtx = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ['camera', 'microphone'],
  });
  const studentPage = await studentCtx.newPage();
  const studentLogs: string[] = [];
  studentPage.on('console', (msg) => {
    const txt = msg.text();
    if (
      msg.type() === 'error' ||
      txt.includes('CometChat') || txt.includes('LiveClass') ||
      txt.includes('call') || txt.includes('Call')
    ) {
      studentLogs.push(`[${msg.type().toUpperCase()}] ${txt.substring(0, 200)}`);
    }
  });
  studentPage.on('pageerror', (e) => studentLogs.push(`[PAGEERR] ${e.message}`));

  // Login both in parallel
  log('dual', 'Logging in both users in parallel...');
  await Promise.all([
    login(teacherPage, TEACHER_EMAIL, TEACHER_PASS, 'dual-teacher'),
    login(studentPage, STUDENT_EMAIL, STUDENT_PASS, 'dual-student'),
  ]);
  log('dual', 'Both logged in');

  // Teacher navigates to live page first
  const liveUrl = `${BASE_URL}/en/class/${classId}/live`;
  log('dual', `Teacher navigating to ${liveUrl}`);
  await teacherPage.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await teacherPage.waitForTimeout(3000);
  await teacherPage.screenshot({ path: `${SS_DIR}/dual-teacher-01-live.png`, fullPage: true });

  // Student navigates to live page 2s later
  log('dual', `Student navigating to ${liveUrl}`);
  await studentPage.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await studentPage.waitForTimeout(3000);
  await studentPage.screenshot({ path: `${SS_DIR}/dual-student-01-live.png`, fullPage: true });

  // Wait for CometChat to initialize on both sides
  log('dual', 'Waiting 8s for CometChat to initialize...');
  await Promise.all([
    teacherPage.waitForTimeout(8000),
    studentPage.waitForTimeout(8000),
  ]);

  await teacherPage.screenshot({ path: `${SS_DIR}/dual-teacher-02-8s.png`, fullPage: true });
  await studentPage.screenshot({ path: `${SS_DIR}/dual-student-02-8s.png`, fullPage: true });

  // Check CometChat status on both
  const [teacherCC, studentCC] = await Promise.all([
    teacherPage.evaluate(async () => {
      try {
        const CC = (window as any).CometChat;
        if (!CC) return { error: 'not on window' };
        const user = await CC.getLoggedinUser();
        return user ? { uid: user.getUid(), status: 'logged_in' } : { status: 'not_logged_in' };
      } catch (e: any) { return { error: e.message }; }
    }),
    studentPage.evaluate(async () => {
      try {
        const CC = (window as any).CometChat;
        if (!CC) return { error: 'not on window' };
        const user = await CC.getLoggedinUser();
        return user ? { uid: user.getUid(), status: 'logged_in' } : { status: 'not_logged_in' };
      } catch (e: any) { return { error: e.message }; }
    }),
  ]);

  log('dual', `Teacher CometChat: ${JSON.stringify(teacherCC)}`);
  log('dual', `Student CometChat: ${JSON.stringify(studentCC)}`);

  // If student is logged into CometChat and we know the teacher's CometChat UID,
  // try to manually initiate a call from student → teacher
  const teacherCometUID = teacherCC.uid || teacherSupabaseId;
  if (studentCC.status === 'logged_in' && teacherCometUID) {
    log('dual', `Attempting call: student → teacher UID ${teacherCometUID}`);
    const callResult = await studentPage.evaluate(async (receiverUid: string) => {
      try {
        const CC = (window as any).CometChat;
        if (!CC) return { error: 'CometChat not on window' };
        const loggedIn = await CC.getLoggedinUser();
        if (!loggedIn) return { error: 'Student not logged in to CometChat' };
        if (loggedIn.getUid() === receiverUid) {
          return { error: `ERR_CALLING_SELF: student UID (${loggedIn.getUid()}) === teacher UID (${receiverUid})` };
        }
        const call = new CC.Call(receiverUid, CC.CALL_TYPE.VIDEO, CC.RECEIVER_TYPE.USER);
        const initiated = await CC.initiateCall(call);
        return {
          success: true,
          sessionId: initiated.getSessionId(),
          receiverUid,
          senderUid: loggedIn.getUid(),
        };
      } catch (e: any) {
        return { error: e.message, receiverUid };
      }
    }, teacherCometUID);
    log('dual', `Call initiation result: ${JSON.stringify(callResult)}`);
    fs.writeFileSync(`${SS_DIR}/dual-call-result.json`, JSON.stringify(callResult, null, 2));

    // If call was initiated, wait and screenshot both sides
    if (callResult.success) {
      log('dual', 'Call initiated! Waiting 5s for both sides to show call UI...');
      await Promise.all([
        teacherPage.waitForTimeout(5000),
        studentPage.waitForTimeout(5000),
      ]);
      await teacherPage.screenshot({ path: `${SS_DIR}/dual-teacher-03-call-active.png`, fullPage: true });
      await studentPage.screenshot({ path: `${SS_DIR}/dual-student-03-call-active.png`, fullPage: true });
    }
  }

  // Final state screenshots
  await teacherPage.screenshot({ path: `${SS_DIR}/dual-teacher-final.png`, fullPage: true });
  await studentPage.screenshot({ path: `${SS_DIR}/dual-student-final.png`, fullPage: true });

  // Page body texts
  const [teacherBody, studentBody] = await Promise.all([
    teacherPage.evaluate(() => document.body.innerText.slice(0, 600)),
    studentPage.evaluate(() => document.body.innerText.slice(0, 600)),
  ]);

  log('dual', `\nTeacher page body:\n${teacherBody}`);
  log('dual', `\nStudent page body:\n${studentBody}`);
  log('dual', `\nTeacher logs:\n${teacherLogs.join('\n')}`);
  log('dual', `\nStudent logs:\n${studentLogs.join('\n')}`);

  fs.writeFileSync(`${SS_DIR}/dual-summary.json`, JSON.stringify({
    classId,
    teacherSupabaseId,
    teacherCometUID,
    teacherCC,
    studentCC,
    teacherLogs: teacherLogs.slice(0, 60),
    studentLogs: studentLogs.slice(0, 60),
    teacherBody: teacherBody.substring(0, 400),
    studentBody: studentBody.substring(0, 400),
  }, null, 2));

  await Promise.all([teacherCtx.close(), studentCtx.close()]);

  // Final assertions
  expect(teacherCC).not.toHaveProperty('error', 'not on window');
  expect(studentCC).not.toHaveProperty('error', 'not on window');
});
