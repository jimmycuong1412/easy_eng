# Tasks: Notification System — Admin, Students & Teachers

**Feature**: Notification System — Admin, Students & Teachers
**Branch**: `001-english-learning-platform`
**Plan**: plan.md | **Total tasks**: 22

---

## Phase 1 — Setup / Schema

- [x] T001 Verify which of the 9 columns are missing from live `notifications` table by querying `information_schema.columns` for project `evrcwtsexlamacawofxo`
- [x] T002 Create `supabase/migrations/034_notifications_schema_fix.sql` — ALTER TABLE notifications ADD COLUMN IF NOT EXISTS for: `action_url TEXT`, `action_label TEXT`, `related_id UUID`, `related_type TEXT`, `metadata JSONB DEFAULT '{}'`, `icon TEXT`, `color TEXT`, `priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent'))`, `expires_at TIMESTAMPTZ`; add indexes `idx_notifications_related` and `idx_notifications_expires`
- [x] T003 Apply migration 034 to live Supabase project `evrcwtsexlamacawofxo` via Supabase MCP `apply_migration` and confirm all 9 columns exist

---

## Phase 2 — DB Triggers

- [x] T004 Create `supabase/migrations/035_notification_triggers.sql` with helper function `notify_user(p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT, p_action_url TEXT DEFAULT NULL, p_related_id UUID DEFAULT NULL, p_related_type TEXT DEFAULT NULL, p_priority TEXT DEFAULT 'normal', p_metadata JSONB DEFAULT '{}')` that inserts one row into `notifications`
- [x] T005 Add `notify_all_admins(p_type, p_title, p_message, p_action_url, p_related_id, p_related_type, p_priority)` in `supabase/migrations/035_notification_triggers.sql` — selects all `profiles.id WHERE role = 'admin'` and calls `notify_user` for each
- [x] T006 Add trigger function `trg_booking_notifications()` in `supabase/migrations/035_notification_triggers.sql` — fires AFTER INSERT on `bookings`: notifies student with `booking_confirmed` AND teacher with `new_booking`
- [x] T007 Add trigger function `trg_booking_cancelled()` in `supabase/migrations/035_notification_triggers.sql` — fires AFTER UPDATE OF status on `bookings` WHEN NEW.status='cancelled' AND OLD.status!='cancelled': notifies both student and teacher with `booking_cancelled`
- [x] T008 Add trigger function `trg_gems_earned()` in `supabase/migrations/035_notification_triggers.sql` — fires AFTER INSERT on `gem_transactions` WHEN NEW.amount > 0: calls `notify_user(NEW.student_id, 'gems_earned', 'Gems Earned!', 'You earned ' || NEW.amount || ' gems')`
- [x] T009 Add trigger function `trg_new_user_notify_admins()` in `supabase/migrations/035_notification_triggers.sql` — fires AFTER INSERT on `profiles`: calls `notify_all_admins` with type `system_announcement`
- [x] T010 Add trigger function `trg_payout_request_notify_admins()` in `supabase/migrations/035_notification_triggers.sql` — fires AFTER INSERT on `payout_requests`: calls `notify_all_admins` with type `payment_received` and priority `high`
- [x] T011 Wire all trigger functions to their tables in `supabase/migrations/035_notification_triggers.sql` with CREATE TRIGGER for: bookings INSERT, bookings UPDATE OF status, gem_transactions INSERT, profiles INSERT, payout_requests INSERT
- [x] T012 Apply migration 035 to live Supabase project `evrcwtsexlamacawofxo` via Supabase MCP `apply_migration` and verify via SQL `SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public'`

---

## Phase 3 — Hook and Realtime

- [x] T013 [US2] Update `Notification` interface in `frontend/src/hooks/useRealtimeNotifications.ts` — make all 9 new columns optional; keep `priority` required; ensure `unreadCount` filters expired notifications
- [x] T014 [US2] Verify realtime subscription block in `frontend/src/hooks/useRealtimeNotifications.ts` handles INSERT (prepend + increment unreadCount), UPDATE (patch read status), DELETE (filter out); ensure cleanup calls `supabase.removeChannel`

