# Implementation Plan: Teacher Schedule UX Overhaul

**Branch**: `001-english-learning-platform` | **Date**: 2026-03-31 | **Spec**: spec.md
**Input**: Feature specification — Teacher Schedule batch save, drag selection, visual polish

---

## Summary

Replace 800ms debounce auto-save with an explicit **Save / Discard** button pair, add **click-and-drag** multi-slot selection on top of the existing shift-click, apply **high-contrast state colours** (higher-opacity fills + diagonal stripe for past slots), and wrap the 48-row grid in a **fixed-height scrollable container** with a sticky header so the full week is navigable without the grid overflowing the viewport.

All changes are UI-only: one component (`AvailabilityCalendar.tsx`), two i18n files. No new packages, no DB schema changes, no new API routes.

---

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 20
**Primary Dependencies**: Next.js 14.2, Tailwind CSS 3, next-intl, Supabase JS v2
**Storage**: Supabase PostgreSQL — `teacher_slot_overrides` table (existing, no migration)
**Testing**: Playwright (e2e) — existing `teacher-schedule-*.spec.ts` suites
**Target Platform**: Web (desktop-first teacher dashboard)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Save batch ≤ 1 DB round-trip per explicit save; grid render ≤ 16ms
**Constraints**: No new npm packages; backwards-compatible with existing slot data format
**Scale/Scope**: 1 component file, 2 i18n files, ~50 lines added / ~30 lines removed

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility functions kept; TypeScript strict; no duplication |
| II. Testing | PASS | Existing Playwright e2e tests cover slot interactions; no new logic paths require new unit tests beyond manual smoke test |
| III. UX Consistency | PASS | Explicit Save follows standard form UX; drag matches Google Calendar conventions |
| IV. Performance | PASS | Debounce removed — fewer DB writes; grid still renders in O(n) |
| V. RBAC | PASS | Teacher-only page; no permission changes |
| VI. Currency Integrity | N/A | No currency involved |
| VII. UI Design Excellence | PASS | High-contrast colours, sticky headers, scroll container improve WCAG contrast ratios |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-english-learning-platform/
├── plan.md        ← this file
├── research.md    ← Phase 0 decisions
└── tasks.md       ← Phase 2 output (/speckit.tasks)
```

### Source Code (files changed)

```text
frontend/
├── src/components/teacher/
│   └── AvailabilityCalendar.tsx   ← primary change target
├── messages/
│   ├── en.json                    ← 6 new/updated calendar.* keys
│   └── vi.json                    ← matching Vietnamese translations
└── src/app/[locale]/teacher/schedule/
    └── page.tsx                   ← no changes required
