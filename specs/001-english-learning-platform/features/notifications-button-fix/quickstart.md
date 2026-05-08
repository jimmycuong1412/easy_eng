# Quickstart: Fix Notifications Button in Teacher Dashboard

## Summary

Two surgical edits to fix the non-functional notification button:

1. **`DashboardLayout`** — replace the decorative `🔔` Button with `<NotificationBell />`
2. **Teacher page** — remove the duplicate hardcoded notifications button from the hero section

---

## Edit 1: DashboardLayout

**File**: `frontend/src/app/[locale]/dashboard/layout.tsx`

Add import at the top:
```tsx
import NotificationBell from '@/components/layout/NotificationBell';
```

Replace (lines ~377–380):
```tsx
{/* BEFORE — broken */}
<Button variant="ghost" size="icon" className="relative">
  <span className="text-xl">🔔</span>
  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
</Button>
```

With:
```tsx
{/* AFTER — functional */}
<NotificationBell />
```

---

## Edit 2: Teacher Dashboard Page

**File**: `frontend/src/app/[locale]/dashboard/teacher/page.tsx`

Remove the notification Button from the hero section (lines ~203–208):
```tsx
{/* REMOVE THIS BUTTON */}
<Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
  <Bell className="w-4 h-4 mr-2" />
  {t('notifications')}
  <Badge className="ml-2 bg-red-500 text-white text-xs">3</Badge>
</Button>
```

Also remove unused `Bell` import if it becomes unused after the removal.

---

## Verification

1. Open `/en/dashboard/teacher` as a logged-in teacher
2. Click the bell icon in the header → dropdown should open
3. Unread count badge should show real data (or nothing if 0 unread)
4. Clicking outside dropdown → closes it
5. Hero section should no longer show a duplicate notification button
