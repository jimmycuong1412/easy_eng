# Tasks: Materials Library (Vietnamese-targeted)

**Input**: Design documents from `specs/001-english-learning-platform/features/materials-library/`
**Branch**: `001-english-learning-platform` | **Date**: 2026-05-10
**Spec**: `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: TDD required per Constitution II — failing tests MUST exist before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## User Stories (from plan.md goals)

- **US1**: Student browses the Vietnamese materials catalog (SEO-friendly, anonymous)
- **US2**: Student opens and reads/listens to a material, earns gems + XP on completion
- **US3**: Student takes a mock test and sees server-graded results with explanations
- **US4**: Admin/Teacher creates and authors a new material through the editor
- **US5**: Admin publishes materials through the moderation pipeline
- **US6**: Dashboard surfaces the "next recommended material" widget for logged-in students
- **US7**: Admin manages curated learning path collections

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database foundation, storage bucket, i18n strings, and file scaffolding.

- [X] T001 Write pgTAP test file asserting all enums + tables + indexes from `data-model.md` in `supabase/tests/rls/materials.test.sql`
- [X] T002 Create migration `supabase/migrations/080_materials_library.sql` with all enums, tables, indexes, and triggers (material_type, material_level, material_status, material_goal; materials, material_sections, vocabulary_items, mock_test_items, material_assets, material_tags, material_tag_links, material_collections, material_collection_items, material_progress, material_reviews, material_translations, materials_audit)
- [X] T003 Create migration `supabase/migrations/081_materials_rls.sql` with all RLS policies and the `mock_test_items_public` view (no `correct_index`, no `explanation_*` for student/anon)
- [X] T004 Create migration `supabase/migrations/082_materials_storage.sql` with `material-assets` bucket (public read, authenticated write; audio ≤ 3 MB, image ≤ 200 KB policies)
- [X] T005 Create migration `supabase/migrations/083_materials_rpc.sql` with `award_material_completion`, `grade_mock_test`, `recommend_next_material`, and `compute_popularity_scores` SECURITY DEFINER functions; `award_material_completion` exception handler writes `materials_audit` row `{event:'materials.award_failed', user_id, material_id, error}` before re-raising
- [X] T006 Create migration `supabase/migrations/084_materials_seed_vi.sql` with 30 seed materials (5 per type, Vietnamese-first, CEFR A1–C1), 15+ tags, and 1 curated collection ("Thi tốt nghiệp THPT — Bộ luyện thi 30 ngày")
- [X] T007 [P] Add `materials.*` i18n keys to `frontend/messages/vi.json` (all card, catalog, detail, editor, test-player, reward strings)
- [X] T008 [P] Add `materials.*` i18n keys to `frontend/messages/en.json` (English mirror of T007)
- [X] T009 Create `frontend/src/lib/queries/materials.ts` with TypeScript types (`MaterialSummary`, `MaterialDetail`, `MaterialProgressLite`) and Supabase query helpers (catalog list, detail by slug, progress fetch — max 3 round-trips per page load, no N+1)
- [X] T010 [P] Scaffold directory structure: `frontend/src/app/[locale]/materials/`, `frontend/src/components/materials/`, `frontend/tests/unit/materials/`, `frontend/tests/e2e/`

**Checkpoint**: Migrations applied locally, pgTAP tests pass, TypeScript types compile, i18n keys render.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core shared components that all user-story phases depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T011 Write failing unit tests for `<MaterialCard>` per `contracts/component-material-card.md` in `frontend/tests/unit/materials/MaterialCard.test.tsx` (9 tests: vi title, en title, en summary fallback, null progress, completion check, anonymous lock, design tokens, type pill, badge)
- [X] T012 Implement `<MaterialCard>` in `frontend/src/components/materials/MaterialCard.tsx` with all required visual elements: type pill (`kindLabelVi` map), level badge, Newsreader title, 2-line summary, duration chip, reward chip (omitted for mock_test per clarification); conditional: cover image, progress strip, goal eyebrow, anonymous lock, badge prop; `<MaterialCard.Skeleton>` sub-component for Suspense fallbacks — **9/9 tests passing**
- [X] T013 [P] Implement `<MaterialFilters>` in `frontend/src/components/materials/MaterialFilters.tsx` (level A1–C1, type, goal chips; URL search-param driven so filters are bookmarkable/SEO-safe)
- [X] T014 [P] Implement `<ProgressRibbon>` in `frontend/src/components/materials/ProgressRibbon.tsx` (entrance animation; shows "+{n} ⟡ +{n} XP" on completion; "already-earned" variant for repeat visits)

**Checkpoint**: `<MaterialCard>` tests pass, Skeleton renders, filters update URL params correctly.

---

## Phase 3: User Story 1 — Browse the Catalog (Priority: P1) 🎯 MVP

**Goal**: Anonymous and authenticated students can browse, filter, and search published Vietnamese materials at `/{locale}/materials`.

**Independent Test**: Visit `http://localhost:3000/vi/materials`, see seeded 30 materials as `<MaterialCard>` grid, filter by `level=a2` returns only A2 cards, search "xin chào" returns matching vocabulary pack. No auth required.