```

---

## User Stories

### US1 — Batch State Management (P1 — Core)

**As a teacher**, when I make changes to my schedule grid, I want to review all changes before they are saved, so I don't accidentally commit a half-edited schedule.

**Acceptance criteria**:
1. After toggling any slot, a `Save Changes` button becomes enabled
2. Clicking `Save Changes` performs one batch DB write (delete all + insert enabled) and shows "Saved!" confirmation
3. Clicking `Discard` resets the grid to the last saved state
4. Preset buttons and bulk open/close defer to the same Save button (no auto-save)
5. Page navigation away with unsaved changes does NOT warn (out of scope — no browser `beforeunload` hook)

**Files**: `AvailabilityCalendar.tsx`, `en.json`, `vi.json`

---

### US2 — Drag Multi-Select (P1 — Core)

**As a teacher**, I want to click and drag across time slots to select many at once, so I can quickly bulk-open or bulk-close a block of time.

**Acceptance criteria**:
1. Pressing mousedown on a cell starts drag mode; dragging over adjacent cells in the same column adds them to selection
2. Releasing mouseup anywhere ends drag mode
3. Existing shift+click range selection continues to work
4. Past slots and booked slots are skipped during drag
5. No text is selected during drag (user-select: none on table)

**Files**: `AvailabilityCalendar.tsx`

---

### US3 — Scrollable Grid + Visual Simplification (P1 — Core)

**As a teacher**, I want to see the day headers at all times while scrolling through a full 24-hour grid, so I always know which column I'm editing.

**Acceptance criteria**:
1. Grid container has max-height ~400px with vertical scroll
2. Day-column headers stick to the top during scroll
3. Time label column shows only the `:00` hour label; `:30` rows show no label (but row-header click still works)
4. `:00` rows have a faint top border to visually group hours

**Files**: `AvailabilityCalendar.tsx`

---

### US4 — High-Contrast State Indicators (P1 — Core)

**As a teacher**, I want to instantly distinguish between Open, Closed, Booked, Selected, and Past slots in a dense dark grid, so I don't make mistakes when editing.

**Acceptance criteria**:
1. Open: rich emerald (`bg-emerald-500/70 border-emerald-400`)
2. Closed: neutral dark (`bg-slate-700/50 border-slate-600/40`)
3. Booked: vivid blue (`bg-blue-500/70 border-blue-400`)
4. Selected: bright amber (`bg-amber-400/80 border-amber-300`)
5. Past: diagonal stripe texture (not flat dark) — visually distinct from Closed
6. Legend updated to match new swatches

**Files**: `AvailabilityCalendar.tsx`

---

## Implementation Strategy

### Phase 1: i18n Keys First (unblocks all component work)

Add 6 keys to `en.json` and `vi.json` before touching the component.

New keys under `teacherSchedule.calendar`:
- `saveChanges` — "Save Changes"
- `discardChanges` — "Discard"
- `unsavedChanges` — "{count} unsaved change(s)"
- `saved` — "Saved!"
- `dragHint` — "Click and drag or Shift+click to select multiple slots"
- `saveError` — "Failed to save. Please try again."

Replace existing `shiftHint` with `dragHint` (same key slot, updated message).

### Phase 2: Batch Save (US1)

**State additions** to `AvailabilityCalendar`:
```typescript
const savedStateRef = useRef<Record<string, boolean>>({});
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [saveSuccess, setSaveSuccess] = useState(false);
```

**On load**: set `savedStateRef.current = buildDefaultState(overrides)` after fetch.

**On any slot state change**: call `checkUnsaved(newState)` which does:
```typescript
setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(savedStateRef.current));
```

**Remove**: `debounceTimer`, `scheduleSave`, all auto-save calls from `handleSlotClick`, `bulkOpen`, `bulkClose`, `applyPreset`.

**Add explicit Save button** above the grid:
```tsx
{hasUnsavedChanges && (
  <div className="flex items-center gap-2">
    <button onClick={handleSave} className="... bg-blue-600 ...">
      {saving ? <Loader2 /> : null} {t('calendar.saveChanges')}
    </button>
    <button onClick={handleDiscard} className="... bg-white/10 ...">
      {t('calendar.discardChanges')}
    </button>
    <span className="text-xs text-slate-400">
      {t('calendar.unsavedChanges', { count: unsavedCount })}
    </span>
  </div>
)}
{saveSuccess && <span className="text-green-400 text-xs">{t('calendar.saved')}</span>}
```

`handleSave` calls `saveToDb(slotState)`, on success sets `savedStateRef.current = slotState` and `setSaveSuccess(true)` (clears after 2s).
`handleDiscard` resets `setSlotState(savedStateRef.current)` and `setHasUnsavedChanges(false)`.

### Phase 3: Drag Selection (US2)

**State additions**:
```typescript
const [isDragging, setIsDragging] = useState(false);
const dragStartKeyRef = useRef<string | null>(null);
```

**Document-level mouseup** (in `useEffect`):
```typescript
useEffect(() => {
  const onMouseUp = () => setIsDragging(false);
  document.addEventListener('mouseup', onMouseUp);
  return () => document.removeEventListener('mouseup', onMouseUp);
}, []);
```

**Cell event handlers**:
- `onMouseDown`: if not past/booked → `setIsDragging(true)`, `dragStartKeyRef.current = key`, add key to selection
- `onMouseEnter`: if `isDragging` && `dragStartKeyRef.current` → compute `getTimeRange(dragStartKeyRef.current, key)`, filter past/booked, set selection

**Table class**: add `select-none` to prevent browser text selection during drag.

Replace `shiftHint` → `dragHint` in the tip paragraph.

### Phase 4: Scrollable Grid + Visual Simplification (US3)

**Wrap** the `<table>` parent div:
```tsx
<div className="overflow-x-auto rounded-lg border border-white/10">
  <div className="max-h-[400px] overflow-y-auto">
    <table className="w-full min-w-[420px] border-collapse table-fixed">
      <thead className="sticky top-0 z-10 bg-[#0d1f3c]">
        ...
      </thead>
```

**Time column** logic:
```tsx
// Show label only on :00 rows
{time.endsWith(':00') ? (
  <button onClick={...} className="text-xs text-slate-500 ...">
    {time.slice(0, 2)}
  </button>
) : (
  <button onClick={...} className="w-full h-full opacity-0 cursor-pointer" aria-label={time} />
)}
```

**Row border grouping**: `:00` rows → `border-t border-white/10`; `:30` rows → `border-b border-white/5`.

### Phase 5: High-Contrast Colours (US4)

Replace the `cellClass` logic in the render block:
```typescript
if (isPast) {
  cellClass += 'bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.06)_3px,rgba(255,255,255,0.06)_6px)] border-slate-700/20 cursor-not-allowed';
} else if (isBooked) {
  cellClass += 'bg-blue-500/70 border-blue-400 cursor-not-allowed';
} else if (isSelected) {
  cellClass += 'bg-amber-400/80 border-amber-300 cursor-pointer';
} else if (isOpen) {
  cellClass += 'bg-emerald-500/70 border-emerald-400 hover:bg-emerald-500/80 cursor-pointer';
} else {
  cellClass += 'bg-slate-700/50 border-slate-600/40 hover:bg-slate-600/60 cursor-pointer';
}
```

Update legend swatches to match new colours.

---

## Complexity Tracking

No constitution violations — all changes are UI-only, within a single component.

---

## Phase 0 Research Summary

See `research.md` for all 6 decisions with rationale and alternatives considered.

Key findings:
- No new packages needed — drag implemented with standard DOM events
- `getTimeRange` helper already handles range math correctly for drag
- `teacher_slot_overrides` table schema unchanged — batch save uses existing delete+insert pattern
- 6 new i18n keys needed; `shiftHint` superseded by `dragHint`
- Sticky `<thead>` requires explicit `bg-[#0d1f3c]` to prevent row bleed-through
