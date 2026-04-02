# Tasks: Multi-Role Notification System

**Feature**: Robust multi-role notification system — favorites, batching, server-side preferences, admin broadcast, cancellation alerts
**Branch**: `001-english-learning-platform`
**Plan**: `specs/001-english-learning-platform/plan.md`
**Research**: `specs/001-english-learning-platform/research.md`
**Total tasks**: 27

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US1]**: Booking/payment/cancellation notifications (fix `new_booking` schema bug + payment receipt)
- **[US2]**: Favorites + slot-opened notifications (`teacher_favorites` table, triggers, batching)
- **[US3]**: Server-side notification preferences (`notification_preferences` table, settings page update)
- **[US4]**: Admin system broadcast UI + high-frequency cancellation alerts

---

## Phase 1: Setup (Pre-check)

**Purpose**: Confirm current state of existing infrastructure before any edits.

- [x] T001 Read `supabase/migrations/033_notifications.sql` and confirm the `type` CHECK constraint lists exactly these types: `booking_confirmed`, `booking_cancelled`, `class_reminder`, `gems_earned`, `xp_earned`, `achievement_unlocked`, `level_up`, `class_started`, `class_ended`, `payment_received`, `system_announcement`, `friend_request`, `message_received` — and confirm `new_booking` is absent
- [x] T002 [P] Read `supabase/migrations/035_notification_triggers.sql` and confirm `trg_booking_notifications` uses type `'new_booking'` (the bug) and that no `slot_opened`, `teacher_favorited`, or `cancellation_alert` triggers exist
- [x] T003 [P] Read `supabase/functions/create-notification/index.ts` and confirm it only supports single-user mode (no `broadcast` field handling)
- [x] T004 [P] Read `frontend/src/app/[locale]/notifications/page.tsx` and confirm preference toggles use component state only (no Supabase upsert calls)

**Checkpoint**: All four files confirmed — proceed to Phase 2.

---

## Phase 2: Foundational (Migration — blocks all user stories)

**Purpose**: A single migration file must exist before any trigger or table work can reference the new types.

**⚠️ CRITICAL**: No user story work can begin until T005 is applied.

- [x] T005 Create `supabase/migrations/036_notification_gaps.sql` with: (a) DROP + re-add `notifications_type_check` constraint adding types `new_booking`, `slot_opened`, `teacher_favorited`, `booking_payment`, `cancellation_alert`; (b) CREATE TABLE `teacher_favorites (id UUID PK, student_id UUID FK auth.users, teacher_id UUID FK auth.users, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(student_id, teacher_id))`; (c) CREATE TABLE `notification_preferences (id UUID PK, user_id UUID FK auth.users UNIQUE, settings JSONB NOT NULL DEFAULT <full default object>, updated_at TIMESTAMPTZ DEFAULT NOW())`; (d) RLS policies for both tables (student manages own favorites, teacher reads own fans, user manages own preferences, service role full access); (e) indexes: `idx_teacher_favorites_student`, `idx_teacher_favorites_teacher`, `idx_notification_preferences_user`

**Checkpoint**: Migration file exists with no SQL syntax errors (`psql --file` dry-run or local `supabase db reset`).

---

## Phase 3: User Story 1 — Booking / Payment / Cancellation (Priority: P1) 🎯

**Goal**: Fix the `new_booking` schema bug so the existing booking-created trigger no longer violates the CHECK constraint; add a `booking_payment` notification so students receive a payment receipt after purchase.

**Independent Test**: Make a test booking → teacher receives `new_booking` notification in bell without any DB error. Complete a payment → student receives `booking_payment` notification.

### Implementation for User Story 1

