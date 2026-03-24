# Quickstart: Teacher Schedule — Past Slot Locking + i18n

**Target**: Developer implementing past-slot blocking and English i18n on the teacher schedule page.

---

## What Changes

| File | Change |
|------|--------|
| `frontend/src/components/teacher/AvailabilityCalendar.tsx` | Add pastSlots locking; replace all hardcoded Vietnamese with `useTranslations`; refactor PRESETS keys |
| `frontend/src/app/[locale]/teacher/schedule/page.tsx` | Add `useTranslations` + `useLocale`; remove hardcoded Vietnamese; fix date locale |
| `frontend/messages/en.json` | Add `teacherSchedule.calendar` sub-keys |
| `frontend/messages/vi.json` | Add `teacherSchedule.calendar` sub-keys (Vietnamese) |

No DB schema changes. No new npm packages.

---

## Past Slot Logic

```
Today (e.g. Wednesday 14:30):
  Monday     → ALL slots locked (past day)
  Tuesday    → ALL slots locked (past day)
  Wednesday  → slots 06:00–14:30 locked (past time today), 15:00+ open/closed normally
  Thursday+  → normal (future)

Past week (weekStart < this Monday):
  ALL slots locked

Future week (weekStart > this Monday):
  NO slots locked (all can be opened/closed freely)
```

Slot key mapping to actual date:
```typescript
const offset = d === 0 ? 6 : d - 1;  // dayOfWeek → days since Monday
const date = new Date(weekStart);
date.setDate(weekStart.getDate() + offset);
```

Past slots: dimmed grey visual, `cursor-not-allowed`, click suppressed.

---

## PRESETS Refactor

```typescript
// Before (broken — Vietnamese keys)
const PRESETS = { 'Giờ hành chính': ... };

// After (i18n-safe)
const PRESET_CONFIG = {
  workHours: { days: [1,2,3,4,5], from: '08:00', to: '17:00' },
  morning:   { days: [0,1,2,3,4,5,6], from: '06:00', to: '12:00' },
  evening:   { days: [0,1,2,3,4,5,6], from: '18:00', to: '22:00' },
} as const;
type PresetKey = keyof typeof PRESET_CONFIG;
// Display: t(`calendar.presets.${key}`)
```

---

## Test Checklist

### Past Slot Locking
- [ ] Open `/en/teacher/schedule` — past days this week show as dimmed/locked
- [ ] Current day: slots before current time are locked; slots after current time are togglable
- [ ] Cannot click/toggle a past slot (click has no effect)
- [ ] Shift+click range stops at past slots (they are excluded from selection)
- [ ] Navigate to a past week → all slots locked
- [ ] Navigate to a future week → no slots locked

### i18n — English (`/en/teacher/schedule`)
- [ ] Page title shows "Teaching Schedule" (not "Lịch dạy")
- [ ] Subtitle is in English
- [ ] "Prev week" / "Next week" buttons are in English
- [ ] Week date range uses English date format (e.g. "March 23 – March 29, 2026")
- [ ] Day column headers show "Mon", "Tue", etc. (not "Thứ 2")
- [ ] Preset buttons show "Work hours (8–17)", "Morning (6–12)", "Evening (18–22)"
- [ ] Bulk action bar shows "Open selected", "Close selected", "Deselect"
- [ ] Legend shows "Open", "Closed", "Booked", "Selected", "Past"
- [ ] Saving indicator shows "Saving..."
- [ ] Shift hint is in English

### i18n — Vietnamese (`/vi/teacher/schedule`)
- [ ] Page title shows "Lịch dạy"
- [ ] Day column headers show "Thứ 2", "CN", etc.
- [ ] Preset buttons show Vietnamese names
- [ ] Bulk actions in Vietnamese
- [ ] All other labels in Vietnamese

### Existing Functionality (regression)
- [ ] Single click toggles one slot open/closed
- [ ] Auto-save fires ~800ms after last toggle (network tab)
- [ ] Shift+click selects a range on the same day
- [ ] "Open selected" opens all highlighted + saves immediately
- [ ] Column header selects entire day
- [ ] Row header selects same time across all 7 days
- [ ] Booked slot shows as locked blue
- [ ] Preset opens correct slots additively
- [ ] Week navigation works; booked slots update per week
