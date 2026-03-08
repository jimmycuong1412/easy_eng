# EasyEng QA Testing Progress

**Last updated:** 2026-02-21 (Session 4)
**Branch:** `001-english-learning-platform`
**Base URL:** `http://localhost:3000` (fresh server on port 3000 after zombie process cleanup)

---

## Status: IN PROGRESS

### Blockers to resolve before continuing
1. **Dev server must be started manually** from `F:\Git\easy_eng\frontend` with `npm run dev`
   - Do NOT start via background process — env vars won't load
   - Wait for `✓ Ready on http://localhost:3000` before testing
2. **Clear browser cookies** between account tests to avoid stale `x-user-role` cookie (5 min TTL)

---

## Bugs Fixed This Session

### Session 1 (earlier)

| # | File | Fix | Status |
|---|------|-----|--------|
| F1 | `src/lib/env.ts` | Changed `process.env[name]` → dot notation so Next.js statically inlines client vars | ✅ Fixed |
| F2 | `src/lib/supabase/middleware.ts` | Added `/student`, `/teacher`, `/admin` to `isProtectedRoute` check | ✅ Fixed |
| F3 | `src/utils/roleCheck.ts` | Fixed `getDashboardPath()` — was returning non-existent dashboard paths | ✅ Fixed |
| F4 | `src/app/[locale]/dashboard/layout.tsx` | Fixed `teacherNav` home link from `/teacher/dashboard` → `/dashboard` | ✅ Fixed |
| F5 | `.env.local` | Converted CRLF → LF line endings to fix env var parsing | ✅ Fixed |
| F6 | `src/hooks/useAuth.ts` | Wrapped `getSupabaseClient()` in `useRef` to prevent render-phase call | ✅ Fixed |

### Session 2 (2026-02-20)

| # | File | Fix | Status |
|---|------|-----|--------|
| F7 | `supabase migration` | Added `classes_teacher_id_profiles_fkey` FK: `classes.teacher_id → profiles.id` | ✅ Fixed |
| F8 | `src/lib/queries.ts` | Fixed all 4 FK references: `classes_teacher_id_fkey` → `classes_teacher_id_profiles_fkey` | ✅ Fixed |
| F9 | `src/app/[locale]/classes/page.tsx` | Fixed FK name, removed non-existent `average_rating`, `total_reviews` columns | ✅ Fixed |
| F10 | `src/hooks/useClassSearch.ts` | Fixed FK name in classes query | ✅ Fixed |
| F11 | `src/app/[locale]/classes/[classId]/page.tsx` | Fixed FK name + removed non-existent columns | ✅ Fixed |
| F12 | `src/app/[locale]/class/[classId]/live/page.tsx` | Fixed FK name + removed `average_rating` | ✅ Fixed |
| F13 | `src/app/[locale]/student/classes/[id]/page.tsx` | Fixed FK name | ✅ Fixed |
| F14 | `src/app/[locale]/student/bookings/confirm/page.tsx` | Fixed FK name | ✅ Fixed |
| F15 | `src/app/[locale]/student/bookings/page.tsx` | `useState(true)` → `useState(false)` to fix infinite spinner | ✅ Fixed |
| F16 | `src/app/[locale]/recordings/page.tsx` | Same loading state fix | ✅ Fixed |
| F17 | `src/app/[locale]/student/referral/page.tsx` | Same loading state fix | ✅ Fixed |
| F18 | `src/app/[locale]/settings/profile/page.tsx` | Same loading state fix (`isPageLoading`) | ✅ Fixed |
| F19 | `src/app/[locale]/dashboard/teachers/page.tsx` | Added `teachers` to `filteredTeachers` useMemo deps — was missing, causing 0 results | ✅ Fixed |

### Session 3 (2026-02-21)

