# Research: Teacher Schedule — Multi-Select, UI Cleanup & Compact Layout

**Phase 0 output** | Branch: `claude/angry-moser` | Date: 2026-03-30

---

## R1 — Multi-select drag implementation (no external library)

**Decision**: Pure React pointer events — `onPointerDown` / `onPointerEnter` / `onPointerUp` on `<td>` elements, using the Pointer Capture API.

**Findings**:
- The Pointer Capture API (`e.currentTarget.setPointerCapture(e.pointerId)`) ensures `onPointerMove` / `onPointerEnter` events continue firing even when the cursor leaves the element, preventing "stuck" drag states.
- `onPointerEnter` on each cell fires reliably during a drag when pointer capture is NOT set on the table container (if we set capture on the container, `pointerenter` won't fire on children). So we skip container capture and rely on `onPointerEnter` per cell.
- Rectangle selection: store `(rowIdx, colIdx)` of anchor and current hover cell; compute selection as all cells where `min(anchor.row, curr.row) ≤ row ≤ max(anchor.row, curr.row)` AND same for col.
- Text selection prevention: add `select-none` class to the `<table>` while `isDragging` is true.
- Mobile: the table already has `overflow-x-auto` scroll. Adding `touch-action: none` during drag prevents accidental scroll-while-selecting; restore `touch-action: auto` on drag end.

**Alternatives considered**:
- `react-selecto` library: feature-complete but adds ~15kB; overkill for a simple rectangular selection.
- CSS `user-select: none` + mousemove: pointer events are more reliable than mouse events on touch devices and with pointer capture.

---

## R2 — Selection key format

**Decision**: Use `"YYYY-MM-DD:HH:MM"` (e.g., `"2026-03-31:08:00"`) as the selection key.

**Findings**:
- The grid already identifies cells by `(dateKey, time)` — the `dateKey` is `YYYY-MM-DD` and `time` is `HH:MM`.
- This format is already used for `scheduleMap` lookups in `page.tsx`, so no format conversion needed.
- A `Set<string>` is the correct data structure: O(1) add/has/delete, fast for 57×7 = 399 max cells.

---

## R3 — Shift-click range selection

**Decision**: Store anchor in a `useRef` (not state), recompute selection on each shift-click.

**Findings**:
- `useRef` avoids re-renders on anchor update; the selection `Set<string>` in state drives renders.
- Algorithm: on shift+click, compute rectangle from `anchorRef.current` to clicked cell and set `selected = new Set(computeRectangle(anchor, target, allCells))`.
- `allCells` is the sorted list of `{dateKey, time, rowIdx, colIdx}` — derived from `timeSlots × weekDays` (same arrays used to render the grid, so indices are stable).
- On non-shift click: clear selection, set anchor to clicked cell, add to selection.

---

## R4 — Batch action integration with `useScheduleDraft`

**Decision**: Batch action calls `toggleDraft(dayOfWeek, time, value)` in a loop for each selected cell — no changes to `useScheduleDraft` needed.

**Findings**:
- `toggleDraft` updates `draft` state via `setDraft(prev => ({ ...prev, key: value }))`. Calling it N times in a `forEach` loop will batch in React 18's automatic batching, resulting in a single re-render.
- Only `available` and `disabled` slots are actionable. Booked/upcoming are visually highlighted but skipped.
- `dayOfWeek` for a selection key `"YYYY-MM-DD:HH:MM"` can be computed as `new Date(dateKey).getDay()`.

---

## R5 — Compact layout approach

**Decision**: Adjust individual cell sizes in Tailwind (not CSS `transform: scale()`).

**Findings**:
- CSS `transform: scale(0.8)` on the table container would scale the scroll container too, causing incorrect overflow calculations and broken sticky headers. Not viable.
- Target density: `h-5` (20px) rows with `py-0` padding gives ~24 visible rows at 1080p (24 × 20px = 480px, fits in ~600px visible area with headers).
- At 20px row height, showing two lines of text (topic + student) is impossible. Solution: show only a colored indicator (thin bar or dot). Full text still visible in the detail dialog on click.
- Time labels at `text-[10px]` (10px) are readable on desktop; on mobile (375px) the time column collapses naturally via the existing `min-w-[900px]` table constraint.
- Day headers reduce from `py-2` to `py-1.5` — saves ~14px per render.

**Slot content at compact size**:
- Available: `w-1.5 h-1.5 rounded-full bg-white/40 mx-auto` dot
- Disabled: `w-1.5 h-1.5 rounded-full bg-red-500/50 mx-auto` dot
- Upcoming/Booked: `w-full h-2 rounded-sm bg-[#3B82F6]/70` bar
- Completed: `w-full h-2 rounded-sm bg-emerald-500/70` bar
- Empty (outside availability): nothing rendered

**Alternatives considered**:
- CSS `zoom`: browser inconsistency (not supported in Firefox until 2024).
- Collapsible time groups (e.g., show only hours, expand on click): adds interaction complexity without the clean "bird's-eye" feel requested.

---

## R6 — Settings button removal strategy

**Decision**: Remove the "Slot Settings" `<Button>` from the page header. Add a small `<Settings>` icon button in the slot detail dialog for empty/outside-availability slots.

**Findings**:
- The header button (`settingsBtn` i18n key, value "Slot Settings") currently opens the `AvailabilityCalendar` dialog.
- The `AvailabilityCalendar` manages recurring weekly availability patterns (not individual slot overrides). Teachers configure it infrequently (once when setting up their schedule).
- Moving it to the slot detail dialog for empty slots makes it contextually discoverable: "This slot is outside your availability — configure availability here → [⚙ Settings]".
- The dialog close button already exists; no additional UI scaffolding needed.

---

## Resolved unknowns

| Unknown | Resolution |
|---------|-----------|
| Can pointer events handle fast drag without missing cells? | Yes — `onPointerEnter` per `<td>` fires reliably; Pointer Capture on initial cell ensures drag start is captured |
| Does React 18 batch multiple `toggleDraft` calls? | Yes — automatic batching in React 18 groups synchronous state updates in event handlers |
| Can `text-[10px]` be used in Tailwind without config? | Yes — arbitrary values work out of the box |
| Will compact rows break the existing `h-8` slot detail button logic? | No — buttons inside cells use their own sizing; only the `<tr>` height changes |
| Is `useRef` for anchor safe with concurrent rendering? | Yes — refs are mutable and not part of the render cycle; anchor doesn't need to trigger renders |
