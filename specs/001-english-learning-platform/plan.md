# Implementation Plan: Teacher Schedule — Multi-Select, UI Cleanup & Compact Layout

**Branch**: `claude/angry-moser` | **Date**: 2026-03-30 | **Spec**: specs/001-english-learning-platform/spec.md
**Input**: Teacher schedule UX improvements — multi-slot selection, Settings button removal, compact bird's-eye grid

## Summary

Enhance the teacher schedule page (`/en/teacher/schedule`) with three improvements:
1. **Multi-select**: Click-drag or shift-click to select multiple availability cells; batch Enable/Disable via a footer action bar — feeds directly into the existing `useScheduleDraft` → batch upsert pipeline.
2. **UI Cleanup**: Remove the redundant "Slot Settings" header button; Settings/Availability dialog remains accessible via a compact icon in the slot detail dialog.
3. **Compact Layout**: Reduce row height from 32px → 20px, condense padding/fonts so ~24 rows are visible without scrolling on 1080p.

All changes are frontend-only (`frontend/src/`), no DB migrations.

## Technical Context

**Language/Version**: TypeScript 5.4, Next.js 14.2 App Router
**Primary Dependencies**: React 18, Framer Motion, Tailwind CSS, shadcn/ui (Radix), lucide-react, next-intl
**Storage**: Supabase `teacher_slot_overrides` (existing) — no new tables
**Testing**: Jest (unit), Playwright (e2e)
**Target Platform**: Web — desktop-first (1080p), responsive down to 375px
**Performance Goals**: Selection interaction ≤16ms (60fps), no layout thrash during drag
**Constraints**: No new npm packages; pure React pointer events for drag-select
**Scale/Scope**: Single page (~660 LOC) — targeted edits, no full rewrite

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality (I) | ✅ PASS | TypeScript strict, single-responsibility hook for selection |
| Testing (II) | ✅ PASS | Unit tests for `useSlotSelection`; e2e for batch action flow |
| UX Consistency (III) | ✅ PASS | Follows existing dark theme, amber banner pattern |
| Role-Based Access (V) | ✅ PASS | Teacher-only page, existing auth guard unchanged |
| UI Design Excellence (VII) | ✅ PASS | Reduces clutter, improves information density |

## Project Structure

### Documentation (this feature)

```text
specs/001-english-learning-platform/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── schedule-draft.md   (existing, no changes)
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (affected files only)

```text
frontend/src/
├── app/[locale]/teacher/schedule/
│   └── page.tsx                          # Primary — multi-select wiring, layout, Settings removal
├── hooks/
│   ├── useScheduleDraft.ts               # Existing — no changes needed
│   └── useSlotSelection.ts               # NEW — multi-select state hook
├── messages/
│   ├── en.json                           # Add batchAction.* keys
│   └── vi.json                           # Add matching Vietnamese keys
└── hooks/
    └── useSlotSelection.test.ts          # NEW — unit tests
