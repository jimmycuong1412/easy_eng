# Research: Fix Notifications Button in Teacher Dashboard

## Finding 1: DashboardLayout Notification Button

**Location**: `frontend/src/app/[locale]/dashboard/layout.tsx` lines 377–380

**Current code** (broken):
```tsx
<Button variant="ghost" size="icon" className="relative">
  <span className="text-xl">🔔</span>
  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
</Button>
```

**Problem**: No `onClick`, no state, no dropdown. Static decoration only.

**Fix**: Replace with `<NotificationBell />` from `@/components/layout/NotificationBell`

---

## Finding 2: Teacher Page Duplicate Button

**Location**: `frontend/src/app/[locale]/dashboard/teacher/page.tsx` lines 203–208

**Current code** (broken):
```tsx
<Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
  <Bell className="w-4 h-4 mr-2" />
  {t('notifications')}
  <Badge className="ml-2 bg-red-500 text-white text-xs">3</Badge>
</Button>
```

**Problem**: Hardcoded badge count of `3`, no onClick, no connection to real data.

**Decision**: Remove this button entirely. The header `NotificationBell` in `DashboardLayout` is the canonical notification entry point. Duplicating it in the page hero adds confusion.

**Rationale**: The layout already provides a persistent notification button that works for all dashboard pages. A duplicate in the hero section violates the single-source-of-truth principle.

---

## Finding 3: Working Reference Implementation

**Location**: `frontend/src/components/layout/NotificationBell.tsx`
- Uses `useRealtimeNotifications` hook for live data
- Shows unread count badge (real, from DB)
- Dropdown with `z-50`, closes on outside click
- Mark as read / mark all as read
- `NotificationList` component for rendering items

**Location**: `frontend/src/components/layout/RoleBasedNav.tsx` line 135
- Already imports and renders `<NotificationBell />` in the main (non-dashboard) layout

---

## Finding 4: Z-Index Analysis

- DashboardLayout header: `z-30`
- NotificationBell dropdown: `z-50`

The dropdown will render above the header. No stacking context issues expected.

---

## Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DashboardLayout button | Replace with `NotificationBell` | Reuse existing, tested component |
| Teacher hero button | Remove | Duplicate; canonical entry point is the header |
| Other role dashboards | Same fix applies | All use same `DashboardLayout` |
| Z-index | No change needed | `z-50` dropdown is above `z-30` header |
