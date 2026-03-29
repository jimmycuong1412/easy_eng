# Contract: Schedule Draft Save

**Feature**: Teacher Schedule UX & Save-Button Refactor
**Date**: 2026-03-30
**Type**: Supabase client SDK operation (no REST API route)

---

## Operation: Batch upsert slot overrides

**Caller**: `useScheduleDraft.saveDraft(teacherId)`
**Table**: `teacher_slot_overrides`
**Method**: Supabase `.upsert(rows, { onConflict: 'teacher_id,day_of_week,slot_time' })`

### Input

```ts
rows: Array<{
  teacher_id: string;          // UUID — current auth user
  day_of_week: number;         // 0–6
  slot_time: string;           // "HH:MM:00" format (e.g. "08:25:00")
  is_enabled: boolean;
}>
```

### Output

| Case | Result |
|------|--------|
| Success | Empty response body; `error === null` |
| Auth error | `error.code === 'PGRST301'` — hook sets `saveError` |
| Constraint violation | Should not occur (upsert with onConflict handles duplicates) |

### RLS enforcement

Row-level security policy on `teacher_slot_overrides` ensures:
- INSERT/UPDATE only allowed when `teacher_id = auth.uid()`
- SELECT only returns own rows

---

## Hook interface contract

```ts
// useScheduleDraft return type
interface UseScheduleDraftReturn {
  draft: Record<string, boolean>;          // "dayOfWeek:HH:MM" → enabled
  isDirty: boolean;
  saving: boolean;
  saveError: string | null;
  toggleDraft: (dayOfWeek: number, slotTime: string, newValue: boolean) => void;
  saveDraft: (teacherId: string) => Promise<void>;
  discardDraft: () => void;
}
```

### Key format

Draft keys use `"dayOfWeek:HH:MM"` (no seconds) to match the grid's `slot.time` format.
When writing to DB, `:00` is appended to produce `"HH:MM:00"` for the `time` column.

---

## Stats computation contract

```ts
// Input: ScheduleData (already in page state)
// Output: WeekStats (derived synchronously, no DB call)
interface WeekStats {
  total: number;      // count of all non-empty ScheduleSlot entries
  available: number;  // status === 'available'
  booked: number;     // status === 'upcoming' | 'booked'
  disabled: number;   // status === 'disabled'
}
```

**Note**: Stats reflect the persisted DB state. Draft overrides are not reflected in stats until after Save + schedule reload.
