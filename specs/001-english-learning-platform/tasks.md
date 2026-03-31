# Tasks: UI Cleanup & Scaling — AvailabilityCalendar

**Feature**: Teacher Schedule — compact grid, dashed half-hour borders, dead i18n key removal
**Branch**: `001-english-learning-platform`
**Plan**: `specs/001-english-learning-platform/plan.md`
**Research**: `specs/001-english-learning-platform/research.md`
**Total tasks**: 10

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US1]**: UI Cleanup & Scaling story

---

## Phase 1: Setup (No-dependency pre-checks)

**Purpose**: Confirm current state before touching files — prevents editing the wrong values.

- [X] T001 [P] Read `frontend/messages/en.json` lines 288–360 and confirm exact keys under `teacherSchedule.settingsBtn` and `teacherSchedule.availSettings` exist and are unreferenced
- [X] T002 [P] Read `frontend/src/components/teacher/AvailabilityCalendar.tsx` lines 488–560 and confirm current values: `max-h-[400px] overflow-y-auto` on grid container, `h-3` on cell class, border ternary `border-t border-white/10` / `border-b border-white/5`

**Checkpoint**: Both tasks confirm the exact strings to replace — proceed to Phase 2 only after both read tasks confirm expected values.

---

## Phase 2: Foundational (i18n cleanup — unblocks type-check)

**Purpose**: Remove dead translation keys from both message files.

- [X] T003 [P] [US1] Remove `"settingsBtn": "Slot Settings"` line and the entire `"availSettings": { ... }` block from `frontend/messages/en.json`
- [X] T004 [P] [US1] Remove `"settingsBtn"` line and the entire `"availSettings"` block from `frontend/messages/vi.json`

**Checkpoint**: Run `npm run type-check` from `frontend/` — should still pass (keys were unused).

---

## Phase 3: User Story 1 — Grid Compaction & Border Styles (Priority: P1) 🎯 MVP

**Goal**: Compact the 48-row grid from `h-3` (12px) to `h-2` (8px) cells so the full week is visible without vertical scrolling; add solid/dashed border distinction between `:00` hour rows and `:30` half-hour rows; remove the now-unnecessary `max-h` scroll cap.

**Independent Test**: Navigate to `/en/teacher/schedule` at 1080p — all 48 rows from `12:00 AM` to `11:30 PM` are visible without scrolling. `:00` rows have a solid top border; `:30` rows have a dashed top border. Clicking/dragging cells and Save/Discard still work.

### Implementation for User Story 1

- [X] T005 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` ~line 492: change `<div ref={tableContainerRef} className="max-h-[400px] overflow-y-auto">` → `<div ref={tableContainerRef}>` (removes scroll cap; outer wrapper keeps horizontal scroll)
- [X] T006 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` ~lines 514–519: update `<tr>` className ternary from `time.endsWith(':00') ? 'border-t border-white/10' : 'border-b border-white/5 last:border-0'` → `time.endsWith(':00') ? 'border-t border-white/15' : 'border-t border-dashed border-white/[0.06]'` (solid hour boundary, dashed half-hour subdivision)
- [X] T007 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` ~line 548: change `let cellClass = 'w-full h-3 rounded-sm transition-colors border ';` → `let cellClass = 'w-full h-2 rounded-sm transition-colors border ';` (8px cell height fits 48 rows in one viewport)

**Checkpoint**: Full 48-row grid visible without scrolling; solid/dashed borders visible; cells still clickable and saveable.

---

## Phase 4: Polish & Validation

**Purpose**: Verify type safety, lint cleanliness, and visual correctness after all edits.

- [X] T008 From `frontend/`, run `npm run type-check` — must exit 0 with no errors
- [X] T009 From `frontend/`, run `npm run lint` — must exit 0 with no warnings or errors
- [ ] T010 Visual check: open `/en/teacher/schedule`, log in as teacher (`jimmycuong1414@gmail.com / 12345678`), confirm: (a) full 48-row grid visible without vertical scroll at 1080p, (b) `:00` rows have solid top border, (c) `:30` rows have dashed top border, (d) clicking a cell toggles open/closed, (e) drag-select works, (f) Save/Discard buttons appear after changes and save correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (T001–T002): No dependencies — run in parallel immediately
- **Phase 2** (T003–T004): No dependency on Phase 1 — can run in parallel with Phase 1 (different files)
- **Phase 3** (T005–T007): Depends on Phase 1 confirmation; T006 depends on T005, T007 depends on T006 (same file — sequential edits)
- **Phase 4** (T008–T010): Depends on Phase 2 + Phase 3 complete

### Parallel Opportunities

```
Immediately parallelizable (different files, zero risk):
  T001 (read en.json)
  T002 (read AvailabilityCalendar.tsx)
  T003 (edit en.json)
  T004 (edit vi.json)

Sequential within Phase 3 (same file):
  T005 → T006 → T007

Sequential validation (depends on all edits complete):
  T008 → T009 → T010
```

**Note**: T005, T006, T007 all edit `AvailabilityCalendar.tsx` — batch into one edit session to avoid conflicts.

---

## Implementation Strategy

### MVP First (all tasks — this is a small, self-contained feature)

1. Complete Phase 1 (T001–T002) — confirm current values
2. Complete Phase 2 (T003–T004) — clean dead i18n keys in parallel
3. Complete Phase 3 (T005–T007) — compact grid + dashed borders (batch into one edit)
4. **STOP and VALIDATE** Phase 4 (T008–T010)
5. Commit and push

### Notes

- T005, T006, T007 touch the same file — batch them in one edit session to avoid conflicts
- Phase 1 read tasks can be skipped if you have confirmed the values from a recent file read
- After T007, the `scrollToTime` preset scroll logic works harmlessly (scroll distance will be near-zero on a fully-visible grid)
- No DB migrations, no Supabase changes, no API changes required