- [x] T006 [US1] In `supabase/migrations/036_notification_gaps.sql` (already created in T005) confirm the CHECK constraint alteration includes `new_booking` — no code change needed beyond T005 if T005 was written correctly. Verify by running `SELECT 1` against local Supabase or reviewing the SQL.
- [x] T007 [US1] Add `trg_payment_receipt` function to `supabase/migrations/036_notification_gaps.sql`: after a row is inserted into `payments` (or equivalent payment table — check `039_payments.sql` for table name) with `status = 'completed'`, call `notify_user(student_id, 'booking_payment', 'Payment Received', 'Your payment of ' || amount || ' was successful.', '/bookings', payment_id, 'payment', 'high')`. Wire trigger: `CREATE TRIGGER after_payment_insert AFTER INSERT ON payments FOR EACH ROW WHEN (NEW.status = 'completed') EXECUTE FUNCTION trg_payment_receipt()`
- [x] T008 [US1] Add `trg_cancellation_alert` function to `supabase/migrations/036_notification_gaps.sql`: after `bookings` UPDATE where `NEW.status = 'cancelled'`, count teacher's cancellations in last 24h; if count >= 3 AND count % 3 = 0, call `notify_all_admins('cancellation_alert', 'High Cancellation Rate', teacher_name || ' has ' || count || ' cancellations in 24h.', '/admin/bookings', teacher_id, 'profile', 'high')`. Wire trigger: `CREATE TRIGGER after_booking_cancelled_alert AFTER UPDATE OF status ON bookings FOR EACH ROW WHEN (NEW.status = 'cancelled' AND OLD.status <> 'cancelled') EXECUTE FUNCTION trg_cancellation_alert()`

**Checkpoint**: Local DB accepts the migration without errors. Booking insert no longer causes `invalid type` constraint violation.

---

## Phase 4: User Story 2 — Favorites + Slot-Opened Notifications (Priority: P1)

**Goal**: Student can favorite/unfavorite a teacher; teacher is notified when favorited; when a favorited teacher opens new availability slots all subscribed students receive a batched `slot_opened` notification.

**Independent Test**: Student A favorites Teacher B → Teacher B sees `teacher_favorited` notification in bell. Teacher B saves availability slots → Student A sees `slot_opened` in bell. Teacher B saves 5 more slots within 15 min → Student A's notification updates to show "(+5 more)" rather than 5 separate notifications.

### Implementation for User Story 2

- [x] T009 [US2] Add `notify_user_batched()` PostgreSQL function to `supabase/migrations/036_notification_gaps.sql` — full implementation per `specs/001-english-learning-platform/data-model.md` (checks `notification_preferences`, finds existing unread notification in window, UPDATEs batch_count or INSERTs fresh). Signature: `notify_user_batched(p_user_id, p_type, p_title, p_message, p_action_url, p_related_id, p_related_type, p_priority, p_batch_key, p_window_mins INT DEFAULT 15)`
- [x] T010 [US2] Add `trg_teacher_favorited()` function to `supabase/migrations/036_notification_gaps.sql`: on `teacher_favorites` INSERT, fetch student `full_name` from `profiles`, call `notify_user_batched(NEW.teacher_id, 'teacher_favorited', 'New Fan!', student_name || ' added you to their favorites.', '/teacher/profile', NEW.student_id, 'profile', 'normal', NEW.student_id::text, 60)`. Wire: `CREATE TRIGGER after_favorite_insert AFTER INSERT ON teacher_favorites FOR EACH ROW EXECUTE FUNCTION trg_teacher_favorited()`
- [x] T011 [US2] Add `trg_slot_opened()` function to `supabase/migrations/036_notification_gaps.sql`: on `teacher_availability` INSERT, fetch teacher `full_name`, loop over `teacher_favorites WHERE teacher_id = NEW.teacher_id`, for each fan call `notify_user_batched(fan.student_id, 'slot_opened', 'New Slot Available', teacher_name || ' just opened new availability slots.', '/teachers/' || NEW.teacher_id, NEW.teacher_id, 'teacher', 'normal', NEW.teacher_id::text, 15)`. Wire: `CREATE TRIGGER after_availability_insert AFTER INSERT ON teacher_availability FOR EACH ROW EXECUTE FUNCTION trg_slot_opened()`
- [x] T012 [P] [US2] Add "Favorite" toggle button to the teacher browse/profile UI. Find the teacher listing component (search `frontend/src/components` for teacher card/profile components). Add a heart/star icon button that: (a) queries `teacher_favorites` for `{student_id: user.id, teacher_id: teacher.id}` on mount to set initial state; (b) on click, inserts or deletes a `teacher_favorites` row via Supabase client. Only render for `role === 'student'`.
- [x] T013 [US2] Add `slot_opened` and `teacher_favorited` to the `notificationIconMap` in `frontend/src/app/[locale]/notifications/page.tsx` — `slot_opened`: `{ icon: Calendar, color: 'text-blue-400', bgColor: 'bg-blue-500/10' }`; `teacher_favorited`: `{ icon: Star, color: 'text-pink-400', bgColor: 'bg-pink-500/10' }`. Also add them to `NotificationList` icon map if separate (`frontend/src/components/common/NotificationList.tsx`).

