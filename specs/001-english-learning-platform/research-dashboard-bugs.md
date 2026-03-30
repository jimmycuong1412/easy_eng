# Research: Teacher Dashboard Bug Fixes

**Date**: 2026-03-30
**Scope**: Bugs found during live Playwright testing of `/en/dashboard/teacher`

---

## Bug 1: "View all" links → 404

**Finding**: `dashboard/teacher/page.tsx` lines 297 and 431 use hrefs without locale prefix that point to non-existent pages:
- `<Link href="/dashboard/schedule">` → `/en/dashboard/schedule` (no route)
- `<Link href="/dashboard/reviews">` → `/en/dashboard/reviews` (no route)

**Decision**: Fix hrefs to existing teacher pages:
- Schedule "View all" → `/teacher/schedule` (exists)
- Reviews "View all" → remove link or link to `/teacher/schedule` (no reviews page exists)

---

## Bug 2: "Create Class" button wrong route + loading hang

**Finding**: `dashboard/teacher/page.tsx` line 209:
```tsx
onClick={() => router.push('/teacher/schedule')}
```
Navigates to `/teacher/schedule` and gets stuck on "Verifying access..." indefinitely.

**Correct route**: `/teacher/classes/new` exists at `app/[locale]/teacher/classes/new/page.tsx`.

**Decision**: Change `router.push('/teacher/schedule')` → `router.push('/teacher/classes/new')`.

---

## Bug 3: Missing settings pages (`/settings/notifications`, `/settings/billing`)

**Finding**: Settings layout nav links to these routes but no `page.tsx` exists:
- `frontend/src/app/[locale]/settings/notifications/` — missing
- `frontend/src/app/[locale]/settings/billing/` — missing

**Decision**: Create stub pages. Notifications stub redirects to `/notifications` (the working page). Billing stub shows "Coming soon" with a payment info card.

---

## Bug 4 & 5: Hardcoded Vietnamese strings (Quiz Create + Referral pages)

**Finding**: Neither page imports `useTranslations`. All labels are hardcoded Vietnamese.

**Decision**: Add `useTranslations` + i18n keys to both pages. Add EN/VI keys to `messages/en.json` and `messages/vi.json`.

---

## Bug 6: Profile page shows "Student" role badge for teacher

**Finding**: `settings/profile/page.tsx` line 127 — `getRoleLabel()` fallback returns `t('roleStudent')` when role is anything other than 'student'/'teacher'/'admin'. The `getUserProfile()` query selects all columns including `role`.

**Root cause**: The profile loads correctly but `profile?.role` is typed as `string | undefined` — if the profile fetch hasnves yet completed, it defaults to "Student".

**Decision**: Fix fallback to return empty string. Show skeleton until profile loads.

---

## Bug 7: Notification toggle switches invisible

**Finding**: Radix UI `Switch` components in the `/en/notifications` Settings tab render in the DOM but are invisible. Likely a Tailwind class conflict or missing thumb/track background color in dark context.

**Decision**: Inspect and fix the `Switch` component styling in the notifications settings tab.

---

## Bug 8: `/images/gem.png` → 404

**Finding**: `GemImage.tsx` line 14 references `/images/gem.png`. Directory `/public/images/` doesn't exist. The gem asset exists as `/public/gem.svg`.

**Decision**: Update `GemImage.tsx` to use `/gem.svg` (no new assets needed).

---

## Bug 9: `get_teacher_earnings_summary` RPC → 404

**Finding**: Function defined in migration `040_teacher_earnings.sql` but migration not applied to production DB.

**Decision**: Deployment task — run migration against production Supabase. No code change needed.