### Tests for User Story 1 ⚠️ Write FIRST, ensure they FAIL

- [X] T015 [P] [US1] Write Playwright E2E test for catalog browse → filter → search journey in `frontend/tests/e2e/materials.spec.ts` — runs against a live dev server with seed migrations applied
- [X] T016 [P] [US1] Write unit test for `fetchMaterialsList` cursor pagination + locale resolvers in `frontend/tests/unit/materials/queries.test.ts` — **14/14 tests passing**

### Implementation for User Story 1

- [X] T017 [US1] Implement catalog server component `frontend/src/app/[locale]/materials/page.tsx` — server-renders published materials, SEO `<title>` + `og:` + `CollectionPage`/`Course` JSON-LD with `inLanguage: vi-VN`, URL-driven filters via `<MaterialFilters>`, `revalidate: 300` edge cache, anonymous-friendly
- [X] T018 [US1] `fetchMaterialsList` query helper in `frontend/src/lib/queries/materials.ts` — filtered by `status='published'`, indexed columns (`level`, `type`, `goal`), FTS, cursor pagination via `published_at` (capped at 60)

**Checkpoint**: `npm run dev` → `/vi/materials` shows 30 seeded cards, filter and search work, page is server-rendered (view-source shows content), Playwright test passes.

---

## Phase 4: User Story 2 — Read a Material & Earn Rewards (Priority: P1) 🎯 MVP

**Goal**: Authenticated student opens a material detail page, reads/listens, completes it, and receives the gem + XP award strip.

**Independent Test**: Navigate to a published `vocabulary_pack` slug. See Vietnamese vocabulary table with IPA + gloss. Mark ≥ 80% cards as known. Award strip animates "+2 ⟡ +30 XP". Verify `gems_transactions` has exactly one new row with `reason='material_completion'`. Re-completing the same material does NOT add another row. (Mock tests do not trigger this flow — they award no gems or XP.)

### Tests for User Story 2 ⚠️ Write FIRST, ensure they FAIL

- [X] T019 [P] [US2] Write integration test for `award_material_completion` idempotency (concurrent calls for non-test materials → single `gem_transactions` ledger row, mock_test rejected) in `frontend/tests/integration/materials/award-concurrent.test.ts` — vitest, hits live Supabase, auto-skips when env vars missing
- [X] T020 [P] [US2] Write unit tests for `<MaterialBody>` locale-fallback rendering in `frontend/tests/unit/materials/MaterialBody.test.tsx` — **6/6 tests passing**

### Implementation for User Story 2

