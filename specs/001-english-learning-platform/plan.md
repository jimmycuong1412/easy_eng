# Implementation Plan: Notification System — Admin, Students & Teachers

**Branch**: `001-english-learning-platform` | **Date**: 2026-03-30 | **Spec**: specs/001-english-learning-platform/spec.md
**Input**: Wire up the existing notification infrastructure so all three roles receive real-time in-app notifications for key platform events.

## Summary

The notification system is **partially built** — the DB table, Realtime hook, UI components, and Edge Functions all exist in the codebase but nothing is connected:
- `NotificationBell` is not rendered in any nav/layout
- `useRealtimeNotifications` expects 9 extra DB columns missing from the live `notifications` table
- No DB triggers fire `INSERT INTO notifications` on any platform event  
- Edge functions (`create-notification`, `send-booking-confirmation`, `send-class-reminder`) are not deployed

This plan wires all four layers together: DB schema → DB triggers → realtime hook → UI bell.

## Technical Context

**Language/Version**: TypeScript 5.4, Next.js 14.2 App Router, Deno (Edge Functions)
**Primary Dependencies**: `@supabase/supabase-js` v2, Zustand 4.5, Framer Motion 11, lucide-react, next-intl
**Storage**: Supabase PostgreSQL — `notifications` table (exists, needs 9 additional columns via migration)
**Testing**: Playwright e2e
**Target Platform**: Web — all three role dashboards
**Performance Goals**: Realtime delivery ≤500ms p95; unread count query <50ms
**Constraints**: No new npm packages; notification logic lives in DB triggers + edge functions
**Scale/Scope**: 2 DB migrations + 4 edge function deployments + nav integration + i18n keys

## Constitution Check

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality | Hook/components already written; only wiring needed | ✅ |
| III. UX Consistency | Role-specific types; unified bell UI across all roles | ✅ |
| V. Role-Based Access | RLS on notifications table (users see only their own) | ✅ |
| VI. Currency Integrity | gems_earned notification uses existing gem_transactions | ✅ |
| VII. UI Design Excellence | Bell dropdown matches dark theme; animated badge | ✅ |

## Project Structure

### Source Code (affected files)

```text
supabase/
├── migrations/
│   ├── 034_notifications_schema_fix.sql   ← NEW: add 9 missing columns
│   └── 035_notification_triggers.sql      ← NEW: DB triggers for events
└── functions/
    ├── create-notification/               ← EXISTING: deploy
    ├── send-booking-confirmation/         ← EXISTING: deploy
    ├── send-class-reminder/               ← EXISTING: deploy
    └── notify-gem-expiration/             ← EXISTING: deploy

frontend/src/
├── components/layout/
│   ├── NotificationBell.tsx              ← EXISTING: minor userId prop fix
│   └── RoleBasedNav.tsx                  ← MODIFY: add <NotificationBell />
├── hooks/
│   └── useRealtimeNotifications.ts       ← MODIFY: align type with actual DB schema
├── app/[locale]/notifications/page.tsx   ← EXISTING: add nav link from dashboards
└── messages/
    ├── en.json                            ← ADD: notifications.* i18n keys
    └── vi.json                            ← ADD: matching Vietnamese keys
```

## Phase 0: Research

### Decision 1 — Schema alignment

**Decision**: Migrate live DB to add 9 missing columns rather than downgrade the hook type.
**Rationale**: Hook, NotificationBell, NotificationList, and the notifications page all rely on the richer schema (`action_url`, `priority`, `metadata`, etc). Migrating the DB is 1 SQL file; simplifying the hook requires rewriting 4 files.
**Missing columns**: `action_url`, `action_label`, `related_id`, `related_type`, `metadata`, `icon`, `color`, `priority`, `expires_at`

### Decision 2 — Trigger strategy

**Decision**: PostgreSQL triggers for synchronous events; Edge Functions for scheduled/async.

| Event | Mechanism | Recipients |
|-------|-----------|-----------|
| `bookings` INSERT (confirmed) | DB trigger | Student (`booking_confirmed`) + Teacher (`new_booking`) |
| `bookings` UPDATE → cancelled | DB trigger | Other party (`booking_cancelled`) |
| `gem_transactions` INSERT (amount > 0) | DB trigger | Student (`gems_earned`) |
| Class starting in 15 min | Edge Function cron | Student + Teacher (`class_reminder`) |
| `profiles` INSERT (new user) | DB trigger | All admins (`system_announcement`) |
| `payout_requests` INSERT | DB trigger | All admins (`payment_received`) |

### Decision 3 — Bell placement

**Decision**: Add `<NotificationBell />` inside `RoleBasedNav.tsx` — shared nav across all role dashboards.
**Rationale**: Single integration point; all roles already use `RoleBasedNav`.

### Decision 4 — Admin fan-out

**Decision**: DB function `notify_all_admins()` loops over `profiles WHERE role = 'admin'`.
**Rationale**: Multiple admins may exist; all need platform-level alerts.

### Decision 5 — i18n

**Decision**: Store English title/message in DB; translate notification `type` in the UI using `t('notifications.types.{type}')`.
**Rationale**: Notification created at server time (no locale); translated at read time in browser.

## Phase 1: Design

### Migration 034 — Schema fix

```sql
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS action_url     TEXT,
  ADD COLUMN IF NOT EXISTS action_label   TEXT,
  ADD COLUMN IF NOT EXISTS related_id     UUID,
  ADD COLUMN IF NOT EXISTS related_type   TEXT,
  ADD COLUMN IF NOT EXISTS metadata       JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS icon           TEXT,
  ADD COLUMN IF NOT EXISTS color          TEXT,
  ADD COLUMN IF NOT EXISTS priority       TEXT DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  ADD COLUMN IF NOT EXISTS expires_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_related
  ON notifications(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_notifications_expires
  ON notifications(expires_at) WHERE expires_at IS NOT NULL;
```

### Migration 035 — Triggers

```sql
-- Helper: insert one notification
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT,
  p_action_url TEXT DEFAULT NULL, p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL, p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$ ... $$;

-- Helper: notify all admins
CREATE OR REPLACE FUNCTION notify_all_admins(
  p_type TEXT, p_title TEXT, p_message TEXT, ...
) RETURNS VOID AS $$ ... $$;

-- Triggers: booking_confirmed, booking_cancelled,
--           gems_earned, new_user, payout_request
```

### i18n contract (`en.json` additions)

```json
{
  "notifications": {
    "title": "Notifications",
    "empty": "No notifications yet",
    "markAllRead": "Mark all as read",
    "viewAll": "View all",
    "unreadCount": "{{count}} unread",
    "types": {
      "booking_confirmed": "Booking Confirmed",
      "booking_cancelled": "Booking Cancelled",
      "new_booking": "New Booking",
      "class_reminder": "Class Starting Soon",
      "gems_earned": "Gems Earned! 💎",
      "system_announcement": "New User Registered",
      "payment_received": "Payout Request Received"
    }
  }
}
```

### Quickstart test checklist

- [ ] NotificationBell renders in nav for all 3 roles
- [ ] Unread count badge shows; disappears when all read
- [ ] Student gets `booking_confirmed` after booking
- [ ] Teacher gets `new_booking` when student books
- [ ] Both get `booking_cancelled` on cancellation
- [ ] Student gets `gems_earned` after gem transaction
- [ ] Admin gets notification on new user registration
- [ ] Admin gets notification on payout request
- [ ] Realtime: notification appears in <2s without page refresh
- [ ] `/en/notifications` page shows full paginated history
