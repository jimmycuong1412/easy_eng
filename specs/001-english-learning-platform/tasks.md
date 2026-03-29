# Tasks: Teacher Schedule UX & Save-Button Refactor

**Input**: Design documents from `/specs/001-english-learning-platform/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/schedule-draft.md, research.md, quickstart.md

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in every description

---

## Phase 1: Setup

**Purpose**: Confirm all prerequisites are in place before modifying production code.

- [x] T001 Verify dev server runs cleanly at `http://localhost:3001/en/teacher/schedule` and current slot-toggle writes to DB on every click
- [x] T00X [P] Confirm `teacher_slot_overrides` unique constraint `(teacher_id, day_of_week, slot_time)` exists by checking `supabase/migrations/`
- [x] T00X [P] Read `frontend/messages/en.json` and `frontend/messages/vi.json` to confirm `teacherSchedule` namespace structure before adding keys

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New hook and i18n keys must exist before the page can use them.

**⚠️ CRITICAL**: All user story phases depend on these tasks.

- [x] T00X Create `frontend/src/hooks/useScheduleDraft.ts` with the full interface: `draft`, `isDirty`, `saving`, `saveError`, `toggleDraft`, `saveDraft`, `discardDraft` — using Supabase client batch upsert on `teacher_slot_overrides` (see `quickstart.md` Step 1)
- [x] T00X [P] Add `saveBar`, `stats`, and updated `legend.disabled` keys to `frontend/messages/en.json` under `teacherSchedule` (see `research.md` R4 for exact keys)
- [x] T00X [P] Add matching Vietnamese translations to `frontend/messages/vi.json` under `teacherSchedule.saveBar`, `teacherSchedule.stats`, `teacherSchedule.legend.disabled`

**Checkpoint**: Hook compiles, i18n keys exist — page modifications can begin

---

## Phase 3: User Story 1 — Draft State & Save Button (Priority: P1) 🎯 MVP

**Goal**: Replace per-click DB writes with local draft state. Teacher can toggle multiple slots, see an unsaved-changes banner, then Save all at once with a single batch upsert.

**Independent Test**: Log in as teacher → toggle 3 slots → confirm NO DB writes yet (network tab shows 0 requests) → click Save → confirm exactly 1 upsert request with all 3 rows → reload page → confirm slots reflect saved state.

### Implementation for User Story 1

