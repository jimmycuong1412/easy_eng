# Tasks: Fix Notifications Button in Teacher Dashboard

**Input**: Design documents from `specs/001-english-learning-platform/features/notifications-button-fix/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested in spec — no TDD tasks generated.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing component and confirm no new infrastructure needed.

- [x] T001 Confirm `NotificationBell` component renders and exports correctly at `frontend/src/components/layout/NotificationBell.tsx`
- [x] T002 Confirm `useRealtimeNotifications` hook exists at `frontend/src/hooks/useRealtimeNotifications.ts`

**Checkpoint**: Both components confirmed — ready to wire into layout.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No new foundational infrastructure required — `NotificationBell` is a fully self-contained drop-in. Phases 3+ can begin immediately after Phase 1.

**⚠️ NOTE**: No blocking prerequisites. Proceed directly to user story phases.

---

## Phase 3: User Story 1 — Wire NotificationBell into DashboardLayout (Priority: P1) 🎯 MVP

**Goal**: Replace the non-functional emoji `🔔` button in the dashboard header with the real `NotificationBell` component, making it clickable and connected to real-time notification data for ALL roles (teacher, student, admin).

**Acceptance Criteria**: AC1, AC2, AC4 from spec.md

**Independent Test**: Log in as teacher → go to `/en/dashboard/teacher` → click the bell icon in the top-right header → notification dropdown opens; unread badge shows real count.

### Implementation for User Story 1

- [x] T003 [US1] Add `NotificationBell` import to `frontend/src/app/[locale]/dashboard/layout.tsx` (add `import NotificationBell from '@/components/layout/NotificationBell';` at the top with other imports)
- [x] T004 [US1] Replace the decorative Button block (lines ~377–380) in `frontend/src/app/[locale]/dashboard/layout.tsx` with `<NotificationBell />` inside the existing `{/* Notifications */}` comment block
- [x] T005 [US1] Remove the now-unused `Button` usage for notifications and confirm no TypeScript or lint errors in `frontend/src/app/[locale]/dashboard/layout.tsx`

**Checkpoint**: Dashboard header bell is now functional for teacher, student, and admin. Click opens dropdown with real notifications.

---

## Phase 4: User Story 2 — Remove Duplicate Button from Teacher Hero (Priority: P1)

**Goal**: Remove the hardcoded, non-functional notification button from the teacher dashboard hero section to eliminate confusion and UI duplication.

**Acceptance Criteria**: AC3 from spec.md

**Independent Test**: Go to `/en/dashboard/teacher` → the hero section no longer contains a `Notifications` button with a hardcoded badge of `3`.

### Implementation for User Story 2

- [x] T006 [P] [US2] Remove the duplicate `<Button>` notification block (lines ~203–208) from the hero section in `frontend/src/app/[locale]/dashboard/teacher/page.tsx`
- [x] T007 [US2] Remove `Bell` from the `lucide-react` import in `frontend/src/app/[locale]/dashboard/teacher/page.tsx` if it is no longer referenced elsewhere in the file
- [x] T008 [US2] Remove `Badge` from component imports in `frontend/src/app/[locale]/dashboard/teacher/page.tsx` if it is no longer referenced elsewhere in the file
- [x] T009 [US2] Confirm no TypeScript or lint errors remain in `frontend/src/app/[locale]/dashboard/teacher/page.tsx`

**Checkpoint**: Teacher hero section is clean — no duplicate notification button. Header bell remains the single entry point.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cleanup across both stories.

- [ ] T010 [P] Visually verify teacher dashboard at `/en/dashboard/teacher` — bell in header is clickable, no duplicate in hero
- [ ] T011 [P] Visually verify student dashboard at `/en/dashboard/student` — bell in header is clickable (same layout fix applies)
- [ ] T012 [P] Visually verify admin dashboard at `/en/dashboard/admin` — bell in header is clickable (same layout fix applies)
- [x] T013 Run `npm run type-check` in `frontend/` to confirm zero TypeScript errors introduced
- [x] T014 Run `npm run lint` in `frontend/` to confirm zero lint errors introduced

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Skipped — no blocking prerequisites
- **US1 (Phase 3)**: Depends on Phase 1 (T001, T002)
- **US2 (Phase 4)**: **Independent of US1** — can run in parallel with Phase 3
- **Polish (Phase 5)**: Depends on Phase 3 AND Phase 4 both complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 1 — no dependency on US2
- **US2 (P1)**: Can start after Phase 1 — **fully independent** of US1 (different file)

### Within Each User Story

- US1: T003 → T004 → T005 (sequential, same file)
- US2: T006 can run immediately; T007 and T008 are [P] after T006; T009 last

### Parallel Opportunities

- Phase 3 (US1) and Phase 4 (US2) can run in parallel — they touch different files
- T010, T011, T012 in Polish phase can run in parallel
- T013 and T014 can run in parallel

---

## Parallel Example: US1 + US2 simultaneously

```bash
# Developer A: US1 — DashboardLayout
Task T003: Add NotificationBell import to frontend/src/app/[locale]/dashboard/layout.tsx
Task T004: Replace emoji Button with <NotificationBell /> in layout.tsx
Task T005: Confirm no errors in layout.tsx

# Developer B (or same dev, different terminal): US2 — Teacher page
Task T006: Remove duplicate Button from frontend/src/app/[locale]/dashboard/teacher/page.tsx
Task T007: Clean up Bell import
Task T008: Clean up Badge import
Task T009: Confirm no errors in teacher/page.tsx
```

---

## Implementation Strategy

### MVP First (US1 Only — 3 tasks)

1. Complete Phase 1: T001, T002 (verify components exist)
2. Complete Phase 3: T003 → T004 → T005 (wire bell into layout)
3. **STOP and VALIDATE**: Visit `/en/dashboard/teacher`, click bell → dropdown opens
4. Deploy MVP — notifications are now functional

### Full Fix (US1 + US2 — 9 tasks total)

1. Complete Phase 1
2. Complete Phase 3 (US1) and Phase 4 (US2) — can be parallel
3. Complete Phase 5 (Polish + lint/type-check)
4. PR ready

---

## Notes

- [P] tasks = different files or no sequential dependency within the same phase
- US1 and US2 are fully independent (different source files)
- No database migrations, no new components, no new hooks needed
- The `NotificationBell` component is already production-ready and tested
- The fix affects all dashboard roles (teacher, student, admin) — this is intentional per AC4