**Checkpoint**: Student can favorite/unfavorite via UI; trigger fires correctly; multiple slot openings produce one batched notification per teacher per 15-min window.

---

## Phase 5: User Story 3 — Server-Side Notification Preferences (Priority: P2)

**Goal**: User toggles on the settings/notifications page persist to Supabase (`notification_preferences` table) and survive page refresh and device switching.

**Independent Test**: Open `/en/notifications`, toggle `slot_opened` off → refresh page → toggle is still off. Open same page in incognito → toggle is still off.

### Implementation for User Story 3

- [x] T014 [US3] Add `useNotificationPreferences` hook at `frontend/src/hooks/useNotificationPreferences.ts`: (a) on mount, fetch `notification_preferences` row for `user.id`; (b) merge with `DEFAULT_PREFERENCES` (from `specs/001-english-learning-platform/contracts/notification-system.md`); (c) expose `preferences`, `loading`, `updatePreference(type, channel, value)` — upserts to `notification_preferences` table on change.
- [x] T015 [US3] Update `frontend/src/app/[locale]/notifications/page.tsx` to replace local `useState` toggle logic with `useNotificationPreferences` hook. Map the existing `NOTIFICATION_SETTING_KEYS` array to the new preference keys. Each `Switch` `onCheckedChange` calls `updatePreference(type, 'in_app', value)`. Add a second email channel toggle where relevant. Remove all `localStorage` calls if any exist.
- [x] T016 [P] [US3] Add `slot_opened` and `teacher_favorited` entries to the `NOTIFICATION_SETTING_KEYS` array and their display labels in `frontend/src/app/[locale]/notifications/page.tsx` so the new notification types appear in the preferences UI.

**Checkpoint**: Preferences persist across refreshes; new types appear in the settings list.

---

## Phase 6: User Story 4 — Admin System Broadcast + Cancellation Alerts (Priority: P2)

**Goal**: Admin can compose a system announcement and send it to all users (or a filtered segment). Admin also receives `cancellation_alert` notifications (already wired in US1/T008).

**Independent Test**: Log in as admin → open `/en/admin/notifications` → fill in title and message → click Send to All → all users see `system_announcement` in their bell. Admin's own bell shows `cancellation_alert` when a teacher hits 3 cancellations in 24h.

### Implementation for User Story 4