---

## Phase 4 — UI Integration

- [x] T015 [US2] Import and render `NotificationBell` in `frontend/src/components/layout/RoleBasedNav.tsx` — place it in the desktop header row right of the user avatar dropdown trigger
- [x] T016 [US2] Add Bell icon and notifications nav item in `frontend/src/components/layout/RoleBasedNav.tsx` mobile menu — href `/notifications`, roles: all
- [x] T017 [US2] Add `notifications` i18n keys to `frontend/messages/en.json`: `nav.notifications`, top-level `notifications` object with `title`, `empty`, `markAllRead`, `viewAll`, `unreadCount`, and `types` object covering all 7 notification types
- [x] T018 [US2] Add matching Vietnamese translations to `frontend/messages/vi.json` for all keys added in T017

---

## Phase 5 — Edge Function Deploy

- [x] T019 [P] Deploy `supabase/functions/create-notification` to project `evrcwtsexlamacawofxo` using Supabase MCP `deploy_edge_function`
- [x] T020 [P] Deploy `supabase/functions/send-booking-confirmation` to project `evrcwtsexlamacawofxo` using Supabase MCP `deploy_edge_function`
- [x] T021 [P] Deploy `supabase/functions/send-class-reminder` to project `evrcwtsexlamacawofxo` using Supabase MCP `deploy_edge_function`

---

## Phase 6 — Smoke Test

- [x] T022 Smoke test on `https://easyeng-dev.vercel.app`: book a class as student → bell shows badge for student AND teacher; cancel → both get cancelled notification; gem transaction → student gets gems_earned; admin sees system_announcement; click notification → marks read; mark all read → badge clears

---

## Dependencies

```
T001 -> T002 -> T003
T003 -> T004 -> T005 -> T006 -> T007 -> T008 -> T009 -> T010 -> T011 -> T012
T003 -> T013 -> T014
T014 -> T015 -> T016
T017 -> T018
T019, T020, T021 [parallel]
T012 + T016 + T021 -> T022
```

## Parallel opportunities

- T019, T020, T021 — deploy 3 edge functions simultaneously
- T013-T014 can run in parallel with T017-T018

## MVP scope

Phases 1-4 only (T001-T018): DB schema + triggers + hook fix + UI bell
All three roles get real-time in-app notifications without edge function deploys.
Edge functions (T019-T021) add email/push as a separate increment.
**Prerequisites**: plan.md ✅, research.md ✅, quickstart.md ✅
**Tests**: Not requested — manual test checklist in quickstart.md

**Organization**: UI-only refactor across 2 files. No backend changes, no new packages.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in every description

---

## Phase 1: Setup (Verify baseline)

**Purpose**: Confirm current files are correct before making changes.

- [x] T001 Verify `frontend/src/components/teacher/AvailabilityCalendar.tsx` exports `AvailabilityCalendar` and contains `pastSlots` useMemo + `PRESET_CONFIG` + `useTranslations`
- [x] T002 Verify `frontend/src/app/[locale]/teacher/schedule/page.tsx` imports `AvailabilityCalendar` and contains `isCurrentWeek` guard + `useTranslations`

---

## Phase 2: Compact Grid — AvailabilityCalendar.tsx [US1] 🎯 Core

**Goal**: Shrink the 32-row × 7-col grid so the full week fits on screen without vertical scrolling.

**Independent Test**: Open `/en/teacher/schedule` — entire grid visible without scrolling on a 1080p screen. All slot interactions still work.

- [x] T003 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — change all slot cell buttons from `h-6` to `h-3` and cell padding from `p-0.5` to `p-px`
- [x] T004 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — change time column `<th>` width from `w-14` to `w-8`
- [x] T005 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — update row header time labels: show only `time.slice(0, 2)` (hour number) when `time.endsWith(':00')`, empty invisible button for `:30` rows so range-select still works; update row `<td>` to `text-right pr-1`
- [x] T006 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — change table `min-w-[560px]` to `min-w-[420px]`
- [x] T007 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — change column header `<th>` padding from `p-1` to `p-0.5` and inner button `py-1` to `py-0.5`