frontend/tests/e2e/
└── teacher-schedule-multiselect.spec.ts  # NEW — e2e tests
```

## Key Design Decisions

### 1. Multi-Select State: `useSlotSelection` Hook

Separate hook keeps selection logic out of the 660-LOC page.

```ts
// frontend/src/hooks/useSlotSelection.ts
interface UseSlotSelectionReturn {
  selected: Set<string>;        // "YYYY-MM-DD:HH:MM" keys
  isSelected: (dateKey: string, time: string) => boolean;
  selectionCount: number;
  isDragging: boolean;
  anchorRef: React.MutableRefObject<{dateKey: string; time: string; rowIdx: number; colIdx: number} | null>;
  startSelect: (dateKey: string, time: string, rowIdx: number, colIdx: number) => void;
  extendSelect: (dateKey: string, time: string, rowIdx: number, colIdx: number) => void;
  endSelect: () => void;
  shiftSelect: (dateKey: string, time: string, rowIdx: number, colIdx: number, allCells: CellCoord[]) => void;
  clearSelection: () => void;
}
```

Selection key format: `"YYYY-MM-DD:HH:MM"` — unique per cell in the grid.

### 2. Drag-Select Pattern (pure pointer events)

```tsx
// On each <td> cell:
onPointerDown={(e) => {
  e.currentTarget.setPointerCapture(e.pointerId);
  startSelect(dateKey, time, rowIdx, colIdx);
}}
onPointerEnter={() => {
  if (isDragging) extendSelect(dateKey, time, rowIdx, colIdx);
}}
// Document-level: endSelect on pointerup
```

- Rectangle selection: all cells where `rowIdx` is between anchor.row and current.row AND `colIdx` is between anchor.col and current.col
- `touch-action: none` on the table during drag, `user-select: none` on body during drag
- Pointer capture prevents losing drag when cursor moves fast

### 3. Shift-Click Pattern

- First click (no Shift): sets anchor, selects single cell
- Shift+click: selects rectangle from anchor to clicked cell
- Anchor preserved in a `useRef` until a non-shift click

### 4. Batch Action Bar

Sticky bar at the bottom of the schedule grid card, shown only when `selectionCount > 0`:

```
[×] Clear  ·  3 slots selected  ·  [☒ Disable Selected]  [☑ Enable Selected]
```

- "Enable Selected": calls `toggleDraft(dow, time, true)` for each selected cell with status `available` or `disabled`
- "Disable Selected": calls `toggleDraft(dow, time, false)` for each selected cell with status `available` or `disabled`
- Booked/upcoming cells are visually selected (highlight) but skipped in batch action
- After batch action: selection clears, unsaved banner appears (existing `isDirty` flow)
- Single-cell click on a slot still opens the detail dialog (only if NOT in selection mode / `selectionCount === 0`)

**Interaction rule**: If selection is active (`selectionCount > 0`), clicking a cell adds/removes it from selection instead of opening the dialog.

### 5. Remove "Slot Settings" Header Button

Remove the `<Button>` in the page header that opens `AvailabilityCalendar`. Access to availability settings moves to:
- A small `<Settings className="w-3 h-3" />` icon link in the slot detail dialog for empty/outside-availability slots
- This keeps the feature accessible without cluttering the header

### 6. Compact Grid Layout

Target: ~24 visible rows at 1080p (currently ~10).

| Element | Current | New |
|---------|---------|-----|
| Row height | `h-8` (32px) | `h-5` (20px) |
| Time label font | `text-xs` | `text-[10px]` |
| Time cell padding | `px-2 py-0.5` | `px-1 py-0` |
| Slot cell padding | `px-1 py-0.5` | `px-0.5 py-0` |
| Slot inner content height | `h-5` | `h-3.5` |
| Booked/upcoming content | topic + student (2 lines) | colored bar (no text at this density) |
| Available/disabled | `+ icon` | colored dot `w-1.5 h-1.5 rounded-full` |
| Header row padding | `py-2` | `py-1.5` |
| Stats cards | `p-3` | `p-2` |

At compact density, slot cells show only a solid colored indicator (dot or thin bar):
- Available: `bg-white/30` dot
- Disabled: `bg-red-500/40` dot
- Upcoming/booked: `bg-[#3B82F6]` full-width thin bar
- Completed: `bg-emerald-500` full-width thin bar

## Data Model

No new database entities. Selection state is ephemeral (React only).

State additions via `useSlotSelection`:
- `selected: Set<string>` — selected cell keys
- `isDragging: boolean` — pointer drag in progress
- `anchorRef` — anchor cell for shift-click/drag range

## Phase 0 Research Summary

See `research.md` for full details. Key resolved decisions:

| Topic | Decision |
|-------|---------|
| Drag-select implementation | Pure `onPointerDown/Enter/Up` — no library, pointer capture API |
| Selection key format | `"YYYY-MM-DD:HH:MM"` — already unique in the grid |
| Shift-click 2D range | Anchor stored in `useRef`, rectangle via min/max of rowIdx/colIdx |
| Compact row density | `h-5` rows, `text-[10px]` labels, dot-only content for availability |
| Settings button removal | Remove from header; keep dialog accessible via slot detail dialog |
| Batch action integration | Calls existing `toggleDraft()` in loop — no hook changes needed |
