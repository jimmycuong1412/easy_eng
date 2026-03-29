# Tasks: Teacher Schedule — Multi-Select, UI Cleanup & Compact Layout

**Input**: Design documents from `/specs/001-english-learning-platform/`
**Prerequisites**: plan.md, data-model.md, research.md, quickstart.md

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in every description

---

## Phase 1: Setup

**Purpose**: Confirm prerequisites and dev environment before modifying production code.

- [ ] T001 Verify dev server runs at `http://localhost:3001/en/teacher/schedule` and current page renders with stats bar and Settings button visible
- [ ] T002 [P] Confirm `frontend/src/hooks/useScheduleDraft.ts` exists and exports `toggleDraft`, `saveDraft`, `discardDraft` interface unchanged
- [ ] T003 [P] Read `frontend/messages/en.json` and `frontend/messages/vi.json` to confirm `teacherSchedule` namespace before adding keys

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New hook and i18n keys must exist before the page can use them.

**⚠️ CRITICAL**: All user story phases depend on these tasks.

- [ ] T004 Create `frontend/src/hooks/useSlotSelection.ts` with full interface: `selected`, `isDragging`, `isSelected`, `selectionCount`, `startSelect`, `extendSelect`, `endSelect`, `shiftSelect`, `clearSelection` — using pure pointer events and rectangle range computation (see `quickstart.md` Step 1)
- [ ] T005 [P] Add `batchAction` and `settingsHint` keys to `frontend/messages/en.json` under `teacherSchedule`: `batchAction.label`, `batchAction.label_plural`, `batchAction.enableSelected`, `batchAction.disableSelected`, `batchAction.clear`, `settingsHint` (see `data-model.md` i18n section)
- [ ] T006 [P] Add matching Vietnamese translations to `frontend/messages/vi.json` under `teacherSchedule.batchAction` and `teacherSchedule.settingsHint`

**Checkpoint**: Hook compiles, i18n keys exist — page modifications can begin

---

## Phase 3: User Story 1 — Multi-Select & Batch Action (Priority: P1) 🎯 MVP

**Goal**: Teacher can click-drag or shift-click to select multiple availability cells simultaneously, then Enable or Disable all selected slots at once via a batch action bar — all feeding into the existing `useScheduleDraft` save pipeline.

**Independent Test**: Login as teacher → shift-click two available slots → batch action bar appears showing "2 slots selected" → click "Disable Selected" → both slots update to disabled style → unsaved banner appears → click Save → reload → slots are still disabled.

### Implementation for User Story 1

