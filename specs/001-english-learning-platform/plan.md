# Implementation Plan: Teacher Schedule Polish — Past Slot Locking + i18n

**Branch**: `001-english-learning-platform` | **Date**: 2026-03-23
**Input**: Feature request — block past slots + fix English i18n on teacher schedule page

---

## Technical Context

**Tech Stack**: Next.js 14, TypeScript 5.4, next-intl (i18n), Supabase JS v2
**Affected Files**:
- `frontend/src/components/teacher/AvailabilityCalendar.tsx`
- `frontend/src/app/[locale]/teacher/schedule/page.tsx`
- `frontend/messages/en.json`
- `frontend/messages/vi.json`

**No DB changes. No new npm packages.**

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Code Quality | PASS | Changes are small, well-typed, readable |
| Testing Discipline | PASS | No new business logic that requires unit tests; smoke-test via quickstart |
| UX Consistency | PASS | Past slots follow same locked-cell pattern as booked slots |
| Role-Based Access | PASS | No access control changes |
| Currency Integrity | N/A | No gem/currency changes |

---

## Feature Summary

### Sub-feature A: Past Slot Locking

**Problem**: Teachers can currently toggle open slots in the past (past days and past times on today).
**Fix**: Derive `pastSlots: Set<string>` inside `AvailabilityCalendar` from `weekStart` + current time using `useMemo`. Render past slots as dimmed/locked (distinct from booked=blue). Suppress click handlers for past slots.

**Visual hierarchy**:
| State | Color | Interaction |
|-------|-------|-------------|
| OPEN | Green | Click to close |
| CLOSED | Grey | Click to open |
| BOOKED | Blue | Locked (cursor-not-allowed) |
| PAST | Dark striped/dimmed | Locked (cursor-not-allowed) |
| SELECTED | Yellow highlight | Bulk action |

### Sub-feature B: i18n for Schedule Page and AvailabilityCalendar

**Problem**: `schedule/page.tsx` and `AvailabilityCalendar.tsx` contain hardcoded Vietnamese strings. When locale = English, the page still shows Vietnamese.

**Fix**:
1. Add `teacherSchedule.calendar` keys to `en.json` and `vi.json`
2. Use `useTranslations('teacherSchedule')` in `AvailabilityCalendar.tsx`
3. Use `useTranslations('teacherSchedule')` and `useLocale()` in `schedule/page.tsx`
4. Refactor `PRESETS` to use fixed English keys; labels from translations
5. Replace hardcoded `'vi-VN'` with dynamic locale string

---

## Phase 0: Research (Complete)

See `research.md` — all decisions resolved.

---

## Phase 1: Design & Contracts

### Data Model

No schema changes. No new state shapes. The only new derived state:

```typescript
// Inside AvailabilityCalendar — derived from weekStart + Date.now()
pastSlots: Set<string>   // "dayOfWeek:HH:MM" keys that are in the past
```

### New i18n Keys

**`messages/en.json`** — add under `teacherSchedule`:
```json
"calendar": {
  "presets": {
    "workHours": "Work hours (8–17)",
    "morning": "Morning (6–12)",
    "evening": "Evening (18–22)"
  },
  "selectedCount": "{count} slots selected",
  "bulkOpen": "Open selected",
  "bulkClose": "Close selected",
  "deselect": "Deselect",
  "legend": {
    "open": "Open",
    "closed": "Closed",
    "booked": "Booked",
    "selected": "Selected",
    "past": "Past"
  },
  "saving": "Saving...",
  "shiftHint": "Shift+click to select range — click column/row header to select full day/time",
  "bookedTooltip": "Already booked by a student",
  "pastTooltip": "Cannot modify past slots",
  "openTooltip": "Open — click to close",
  "closedTooltip": "Closed — click to open",
  "colSelectTitle": "Select full day",
  "rowSelectTitle": "Select this time across all days"
}
```

