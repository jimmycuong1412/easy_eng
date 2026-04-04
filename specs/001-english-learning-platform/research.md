# Research: Teacher Schedule UX Overhaul

**Feature**: Teacher Schedule — Batch Save, Drag Selection, Visual Polish
**Branch**: `001-english-learning-platform`

---

## Decision 1 — Batch State Management Strategy

**Decision**: Replace 800ms debounce auto-save with an explicit "Save Changes" / "Discard" button pair.

**Approach**:
- Maintain a `savedState` ref (mirrors what is in the DB, set on load and after each successful save)
- `slotState` continues to be the local working copy
- `hasUnsavedChanges` derived by comparing `slotState` to `savedState` via JSON.stringify
- A sticky `Save Changes` button becomes active when `hasUnsavedChanges` is true
- `Discard` resets `slotState` back to `savedState`
- Remove `debounceTimer` and `scheduleSave` entirely
- `bulkOpen`, `bulkClose`, `applyPreset` and single-slot toggle no longer auto-save
- `saveToDb` called only on explicit Save button click

**Rationale**: Reduces DB write volume from every click to 1 batch per session. Teachers can experiment freely before committing. Matches standard form UX (settings pages, calendar editors).

**Alternatives rejected**:
- Keep debounce but increase to 3s — still fires per-click, no user control
- Optimistic immediate save on every slot — opposite of batch goal

---

## Decision 2 — Drag Selection Implementation

**Decision**: Add mousedown+mousemove drag selection using React state + document-level `mouseup` listener.

**Approach**:
- `isDragging` boolean state + `dragStartKey` string state
- `onMouseDown` on a cell: set `isDragging=true`, `dragStartKey=key`, add key to selection
- `onMouseEnter` on a cell (when `isDragging`): compute range from `dragStartKey` to current key, add to selection
- Document-level `mouseup` listener (in `useEffect` cleanup): set `isDragging=false`
- Shift+click range (existing) preserved alongside drag; drag uses the same `getTimeRange` helper
- Drag does NOT cross columns (same single-column range as shift-click per `getTimeRange`)
- Add `select-none` class to table to prevent text selection during drag

**Rationale**: Native drag feel with zero new dependencies. `getTimeRange` already exists and handles the range math correctly.

**Alternatives rejected**:
- External library (react-dnd) — overkill for a simple selection gesture
- Pointer events API — adds complexity; mouse events sufficient for desktop-first teacher UI

---

## Decision 3 — Visual Simplification / Scrollable Grid

**Decision**: Wrap the grid in a `max-h-[400px] overflow-y-auto` scrollable container with a sticky `<thead>`.

**Approach**:
- Grid stays at full 00:00–23:30 range (48 rows) — teachers set overnight tutoring slots
- Wrap `<div className="overflow-x-auto rounded-lg border border-white/10">` gets an inner `<div className="max-h-[400px] overflow-y-auto">`
- `<thead>` gets `sticky top-0 z-10` with explicit background to prevent bleed-through
- Time column: only show label on `:00` rows; `:30` rows show invisible placeholder button (still clickable for row-select)
- `:00` rows get `border-t border-white/10` to visually group hours; `:30` rows get `border-b border-white/5`

**Rationale**: 48-row × 7-col grid scrolled inline is the Google Calendar standard. Sticky headers keep day context visible at all scroll positions.

---

## Decision 4 — High-Contrast State Indicators

**Decision**: Use higher-opacity background fills for all interactive states.

| State    | Background              | Border                  |
|----------|-------------------------|-------------------------|
| Open     | `bg-emerald-500/70`     | `border-emerald-400`    |
| Closed   | `bg-slate-700/50`       | `border-slate-600/40`   |
| Booked   | `bg-blue-500/70`        | `border-blue-400`       |
| Selected | `bg-amber-400/80`       | `border-amber-300`      |
| Past     | diagonal stripe texture | `border-slate-700/20`   |

Past slot stripe (Tailwind arbitrary):
```
bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.06)_3px,rgba(255,255,255,0.06)_6px)]
```

**Rationale**: Current `bg-xxx/20–/30` fills are hard to distinguish in a dense dark grid. Higher opacity + stripe texture for Past vs Closed resolves the most-confused pair.

---

## Decision 5 — i18n Keys to Add

New keys in `teacherSchedule.calendar`:

```json
"saveChanges": "Save Changes",
"discardChanges": "Discard",
"unsavedChanges": "{count} unsaved change(s)",
"saved": "Saved!",
"dragHint": "Click and drag or Shift+click to select multiple slots",
"saveError": "Failed to save. Please try again."
```

Existing `shiftHint` key is replaced by `dragHint` (superset message).

---

## Decision 6 — Scope (Files Changed)

| File | Change |
|------|--------|
| `frontend/src/components/teacher/AvailabilityCalendar.tsx` | All 4 features |
| `frontend/messages/en.json` | 6 new/updated `calendar.*` keys |
| `frontend/messages/vi.json` | Same 6 keys in Vietnamese |
| `frontend/src/app/[locale]/teacher/schedule/page.tsx` | No changes needed |

No new packages. No DB schema changes. No new API routes.