- [X] T021 [US2] Implement `<MaterialBody>` in `frontend/src/components/materials/MaterialBody.tsx` — purpose-built lightweight Markdown parser (no react-markdown dep — saves ~120 KB gzipped); supports headings, paragraphs, bold/italic, ordered/unordered lists, code fences; locale fallback (`body_en ?? body_vi`) with "translation pending" eyebrow on en
- [X] T022 [P] [US2] Implement `<VocabularyTable>` in `frontend/src/components/materials/VocabularyTable.tsx` — word + IPA + `vi_phonetic_hint` + `gloss_vi` + `example_en`/`example_vi`; "I know this" tap per card; ≥ 80% triggers `award_material_completion` via shared hook
- [X] T023 [P] [US2] Implement `<GrammarPattern>` in `frontend/src/components/materials/GrammarPattern.tsx` — Markdown body + "Tôi đã làm xong bài tập" trigger
- [X] T024 [P] [US2] Implement `<ReadingPassage>` in `frontend/src/components/materials/ReadingPassage.tsx` — Markdown body + "Tôi đã đọc xong" trigger (companion mock_test recommended for quiz-style assessment)
- [X] T025 [P] [US2] Implement `<ListeningPlayer>` in `frontend/src/components/materials/ListeningPlayer.tsx` — native `<audio>` with progress tracking; **5 s timeout fallback per Q2 clarification**: auto-reveals transcript with "Âm thanh không tải được — xem bản ghi" notice; ≥ 90% audio progress fires completion
- [X] T026 [P] [US2] Implement `<DialoguePlayer>` in `frontend/src/components/materials/DialoguePlayer.tsx` — Markdown body + "shadow-read done" trigger
- [X] T027 [US2] Implement material detail server component `frontend/src/app/[locale]/materials/[slug]/page.tsx` — fetches material + progress + type-specific items in parallel (≤ 3 round-trips); type dispatcher renders the right component; mock_test redirects to `/test`; `revalidate: 300`; anonymous-friendly with login CTA
- [X] T028 [US2] Added `fetchMaterialDetail`, `fetchUserProgress`, `fetchVocabularyItems`, `fetchMaterialAssets`, and `useAwardCompletion` hook to `frontend/src/lib/queries/materials.ts` and `components/materials/useAwardCompletion.ts`

**Checkpoint**: Student can read each of 4 material types (vocab, grammar, reading, listening, dialogue), complete them, see gem burst, confirm ledger row. Concurrent completion test passes.

---

## Phase 5: User Story 3 — Mock Test Player (Priority: P1) 🎯 MVP

**Goal**: Student opens a mock-test material, answers questions (without ever seeing `correct_index`), submits, and sees server-graded per-item results with Vietnamese explanations.

**Independent Test**: Navigate to a published `mock_test` slug → `/test`. Client fetches questions via `mock_test_items_public` view (no `correct_index` visible in network tab). Submit answers → `grade_mock_test` RPC returns `score_pct`, `passed`, `per_item[{correct, explanation_vi}]`. **No gems or XP are awarded**; the result screen shows the score and per-item explanations only.

### Tests for User Story 3 ⚠️ Write FIRST, ensure they FAIL

- [X] T029 [P] [US3] Write unit tests for `<MockTestPlayer>` answer state, submit handler, anonymous gating in `frontend/tests/unit/materials/MockTestPlayer.test.tsx` — **6/6 tests passing**
- [X] T030 [P] [US3] Write Playwright E2E segment in `materials.spec.ts` for mock-test journey: redirect to /test, prompts visible, **`correct_index` and `explanation_*` never appear in network response** (defensive integrity check)

### Implementation for User Story 3

