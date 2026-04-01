# Implementation Plan: Multi-Role Notification System

**Branch**: `001-english-learning-platform` | **Date**: 2026-03-31 | **Spec**: `specs/001-english-learning-platform/spec.md`
**Input**: Full notification system spec — bell icon, realtime, email fallback, booking/payment/cancellation/favorites triggers, batching, preferences, admin broadcast, toast

## Summary

EasyEng already has a solid notification foundation (migrations 033–035, `useRealtimeNotifications`, `NotificationBell`, `NotificationCenter`, notifications page). This plan closes the 6 gaps: favorites tracking with bidirectional notifications, anti-fatigue batching, server-side preference persistence, admin broadcast UI, and high-frequency cancellation alerts.

## Technical Context

**Language/Version**: TypeScript 5.4 (Next.js 14.2), PostgreSQL 15 (Supabase), Deno (Edge Functions)
**Primary Dependencies**: Supabase JS v2, Supabase Realtime (`postgres_changes`), Tailwind CSS, Radix UI, Framer Motion, Zustand
**Storage**: Supabase PostgreSQL — new `teacher_favorites` and `notification_preferences` tables; ALTER on `notifications` CHECK constraint
**Testing**: Jest (unit), Playwright (e2e)
**Target Platform**: Web (Next.js 14 App Router), Supabase Edge Runtime
**Project Type**: Web application (frontend + Supabase backend)
**Performance Goals**: Notification delivery < 500ms p95 via Realtime; broadcast to 10k users < 10s
**Constraints**: Batching window 15 min for `slot_opened`; preferences check before every DB insert; no N+1 on broadcast (batch INSERT)
**Scale/Scope**: 3 roles, ~8 notification types active, ~10k users target

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Helpers < 50 lines; single responsibility; typed |
| II. Testing Discipline | PASS | Unit tests for `notify_user_batched()`; integration for trigger→notification flow |
| III. UX Consistency | PASS | Bell + realtime already consistent across roles; preferences page updated |
| IV. Performance | PASS | Realtime < 200ms; batch INSERT for broadcast |
| V. Role-Based Access | PASS | RLS on all new tables; broadcast admin-only via service role |
| VI. Currency Integrity | N/A | No currency changes |
| VII. UI Design Excellence | PASS | Admin broadcast form follows existing admin page patterns |

No violations. Proceed.

## Project Structure

### Documentation (this feature)

```text
specs/001-english-learning-platform/
├── plan.md              # This file
├── research.md          # Gap analysis + decisions
├── data-model.md        # New tables, functions, triggers
├── quickstart.md        # Dev setup + verify checklist
├── contracts/
│   └── notification-system.md   # REST + Edge Function contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (affected files)

```text
supabase/
└── migrations/
    └── 036_notification_gaps.sql    # NEW — schema fix + favorites + preferences + batching + triggers
supabase/
└── functions/
    └── create-notification/
        └── index.ts                 # MODIFIED — add broadcast mode

frontend/src/
├── app/[locale]/
│   ├── admin/notifications/
│   │   └── page.tsx                 # NEW — admin system broadcast UI
│   └── notifications/
│       └── page.tsx                 # MODIFIED — preferences upsert to DB instead of localStorage
└── components/
    └── teacher/
        └── TeacherCard.tsx          # MODIFIED — add Favorite toggle button (or equivalent browse page)
```

**Structure Decision**: Web application (existing Option 2 structure). All changes are additions to the existing frontend + Supabase layout. No new services or packages required.

---

## Phase 0: Research (Complete)

See `research.md` for full findings.

**Key findings**:
- Notifications table, triggers (booking/cancellation/gems/user/payout), realtime hook, bell, list, page: all complete
- Missing: `teacher_favorites` table, `slot_opened`/`teacher_favorited`/`new_booking` types, batching helper, `notification_preferences` table, admin broadcast page, cancellation frequency alerts
- `new_booking` type used in existing trigger but missing from CHECK constraint (schema bug)

---

## Phase 1: Design (Complete)

### New Entities

1. **`teacher_favorites`** — student-to-teacher favorites with RLS (student owns, teacher reads)
2. **`notification_preferences`** — per-user JSONB settings with upsert pattern
3. **`notify_user_batched()`** — PostgreSQL function for deduplication within configurable time window
4. **Extended `notifications` CHECK constraint** — adds `new_booking`, `slot_opened`, `teacher_favorited`, `booking_payment`, `cancellation_alert`

### New Triggers

| Trigger | Table | Event | Notification |
|---------|-------|-------|--------------|
| `trg_teacher_favorited` | `teacher_favorites` | INSERT | `teacher_favorited` → teacher |
| `trg_slot_opened` | `teacher_availability` | INSERT | `slot_opened` → each student fan (batched per teacher, 15-min window) |
| `trg_cancellation_alert` | `bookings` | UPDATE (status→cancelled) | `cancellation_alert` → all admins (fires at 3, 6, 9... per teacher per 24h) |

### Admin Broadcast Flow

```
Admin fills form at /en/admin/notifications
  → Next.js Server Action (uses SUPABASE_SERVICE_KEY)
    → POST supabase/functions/create-notification { broadcast: { target: "all" } }
      → Edge Function queries profiles by role
        → batch INSERT notifications
          → Supabase Realtime pushes to all connected clients
```

### Preferences Migration Path

Current: `notifications/page.tsx` stores toggle state in component state only (lost on refresh)
New: On toggle change → `UPSERT notification_preferences` → all devices see same preferences

---

## Complexity Tracking

No constitution violations. Standard additions within existing architecture.
