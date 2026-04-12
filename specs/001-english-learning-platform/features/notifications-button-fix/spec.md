# Feature Spec: Fix Notifications Button in Teacher Dashboard

**Branch**: `001-english-learning-platform` | **Date**: 2026-04-12

## Problem Statement

The Notifications button in the teacher dashboard (`/en/dashboard/teacher`) is **unable to click** — it renders as a static, non-interactive element with hardcoded badge data. Users cannot open a notification dropdown, view real notifications, or mark them as read.

## Root Causes

1. **DashboardLayout header** (`frontend/src/app/[locale]/dashboard/layout.tsx`, lines 377–380) uses a plain `<Button>` with no `onClick` handler and no dropdown — it's purely decorative.
2. **Teacher dashboard page** (`frontend/src/app/[locale]/dashboard/teacher/page.tsx`, lines 203–208) renders a second decorative notification button in the hero section with hardcoded badge count of `3`.
3. Neither button is wired to the existing `NotificationBell` component (`frontend/src/components/layout/NotificationBell.tsx`) or the `useRealtimeNotifications` hook.

## Goals

1. Replace the non-functional `🔔` emoji button in `DashboardLayout` header with the existing `NotificationBell` component (consistent with `RoleBasedNav` usage).
2. Remove the duplicate hardcoded notification button from the teacher dashboard hero section, or wire it to open the same notification panel.
3. Ensure the button is interactive, shows real unread count, and opens the notification dropdown.

## Non-Goals

- Redesigning the `NotificationBell` component itself
- Adding new notification types
- Changes to the notification backend/edge functions

## Requirements

### Functional
- FR1: Clicking the bell icon in the dashboard header opens the notification dropdown
- FR2: Unread count badge reflects real-time data from `useRealtimeNotifications`
- FR3: Dropdown allows marking individual/all notifications as read
- FR4: The duplicate button in the teacher hero section is removed or replaced

### Non-Functional
- NFR1: Bell button must be accessible (aria-label, keyboard focus)
- NFR2: Dropdown must render above all other dashboard elements (z-50 or higher)
- NFR3: No regressions on other dashboard roles (student, admin)

## Acceptance Criteria

- AC1: Teacher clicks bell icon in dashboard header → notification dropdown opens
- AC2: Unread badge count matches actual unread notifications in DB
- AC3: No broken button in teacher hero section
- AC4: Student and Admin dashboard header notification button also functional (same fix)
