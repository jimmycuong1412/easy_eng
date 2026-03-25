# Research: Teacher Schedule — Compact General View

## Cell Density

**Decision**: `h-3` (12px) cells
- 32 rows × 12px = 384px grid body — fits a 900px screen with header/nav
- Minimum comfortable click target on desktop mouse: ~10px
- Mobile: handled by `overflow-x-auto` scroll, density acceptable

## Hour-only Label Strategy

**Decision**: Show label only on `:00` rows
- Pattern: `time.endsWith(':00') ? time.slice(0,2) : ''`
- `:30` rows still receive a transparent row-select button for range selection
- Visual anchor spacing: 1 label per 24px (2 × 12px rows) — readable

## Toolbar Consolidation

**Decision**: Swap presets row ↔ bulk-action row (mutually exclusive display)
- `selected.size > 0` → show bulk-action bar, hide presets
- `selected.size === 0` → show presets row
- Saves ~36px when no selection active (no double-row)

## Layout Consolidation

**Decision**: Single `Card` for nav + calendar
- Week nav becomes the `CardContent` header section (border-bottom separator)
- Calendar grid directly below, no extra Card wrapper
- Net saving: ~32px padding + ~2px double border

---

# Research: Teacher Schedule Polish — Past Slot Locking + i18n

---

## Decision 1: Past Slot Detection Approach

**Decision**: Compute `pastSlots` inside `AvailabilityCalendar` from the existing `weekStart` prop using `useMemo`.

**Rationale**:
- `weekStart` prop is already passed from schedule page but was previously ignored.
- With `weekStart` we can compute the actual calendar date for each column: `offset = d === 0 ? 6 : d - 1`.
- Reuses the same `isSlotPast(date, time)` logic already on the student booking page.
- No new props or API changes needed.

**Alternatives considered**:
- Pass `pastSlots: Set<string>` from parent — adds complexity without benefit; parent has no reason to know about time semantics.
- Block at API save-time — better as server-side defence but UX fix belongs in the UI.

**Implementation sketch**:
```typescript
const pastSlots = useMemo<Set<string>>(() => {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const past = new Set<string>();
  for (const d of ORDERED_DAYS) {
    const offset = d === 0 ? 6 : d - 1;
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset);
    if (date < today) {
      VISIBLE_SLOTS.forEach(t => past.add(`${d}:${t}`));
    } else if (date.toDateString() === now.toDateString()) {
      const nowMins = now.getHours() * 60 + now.getMinutes();
      VISIBLE_SLOTS.forEach(t => {
        const [h, m] = t.split(':').map(Number);
        if (h * 60 + m <= nowMins) past.add(`${d}:${t}`);
      });
    }
  }
  return past;
}, [weekStart]);
```

Past slots: distinct visual (dimmed/striped), cannot be toggled or selected.

---

## Decision 2: i18n Strategy for AvailabilityCalendar

**Decision**: Use `useTranslations('teacherSchedule')` directly inside `AvailabilityCalendar`. Add a `calendar` sub-key.

**Rationale**: Component is `'use client'`, so `useTranslations` works. Precedent: `teacher/quiz/page.tsx`. Existing `teacherSchedule.days` keys reused for column headers.

**New keys needed** under `teacherSchedule.calendar`:
```json
{
  "presets": { "workHours": "...", "morning": "...", "evening": "..." },
  "selectedCount": "{count} slots selected",
  "bulkOpen": "Open selected",
  "bulkClose": "Close selected",
  "deselect": "Deselect",
  "legend": { "open": "Open", "closed": "Closed", "booked": "Booked", "selected": "Selected", "past": "Past" },
  "saving": "Saving...",
  "shiftHint": "Shift+click to select range — click column/row header to select full day/time",
  "bookedTooltip": "Already booked",
  "pastTooltip": "Cannot modify past slots",
  "openTooltip": "Open — click to close",
  "closedTooltip": "Closed — click to open",
  "colSelectTitle": "Select full day",
  "rowSelectTitle": "Select this time across all days"
}
```

---

## Decision 3: PRESETS Refactor

**Decision**: Change PRESETS to use fixed English keys (`workHours`, `morning`, `evening`); display labels come from `t('teacherSchedule.calendar.presets.workHours')` etc.

**Rationale**: Current code uses Vietnamese strings as both object keys and display labels — prevents translation and is type-unsafe.

---

## Decision 4: Date Locale for Week Range Display

**Decision**: Use `useLocale()` in `schedule/page.tsx`; map `vi` → `vi-VN`, `en` → `en-US` for `toLocaleDateString`.

**Rationale**: Precedent in `recordings/page.tsx` uses the same pattern.

---

## Decision 5: Scope of Other Pages

**Finding**: Scanned all teacher page files:
- `teacher/quiz/page.tsx` — already uses `useTranslations('teacherQuiz')` ✓
- `teacher/dashboard/page.tsx` — English hardcoded, no Vietnamese ✓
- `teacher/classes/page.tsx`, `classes/new/page.tsx`, `classes/[id]/page.tsx` — English ✓
- `teacher/earnings/page.tsx` — English ✓

**Decision**: Only `schedule/page.tsx` and `AvailabilityCalendar.tsx` need i18n changes.
