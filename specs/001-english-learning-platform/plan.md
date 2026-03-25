# Implementation Plan: Teacher Schedule — Compact General View

**Branch**: `001-english-learning-platform` | **Date**: 2026-03-25 | **Spec**: specs/001-english-learning-platform/spec.md
**Input**: Feature specification from `/specs/001-english-learning-platform/spec.md`

## Summary

Redesign the teacher availability calendar (`AvailabilityCalendar` component + `TeacherSchedulePage`) to use a compact, dense grid layout so the full 06:00–22:00 × 7-day week fits on a single screen without vertical scrolling. Slots become small, colour-coded squares; hour labels appear only on the `:00` row; controls are tightened into a single toolbar row. No backend changes required.

## Technical Context

**Language/Version**: TypeScript 5.4, Next.js 14.2
**Primary Dependencies**: React 18, Tailwind CSS, next-intl, framer-motion, lucide-react
**Storage**: N/A (UI-only change)
**Testing**: Vitest + React Testing Library
**Target Platform**: Web (desktop-first, responsive)
**Project Type**: Web application — teacher-facing schedule management page
**Performance Goals**: 60 fps interactions, no layout shift on render
**Constraints**: Must preserve all existing functionality (past-slot locking, i18n, shift-click range, bulk actions, presets, auto-save). Must not break mobile view.
**Scale/Scope**: Single component + single page file

## Constitution Check

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality | Functions ≤50 lines, no duplication | ✅ Refactoring only |
| III. UX Consistency | Role-specific dashboard, clear feedback | ✅ Improves density while preserving all states |
| IV. Performance | 60fps, no N+1 queries | ✅ Same data layer, fewer DOM nodes |
| VII. UI Design Excellence | Clean layouts, visual hierarchy, responsive | ✅ Core goal of this feature |

## Project Structure

### Documentation (this feature)

```text
specs/001-english-learning-platform/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← N/A (no DB changes)
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code

```text
frontend/src/
├── components/teacher/
│   └── AvailabilityCalendar.tsx   ← PRIMARY: compact grid redesign
└── app/[locale]/teacher/schedule/
    └── page.tsx                   ← SECONDARY: consolidate cards, tighten layout
```

## Phase 0: Research

### Decision 1 — Cell density target

**Decision**: 12px tall cells (`h-3`, `py-px`) — smallest touch-able size on desktop without losing click accuracy.
**Rationale**: 32 rows × 12px + borders = ~416px — fits comfortably inside a 1080p screen with header and nav. Current `h-6` (24px) renders at ~800px requiring scroll.
**Alternatives considered**: 16px (`h-4`) — still fits but leaves unused space; 8px — too small to click accurately.

### Decision 2 — Time label strategy

**Decision**: Show the hour label only on `:00` rows (e.g., "06", "07"). The `:30` row shows no label (empty `td`).
**Rationale**: Halves the visual noise in the time column while still giving enough anchoring context. Teachers scan by hour, not by half-hour.
**Alternatives considered**: Full "06:30" labels on every row — current approach, too noisy; no labels at all — hard to orient.

### Decision 3 — Controls layout

**Decision**: Consolidate preset buttons + bulk-action bar + legend into a 2-row compact toolbar above the grid. Presets and bulk actions share the same row (presets hidden when bulk bar is active).
**Rationale**: Reduces vertical space above grid from ~100px to ~50px.
**Alternatives considered**: Sidebar layout — adds horizontal complexity; Collapsible panel — adds cognitive load.

### Decision 4 — Page layout

**Decision**: Merge week navigation bar and calendar into a single `Card`. Remove separate `Card` wrapper from `AvailabilityCalendar` section.
**Rationale**: Eliminates double-border and double-padding. The nav + grid form a single cohesive widget.
**Alternatives considered**: Keep separate cards — more vertical space wasted.

## Phase 1: Design

### Component Changes — `AvailabilityCalendar.tsx`

#### Grid cells

```
Before: h-6 p-0.5  (24px tall cell)
After:  h-3 p-px   (12px tall cell)
```

#### Time column

- Width: `w-14` → `w-8`
- Show label only when `time.endsWith(':00')` — display just the hour number (`"06"`, `"07"`, …)
- `:30` rows: empty `<td>` (no button, no label)
- Row header click still works for `:30` rows (invisible hit area via `w-full h-full`)

#### Header row

- Day name cells: `p-1` → `p-0.5`, `text-xs` unchanged
- Column header button: `py-1` → `py-0.5`

#### Toolbar layout

```
Row 1: [Preset buttons] ── OR ── [Bulk action bar when selection active]
Row 2: [Legend + saving indicator]   (compact inline)
Row 3: [Shift-click hint]            (xs text, single line)
```

All three rows use `text-xs`, tight `gap-1.5`.

#### Table wrapper

```
Before: overflow-x-auto rounded-lg border border-white/10
        min-w-[560px]
After:  overflow-x-auto rounded-lg border border-white/10
        min-w-[420px]
```

### Page Changes — `page.tsx`

- Remove the separate `<Card>` that wraps only `<AvailabilityCalendar>` — the calendar's own table border provides visual containment.
- Week navigation card: `p-4` → `p-3`, remove `motion.div` delay on calendar (0.2 → 0).
- `max-w-5xl` → `max-w-4xl` (tighter column focus).

### Unchanged

- All logic: `pastSlots`, `handleSlotClick`, `bulkOpen/Close`, `applyPreset`, `saveToDb`, `scheduleSave`
- All i18n: `t()` calls and translation keys
- All styling variables: colour palette, border colours, hover states
- Booked/past/selected/open cell classes — only height/padding change

## quickstart.md

See `quickstart.md` for before/after visual reference and manual test checklist.
