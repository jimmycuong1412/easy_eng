// Verify the join-reminder popup appears for a student with a class starting soon
import { chromium } from '@playwright/test';
import fs from 'fs';
const BASE = 'https://easyeng-dev.vercel.app';
const TEACHER_ID = '7a46e4e2-782c-471a-ba1b-cea449e75028';
fs.mkdirSync('e2e-results', { recursive: true });
const log = (s, st, d='') => console.log(`[${st}] ${s}${d?' — '+d:''}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport:{width:1280,height:800} });
const page = await ctx.newPage();
await page.goto(`${BASE}/vi/auth/login`, { waitUntil:'domcontentloaded' });
await page.waitForTimeout(2000);
await page.fill("input[placeholder='you@example.com']", 'jimmycuong1413@gmail.com');
await page.fill("input[placeholder='••••••••']", '123456');
await page.click("button[type='submit']");
await page.waitForURL('**/dashboard**', { timeout: 20000 });
log('Student login', 'PASS');

// Book a class ~3 min in the future (inside the 5-min reminder window).
// Slot times are HH:MM in +07; pick the next half-hour mark is too far,
// so we book any available future slot then fake the clock to 3 min before it.
const date = new Date(Date.now() + 86400000).toISOString().split('T')[0];
let booked=null;
for (const time of ['08:30','09:30','10:30','11:30','15:30','16:30','19:30','20:30']) {
  const r = await page.evaluate(async ({date,time,TEACHER_ID})=>{const res=await fetch('/api/bookings/book-slot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({teacherId:TEACHER_ID,date,time}),credentials:'include'});return{status:res.status,body:await res.json().catch(()=>({}))};},{date,time,TEACHER_ID});
  if (r.status===201){booked={date,time,bookingId:r.body.bookingId};break;}
}
if (!booked){log('Booking','FAIL','no slot');await browser.close();process.exit(1);}
log('Booking', 'PASS', `${booked.date} ${booked.time}`);

// Fake clock to 3 minutes before the booked start, then load dashboard fresh
const slotEpoch = new Date(`${booked.date}T${booked.time}:00+07:00`).getTime();
await page.clock.install({ time: slotEpoch - 3*60*1000 });
await page.goto(`${BASE}/vi/dashboard`, { waitUntil:'domcontentloaded' });
// hook checks on mount + every 30s; wait for first check
await page.waitForTimeout(9000);

const popup = await page.evaluate(() => {
  const txt = document.body.innerText;
  const hasHeading = /Lớp học sắp bắt đầu|Lớp học đang diễn ra/.test(txt);
  const hasJoinBtn = Array.from(document.querySelectorAll('button')).some(b=>/Vào lớp ngay/.test(b.textContent||''));
  return { hasHeading, hasJoinBtn, snippet: txt.match(/Lớp học[^\n]{0,80}/)?.[0] ?? '' };
});
log('Reminder popup (starting_soon)', (popup.hasHeading && popup.hasJoinBtn)?'PASS':'FAIL', JSON.stringify(popup));
await page.screenshot({ path:'e2e-results/reminder-popup.png' });

// "Vào lớp ngay" should route to the live page
if (popup.hasJoinBtn) {
  await page.click("button:has-text('Vào lớp ngay')");
  await page.waitForTimeout(3000);
  log('Join CTA routes to live', /\/class\/.+\/live/.test(page.url())?'PASS':'FAIL', page.url().replace(BASE,''));
}
await browser.close();
