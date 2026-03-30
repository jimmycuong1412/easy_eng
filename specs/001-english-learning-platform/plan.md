# Implementation Plan: Teacher Dashboard Bug Fixes

**Branch**: `001-english-learning-platform` | **Date**: 2026-03-30 | **Spec**: `specs/001-english-learning-platform/spec.md`
**Research**: `specs/001-english-learning-platform/research-dashboard-bugs.md`

## Summary

Fix 9 bugs found during live Playwright testing of the teacher dashboard at `easyeng-dev.vercel.app`. Bugs span broken navigation links (404s), wrong button routing, missing settings pages, missing i18n on two pages, a role badge display bug, invisible notification toggles, a missing static asset, and an unapplied DB migration.

## Technical Context

**Language/Version**: TypeScript 5.4, Next.js 14.2
**Primary Dependencies**: next-intl (i18n), Radix UI (Switch component), Tailwind CSS, Supabase JS
**Storage**: PostgreSQL via Supabase (migration needed for Bug 9)
**Testing**: Playwright (e2e), Jest (unit)
**Target Platform**: Web (Vercel deployment)
**Project Type**: Web application
**Performance Goals**: No regression to existing page load times
**Constraints**: All fixes must pass lint + type-check
**Scale/Scope**: 8 code fixes + 1 deployment task

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | All fixes are targeted; no new abstractions needed |
| II. Testing Discipline | ✅ PASS | Existing e2e tests cover navigation; new stubs need basic smoke tests |
| III. UX Consistency | ⚠️ VIOLATIONS FIXED | Broken nav links, wrong routing, invisible toggles all violate this |
| IV. Performance | ✅ PASS | No performance impact expected |
| V. Role-Based Access | ⚠️ VIOLATION FIXED | Teacher showing "Student" badge violates role clarity |
| VI. Currency Integrity | ✅ N/A | No currency code changes |
| VII. UI Design Excellence | ⚠️ VIOLATION FIXED | Invisible switches, 404 asset, hardcoded strings violate this |

## Project Structure

### Source files affected

```text
frontend/src/
├── app/[locale]/
│   ├── dashboard/teacher/page.tsx          # Bug 1, 2: fix hrefs + Create Class route
│   ├── settings/
│   │   ├── notifications/page.tsx          # Bug 3: CREATE (stub/redirect)
│   │   ├── billing/page.tsx                # Bug 3: CREATE (stub)
│   │   └── profile/page.tsx               # Bug 6: fix role badge fallback
│   └── teacher/
│       └── quiz/create/page.tsx            # Bug 4: add useTranslations
├── components/common/
│   └── GemImage.tsx                        # Bug 8: fix asset path
└── messages/
    ├── en.json                             # Bug 4, 5: add i18n keys
    └── vi.json                             # Bug 4, 5: add i18n keys

# Bug 5: settings/referral/page.tsx - add useTranslations
# Bug 7: notifications page Switch styling fix
# Bug 9: DB migration deployment (no code change)
```

## Fixes — Detailed

### Fix 1 & 2: Teacher Dashboard broken links + Create Class routing
**File**: `frontend/src/app/[locale]/dashboard/teacher/page.tsx`

| Line | Current | Fix |
|------|---------|-----|
| 209 | `router.push('/teacher/schedule')` | `router.push('/teacher/classes/new')` |
| 297 | `<Link href="/dashboard/schedule">` | `<Link href="/teacher/schedule">` |
| 431 | `<Link href="/dashboard/reviews">` | Remove link (no reviews page exists) or hide button |

### Fix 3: Missing settings pages
**Create**: `frontend/src/app/[locale]/settings/notifications/page.tsx`
- Redirect to `/notifications` or render the same notification settings UI (reuse the Settings tab from the notifications page)

**Create**: `frontend/src/app/[locale]/settings/billing/page.tsx`
- Stub page: "Billing — Coming Soon" card with payment method placeholder

### Fix 4: Quiz Create page — add i18n
**File**: `frontend/src/app/[locale]/teacher/quiz/create/page.tsx`
- Add `import { useTranslations } from 'next-intl'`
- Replace all hardcoded Vietnamese strings with `t('key')` calls
- Add keys to `messages/en.json` under `teacher.quiz.create`
- Add Vietnamese translations to `messages/vi.json`

### Fix 5: Referral page — add i18n
**File**: `frontend/src/app/[locale]/settings/referral/page.tsx`
- Same approach as Fix 4
- Add keys under `settings.referral` in both message files

### Fix 6: Profile role badge fallback
**File**: `frontend/src/app/[locale]/settings/profile/page.tsx` line 127
```tsx
// Before:
return t('roleStudent');
// After:
return '';
```
Also: render role badge only when `profile` is loaded (guard with `profile &&`).

### Fix 7: Notification toggle switches invisible
**File**: Whichever component renders the Settings tab in `/en/notifications`
- Inspect `Switch` component — add explicit `bg-slate-600 data-[state=checked]:bg-blue-500` classes to the track, and `bg-white` to the thumb
- Alternatively verify the Radix UI Switch CSS variables are present in the dark theme context

### Fix 8: GemImage asset path
**File**: `frontend/src/components/common/GemImage.tsx` line 14
```tsx
// Before:
src="/images/gem.png"
// After:
src="/gem.svg"
```

### Fix 9: DB migration (deployment only)
- Run `supabase db push` or apply migration `040_teacher_earnings.sql` against production project `evrcwtsexlamacawofxo`
- No code change required

## Complexity Tracking

No constitution violations that need justification — all fixes reduce violations, none introduce new ones.

## Implementation Order

1. **Fix 8** (GemImage) — 1 line, zero risk, fixes 404 on every page
2. **Fix 1 & 2** (dashboard links + Create Class) — 3 line changes, high user impact
3. **Fix 6** (role badge) — 1 line + loading guard
4. **Fix 3** (missing settings pages) — create 2 new stub files
5. **Fix 7** (Switch visibility) — CSS fix, needs visual verification
6. **Fix 4** (quiz create i18n) — larger change, many strings
7. **Fix 5** (referral i18n) — same pattern as Fix 4
8. **Fix 9** (DB migration) — run in Supabase CLI, verify earnings page