- [X] T031 [US3] Implement `<MockTestPlayer>` in `frontend/src/components/materials/MockTestPlayer.tsx` — client component; fetches questions from `mock_test_items_public` view (never base table); manages per-question answer state; on submit calls `supabase.rpc('grade_mock_test', {p_user_id, p_material_id, p_answers})`; renders score summary + per-item result with `explanation_vi`/`explanation_en` after grade; **no gem/XP award strip per 2026-05-10 clarification**; surfaces "no reward" notice on result page
- [X] T032 [US3] Implement mock-test player page `frontend/src/app/[locale]/materials/[slug]/test/page.tsx` — requires auth (redirects to `/auth/login?redirect=...`); fetches material metadata + questions server-side; `revalidate: 0` (interactive); `robots: { index: false }` (don't index test pages — catalog detail is the SEO surface)
- [X] T033 [US3] Add `fetchMockTestQuestions` helper + `MockTestQuestion`, `MockTestPerItemResult`, `MockTestGradeResult` types to `frontend/src/lib/queries/materials.ts` — queries `mock_test_items_public` view; **defensive runtime check throws if any returned row contains `correct_index`** (catches misconfigured view as a backstop)

**Checkpoint**: Mock-test player renders, submit calls `grade_mock_test`, answers with correct answers pass and show explanations, `correct_index` never appears in browser network inspector.

---

## Phase 6: User Story 4 — Author Materials (Priority: P2)

**Goal**: Admin and Teachers can create, draft, and edit materials through a rich editor UI at `/materials/admin/editor/[id]`.

**Independent Test**: Sign in as admin → `/vi/materials/admin` → click "Tạo mới" → choose `vocabulary_pack` → editor opens → fill `title_vi`, `summary_vi`, `body_vi`, add 8 vocabulary items → save as draft → material appears in admin list with status `draft`.

### Tests for User Story 4 ⚠️ Write FIRST, ensure they FAIL

- [X] T034 [P] [US4] Write unit tests for `<MaterialEditor>` field validation (title_vi required, ≥ 8 vocab items for vocabulary_pack) in `frontend/tests/unit/materials/MaterialEditor.test.tsx`

### Implementation for User Story 4

- [X] T035 [US4] Implement `<SectionEditor>` in `frontend/src/components/materials/editor/SectionEditor.tsx` — per-section Markdown editor with live preview; handles all `section.kind` values
- [X] T036 [US4] Implement `<MaterialEditor>` in `frontend/src/components/materials/editor/MaterialEditor.tsx` — full authoring form: type selector, level/goal/duration inputs, bilingual fields (`title_vi`/`title_en`, etc.), `<SectionEditor>` for sections, type-specific inline editors (`<VocabularyItemsEditor>` for vocab packs, `<MockTestItemsEditor>` for mock tests), asset upload to `material-assets` bucket, autosave to draft; **optimistic-lock save**: PATCH includes `?updated_at=eq.<last_fetched>`; on 409 response show "Someone else saved changes — reload to see their version before editing"
- [X] T037 [US4] Implement admin catalog manager page `frontend/src/app/[locale]/materials/admin/page.tsx` — admin/teacher role guard; shows all materials (admin: all statuses; teacher: own drafts only); "Tạo mới" button with type-picker modal
- [X] T038 [US4] Implement material editor page `frontend/src/app/[locale]/materials/admin/editor/[id]/page.tsx` — loads existing material or creates new draft; renders `<MaterialEditor>`; role guard (teacher: own drafts only)
- [X] T039 [US4] Add `createMaterialDraft`, `updateMaterialDraft`, `fetchMaterialForEditor` query helpers to `frontend/src/lib/queries/materials.ts`

**Checkpoint**: Admin can create all 6 material types through the editor, save as draft, and the draft appears in the admin list.

---

## Phase 7: User Story 5 — Moderation Pipeline (Priority: P2)

**Goal**: Teachers submit drafts for review; Admins approve or reject; approved materials appear in the public catalog within 30 seconds.

**Independent Test**: Teacher submits draft → status → `in_review`. Admin rejects with reason → status → `draft`, rejection comment visible. Admin approves → status → `published` → material appears in `/vi/materials` within 30 s (revalidation tick).

### Tests for User Story 5 ⚠️ Write FIRST, ensure they FAIL

- [ ] T040 [P] [US5] Write unit tests for the Edge Function `materials-publish` state-machine (all action × role × precondition combinations) and automated content checks (`submit_for_review` with missing Vietnamese characters, missing IPA, insufficient item counts → 422; valid draft → 200) in `supabase/functions/materials-publish/index.test.ts`

### Implementation for User Story 5

- [ ] T041 [US5] Implement Edge Function `supabase/functions/materials-publish/index.ts` — validates caller role from `profiles.role`; enforces state-transition matrix (draft→in_review, in_review→published/draft, published→archived, archived→published); on `submit_for_review`: runs automated regex/NULL content checks (Vietnamese character presence in `body_vi`, IPA + `vi_phonetic_hint` + example sentences per vocab item, item-count minimums for vocab/mock-test) and returns HTTP 422 with `errors[]` on failure; creates `material_reviews` row with auto-verified fields pre-populated in `checklist_passed`; on `approve`: validates bilingual fields + all manual checklist items ticked; inserts `audit_log` row; emits Realtime broadcast on `materials:catalog` channel (see `contracts/edge-publish.md`)
- [ ] T042 [US5] Implement Edge Function `supabase/functions/materials-submit-for-review/index.ts` — teacher-accessible shorthand that calls the `submit_for_review` action with ownership check
- [ ] T043 [US5] Add "Submit for review" / "Approve" / "Reject" / "Archive" action buttons to the editor and admin list pages in `frontend/src/app/[locale]/materials/admin/` — call `materials-publish` edge function; show HTTP 422 `errors[]` inline

**Checkpoint**: Full pipeline works end-to-end: Teacher creates → submits → Admin approves → material live in catalog within 30 s. Playwright test for moderation journey passes.

---

## Phase 8: User Story 6 — Dashboard Recommendation Widget (Priority: P2)

**Goal**: Logged-in students see a "Next material" row on the student dashboard surfaced by `recommend_next_material(user_id)`.

**Independent Test**: Sign in as student who has completed 2 materials → dashboard shows a `<MaterialCard>` for an unreached material at the student's CEFR level that was not completed in the last 7 days.

### Tests for User Story 6 ⚠️ Write FIRST, ensure they FAIL

- [ ] T044 [P] [US6] Write unit tests for `recommend_next_material` RPC logic (level filter, type-rotation, career_path tag overlap) in `frontend/tests/unit/materials/queries.test.ts`

### Implementation for User Story 6

- [ ] T045 [US6] Add `fetchRecommendedMaterial` query helper to `frontend/src/lib/queries/materials.ts` — calls `supabase.rpc('recommend_next_material', {p_user_id})` then fetches full `MaterialSummary` for the returned UUID
- [ ] T046 [US6] Add "Next material" section to `frontend/src/app/[locale]/dashboard/page.tsx` — server-fetched, renders one `<MaterialCard size="md" badge="recommended">`; shows nothing (no empty state) if no recommendation returned; existing dashboard layout unchanged

**Checkpoint**: Logged-in student dashboard shows a recommended material card. Completing the recommended material causes a different one to appear next visit.

---

## Phase 9: User Story 7 — Learning Path Collections (Priority: P3)

**Goal**: Admin creates curated collections (e.g. "30-day IELTS prep"), students browse and follow them at `/{locale}/materials/library`.

**Independent Test**: Navigate to `/vi/materials/library` → see the seeded collection "Thi tốt nghiệp THPT — Bộ luyện thi 30 ngày" → click → see ordered list of collection materials with progress indicators.

### Tests for User Story 7 ⚠️ Write FIRST, ensure they FAIL

- [ ] T047 [P] [US7] Write Playwright test for collection browse journey in `frontend/tests/e2e/materials.spec.ts`

### Implementation for User Story 7

- [ ] T048 [US7] Add `fetchCollections` and `fetchCollectionWithItems` query helpers to `frontend/src/lib/queries/materials.ts`
- [ ] T049 [US7] Implement personal library / collections page `frontend/src/app/[locale]/materials/library/page.tsx` — shows student's in-progress + completed materials; also shows curated public collections; requires auth; uses existing `.ed-card` layout
- [ ] T050 [US7] Add collection editor to admin UI in `frontend/src/app/[locale]/materials/admin/page.tsx` — Admin can create `material_collections`, add/reorder `material_collection_items` via drag-and-drop

**Checkpoint**: Seeded collection visible at `/vi/materials/library`. Admin can create a new collection and add materials to it.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Performance, accessibility, SEO hardening, and production readiness.

- [ ] T051 [P] Add `Course` JSON-LD structured data to catalog page `frontend/src/app/[locale]/materials/page.tsx` and detail page `[slug]/page.tsx` (per R8: `inLanguage: vi-VN`, `educationalLevel`, `teaches`)
- [ ] T052 [P] Add audio transcripts (`<track kind="subtitles">` or toggleable transcript panel) to `<ListeningPlayer>` for WCAG 2.1 AA compliance
- [ ] T053 [P] Add `alt-text` (vi + en) to all material cover images and vocabulary illustrations in `<MaterialCard>` and `<VocabularyTable>`
- [ ] T054 [P] Configure nightly `compute_popularity_scores` cron job via Supabase Scheduled Functions or pg_cron in `supabase/migrations/083_materials_rpc.sql`
- [ ] T055 Run Lighthouse budget check on catalog page (LCP ≤ 2 s on 4G, JS ≤ 220 KB gzipped) and fix any regressions
- [ ] T056 [P] Verify Supabase Storage audio CDN headers: `cache-control: public, max-age=31536000, immutable` for `material-assets/` in `supabase/migrations/082_materials_storage.sql`
- [ ] T057 Run `quickstart.md` validation end-to-end: `supabase db reset` → seed → browse → complete → verify ledger → authoring flow
- [ ] T058 [P] Update `CLAUDE.md` with any new symbols added during implementation (per GitNexus requirements)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 — Catalog)**: Depends on Phase 2
- **Phase 4 (US2 — Read & Earn)**: Depends on Phase 2; Phase 3 recommended first (detail page links from catalog)
- **Phase 5 (US3 — Mock Test)**: Depends on Phase 2; parallel with US2 (different files)
- **Phase 6 (US4 — Author)**: Depends on Phase 2; parallel with US2/US3
- **Phase 7 (US5 — Pipeline)**: Depends on Phase 6 (editor must exist before submit/approve buttons)
- **Phase 8 (US6 — Dashboard)**: Depends on Phase 2 and Phase 3 (`<MaterialCard>` must exist)
- **Phase 9 (US7 — Collections)**: Depends on Phase 2; independent of US2–US6
- **Phase 10 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Catalog)**: Unblocked after Foundational — first to implement
- **US2 (Read & Earn)**: Unblocked after Foundational; uses `<MaterialCard>` from US1
- **US3 (Mock Test)**: Unblocked after Foundational; uses detail page route from US2
- **US4 (Author)**: Unblocked after Foundational; parallel with US1–US3
- **US5 (Pipeline)**: Depends on US4 (editor UI must exist)
- **US6 (Dashboard)**: Depends on US1 (`<MaterialCard>` component)
- **US7 (Collections)**: Unblocked after Foundational; independent of all other stories