- [ ] T007 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: import `useSlotSelection` and `CellCoord` from `@/hooks/useSlotSelection`; instantiate hook: `const { selected, isDragging, isSelected, selectionCount, startSelect, extendSelect, endSelect, shiftSelect, clearSelection } = useSlotSelection();`
- [ ] T008 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add `allCells` useMemo that maps `timeSlots × weekDays` to `CellCoord[]` with `rowIdx` and `colIdx` (see `quickstart.md` Step 3b)
- [ ] T009 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add `useEffect` that attaches `pointerup` to `document` calling `endSelect` on unmount-safe cleanup (see `quickstart.md` Step 3c)
- [ ] T010 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add `select-none` class and `touch-action: none` style to `<table>` element conditionally when `isDragging === true` (see `quickstart.md` Step 3d)
- [ ] T011 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: update each `<td>` in the schedule grid to add `onPointerDown` (calls `startSelect`) and `onPointerEnter` (calls `extendSelect` when `isDragging`) handlers — passing `{ dateKey, time, rowIdx, colIdx }` (see `quickstart.md` Step 3e)
- [ ] T012 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: update each slot `<button>` click handler to: (a) if `e.shiftKey` → call `shiftSelect`; (b) if `selectionCount > 0` → toggle cell in selection instead of opening dialog; (c) otherwise open dialog as before (see `quickstart.md` Step 3e)
- [ ] T013 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add `ring-2 ring-white/60 ring-offset-1` classes to slot buttons when `isSelected(dateKey, time)` is true
- [ ] T014 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add the Batch Action Bar — a `motion.div` inside the schedule `<Card>` after the `</div>` wrapping the table, shown only when `selectionCount > 0`, containing: Clear button, count label using `t('batchAction.label', { count: selectionCount })`, "Disable Selected" button, "Enable Selected" button (see `quickstart.md` Step 4)
- [ ] T015 [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: implement batch action handlers — loop over `selected`, parse `dateKey` and `time` from key (`key.slice(0, 10)` and `key.slice(11)`), compute `dayOfWeek`, call `toggleDraft(dow, time, value)` for slots with `available` or `disabled` effective status, then call `clearSelection()`

**Checkpoint**: Multi-select works, batch action bar appears/disappears, draft is updated after batch action

---

## Phase 4: User Story 2 — UI Cleanup: Remove Settings Button (Priority: P2)

**Goal**: Remove the redundant "Slot Settings" button from the page header. Settings dialog becomes accessible via a contextual link in the slot detail dialog for empty/outside-availability slots, reducing header clutter.

**Independent Test**: Load schedule page → confirm NO "Slot Settings" / "Settings" button visible in page header → open slot detail dialog for an empty slot (outside availability) → confirm a "Configure availability" or settings icon link is present → click it → `AvailabilityCalendar` dialog opens.

### Implementation for User Story 2

- [ ] T016 [US2] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: delete the entire `<Button>` block in the page header `<motion.div>` that calls `setShowAvailabilityDialog(true)` (the button with `<Settings className="w-4 h-4 mr-2" />` and `{t('settingsBtn')}`)
- [ ] T017 [US2] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: in the slot detail dialog's empty slot section (the `effectiveStatus === 'empty'` branch showing "Outside your availability hours"), add a small `<button>` with `<Settings className="w-3 h-3" />` icon and `{t('settingsHint')}` text that calls `setSelectedSlot(null); setShowAvailabilityDialog(true)` (see `quickstart.md` Step 5b)

**Checkpoint**: Header is clean (no Settings button), dialog still accessible from empty slot detail

---

## Phase 5: User Story 3 — Compact Layout: Bird's-Eye Grid (Priority: P2)

**Goal**: Reduce schedule grid row height from 32px to 20px, condense fonts and padding, replace text content with colored visual indicators — allowing ~24 rows to be visible without scrolling on a 1080p screen.

**Independent Test**: Load schedule page on 1080p viewport → scroll to verify ~20+ time-slot rows are visible without scrolling → confirm each cell shows a colored dot (available/disabled) or colored bar (booked/upcoming) → confirm time labels are still readable → confirm hovering a slot still works → confirm clicking a slot still opens the detail dialog.

### Implementation for User Story 3

- [ ] T018 [US3] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add `CompactSlotContent` helper component above the main component — renders `w-1.5 h-1.5 rounded-full` dot for available/disabled and `w-full h-1.5 rounded-sm` bar for upcoming/booked/completed, using same colors as `getStatusColor` (see `quickstart.md` Step 3f)
- [ ] T019 [US3] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: change schedule grid `<tr>` height from `h-8` to `h-5`
- [ ] T020 [US3] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: update time `<td>` — change `px-2 py-0.5 text-xs` to `px-1 py-0 text-[10px]` and `w-16` to `w-14`
- [ ] T021 [US3] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: update slot cell `<td>` padding from `px-1 py-0.5` to `px-0.5 py-0`
- [ ] T022 [US3] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: replace the slot button content (the `{slot.student ? (...) : (...)}` render block inside the button) with `<CompactSlotContent status={effectiveStatus!} />` — removing the current 2-line text and Plus icon (see `quickstart.md` Step 3e)
- [ ] T023 [US3] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: reduce slot button inner height from `h-5` to `h-3.5` and remove `hover:scale-[1.02]` (replace with `hover:opacity-80` to avoid layout shift at compact size)
- [ ] T024 [US3] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: update day header `<th>` padding from `py-2` to `py-1.5` and stats `<CardContent>` padding from `p-3` to `p-2`; reduce stats value font from `text-2xl` to `text-xl` and label font from `text-xs` to `text-[10px]`

**Checkpoint**: Grid shows ~24 rows at 1080p, colored indicators visible, clicks still work

---

## Phase 6: Tests

**Purpose**: Unit and e2e coverage for the new hook and multi-select flow.

- [ ] T025 [P] Create `frontend/src/hooks/useSlotSelection.test.ts` with 5 unit tests: (1) `startSelect` sets `isDragging=true` and adds key to selected, (2) `extendSelect` from anchor to target selects 2×2 rectangle, (3) `shiftSelect` from anchor to target selects rectangle without `isDragging`, (4) `clearSelection` empties selection and resets anchor, (5) `endSelect` sets `isDragging=false` but preserves selection (see `quickstart.md` Step 7)
- [ ] T026 [P] Create `frontend/tests/e2e/teacher-schedule-multiselect.spec.ts` with 4 e2e tests: (1) shift-click two available slots → batch action bar shows correct count, (2) click "Disable Selected" → unsaved banner appears, (3) drag across 3 cells → 3 cells selected, (4) "Clear Selection" → batch bar disappears (see `quickstart.md` Step 7)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Run `npm run type-check` in `frontend/` and fix any TypeScript errors introduced by the new hook and page changes
- [ ] T028 [P] Run `npm run lint` in `frontend/` and fix any lint warnings
- [ ] T029 Smoke-test on mobile viewport (375px) — confirm compact grid still scrolls horizontally, batch action bar stacks vertically, no horizontal overflow from new ring styles
- [ ] T030 [P] Verify the existing e2e suite still passes: `PLAYWRIGHT_BASE_URL="https://easyeng-dev.vercel.app/en" npx playwright test tests/e2e/teacher-schedule-save.spec.ts --project=chromium` — no regressions from layout changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks Phases 3–5
- **Phases 3, 4, 5**: All depend on Phase 2; can run in parallel after Phase 2 (touch different sections of page.tsx)
- **Phase 6 (Tests)**: T025 can begin after T004; T026 can begin after T014 (batch action complete)
- **Phase 7 (Polish)**: Depends on Phases 3–5 complete

### User Story Dependencies

- **US1 (Multi-select)**: Depends on T004 (hook) + T005/T006 (i18n)
- **US2 (UI Cleanup)**: Depends on T004/T005/T006 — independent of US1
- **US3 (Compact Layout)**: Depends on T004/T005/T006 — independent of US1 and US2

### Within Each User Story

- T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 (sequential, same file)
- T016 → T017 (sequential, same file)
- T018 → T019 → T020 → T021 → T022 → T023 → T024 (sequential, same file)

---

## Parallel Opportunities

### Phase 2 (after T001–T003)
```
T004: Create useSlotSelection hook
T005: Add en.json i18n keys          (different file → parallel)
T006: Add vi.json i18n keys          (different file → parallel)
```

### Phase 3+4+5 (after Phase 2)
```
T007–T015: US1 (multi-select)        → developer A
T016–T017: US2 (Settings cleanup)    → developer B (10 min task)
T018–T024: US3 (compact layout)      → developer C
```

### Phase 6 (after T004 and T014)
```
T025: Unit tests for hook
T026: E2e tests for batch action
```

### Phase 7 (after Phases 3–5)
```
T027: Type-check
T028: Lint
T030: Regression e2e
```

---

## Implementation Strategy

### MVP (User Story 1 only — highest value)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T004–T006)
3. Complete Phase 3: US1 Multi-Select (T007–T015)
4. **STOP and VALIDATE**: Shift-click 3 slots → batch disable → save → reload → slots still disabled
5. Ship — teachers can now configure large ranges in seconds instead of clicking one at a time

### Full Delivery

1. MVP above
2. Phase 4: UI Cleanup (T016–T017) — quick win, removes header clutter
3. Phase 5: Compact Layout (T018–T024) — bird's-eye view
4. Phase 6: Tests (T025–T026) — required for merge
5. Phase 7: Polish (T027–T030)

---

## Notes

- All changes are in `frontend/` only — no DB migrations, no new API routes
- `useSlotSelection` is purely ephemeral state — no Supabase calls, no side effects
- Batch action reuses existing `toggleDraft` and `saveDraft` — no hook changes needed
- Compact layout is non-breaking: slot detail dialog still shows full text on click
- `[P]` tasks touch different files and have no blocking dependencies on each other
