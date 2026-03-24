# Tasks: Teacher Schedule Polish — Past Slot Locking + i18n

**Input**: `specs/001-english-learning-platform/plan.md`, `spec.md`, `research.md`
**Branch**: `001-english-learning-platform`

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
- [x] T020 [P] Deploy to Vercel (`vercel --prod` from `frontend/`) and verify on easyeng-test.vercel.app/en/teacher/schedule and /vi/teacher/schedule

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