### Within Each User Story

1. Write failing tests FIRST (TDD per Constitution II)
2. DB / RPC layer before query helpers
3. Query helpers before components
4. Components before pages
5. Pages before integration / E2E tests pass

### Parallel Opportunities

- T001–T010 (Setup): T007 and T008 (i18n) parallel; T009 and T010 parallel with T002–T006
- T013 and T014 (Foundational components) parallel with each other after T012
- T022–T026 (material type sub-renderers) all parallel — different files
- T035–T039 (authoring) parallel where file paths are distinct
- US3 (Phase 5), US4 (Phase 6), US9 (Phase 9) all parallel once Foundational is complete

---

## Parallel Example: User Story 2 (Read & Earn)

```bash
# Write failing tests first:
Task T019: award-concurrent.test.ts
Task T020: MaterialBody.test.tsx

# Once T021 (MaterialBody) is done, launch all type sub-renderers in parallel:
Task T022: VocabularyTable.tsx
Task T023: GrammarPattern.tsx
Task T024: ReadingPassage.tsx
Task T025: ListeningPlayer.tsx
Task T026: DialoguePlayer.tsx

# Then:
Task T027: materials/[slug]/page.tsx  (depends on sub-renderers)
Task T028: query helpers update
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1 (Setup) — migrations, i18n, types
2. Complete Phase 2 (Foundational) — `<MaterialCard>`, filters, progress ribbon
3. Complete Phase 3 (US1 — Catalog) — browse + filter + search
4. Complete Phase 4 (US2 — Read & Earn) — detail page + all 5 type renderers + gem award
5. Complete Phase 5 (US3 — Mock Test) — server-graded test player
6. **STOP and VALIDATE**: quickstart.md walkthrough passes, Playwright E2E passes, ledger correct
7. Deploy/demo — this is a shippable product increment

### Incremental Delivery

1. Setup + Foundational → database ready
2. US1 → catalog browsable (SEO crawlable from day 1)
3. US2 → learner can complete materials and earn rewards
4. US3 → mock-test prep available (key Vietnamese learner motivation)
5. US4 + US5 → admin/teacher can create and publish new content
6. US6 → personalized recommendation drives return visits
7. US7 → collections enable structured learning paths

### Parallel Team Strategy

With multiple developers:

1. Developer A: Phase 1 (Setup) → Phase 3 (Catalog) → Phase 8 (Dashboard widget)
2. Developer B: Phase 2 (Foundational components) → Phase 4 (Read & Earn)
3. Developer C: Phase 5 (Mock Test) → Phase 6 (Authoring)
4. Developer D: Phase 7 (Pipeline) → Phase 9 (Collections)

---

## Notes

- [P] tasks = different files, no runtime dependencies on incomplete tasks
- Each user story phase is independently deployable and testable
- TDD: every test task MUST be written FIRST and MUST fail before its implementation tasks
- `correct_index` must NEVER appear in browser network responses — verify in each mock-test test
- `award_material_completion` is the most safety-critical path — concurrency test (T019) must pass before any UI for US2 ships
- Gem/XP numbers are locked in `research.md` R3 — do not alter without a spec change
- Vietnamese is `NOT NULL` in the schema — the editor must enforce this before allowing save
- `revalidate: 300` on all catalog/detail server components — don't forget or SEO cache won't work
- After each commit: `npx gitnexus analyze` to keep the GitNexus index fresh (PostToolUse hook handles this automatically)
