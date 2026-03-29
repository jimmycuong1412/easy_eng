# Data Model: Teacher Schedule Multi-Select, UI Cleanup & Compact Layout

**Feature**: Teacher Schedule Multi-Select & Compact View
**Date**: 2026-03-30
**Branch**: `claude/angry-moser`

---

## No new database entities

All changes are ephemeral client-side state. The existing `teacher_slot_overrides` table (from the previous feature) handles persistence.

---

## New Client-Side State Entities

### `SlotSelectionState` (via `useSlotSelection` hook)

```ts
interface SlotSelectionState {
  // Primary selection set — keys are "YYYY-MM-DD:HH:MM"
  selected: Set<string>;

  // True while pointer button is held down and dragging
  isDragging: boolean;

  // Anchor cell for drag/shift-click range (stored in useRef, not state)
  anchor: {
    dateKey: string;   // "YYYY-MM-DD"
    time: string;      // "HH:MM"
    rowIdx: number;    // Index in timeSlots array (0–56)
    colIdx: number;    // Index in weekDays array (0–6)
  } | null;
}
```

### `CellCoord` (used in `shiftSelect` calculation)

```ts
interface CellCoord {
  dateKey: string;   // "YYYY-MM-DD"
  time: string;      // "HH:MM"
  rowIdx: number;    // 0–56
  colIdx: number;    // 0–6
}
```

---

## Existing DB Entity: `teacher_slot_overrides` (unchanged)

```sql
CREATE TABLE teacher_slot_overrides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    uuid NOT NULL REFERENCES profiles(id),
  day_of_week   integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_time     time NOT NULL,    -- "HH:MM:00"
  is_enabled    boolean NOT NULL,
  UNIQUE (teacher_id, day_of_week, slot_time)
);
```

Batch action writes flow: `selected Set<string>` → loop → `toggleDraft(dayOfWeek, time, value)` → existing `saveDraft(teacherId)` → single upsert.

---

## i18n Key Additions (`teacherSchedule` namespace)

### New keys in `en.json`:
```json
"batchAction": {
  "label": "{{count}} slot selected",
  "label_plural": "{{count}} slots selected",
  "enableSelected": "Enable Selected",
  "disableSelected": "Disable Selected",
  "clear": "Clear Selection"
},
"settingsHint": "Configure availability"
```

### Same keys in `vi.json`:
```json
"batchAction": {
  "label": "{{count}} ô đã chọn",
  "label_plural": "{{count}} ô đã chọn",
  "enableSelected": "Bật các ô đã chọn",
  "disableSelected": "Tắt các ô đã chọn",
  "clear": "Bỏ chọn"
},
"settingsHint": "Cấu hình thời gian rảnh"
```

---

## State Transitions

```
No selection  →  (pointer down on cell)  →  Selecting (isDragging=true)
Selecting     →  (pointer up)            →  Selection active (isDragging=false, selected.size > 0)
Selection active → (batch action click)  →  draft updated, selection cleared
Selection active → (clear button)        →  No selection
Selection active → (non-shift click)     →  New single selection (anchor reset)
```
