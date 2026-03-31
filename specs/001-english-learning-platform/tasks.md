# Tasks: Time Column AM/PM Labels — AvailabilityCalendar

**Feature**: Show 12-hour AM/PM label on every slot row in the teacher schedule grid
**Branch**: `001-english-learning-platform`
**Plan**: `specs/001-english-learning-platform/plan.md`
**Research**: `specs/001-english-learning-platform/research.md`
**Total tasks**: 5

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US1]**: AM/PM labels story

---

## Phase 1: Setup (Pre-check)

**Purpose**: Confirm exact current code before editing — prevents editing the wrong section.

- [X] T001 Read `frontend/src/components/teacher/AvailabilityCalendar.tsx` lines 519–540 and confirm: (a) the `{/* Time label */}` comment, (b) the `time.endsWith(':00')` branch showing `{time.slice(0, 2)}`, (c) the `opacity-0` button on `:30` rows

**Checkpoint**: Values confirmed — proceed to Phase 2.

---

## Phase 2: Foundational (Helper function — must exist before rendering change)

**Purpose**: Add `formatSlotLabel` pure helper. This must be in place before the render change in Phase 3.

- [X] T002 [US1] Add `formatSlotLabel` helper function to `frontend/src/components/teacher/AvailabilityCalendar.tsx` just above the `// ---- Component ----` comment (after the existing `getTimeRange` function). The function signature and body are: `function formatSlotLabel(hhmm: string): { time: string; period: 'AM' | 'PM' } { const hour = parseInt(hhmm.slice(0, 2), 10); const minute = hhmm.slice(3, 5); const period = hour < 12 ? 'AM' : 'PM'; const h = hour % 12 === 0 ? 12 : hour % 12; return { time: \`${h}:${minute}\`, period }; }`

**Checkpoint**: File saves with no TypeScript error — `formatSlotLabel('00:00')` would return `{ time: '12:00', period: 'AM' }`.

---

## Phase 3: User Story 1 — Render AM/PM labels on every row (Priority: P1) 🎯 MVP

**Goal**: Replace the conditional `opacity-0` time label with a visible two-line stacked AM/PM label (`"12:00"` / `"AM"`) on every row — both `:00` and `:30` — right-aligned within the `w-8` time column.

**Independent Test**: Open `/en/teacher/schedule` — every one of the 48 rows has a readable label. `:00` rows show e.g. `12:00 / AM`; `:30` rows show e.g. `12:30 / AM`. Labels are right-aligned and visually flush with their grid row boundary. Clicking a label still selects the entire time row across all days.

### Implementation for User Story 1

- [X] T003 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` replace the entire time column `<td>` block (the `{/* Time label — only show on :00 rows */}` section, lines ~521–538) with the new rendering that calls `formatSlotLabel(time)` and renders a `<button>` with two stacked `<span>` elements: top span `className="text-[7px] font-mono leading-none"` showing `t12`, bottom span `className="text-[6px] leading-none opacity-70"` showing `period`. The button itself: `className="flex flex-col items-end justify-center w-full h-full gap-px text-slate-500 hover:text-slate-300 transition-colors"`, `onClick={() => handleRowHeader(time)}`, `title={t('calendar.rowSelectTitle')}`, `aria-label={\`${t12} ${period}\`}`. Wrap the `<td>` in `className="p-px"` (remove `text-right` since flexbox handles alignment).

**Checkpoint**: Every row in the grid has a visible two-line label; clicking the label selects the row.

---

## Phase 4: Polish & Validation

**Purpose**: Verify type safety and visual correctness.

- [X] T004 From `frontend/`, run `npm run type-check` — must exit 0 with no errors
- [ ] T005 Visual check in browser at `/en/teacher/schedule`: (a) all 48 rows show a label, (b) labels read `12:00`/`AM`, `12:30`/`AM`, …, `12:00`/`PM`, …, `11:30`/`PM`, (c) labels right-aligned to time column, (d) clicking a label still highlights full row across all days

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (T001): Immediate — read-only confirmation
- **Phase 2** (T002): No blocker — can start alongside T001 (same file but read-only T001 doesn't block T002)
- **Phase 3** (T003): Depends on T002 complete (`formatSlotLabel` must exist before the render calls it)
- **Phase 4** (T004–T005): Depends on T003 complete

### Execution sequence

```
T001 (confirm current code)
T002 (add formatSlotLabel helper)       ← can start while T001 is reading
T003 (update <td> render)               ← must follow T002
T004 (type-check)                       ← must follow T003
T005 (visual verify)                    ← must follow T004
```

---

## Implementation Strategy

### MVP (all tasks — tiny single-file change)

1. T001 — read and confirm
2. T002 — add helper
3. T003 — update render (depends on T002)
4. T004–T005 — validate

### Notes

- T002 and T003 both edit `AvailabilityCalendar.tsx` — batch into one edit session
- No i18n keys, no DB migrations, no API changes
- `formatSlotLabel` is module-private (not exported) — no impact analysis needed
