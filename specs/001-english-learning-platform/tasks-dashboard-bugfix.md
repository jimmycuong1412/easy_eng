# Tasks: Teacher Dashboard Bug Fixes

**Feature**: Teacher Dashboard Bug Fixes (9 bugs found via Playwright testing)
**Branch**: `001-english-learning-platform`
**Plan**: `specs/001-english-learning-platform/plan.md`
**Research**: `specs/001-english-learning-platform/research-dashboard-bugs.md`
**Total tasks**: 18

## Format: `[ID] [P?] [BUG?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[BUG#]**: Which bug fix this task belongs to

---

## Phase 1: Zero-Risk One-Liners (no dependencies, run in parallel)

**Purpose**: Smallest-possible fixes with highest impact. All touch different files.

- [X] T001 [P] [BUG8] Fix GemImage asset path: change `src="/images/gem.png"` → `src="/gem.svg"` in `frontend/src/components/common/GemImage.tsx:14`
- [X] T002 [P] [BUG2] Fix Create Class button route: change `router.push('/teacher/schedule')` → `router.push('/teacher/classes/new')` in `frontend/src/app/[locale]/dashboard/teacher/page.tsx:209`
- [X] T003 [P] [BUG1] Fix Today's Schedule "View all" href: change `href="/dashboard/schedule"` → `href="/teacher/schedule"` in `frontend/src/app/[locale]/dashboard/teacher/page.tsx:297`
- [X] T004 [P] [BUG1] Fix Recent Reviews "View all": remove the `<Link href="/dashboard/reviews">` wrapper (no reviews page exists) and hide or replace with a disabled button in `frontend/src/app/[locale]/dashboard/teacher/page.tsx:431`
- [X] T005 [P] [BUG6] Fix profile role badge fallback: change `return t('roleStudent')` → `return ''` on the final line of `getRoleLabel()` in `frontend/src/app/[locale]/settings/profile/page.tsx:127`, and guard role badge render with `{profile && getRoleLabel(profile.role) && (...)}`

**Checkpoint**: Run `npm run lint` and `npm run type-check` from `frontend/`. Deploy and verify:
- gem.svg loads on dashboard (no 404 in console)
- "Create Class" navigates to `/teacher/classes/new`
- "View all" → Today's Schedule goes to `/teacher/schedule`
- Profile shows correct role badge for teacher account

---

## Phase 2: Missing Settings Pages (BUG3)

**Purpose**: Create stub pages for the two 404 settings routes. These are independent of each other.

- [X] T006 [P] [BUG3] Create `frontend/src/app/[locale]/settings/notifications/page.tsx` — stub page that imports the `NotificationSettings` component from the notifications page and renders it within the settings layout, so it reuses existing toggle UI instead of duplicating
- [X] T007 [P] [BUG3] Create `frontend/src/app/[locale]/settings/billing/page.tsx` — stub page with a "Billing & Payments — Coming Soon" card matching the settings page dark theme; include placeholder text about supported payment methods (VNPay, MoMo, ZaloPay, Stripe)

**Checkpoint**: Navigate to `/en/settings/notifications` and `/en/settings/billing` — both should load without 404.

---

## Phase 3: Notification Toggle Switches Invisible (BUG7)

**Purpose**: Fix invisible Radix UI Switch components in the notification settings tab.

- [X] T008 [BUG7] Locate the notification settings component that renders the toggle switches (check `frontend/src/app/[locale]/notifications/page.tsx` or `frontend/src/components/notifications/`) and identify the `Switch` component usage
- [X] T009 [BUG7] Add explicit Tailwind classes to the `Switch` track and thumb: `className="bg-slate-600 data-[state=checked]:bg-blue-500"` on the root Switch, ensuring the thumb uses `bg-white` — adjust to match existing design tokens used in the app (depends on T008)

**Checkpoint**: Navigate to `/en/notifications` → Settings tab. All 7 category toggles and 3 channel toggles must be visually visible with on/off states clearly distinguishable.

---

## Phase 4: Quiz Create Page i18n (BUG4)

**Purpose**: Replace ~20 hardcoded Vietnamese strings in the quiz create page with i18n keys.

- [X] T010 [BUG4] Audit all hardcoded Vietnamese strings in `frontend/src/app/[locale]/teacher/quiz/create/page.tsx` — produce a list of every string needing a key (question type labels, difficulty labels, all form field labels, button text, dialog labels, placeholder text)
- [X] T011 [BUG4] Add `teacher.quiz.create` namespace keys to `frontend/messages/en.json` with English values for all strings identified in T010 (depends on T010)
- [X] T012 [BUG4] Add `teacher.quiz.create` namespace keys to `frontend/messages/vi.json` with Vietnamese values matching the existing hardcoded strings (depends on T010)
- [X] T013 [BUG4] Refactor `frontend/src/app/[locale]/teacher/quiz/create/page.tsx`: add `import { useTranslations } from 'next-intl'`, add `const t = useTranslations('teacher.quiz.create')`, replace all hardcoded strings with `t('key')` calls (depends on T011, T012)

