# Tasks: Teacher Schedule — Simplified Slot Management

**Input**: Design documents from `/specs/001-english-learning-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

---

## Phase 1: Setup (Read Existing Code)

**Purpose**: Understand current implementation before rewriting.

- [ ] T001 Read current `AvailabilityCalendar` component in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T002 [P] Read current schedule page in `frontend/src/app/[locale]/teacher/schedule/page.tsx`
- [ ] T003 [P] Read `teacher_slot_overrides` upsert pattern in the existing save handler (AvailabilityCalendar.tsx)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared helpers and constants used by both US1 and US2. Must complete before user story work begins.

**Warning**: No user story work can begin until this phase is complete.

- [ ] T004 Define `VISIBLE_SLOTS` constant (06:00-22:00, 32 half-hour strings) as a module-level array in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T005 [P] Implement `buildDefaultState(overrides)` helper that converts `teacher_slot_overrides` rows into `Record<string, boolean>` keyed by `"dayOfWeek:HH:MM"` in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T006 [P] Implement `getTimeRange(anchorKey, clickedKey)` helper that returns all slot keys between two keys on the same day in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T007 [P] Define `PRESETS` constant (Gio hanh chinh 8-17 Mon-Fri, Buoi sang 6-12 all days, Buoi toi 18-22 all days) with day arrays and time ranges in `frontend/src/components/teacher/AvailabilityCalendar.tsx`

**Checkpoint**: Helpers ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Rewrite AvailabilityCalendar (Priority: P1) — MVP

**Goal**: Replace the existing 48-row single-toggle calendar with a 06:00-22:00 inline grid supporting multi-select, shift-click ranges, row/column header selection, bulk open/close, quick presets, and 800ms debounce auto-save.

**Independent Test**: Navigate to `/teacher/schedule`, toggle a slot, verify it saves after ~800ms (network tab). Shift-click a range, click bulk open, verify all open immediately.

### Implementation for User Story 1

- [ ] T008 [US1] Replace component state in `frontend/src/components/teacher/AvailabilityCalendar.tsx`: add `slotState`, `selected`, `anchorKey`, `pendingChanges`, `saving`, `error` — remove old per-day toggle state
- [ ] T009 [US1] Add `bookedSlots: Set<string>` and `weekStart: Date` to component props interface in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T010 [US1] Implement single-slot click handler: toggle `slotState`, add key to `pendingChanges`, update `anchorKey`, restart 800ms debounce in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T011 [US1] Implement shift-click range handler using `getTimeRange(anchorKey, clickedKey)` to extend `selected` set (same day only) in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T012 [US1] Implement column-header click handler (select entire day — all 32 VISIBLE_SLOTS for that dayOfWeek) in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T013 [US1] Implement row-header click handler (select same time slot across all 7 days) in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T014 [US1] Implement debounce auto-save: on `pendingChanges` non-empty, wait 800ms then batch-upsert to `teacher_slot_overrides` (delete-all + insert enabled) in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T015 [US1] Implement bulk open action: set all selected keys to enabled in `slotState`, save immediately, clear `selected` in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T016 [US1] Implement bulk close action: set all selected keys to disabled in `slotState`, save immediately, clear `selected` in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T017 [US1] Implement deselect-all action to clear `selected` set in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T018 [US1] Implement preset buttons: clicking a preset opens specified slots without closing others, then saves immediately in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T019 [US1] Render 32-row x 7-col grid: BOOKED slots blue+locked (cursor-not-allowed), OPEN slots green (click to close), CLOSED slots grey (click to open); highlight `selected` slots in `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- [ ] T020 [US1] Add saving indicator and error display to component UI in `frontend/src/components/teacher/AvailabilityCalendar.tsx`

**Checkpoint**: AvailabilityCalendar fully functional — multi-select, presets, auto-save all work independently.

---

## Phase 4: User Story 2 — Rewrite Schedule Page (Priority: P2)