---

## Phase 3: Toolbar Consolidation — AvailabilityCalendar.tsx [US1]

**Goal**: Swap preset buttons ↔ bulk-action bar (mutually exclusive) to save vertical space above the grid.

**Independent Test**: When no slots selected — only presets row visible. When slots selected — presets hidden, bulk-action bar appears.

- [x] T008 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — wrap the presets row in `{selected.size === 0 && ( ... )}` so it hides during active selection
- [x] T009 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — remove the `{selected.size > 0 && ( ... )}` guard from the bulk-action bar (mutual-exclusive swap now handles visibility)
- [x] T010 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — consolidate legend + saving indicator to a single flex row using `gap-3` (was `gap-4`), shrink colour swatches from `w-3 h-3` to `w-2.5 h-2.5`

---

## Phase 4: Page Layout Consolidation — page.tsx [US1]

**Goal**: Merge week navigation card and calendar card into a single `Card` with an internal `border-b` divider.

**Independent Test**: Page renders with one visible card; week nav is the top section; grid below a thin divider. `max-w-4xl` constrains the column.

- [x] T011 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx` — change `max-w-5xl` to `max-w-4xl`
- [x] T012 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx` — merge the two separate `<Card>` blocks (week-nav + calendar) into a single `<Card className="bg-white/5 border-white/10">` — week-nav section uses `border-b border-white/10 px-4 py-3`, calendar section uses `<CardContent className="p-3 md:p-4">`
- [x] T013 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx` — remove the second `<motion.div>` wrapper that previously wrapped only the calendar `<Card>` (the week-nav motion wrapper remains)

---

## Phase 5: Polish & Validation

- [x] T014 In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — final read-through: confirm `pastSlots` logic intact, all `t()` calls unchanged, `bulkOpen`/`bulkClose`/`applyPreset` unchanged, `bookedSlots` guards intact
- [x] T015 In `frontend/src/app/[locale]/teacher/schedule/page.tsx` — confirm `isCurrentWeek` disabled prop still on prev-week button, `bookedSlots` still passed to `<AvailabilityCalendar>`, `weekStart={currentWeekStart}` still passed
- [x] T016 Run `cd frontend && npm run build` to verify TypeScript compiles with no errors

---

## Dependencies

```
T001–T002 (verify baseline)
    ↓
T003–T007 (compact grid cells) + T011–T013 (page layout) ← parallel
    ↓
T008–T010 (toolbar swap)
    ↓
