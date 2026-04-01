# Quickstart: Multi-Role Notification System (Gaps Only)

## What Already Works

The core notification infrastructure is fully deployed:
- Bell icon in nav with real-time unread count
- Supabase Realtime subscription (INSERT/UPDATE/DELETE on `notifications`)
- Notifications page at `/en/notifications` with preference toggles
- DB triggers for: booking created, booking cancelled, gems earned, new user, payout request

## What This Feature Adds

| New Capability | How |
|----------------|-----|
| Student favorites a teacher | `teacher_favorites` table + trigger → notifies teacher |
| Teacher opens slots → fans notified | Trigger on `teacher_availability` INSERT → notifies each student fan |
| Anti-fatigue batching | `notify_user_batched()` groups same-type notifications in a 15-min window |
| Preferences persist server-side | `notification_preferences` table; settings page upserts instead of localStorage |
| Admin broadcasts | New admin page `/admin/notifications` → calls `create-notification` Edge Function |
| Cancellation alerts | DB trigger fires admin alert when a teacher hits 3+ cancellations/24h |

## Files Changed / Created

| File | Change |
|------|--------|
| `supabase/migrations/036_notification_gaps.sql` | New migration: fix CHECK constraint, add tables, add functions, add triggers |
| `supabase/functions/create-notification/index.ts` | Extend to support broadcast `target: 'all' | 'students' | 'teachers'` |
| `frontend/src/app/[locale]/admin/notifications/page.tsx` | New admin broadcast UI page |
| `frontend/src/app/[locale]/notifications/page.tsx` | Update toggles to upsert `notification_preferences` instead of localStorage |
| `frontend/src/components/teacher/TeacherCard.tsx` (or similar) | Add "Favorite" button that inserts/deletes `teacher_favorites` row |

## Dev Setup

```bash
cd frontend
npm run dev   # :3001
# /en/teacher/schedule — jimmycuong1414@gmail.com / 12345678
# /en/admin/notifications — admin account
```

## Verify

1. Student favorites a teacher → teacher receives `teacher_favorited` notification in bell
2. Teacher opens availability → each student fan receives `slot_opened` notification
3. Multiple slot inserts in 15 min → fan receives ONE batched notification, not many
4. Toggle a preference off on settings page → refresh page → toggle still off (persisted)
5. Admin broadcasts message → all users see `system_announcement` in bell
6. Teacher cancels 3+ bookings in 24h → admin receives `cancellation_alert`
7. `npm run type-check` exits 0