**`messages/vi.json`** — add under `teacherSchedule.calendar` (Vietnamese equivalents):
```json
"calendar": {
  "presets": {
    "workHours": "Giờ hành chính (8–17)",
    "morning": "Buổi sáng (6–12)",
    "evening": "Buổi tối (18–22)"
  },
  "selectedCount": "Đã chọn {count} slot",
  "bulkOpen": "Mở đã chọn",
  "bulkClose": "Đóng đã chọn",
  "deselect": "Bỏ chọn",
  "legend": {
    "open": "Mở",
    "closed": "Đóng",
    "booked": "Đã đặt",
    "selected": "Đã chọn",
    "past": "Đã qua"
  },
  "saving": "Đang lưu...",
  "shiftHint": "Shift+click để chọn dải — nhấn tiêu đề cột/hàng để chọn cả ngày/giờ",
  "bookedTooltip": "Đã có học viên đặt",
  "pastTooltip": "Không thể sửa slot đã qua",
  "openTooltip": "Đang mở — nhấn để đóng",
  "closedTooltip": "Đang đóng — nhấn để mở",
  "colSelectTitle": "Chọn cả ngày",
  "rowSelectTitle": "Chọn giờ này tất cả các ngày"
}
```

### schedule/page.tsx — Strings to Replace

| Hardcoded | i18n key |
|-----------|----------|
| `"Lịch dạy"` | `t('title')` |
| `"Mở hoặc đóng các khung giờ..."` | `t('subtitle')` |
| `"Tuần trước"` | `t('prevWeek')` |
| `"Tuần sau"` | `t('nextWeek')` |
| `toLocaleDateString('vi-VN', ...)` | `toLocaleDateString(dateLocale, ...)` where `dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US'` |

### AvailabilityCalendar.tsx — Strings to Replace

| Hardcoded | i18n key |
|-----------|----------|
| `DAY_NAMES = ['CN', 'Thứ 2', ...]` | `t('days.sun')`, `t('days.mon')` etc. |
| `PRESETS = { 'Giờ hành chính': ... }` | `PRESET_CONFIG = { workHours: ..., morning: ..., evening: ... }` + `t('calendar.presets.workHours')` |
| `"Mở đã chọn"` | `t('calendar.bulkOpen')` |
| `"Đóng đã chọn"` | `t('calendar.bulkClose')` |
| `"Bỏ chọn"` | `t('calendar.deselect')` |
| `"{n} slot đã chọn"` | `t('calendar.selectedCount', { count: selected.size })` |
| `"Mở"` / `"Đóng"` / `"Đã đặt"` / `"Đã chọn"` | `t('calendar.legend.open')` etc. |
| `"Đang lưu..."` | `t('calendar.saving')` |
| Shift-click hint | `t('calendar.shiftHint')` |
| Column header title | `t('calendar.colSelectTitle')` |
| Row header title | `t('calendar.rowSelectTitle')` |
| Slot button tooltips | `t('calendar.bookedTooltip')`, `t('calendar.pastTooltip')`, `t('calendar.openTooltip')`, `t('calendar.closedTooltip')` |

---

## Implementation Order

1. **Update en.json and vi.json** — add `teacherSchedule.calendar` keys
2. **Rewrite AvailabilityCalendar.tsx**:
   - Add `useMemo` for `pastSlots` (from `weekStart`)
   - Add `useTranslations('teacherSchedule')`
   - Rename `PRESETS` → `PRESET_CONFIG` with fixed English keys
   - Replace all hardcoded strings with `t(...)` calls
   - Add past slot visual style + click suppression
3. **Update schedule/page.tsx**:
   - Add `useTranslations('teacherSchedule')` + `useLocale()`
   - Replace hardcoded strings
   - Fix `toLocaleDateString` to use dynamic locale
4. **TypeScript check** — `npx tsc --noEmit`

---

## Quickstart / Smoke-Test

See updated `quickstart.md` for test checklist including past-slot and i18n scenarios.