- [x] T00X [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: import `useScheduleDraft` and wire up `draft`, `isDirty`, `saving`, `saveError`, `toggleDraft`, `saveDraft`, `discardDraft` — remove `togglingSlot` state and the `toggleSlot` async function
- [x] T00X [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add `getEffectiveStatus` helper that merges `draft` overrides on top of the loaded slot status (see `quickstart.md` Step 2b) and use it when rendering grid cells
- [x] T00X [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add amber unsaved-changes banner (Framer Motion slide-in) with Discard and Save buttons, shown only when `isDirty === true` (see `quickstart.md` Step 2c)
- [x] T0XX [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: update the slot detail dialog — replace `toggleSlot(selectedSlot, false/true)` calls with `toggleDraft(dayOfWeek, selectedSlot.time, false/true)` then `setSelectedSlot(null)` (see `quickstart.md` Step 2e)
- [x] T0XX [US1] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add `beforeunload` event listener that calls `e.preventDefault()` when `isDirty === true` (see `quickstart.md` Step 2f)
- [x] T0XX [US1] Remove now-unused `Loader2` spinner tied to `togglingSlot` from the slot detail dialog buttons in `frontend/src/app/[locale]/teacher/schedule/page.tsx`

**Checkpoint**: Save button works, no per-click DB writes, unsaved banner shows/hides correctly

---

## Phase 4: User Story 2 — Stats Summary Bar (Priority: P1)

**Goal**: Teacher sees at-a-glance counters (Total / Open / Booked / Disabled) for the current week derived from loaded schedule state — no extra DB query.

**Independent Test**: Load schedule page with known data → verify stats bar shows correct counts matching the visible grid cells → toggle a slot to draft-disabled → confirm stats do NOT change (stats reflect persisted state, update only after Save + reload).

### Implementation for User Story 2

- [x] T0XX [US2] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add `stats` memo computed from `Object.values(schedule).flat()` counting by `slot.status` → `{ total, available, booked, disabled }` (see `quickstart.md` Step 2d)
- [x] T0XX [US2] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: render the 4-card stats bar between week navigation and schedule grid using the `stats` memo and `t('stats.*')` i18n keys (see `quickstart.md` Step 2d JSX)

**Checkpoint**: Stats bar visible with correct live counts

---

## Phase 5: User Story 3 — Settings Button & Discoverability (Priority: P2)

**Goal**: The availability settings dialog (currently only openable via hidden state) gets a visible Settings button in the page header, making it easy to find and configure availability.

**Independent Test**: Load schedule page → confirm Settings button is visible in page header → click it → confirm `AvailabilityCalendar` dialog opens → confirm dialog save triggers schedule reload.

### Implementation for User Story 3

- [x] T0XX [US3] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: add `Settings` to lucide imports and render a Settings button in the page header `<div>` that calls `setShowAvailabilityDialog(true)` (see `quickstart.md` Step 2g)
- [x] T0XX [US3] In `frontend/src/components/teacher/AvailabilityCalendar.tsx`: add optional `onSaved?: () => void` prop to the component interface and call it after a successful `save()` in addition to setting `setSaved(true)`
- [x] T0XX [US3] In `frontend/src/app/[locale]/teacher/schedule/page.tsx`: pass `onSaved={() => { setShowAvailabilityDialog(false); fetchSchedule(); }}` to `<AvailabilityCalendar>` so that saving availability auto-closes the dialog and refreshes the grid (replacing the existing `prevDialogOpen` ref pattern)

**Checkpoint**: Availability settings are easily accessible and auto-refresh the grid on save

---

## Phase 6: Tests

**Purpose**: Unit and e2e coverage for the new hook and save flow.

- [x] T0XX [P] Create `frontend/src/hooks/useScheduleDraft.test.ts` with 4 unit tests: (1) `toggleDraft` sets `isDirty=true`, (2) `discardDraft` clears draft, (3) `saveDraft` calls supabase upsert with correct rows and clears draft, (4) `saveDraft` sets `saveError` on DB failure (see `quickstart.md` Step 4)
- [x] T0XX [P] Create `frontend/tests/e2e/teacher-schedule-save.spec.ts` with the full save flow e2e: login as teacher → open slot dialog → disable slot → assert unsaved banner → click Save → assert banner gone → reload → assert slot still disabled (see `quickstart.md` Step 4)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T0XX [P] Add `disabled` status to the legend section in `frontend/src/app/[locale]/teacher/schedule/page.tsx` (add a red-dashed swatch + `t('legend.disabled')` label alongside existing legend items)
- [x] T0XX Remove the dead `prevDialogOpen` ref from `frontend/src/app/[locale]/teacher/schedule/page.tsx` after T017 replaces it with the `onSaved` callback
- [x] T0XX [P] Run `npm run type-check` in `frontend/` and fix any TypeScript errors introduced by the refactor
- [x] T0XX [P] Run `npm run lint` in `frontend/` and fix any lint warnings
- [x] T0XX Smoke-test on mobile viewport (375px) — confirm stats bar wraps to 2×2 grid and save banner stacks vertically

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks Phases 3–5
- **Phases 3, 4, 5**: All depend on Phase 2; can run in parallel after Phase 2
- **Phase 6 (Tests)**: Can begin as soon as Phase 3 is complete (T018 after T004; T019 after T012)
- **Phase 7 (Polish)**: Depends on Phases 3–5 complete

### User Story Dependencies

- **US1 (Draft/Save)**: Depends on T004 (hook) + T005/T006 (i18n) — no dependency on US2/US3
- **US2 (Stats bar)**: Depends on T004/T005/T006 — no dependency on US1 or US3
- **US3 (Settings button)**: Depends on T004/T005/T006 — no dependency on US1 or US2

### Within Each User Story

- T007 → T008 → T009 → T010 (each builds on the previous in the same file)
- T013 → T014 (stats memo before JSX render)
- T015 can run in parallel with T016; T017 depends on both

---

## Parallel Opportunities

### Phase 2 (can run in parallel after T001)
```
Task T004: Create useScheduleDraft hook in frontend/src/hooks/useScheduleDraft.ts
Task T005: Add en.json i18n keys
Task T006: Add vi.json i18n keys
```

### Phase 3+4+5 (after Phase 2)
```
Task T007–T012: US1 (draft state)       → one developer
Task T013–T014: US2 (stats bar)         → another developer
Task T015–T017: US3 (settings button)   → another developer
```

### Phase 6 (after T004 and T012)
```
Task T018: Unit tests for hook
Task T019: E2E save flow test
```

### Phase 7 (after Phases 3–5)
```
Task T020: Add disabled legend item
Task T022: Type-check
Task T023: Lint
```

---

## Implementation Strategy

### MVP (User Story 1 only — highest value)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (T004–T006)
3. Complete Phase 3: US1 Draft/Save (T007–T012)
4. **STOP and VALIDATE**: Toggle slots, verify 0 per-click requests, Save triggers 1 batch upsert
5. Ship — this alone eliminates the N DB writes problem

### Full Delivery

1. MVP above
2. Phase 4: Stats bar (T013–T014) — quick win, no DB cost
3. Phase 5: Settings button (T015–T017) — UX discoverability
4. Phase 6: Tests (T018–T019) — required for merge
5. Phase 7: Polish (T020–T024)

---

## Notes

- All changes are in `frontend/` only — no DB migrations, no new API routes
- `useScheduleDraft` follows the same pattern as `AvailabilityCalendar`'s existing save logic
- Stats bar adds zero DB load — computed from in-memory `schedule` state
- `[P]` tasks touch different files and have no blocking dependencies on each other