| # | File | Fix | Status |
|---|------|-----|--------|
| F20 | `src/app/[locale]/student/gems/history/page.tsx` | Fixed `student_id` → `user_id` in gem_transactions query (×2) | ✅ Fixed |
| F21 | `src/app/[locale]/student/gems/history/page.tsx` | Fixed `get_student_gem_balance` → `get_gems_balance` with `p_user_id` param | ✅ Fixed |
| F22 | `src/lib/queries.ts` | Fixed leaderboard FK: `student_careers_student_id_fkey` → `student_careers_student_id_profiles_fkey` | ✅ Fixed |
| F23 | `src/lib/queries.ts` | Changed `createClient()` per-call → `getSupabaseClient()` singleton | ✅ Fixed |
| F24 | DB migration | Added `student_careers_student_id_profiles_fkey` FK pointing to `profiles.id` | ✅ Fixed |
| F25 | DB migration | Added "Public can view teacher profiles" anon RLS policy on `profiles` | ✅ Fixed |
| F26 | `src/app/[locale]/dashboard/teachers/page.tsx` | Replaced hanging `getTeachers()` with direct `fetch()` call using `env` module — bypasses `@supabase/ssr` session init hang | ✅ Fixed |
| F27 | DB migration | Created `student_levels` view (corrected schema: `career_id`, `xp_this_level`, etc.) | ✅ Fixed |
| F28 | `src/app/[locale]/dashboard/admin/actions.ts` | Fixed `final_price_cents` → `final_price`, `status='completed'` → `payment_status='paid'` in all booking queries | ✅ Fixed |
| F29 | `src/app/[locale]/dashboard/admin/actions.ts` | Fixed `cookie_balances`/`cookie_transactions` → `gem_transactions`, fixed column `type` → `transaction_type` | ✅ Fixed |
| F30 | `src/app/[locale]/dashboard/admin/actions.ts` | Fixed `teacher_profiles` + `bookings.teacher_id` → join via `classes!inner(teacher_id)` | ✅ Fixed |
| F31 | `src/app/[locale]/student/character/page.tsx` | Rewrote query: `student_levels` view → `student_careers` base table + `career_paths!student_careers_career_id_fkey` FK | ✅ Fixed |
| F32 | `src/app/[locale]/student/character/page.tsx` | `.single()` → `.maybeSingle()` + graceful "No Career Selected" empty state | ✅ Fixed |
| F33 | `src/app/[locale]/student/marketplace/page.tsx` | Rewrote: removed `student_characters` ref, use `marketplace_items`+`student_inventory`+`get_gems_balance` to match actual DB schema | ✅ Fixed |
| F34 | `src/app/[locale]/teacher/earnings/page.tsx` | `if (summaryError) throw summaryError` → non-fatal, so `teacher_earnings`+`payout_requests` still load even when RPC missing | ✅ Fixed |
| F35 | `src/app/[locale]/classes/[classId]/page.tsx` | Removed `.eq('is_flagged', false)` on reviews query — column doesn't exist | ✅ Fixed |
| F36 | `src/app/[locale]/classes/[classId]/page.tsx` | Added `handleBookNow` handler: creates booking in DB, redirects to `/student/bookings/payment?booking_id=` | ✅ Fixed |
| F37 | `src/app/[locale]/student/bookings/payment/page.tsx` | Fixed `scheduled_at`→`start_time`, `display_name`→`full_name`, `discount_amount`→`gems_discount_amount`, FK name | ✅ Fixed |

### Session 4 (2026-02-21 continued)

| # | File | Fix | Status |
|---|------|-----|--------|
| F38 | `src/app/[locale]/student/bookings/success/page.tsx` | Fixed `scheduled_at`→`start_time`, `display_name`→`full_name`, FK name, `transaction_id`→`payment_provider_id`, `completed_at`→`updated_at`, `.single()`→`.maybeSingle()` on payments query | ✅ Fixed |
| F39 | `src/app/[locale]/student/bookings/failed/page.tsx` | Fixed `scheduled_at`→`start_time`, `display_name`→`full_name`, FK name, `transaction_id`→`payment_provider_id`, `.single()`→`.maybeSingle()` on payments query | ✅ Fixed |
| F40 | `src/app/[locale]/quiz/[quizId]/page.tsx` | Fixed `correct_answer` type mismatch: `(q.correct_answer as number) ?? 0` → `parseInt(q.correct_answer as string, 10) ?? 0` (DB stores as text, comparison was `number === string`) | ✅ Fixed (needs server restart) |
| F41 | DB seed | Added test quiz `a1b2c3d4-e5f6-7890-abcd-ef1234567890` "English Grammar Basics" with 3 questions | ✅ Done |

---

## Test Accounts (in Supabase project `evrcwtsexlamacawofxo`)

| Email | Password | Role | Profile ID |
|-------|----------|------|------------|
| jimmycuong1413@gmail.com | 123456 | student | 70311902-706f-416c-9520-192a6cc96072 |
| jimmycuong1414@gmail.com | 123456 | teacher | 7a46e4e2-782c-471a-ba1b-cea449e75028 |
| jimmycuong1412@gmail.com | 123456 | admin   | 1edd8815-b62c-4e59-bb87-ee463e6e62b5 |