T014–T016 (polish + build check)
```

## Summary

| Phase | Tasks | File |
|-------|-------|------|
| 1 – Baseline verify | T001–T002 | Both |
| 2 – Compact grid | T003–T007 | AvailabilityCalendar.tsx |
| 3 – Toolbar swap | T008–T010 | AvailabilityCalendar.tsx |
| 4 – Page layout | T011–T013 | page.tsx |
| 5 – Polish + build | T014–T016 | Both |
| **Total** | **16 tasks** | |

**MVP scope**: All 16 tasks — small, low-risk UI-only changes with no backend impact.

---


---

## Phase 1: Setup (Read Existing Code)

**Purpose**: Understand current state of all files before modifying.

- [x] T001 Read `frontend/src/components/teacher/AvailabilityCalendar.tsx` to map current hardcoded strings and slot rendering logic
- [x] T002 [P] Read `frontend/src/app/[locale]/teacher/schedule/page.tsx` to map current hardcoded strings and week navigation
- [x] T003 [P] Read `frontend/messages/en.json` to find the existing `teacherSchedule` key structure
- [x] T004 [P] Read `frontend/messages/vi.json` to find the existing `teacherSchedule` key structure

---

## Phase 2: Foundational (Blocking — Complete Before User Stories)

**Purpose**: Add i18n keys to both message files before any component work begins.

- [x] T005 Add `teacherSchedule.calendar` keys to `frontend/messages/en.json`: presets (workHours/morning/evening), selectedCount, bulkOpen, bulkClose, deselect, legend (open/closed/booked/selected/past), saving, shiftHint, bookedTooltip, pastTooltip, openTooltip, closedTooltip, colSelectTitle, rowSelectTitle
- [x] T006 [P] Add `teacherSchedule.calendar` keys to `frontend/messages/vi.json` with Vietnamese translations matching the exact key structure added in T005

**Checkpoint**: Both message files updated — component work can begin.

---

## Phase 3: User Story 1 — Past Slot Locking (Priority: P1) — MVP

**Goal**: Teachers cannot toggle or select slots that are in the past (past days of the current week, or past/current times on today). Past slots render as dimmed/striped, distinct from intentionally-closed future slots. Prev-week navigation disabled when already on current week.

**User Story**: FR-037 + FR-038
**Depends on**: Phase 2 complete

**Independent Test**: Log in as teacher, navigate to `/teacher/schedule`. Yesterday's slots are dimmed/locked. Today's past time slots (before now) are dimmed/locked. Clicking a past slot does nothing. "Previous week" button is disabled.

- [x] T007 [US1] Add `pastSlots` derived state using `useMemo` in `frontend/src/components/teacher/AvailabilityCalendar.tsx`: compute `Set<string>` of `"dayOfWeek:HH:MM"` keys for all past days and past/current times on today, based on `weekStart` prop and `Date.now()`
- [x] T008 [US1] Update slot click handler in `frontend/src/components/teacher/AvailabilityCalendar.tsx` to early-return (no-op) when the clicked key is in `pastSlots` or `bookedSlots`
- [x] T009 [US1] Update shift-click range handler in `frontend/src/components/teacher/AvailabilityCalendar.tsx` to exclude past slot keys from the resulting selected set
- [x] T010 [US1] Update grid cell rendering in `frontend/src/components/teacher/AvailabilityCalendar.tsx`: past slots render with dimmed/striped style (e.g. `opacity-40 cursor-not-allowed bg-slate-700 bg-stripes`) and `title={t('calendar.pastTooltip')}`; use distinct visual from booked (blue) and closed (grey)
- [x] T011 [US1] Disable "previous week" button in `frontend/src/app/[locale]/teacher/schedule/page.tsx` when `weekStart <= startOfCurrentWeek` (compare Monday dates), so teachers cannot navigate to past weeks

**Checkpoint**: Past slots locked and prev-week button correctly disabled.

---

## Phase 4: User Story 2 — i18n for Teacher Schedule (Priority: P2)

**Goal**: All hardcoded Vietnamese strings in `AvailabilityCalendar.tsx` and `schedule/page.tsx` replaced with `useTranslations` calls. Switching locale to English renders the schedule page fully in English.

**User Story**: FR-039 (scoped to teacher schedule — research confirmed only these two files need changes)
**Depends on**: Phase 2 complete (message keys must exist before `t()` calls are added)

**Independent Test**: Log in as teacher, switch language to English, navigate to `/en/teacher/schedule`. All labels (day names, preset buttons, bulk action buttons, legend, week range) display in English. Switch back to Vietnamese — all display in Vietnamese.

- [x] T012 [US2] Replace `DAY_NAMES` hardcoded Vietnamese array with `t('days.sun')`, `t('days.mon')`, ..., `t('days.sat')` calls in `frontend/src/components/teacher/AvailabilityCalendar.tsx`; add `useTranslations('teacherSchedule')` at component top
- [x] T013 [US2] Rename `PRESETS` to `PRESET_CONFIG` with fixed English keys (`workHours`, `morning`, `evening`) and derive display labels using `t('calendar.presets.workHours')` etc. in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [x] T014 [US2] Replace all remaining hardcoded strings in `frontend/src/components/teacher/AvailabilityCalendar.tsx`: bulk action buttons (`bulkOpen`, `bulkClose`, `deselect`), selected count (`selectedCount`), legend labels, saving indicator (`saving`), shift hint, all slot button `title` attributes
- [x] T015 [US2] Add `useTranslations('teacherSchedule')` and `useLocale()` to `frontend/src/app/[locale]/teacher/schedule/page.tsx`; replace hardcoded `"Lịch dạy"`, `"Mở hoặc đóng..."`, `"Tuần trước"`, `"Tuần sau"` with `t(...)` calls
- [x] T016 [US2] Fix `toLocaleDateString('vi-VN', ...)` in `frontend/src/app/[locale]/teacher/schedule/page.tsx` to use dynamic locale: `locale === 'vi' ? 'vi-VN' : 'en-US'`

**Checkpoint**: Switching to `/en/teacher/schedule` shows all English labels.

---

## Phase 5: Polish and Deploy

**Purpose**: Type safety, smoke-test, commit, deploy.

- [x] T017 Run `npx tsc --noEmit` in `frontend/` and fix any TypeScript errors from Phases 3 and 4
- [x] T018 [P] Smoke-test on local dev server (`localhost:3000`): verify past slots locked, prev-week disabled, English labels correct, Vietnamese labels correct, preset buttons work
- [x] T019 Commit: `git add frontend/src/components/teacher/AvailabilityCalendar.tsx frontend/src/app/[locale]/teacher/schedule/page.tsx frontend/messages/en.json frontend/messages/vi.json` and push to `001-english-learning-platform`
- [x] T020 [P] Deploy to Vercel (`vercel --prod` from `frontend/`) and verify on easyeng-dev.vercel.app/en/teacher/schedule and /vi/teacher/schedule

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No deps — read files first
- **Foundational (Phase 2)**: Depends on Phase 1 (must know key structure before adding new keys)
- **User Story 1 — Past Slot Locking (Phase 3)**: Depends on Phase 2 (needs `t('calendar.pastTooltip')`)
- **User Story 2 — i18n (Phase 4)**: Depends on Phase 2 (all `t(...)` calls need the keys to exist first)
- **Polish (Phase 5)**: Depends on Phases 3 and 4 both complete

### Parallel Opportunities

- T001, T002, T003, T004 — all reads, no deps between them
- T005 and T006 — different files (en.json vs vi.json)
- T007–T011 (US1) and T012–T016 (US2) can run sequentially within their phases
- T017 and T018 (polish) — independent (typecheck vs smoke-test)
- T019 and T020 — sequential (must commit before deploy)

### US1 vs US2 Parallelism

US1 (past slot locking) and US2 (i18n) both modify `AvailabilityCalendar.tsx`. They MUST run sequentially to avoid merge conflicts. Recommended order: US1 first (simpler, affects rendering only), then US2 (replaces all string literals).

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1: Read existing code
2. Phase 2: Add message keys (required for T010 tooltip)
3. Phase 3: Implement past slot locking + prev-week disable
4. **STOP and VALIDATE**: Smoke-test locked slots on local dev
5. Proceed to US2 once US1 confirmed working

### Incremental Delivery

1. Phase 2 → message keys ready
2. Phase 3 → past slots locked (purely visual + click guard)
3. Phase 4 → all Vietnamese strings replaced with translations
4. Phase 5 → typecheck, commit, deploy

---

## Notes

- Past slot key format: `"dayOfWeek:HH:MM"` — same convention as `bookedSlots` and `slotState`
- `ORDERED_DAYS` used to compute `weekStart + offset` per column (Mon=0 offset, ..., Sun=6 offset)
- No DB changes. No new npm packages. Only message files and two component files change.
- research.md Decision 5 confirmed: only `schedule/page.tsx` and `AvailabilityCalendar.tsx` need i18n changes; all other teacher pages already use English or `useTranslations`