**Checkpoint**: Navigate to `/en/teacher/quiz/create` — all text must display in English. Navigate to `/vi/teacher/quiz/create` — all text must display in Vietnamese. Run `npm run type-check`.

---

## Phase 5: Referral Page i18n (BUG5)

**Purpose**: Replace ~15 hardcoded Vietnamese strings in the referral settings page with i18n keys. Same pattern as Phase 4.

- [X] T014 [BUG5] Audit all hardcoded Vietnamese strings in `frontend/src/app/[locale]/settings/referral/page.tsx` — produce a list of every string needing a key (headings, stat labels, share copy, milestone labels, progress copy)
- [X] T015 [P] [BUG5] Add `settings.referral` namespace keys to `frontend/messages/en.json` with English values (depends on T014; can run in parallel with T016)
- [X] T016 [P] [BUG5] Add `settings.referral` namespace keys to `frontend/messages/vi.json` with Vietnamese values matching existing hardcoded strings (depends on T014; can run in parallel with T015)
- [X] T017 [BUG5] Refactor `frontend/src/app/[locale]/settings/referral/page.tsx`: add `useTranslations`, add `const t = useTranslations('settings.referral')`, replace all hardcoded strings with `t('key')` calls (depends on T015, T016)

**Checkpoint**: Navigate to `/en/settings/referral` — all text in English. Navigate to `/vi/settings/referral` — all text in Vietnamese.

---

## Phase 6: DB Migration Deployment (BUG9)

**Purpose**: Apply the existing earnings RPC migration to production Supabase so the Earnings page works.

- [X] T018 [BUG9] Apply migration `supabase/migrations/040_teacher_earnings.sql` to production Supabase project `evrcwtsexlamacawofxo` by running `npx supabase db push --project-ref evrcwtsexlamacawofxo` from repo root, then verify the `get_teacher_earnings_summary` function exists via Supabase dashboard SQL editor

**Checkpoint**: Navigate to `/en/teacher/earnings` as teacher — no console errors for `get_teacher_earnings_summary`, stats cards load without error.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (T001–T005): No dependencies — all 5 tasks run in parallel immediately
- **Phase 2** (T006–T007): No dependencies on Phase 1 — run in parallel with Phase 1
- **Phase 3** (T008–T009): T009 depends on T008; no dependency on other phases
- **Phase 4** (T010–T013): T011/T012 depend on T010 (audit first); T013 depends on T011+T012
- **Phase 5** (T014–T017): T015/T016 depend on T014; T017 depends on T015+T016
- **Phase 6** (T018): No code dependencies — can run any time with Supabase CLI access

### Parallel Opportunities

```
Immediately parallelizable (different files, zero risk):
  T001 (GemImage.tsx)
  T002 (dashboard/teacher/page.tsx:209)
  T003 (dashboard/teacher/page.tsx:297)  ← same file as T002, sequence these two
  T004 (dashboard/teacher/page.tsx:431)  ← same file, sequence with T002/T003
  T005 (settings/profile/page.tsx)
  T006 (settings/notifications/page.tsx - new file)
  T007 (settings/billing/page.tsx - new file)
  T018 (DB migration - no code)

Sequential within Phase 4:
  T010 → [T011 ∥ T012] → T013

Sequential within Phase 5:
  T014 → [T015 ∥ T016] → T017

Sequential within Phase 3:
  T008 → T009
```

**Note**: T002, T003, T004 all edit the same file (`dashboard/teacher/page.tsx`). Batch these into a single edit session to avoid merge conflicts.

---

## Implementation Strategy

### MVP First (highest user impact)

1. Complete Phase 1 (T001–T005) — fixes the most visible bugs in ~15 mins
2. Complete Phase 2 (T006–T007) — eliminates remaining 404 nav links
3. **STOP and DEPLOY** — all navigation bugs resolved, gem asset fixed, role badge fixed

### Full Fix Delivery

4. Phase 3 (T008–T009) — notification switches visible
5. Phase 4 (T010–T013) — quiz create page fully i18n'd
6. Phase 5 (T014–T017) — referral page fully i18n'd
7. Phase 6 (T018) — earnings RPC working in production

---

## Notes

- T002, T003, T004 touch the same file — batch them in one edit to avoid conflicts
- Phase 4 and Phase 5 may require running `npm run build` to catch missing i18n key type errors
- After T013/T017, run `npm run lint` — next-intl enforces key existence at build time
- Bug 7 (Switch visibility) may need visual verification via Playwright or manual browser check after T009