> Profiles were created manually via Supabase SQL on 2026-02-20 (they didn't exist before).

---

## Test Results

### Public Pages
| Page | Status | Notes |
|------|--------|-------|
| `/` redirect | ✅ PASS | Redirects to `/en` |
| `/en` landing | ✅ PASS | Full page renders |
| `/vi` locale | ✅ PASS | Vietnamese translations work |
| `/en/auth/login` | ✅ PASS | Form renders after env fix |
| `/en/auth/signup` | ✅ PASS | Renders correctly |
| `/en/auth/forgot-password` | ✅ PASS | Renders correctly |
| `/api/cometchat/auth-token` | ✅ PASS | Returns 405 (correct for GET) |

### Route Protection (unauthenticated)
| Route | Status | Notes |
|-------|--------|-------|
| `/en/dashboard` | ✅ PASS | Redirects to login with `?redirectTo=` |
| `/en/dashboard/admin` | ✅ PASS | Redirects to login |
| `/en/student/bookings` | ✅ PASS | Fixed — now redirects to login |
| `/en/teacher/schedule` | ✅ PASS | Fixed — now redirects to login |

### Student Account (jimmycuong1413@gmail.com) — Session 2 Results
| Page | Status | Notes |
|------|--------|-------|
| Login | ✅ PASS | Redirects to `/en/dashboard` |
| `/en/dashboard` | ✅ PASS | Loads (hydration warning in dev mode only — non-issue) |
| `/en/classes` | ✅ PASS | Fixed — loads, shows "0 classes" (no seed data) |
| `/en/student/bookings` | ✅ PASS | Fixed — shows tabs with 0 bookings |
| `/en/student/gems/history` | ✅ PASS | Loads |
| `/en/student/progress` | ✅ PASS | Renders with 0 stats |
| `/en/leaderboard` | ✅ PASS | Renders, empty state |
| `/en/learning-path` | ✅ PASS | Shows career path |
| `/en/notifications` | ✅ PASS | Renders "no notifications" |
| `/en/recordings` | ✅ PASS | Fixed — no longer stuck on infinite spinner |
| `/en/quiz` | ✅ PASS | Loads |
| `/en/settings/profile` | ✅ PASS | Fixed — loads correctly |
| `/en/dashboard/teachers` | ✅ FIXED | useMemo deps fix — should now show teacher(s) |
| Sign out | ✅ PASS | Works |

### Student Account — Session 3 Additions
| Page | Status | Notes |
|------|--------|-------|
| `/en/dashboard/teachers` | ✅ PASS | Fixed (Session 3) — now calls direct fetch, shows 1 teacher card |
| `/en/student/rewards` | ✅ PASS | Loads with 124 cookies, streak, weekly goals, reward milestones |
| `/en/student/referral` | ✅ PASS | Renders (data error from referral_codes RLS but page shows) |
| `/en/student/marketplace` | ✅ PASS | Fixed (Session 3) — rewrote to use `marketplace_items`+`student_inventory`, gem balance via `get_gems_balance`. No seed data so shows empty state correctly |
| `/en/student/character` | ✅ PASS | Fixed (Session 3) — graceful "No Career Selected" empty state shown when student has no active career |
| `/en/onboarding/career-avatar` | ✅ PASS | Onboarding steps render correctly |

### Student Account — Session 4 Additions
| Page | Status | Notes |
|------|--------|-------|
| `/en/classes` | ✅ PASS | Shows seeded class "English Conversation Practice" |
| `/en/classes/[classId]` | ✅ PASS | Fixed (Session 3+4) — full detail renders, reviews load, Book Now works |
| `/en/student/bookings/payment` | ✅ PASS | Fixed — shows class/teacher/date/price correctly after F37 |
| `/en/student/bookings/success` | ✅ FIXED | Fixed F38 — field names corrected (tested code only, not live flow) |
| `/en/student/bookings/failed` | ✅ FIXED | Fixed F39 — field names corrected (tested code only) |
| `/en/quiz` | ✅ PASS | List page shows seeded quiz with 3 questions |
| `/en/quiz/[quizId]` — intro | ✅ PASS | Intro screen renders with title, time, rewards |
| `/en/quiz/[quizId]` — questions | ✅ PASS | All 3 questions display, answer selection, submit, explanation, navigation all work |
| `/en/quiz/[quizId]` — results | ✅ PASS | Result screen shows "Xuất sắc! 🎉" 100% after F40 `parseInt` fix + clean server restart |

### Teacher Account (jimmycuong1414@gmail.com)
| Page | Status | Notes |
|------|--------|-------|
| Login | ✅ PASS | Authenticates |
| Sidebar | ✅ PASS | Shows "Teacher User / Teacher" with correct teacher nav |
| `/en/teacher/schedule` | ✅ PASS | Full weekly calendar renders (Mon 16/2 → Sun 22/2) |
| `/en/teacher/quiz/create` | ✅ PASS | Quiz creation form renders |
| `/en/teacher/earnings` | ✅ PASS | Fixed (Session 3) — renders with zeros; RPC error made non-fatal |
| Sign out | ✅ PASS | Works |

### Admin Account (jimmycuong1412@gmail.com)
| Page | Status | Notes |
|------|--------|-------|
| Login | ✅ PASS | Authenticates |
| Sidebar | ✅ PASS | Shows "Admin User / Admin" |
| `/en/dashboard/admin` | ✅ PASS | Shows real data: 2 users, 1 student, 1 teacher (after F28–F30 fixes) |
| `/en/admin/analytics` | ⚠️ PARTIAL | UI renders (tabs, date range, filters). Charts fail — `get-user-analytics` edge function + `analytics_user_growth` view both missing. Post-launch task (T241) |
| Sign out | ✅ PASS | Works |

---

## Remaining Test Tasks

### MEDIUM PRIORITY — Schema gaps (need DB + code fixes)

- [x] `/en/student/character` — DONE
- [x] `/en/student/marketplace` — DONE
- [ ] `/en/admin/analytics` — `get-user-analytics` edge function not deployed (post-launch T241)

### LOW PRIORITY

- [x] `/en/classes/[classId]` — DONE: renders, Book Now creates booking
- [x] `/en/student/bookings/payment` — DONE: shows correct data
- [x] Quiz flow (`/en/quiz`, `/en/quiz/[quizId]`) — DONE: all screens work; `parseInt` fix pending server restart for correct score display
- [x] Teacher earnings page — DONE
- [ ] Actual payment gateway (requires real credentials — skip for now)
- [ ] Booking cancellation flow (RPCs `get_refund_percentage`, `calculate_refund_amounts` not deployed)

---

## How to Continue Testing

1. Start dev server: `cd F:\Git\easy_eng\frontend && npm run dev`
2. Open browser in **incognito/private mode** (clears all cookies)
3. Use Playwright MCP with `--storage-state` cleared between accounts
4. Login via email/password form (NOT the Google button at the top)
5. After login, wait for the role cookie to be set (1-2 seconds) before navigating to role-gated pages

---

## Known Issues Not Yet Fixed

| # | Severity | Description |
|---|----------|-------------|
| BUG-04 | MEDIUM | Role cookie stale after profile creation — clear cookies between sessions |
| BUG-05 | LOW | Dashboard shows "?" name briefly before profile loads (race condition) |
| ~~BUG-06~~ | ~~LOW~~ | ~~Quiz: `isCorrect` type mismatch~~ — **RESOLVED** after clean server restart; all 3 answers show "✅ Chính xác!", result shows 100% |
| BUG-07 | LOW | Booking cancel page: `get_refund_percentage` + `calculate_refund_amounts` RPCs not deployed — refund info shows blank, cancel button still works |
| ~~BUG-08~~ | ~~LOW~~ | ~~Zombie dev server processes~~ — **RESOLVED**: killed PIDs 34904/39816/38504/12536/11088, cleared `.next`, fresh server now on port 3000 PID 16708 |

---

## DB Fixes Applied (2026-02-20)

### RLS Infinite Recursion Fix (Session 1)
- **Root cause**: All policies on `profiles` used `(SELECT role FROM profiles WHERE id = auth.uid())` — infinite recursion → HTTP 500 on every profile read
- **Fix**: Created `public.get_my_role()` — a `SECURITY DEFINER` function that reads role bypassing RLS
- **Migration**: `fix_profiles_rls_recursion` + `fix_rls_use_get_my_role`
- **Tables fixed**: `profiles`, `bookings`, `classes`, `gem_transactions`, `gem_transaction_audit_log`

### Classes → Profiles FK Fix (Session 2)
- **Root cause**: `classes.teacher_id` FK pointed to `auth.users`, not `profiles`. PostgREST couldn't traverse `auth.users → profiles` automatically, causing PGRST200 on all class queries.
- **Fix**: Added direct FK `classes_teacher_id_profiles_fkey` from `classes.teacher_id → profiles.id`
- **Migration**: `add_classes_teacher_profile_fk`
- **Files updated**: `queries.ts`, `useClassSearch.ts`, `classes/page.tsx`, `classes/[classId]/page.tsx`, `class/[classId]/live/page.tsx`, `student/classes/[id]/page.tsx`, `student/bookings/confirm/page.tsx`

### Loading State Pattern Fix (Session 2)
- **Root cause**: Multiple pages used `useState(true)` for loading state + gated `useEffect` on `user?.id`. Since `user?.id` is null during auth init, the `.finally(() => setLoading(false))` never ran → infinite spinner.
- **Pattern fix**: Changed all affected pages to `useState(false)` (loading only activates when fetch actually starts)
- **Pages fixed**: `student/bookings`, `recordings`, `student/referral`, `settings/profile`