**Goal**: Replace the current schedule page (which hides availability settings behind a Dialog modal) with an inline layout: header with week navigation, quick-preset bar, and the new AvailabilityCalendar rendered directly on the page.

**Independent Test**: Navigate to `/teacher/schedule` — no modal button visible. Grid renders inline. Week navigation updates booked slots. Booked slots show as locked.

### Implementation for User Story 2

- [ ] T021 [US2] Derive `bookedSlots: Set<string>` from schedule/bookings data using `scheduled_date.getDay()` + `start_time.slice(0,5)` key format in `frontend/src/app/[locale]/teacher/schedule/page.tsx`
- [ ] T022 [US2] Add week navigation state (`weekStart`) and prev/next week controls to page header in `frontend/src/app/[locale]/teacher/schedule/page.tsx`
- [ ] T023 [US2] Remove the availability settings Dialog modal button; render `<AvailabilityCalendar bookedSlots={bookedSlots} weekStart={weekStart} />` inline in the page body in `frontend/src/app/[locale]/teacher/schedule/page.tsx`

**Checkpoint**: Schedule page shows inline calendar with locked booked slots and working week navigation.

---

## Phase 5: Polish and Deploy

**Purpose**: Type safety, commit, and smoke-test validation.

- [ ] T024 Run `npx tsc --noEmit` in `frontend/` and fix any TypeScript errors introduced by the rewrites
- [ ] T025 [P] Run through quickstart.md smoke-test checklist (12 items) on local dev server to confirm all behaviours work
- [ ] T026 Commit changes: `git add frontend/src/components/teacher/AvailabilityCalendar.tsx frontend/src/app/[locale]/teacher/schedule/page.tsx` and push to branch `001-english-learning-platform`
- [ ] T027 [P] Deploy to Vercel (`vercel --prod` from `frontend/`) and verify on easyeng-dev.vercel.app/teacher/schedule

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — read existing files first
- **Foundational (Phase 2)**: Depends on Phase 1 (understand existing code before writing helpers)
- **User Stories (Phase 3-4)**: Both depend on Foundational phase (helpers must exist)
  - US2 imports the new US1 component, so US1 must complete before US2
- **Polish (Phase 5)**: Depends on both US1 and US2 being complete

### User Story Dependencies

- **US1 (P1 — AvailabilityCalendar rewrite)**: Can start after Phase 2 — standalone component
- **US2 (P2 — Schedule page rewrite)**: Depends on US1 (imports updated AvailabilityCalendar)

### Within Each User Story

- State shape (T008-T009) before handlers (T010-T013)
- Handlers before save logic (T014)
- Save logic before bulk actions (T015-T017)
- All logic before rendering (T019)

### Parallel Opportunities

- T001, T002, T003 can run in parallel (reading different files)
- T005, T006, T007 can run in parallel (independent helpers)
- T024 and T025 can run in parallel (typecheck vs smoke-test)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Read existing code
2. Complete Phase 2: Foundational helpers
3. Complete Phase 3: Rewrite AvailabilityCalendar (US1)
4. **STOP and VALIDATE**: Smoke-test multi-select and auto-save
5. Proceed to US2 once US1 is confirmed working

### Incremental Delivery

1. Phases 1-2: helpers ready
2. Phase 3: new AvailabilityCalendar — test inline (embed temporarily in schedule page)
3. Phase 4: new schedule page embeds it, removes modal
4. Phase 5: type-check, commit, deploy

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [US1] / [US2] labels map tasks to user stories for traceability
- Slot key format: `"dayOfWeek:HH:MM"` — matches existing `teacher_slot_overrides` pattern
- No DB migrations needed — existing table and save pattern are reused unchanged
- No new npm packages — debounce implemented with `useRef` + `setTimeout`
- Booked slots derived from `bookings` table (read-only); `teacher_slot_overrides` is read-write
- Commit after each phase checkpoint to keep history clean
