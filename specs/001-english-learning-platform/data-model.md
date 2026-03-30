# Data Model: Teacher Schedule Simplification

**No schema changes required.** All data lives in existing tables.

---

## Entities Used

### teacher_slot_overrides (existing — read/write)

| Column | Type | Notes |
|--------|------|-------|
| teacher_id | UUID | FK → auth.users |
| day_of_week | INT | 0=Sun, 1=Mon … 6=Sat |
| slot_time | TIME | "HH:MM:00" (30-min intervals) |
| is_enabled | BOOL | true = open for student booking |

**Unique constraint**: `(teacher_id, day_of_week, slot_time)`

**Read**: `SELECT * FROM teacher_slot_overrides WHERE teacher_id = $1`
**Write**: DELETE all for teacher → INSERT only enabled slots (existing pattern, unchanged)

---

### bookings (read-only — derive locked slots)

| Column | Type | Notes |
|--------|------|-------|
| teacher_id | UUID | FK |
| scheduled_date | DATE | specific calendar date |
| start_time | TIME | slot start |
| status | TEXT | 'confirmed' / 'pending' |

**Derived key format**: `"dayOfWeek:HH:MM"` computed from `scheduled_date.getDay()` + `start_time.slice(0,5)`.

---

## Component State Model

```typescript
// AvailabilityCalendar internal state
slotState: Record<string, boolean>   // "dayOfWeek:HH:MM" → is_enabled
selected: Set<string>                // multi-select: highlighted keys (not yet saved)
anchorKey: string | null             // shift-click range anchor
pendingChanges: Set<string>          // changed since last save (drives debounce)
saving: boolean
error: string | null

// Props from parent page
bookedSlots: Set<string>             // locked — cannot toggle
weekStart: Date                      // display only; keys are day_of_week-based
```

---

## Slot Key Convention

```
key = `${dayOfWeek}:${HH:MM}`

Examples:
  "1:08:00"  → Monday 08:00
  "0:14:30"  → Sunday 14:30
  "6:20:00"  → Saturday 20:00
```

Matches the existing key format — no migration needed.

---

## Visible Slot Range

Default: **06:00 – 22:00** = 32 slots per day × 7 days = 224 cells per grid.
(Down from 48 slots × 7 = 336 in current implementation.)
