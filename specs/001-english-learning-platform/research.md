# Research: Multi-Role Notification System

**Feature**: Robust multi-role notification system (bell, realtime, email, favorites, batching, preferences, admin broadcast, toast)
**Branch**: `001-english-learning-platform`

---

## Summary of Existing Infrastructure

### What Already Exists (DO NOT RE-IMPLEMENT)

| Component | Location | Status |
|-----------|----------|--------|
| `notifications` table (full schema) | `supabase/migrations/033_notifications.sql` | Complete |
| Schema fix migration | `supabase/migrations/034_notifications_schema_fix.sql` | Applied |
| DB triggers: booking created/cancelled, gems earned, new user, payout | `supabase/migrations/035_notification_triggers.sql` | Complete |
| `useRealtimeNotifications` hook | `frontend/src/hooks/useRealtimeNotifications.ts` | Complete |
| `NotificationBell` component | `frontend/src/components/layout/NotificationBell.tsx` | In RoleBasedNav |
| `NotificationList` component | `frontend/src/components/common/NotificationList.tsx` | Complete |
| `NotificationCenter` (Zustand toast system) | `frontend/src/components/common/NotificationCenter.tsx` | Complete |
| Notifications page | `frontend/src/app/[locale]/notifications/page.tsx` | Complete |
| `send-email` Edge Function | `supabase/functions/send-email/` | Complete |
| `create-notification` Edge Function | `supabase/functions/create-notification/` | Complete |
| `send-booking-confirmation` Edge Function | `supabase/functions/send-booking-confirmation/` | Complete |
| `send-class-reminder` Edge Function | `supabase/functions/send-class-reminder/` | Complete |
| Local notification preference toggles (UI only) | `frontend/src/app/[locale]/notifications/page.tsx` | localStorage only |

### What Is Missing (MUST BUILD)

| Gap | Description | Priority |
|-----|-------------|----------|
| `teacher_favorites` table | No DB table or triggers for student-to-teacher favorites | P1 |
| `slot_opened` notification type | Alert subscribed students when favorite teacher opens new slots | P1 |
| `teacher_favorited` notification type | Alert teacher when a student favorites them | P1 |
| `new_booking` type in CHECK constraint | Used in trigger but missing from schema CHECK — schema bug | P1 (bug) |
| Batching / anti-fatigue logic | Multiple `slot_opened` events in short window group into one notification | P1 |
| `notification_preferences` DB table | Currently only localStorage toggles; preferences not persisted server-side | P2 |
| Admin "System Broadcast" UI | Admin composes and sends `system_announcement` to all users or segments | P2 |
| High-frequency cancellation alerts | Admin notified when cancellations exceed threshold | P3 |

---

## Decision Log

### Decision 1: Realtime Transport — Supabase Realtime (Keep)
- **Decision**: Keep Supabase Realtime (`postgres_changes` on `notifications` table)
- **Rationale**: Zero additional infrastructure; already deployed; sub-200ms latency for inserts; already in `useRealtimeNotifications`
- **Alternatives considered**: Socket.io server, Pusher Channels
- **Why rejected**: Would require separate WS server or paid Pusher plan; Supabase Realtime already solves the problem

### Decision 2: Batching — DB-Level Deduplication Window
- **Decision**: PostgreSQL upsert with `last_batched_at` + `count` stored in `metadata`, using a 15-minute window keyed on `(user_id, type, related_id)` via a new `notify_user_batched()` helper
- **Rationale**: Pure server-side; no separate job queue; Supabase Realtime fires UPDATE events (handled by existing hook) when a batch record is updated
- **Alternatives considered**: Client-side coalescing, cron-job batching, Redis deduplication
- **Why rejected**: Client-side loses state on page reload; cron too slow; no Redis on Supabase

### Decision 3: Notification Preferences — New DB Table
- **Decision**: New `notification_preferences` table with one row per user and a JSONB `settings` column
- **Rationale**: Preferences must survive across devices and sessions; localStorage breaks multi-device usage
- **Alternatives considered**: `profiles.notification_settings JSONB` column
- **Why rejected**: Wider `profiles` row; separate table is cleaner and independently RLS-gated

### Decision 4: Admin Broadcast UI — New Admin Page
- **Decision**: New page at `frontend/src/app/[locale]/admin/notifications/page.tsx` with a form calling the existing `create-notification` Edge Function with `target: "all" | "students" | "teachers"`
- **Rationale**: Re-uses existing Edge Function; admin-only route; follows existing admin page patterns
- **Alternatives considered**: Supabase Dashboard SQL editor, new dedicated Edge Function
- **Why rejected**: SQL editor not user-friendly; new Edge Function unnecessary

### Decision 5: Favorites — New `teacher_favorites` Table
- **Decision**: New `teacher_favorites (id, student_id, teacher_id, created_at)` table with RLS
- **Rationale**: No existing favorites infrastructure; clean separation from bookings; efficient reverse-direction queries (who favorited this teacher?)
- **Alternatives considered**: `profiles.favorite_teachers UUID[]` array column
- **Why rejected**: Array column makes reverse queries expensive

### Decision 6: `slot_opened` Trigger — On Teacher Availability Insert
- **Decision**: DB trigger on `teacher_availability INSERT` that calls `notify_user_batched()` for all students with that teacher in their favorites
- **Rationale**: Fully server-side; fires immediately when teacher saves slots
- **Alternatives considered**: Edge Function polling, application-layer dispatch
- **Why rejected**: Polling introduces latency; application layer misses direct DB inserts

---

## Architecture Overview (New Work Only)

```
[Student] favorites teacher → teacher_favorites INSERT
                              └→ trg_teacher_favorited() → notify teacher (teacher_favorited)

[Teacher] saves availability → teacher_availability INSERT
                               └→ trg_slot_opened() → query teacher_favorites
                                    └→ notify_user_batched() for each subscribed student (slot_opened)

[Admin Dashboard /admin/notifications]
  → compose broadcast form → POST create-notification Edge Function (service role)
                             └→ INSERT notifications for all / segment

[Settings page /notifications]
  → toggle switch → UPSERT notification_preferences (server-side)
                    notify_user_batched() checks preferences before inserting
```

---

## Existing Notification Types in Schema CHECK Constraint

From `033_notifications.sql`:
```
'booking_confirmed', 'booking_cancelled', 'class_reminder', 'gems_earned',
'xp_earned', 'achievement_unlocked', 'level_up', 'class_started', 'class_ended',
'payment_received', 'system_announcement', 'friend_request', 'message_received'
```

Missing types that need to be added in new migration:
- `new_booking` (used in trigger T006 but not in CHECK)
- `slot_opened` (new — favorite teacher opened availability)
- `teacher_favorited` (new — student added teacher to favorites)
- `booking_payment` (new — payment receipt for student)
- `cancellation_alert` (new — admin high-frequency cancellation alert)