- [x] T017 [US4] Extend `supabase/functions/create-notification/index.ts` to handle broadcast mode: if request body contains `broadcast.target`, query `profiles` table for users with `role` matching target (`'all'` → no filter, `'students'` → `role = 'student'`, `'teachers'` → `role = 'teacher'`), then batch-INSERT notifications for each matched user_id using a single `supabase.from('notifications').insert(rows)` call where `rows` is an array of notification objects.
- [x] T018 [US4] Create `frontend/src/app/[locale]/admin/notifications/page.tsx` — admin-only broadcast page with: (a) a form with fields `title: string`, `message: string`, `target: 'all' | 'students' | 'teachers'`, `priority: 'normal' | 'high' | 'urgent'`; (b) a submit handler that calls a Next.js Server Action which posts to the `create-notification` Edge Function with `SUPABASE_SERVICE_KEY`; (c) success/error toast feedback using the existing `NotificationCenter`; (d) a recent broadcast history table showing last 10 `system_announcement` notifications sent (query from admin's perspective using service role). Add admin-only route guard matching the existing admin page pattern.
- [x] T019 [P] [US4] Add "Notifications" link to the admin sidebar/nav in `frontend/src/components/layout/` (find the admin nav component) pointing to `/admin/notifications`, with a `Bell` icon from lucide-react.
- [x] T020 [P] [US4] Add `cancellation_alert` and `booking_payment` to `notificationIconMap` in `frontend/src/app/[locale]/notifications/page.tsx`: `cancellation_alert`: `{ icon: AlertCircle, color: 'text-orange-400', bgColor: 'bg-orange-500/10' }`; `booking_payment`: `{ icon: Gift, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' }`. Also update `frontend/src/components/common/NotificationList.tsx` if it has its own icon map.

**Checkpoint**: Admin broadcast page is accessible at `/en/admin/notifications`; sending a broadcast creates notifications for all users; cancellation alert type is recognized in the UI icon map.

---

## Phase 7: Polish & Validation

**Purpose**: Type-check, visual QA, and integration smoke test.

- [x] T021 [P] From `frontend/`, run `npm run type-check` — must exit 0 with no TypeScript errors
- [ ] T022 [P] Apply migration to local Supabase: from repo root run `supabase db reset` (or apply `036_notification_gaps.sql` via `supabase migration up`) and confirm no SQL errors
- [ ] T023 Visual check — log in as student, open a teacher profile, click Favorite → verify `teacher_favorited` notification appears in teacher's bell
- [ ] T024 Visual check — log in as teacher, create availability slots → verify `slot_opened` notification appears in favorited student's bell
- [ ] T025 Visual check — open `/en/notifications` settings, toggle a preference off → refresh → confirm persisted
- [ ] T026 Visual check — log in as admin, open `/en/admin/notifications`, send broadcast to "students" → log in as student and verify `system_announcement` in bell
- [ ] T027 [P] Deploy Edge Function update: from repo root run `supabase functions deploy create-notification`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (T001–T004): Immediate — read-only confirmation, all parallel
- **Phase 2** (T005): Depends on Phase 1 completion — BLOCKS all user stories
- **Phase 3** (T006–T008): Depends on T005 (migration file must exist)
- **Phase 4** (T009–T013): Depends on T005; T009 (batching helper) must precede T010 and T011
- **Phase 5** (T014–T016): Depends on T005 (table must exist); T014 must precede T015
- **Phase 6** (T017–T020): Depends on T008 (cancellation alert type added); T017 must precede T018
- **Phase 7** (T021–T027): Depends on all implementation phases complete

### Story Independence

- **US1** (T006–T008): Can proceed after T005; no dependency on US2/US3/US4
- **US2** (T009–T013): Can proceed after T005; T009 blocks T010 and T011; T012 and T013 are parallel to T009–T011
- **US3** (T014–T016): Can proceed after T005; independent of US2 and US4
- **US4** (T017–T020): Can proceed after T005 and T008; T017 blocks T018

### Execution Sequence

```
T001–T004 (parallel confirmation reads)
    ↓
T005 (migration — single foundational task)
    ↓ ──────────────────────────────────────
T006–T008 (US1)     T009→T010,T011 (US2)    T014→T015,T016 (US3)
                    T012, T013 (parallel)
    ↓ ──────────────────────────────────────
T017→T018 (US4)     T019, T020 (parallel)
    ↓
T021–T027 (Polish & Validation, mostly parallel)
```

---

## Implementation Strategy

### MVP (US1 + US2 — P1 stories)

1. T001–T004 — read-only confirmation
2. T005 — write migration
3. T006–T008 — fix `new_booking` bug, add payment receipt, cancellation alert trigger
4. T009–T013 — favorites table, batching helper, triggers, favorite button UI
5. T021–T022 — type-check + migration smoke test
6. **Stop and validate**: Booking creates notifications without DB errors; favorites flow end-to-end

### Full Delivery (all stories)

1. MVP above
2. T014–T016 — server-side preferences
3. T017–T020 — admin broadcast page + nav
4. T023–T027 — full visual QA + Edge Function deploy

### Notes

- All new SQL goes into the single `036_notification_gaps.sql` file — avoids multiple migration files for one feature
- T012 (favorite button UI) can be developed while SQL triggers are being written — different files
- The existing `notify_all_admins()` function from migration 035 is reused in T008 — no duplication
- No new i18n keys are strictly required; UI strings can use hardcoded English until a follow-up i18n pass
