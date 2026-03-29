# Data Model: Teacher Schedule UX & Save-Button Refactor

**Feature**: Teacher Schedule UX & Save-Button Refactor
**Date**: 2026-03-30
**Branch**: `001-english-learning-platform`

---

## Existing DB Tables (no schema changes required)

### `teacher_availability`
Stores the teacher's weekly template (which days + time ranges they're available).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| teacher_id | uuid | FK → profiles.id |
| day_of_week | int | 0=Sun … 6=Sat |
| start_time | time | e.g. `00:00:00` |
| end_time | time | e.g. `23:30:00` |
| is_active | boolean | soft delete flag |

### `teacher_slot_overrides`
Per-slot enable/disable overrides on top of the availability template.

| Column | Type | Notes |
|--------|------|-------|
| teacher_id | uuid | FK + unique constraint component |
| day_of_week | int | unique constraint component |
| slot_time | time | unique constraint component (e.g. `08:00:00`) |
| is_enabled | boolean | true = visible/bookable, false = hidden |

**Unique constraint**: `(teacher_id, day_of_week, slot_time)` — supports upsert on conflict.

---

## Frontend State Model

### `ScheduleData` (existing, unchanged)
```ts
type ScheduleData = Record<string, ScheduleSlot[]>; // key = "YYYY-MM-DD"

interface ScheduleSlot {
  id: string;
  time: string;       // "HH:MM"
  duration: number;   // minutes
  status: 'upcoming' | 'completed' | 'booked' | 'available' | 'disabled' | 'empty';
  student: { name: string; avatar: string; level: string } | null;
  topic: string | null;
}
```

### `DraftOverrides` (new — in `useScheduleDraft` hook)
```ts
// Pending changes not yet persisted to DB
// key: "dayOfWeek:HH:MM" (e.g. "1:08:00")
// value: true = enable slot, false = disable slot
type DraftOverrides = Record<string, boolean>;
```

**State transitions**:
```
IDLE (isDirty=false)
  → toggleDraft() → DIRTY (isDirty=true, draft has entries)
  → saveDraft()   → SAVING → IDLE (draft cleared, schedule reloaded)
  → discardDraft()→ IDLE (draft cleared, no DB write)
```

---

## Derived Stats (computed from `ScheduleData` in-memory)

```ts
interface WeekStats {
  total: number;      // all non-empty slots
  available: number;  // status === 'available'
  booked: number;     // status === 'upcoming' | 'booked'
  disabled: number;   // status === 'disabled'
}
```

Computed with a single O(n) pass over `Object.values(schedule).flat()` — no DB query needed.

---

## No migration required

All persistence uses existing `teacher_slot_overrides` via batch upsert. No new columns or tables.
