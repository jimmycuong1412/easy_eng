# Implementation Plan: Materials Library (Vietnamese-targeted)

**Branch**: `001-english-learning-platform` | **Date**: 2026-05-10 | **Spec**: this folder
**Input**: User request — _"Design a materials system that is necessary for every English education website. The materials content should be targeted to Vietnamese users."_

> Scope note. The platform already has a `class_materials` table (migration 017) for **per-class teacher uploads**. This plan introduces a separate, complementary feature: a curated, platform-wide **Materials Library** that every student can browse, learn from, and progress through — with content authored specifically for Vietnamese learners of English. Both can co-exist; this plan does not modify `class_materials`.

## Summary

Build a comprehensive, Vietnamese-first **Materials Library** that turns EasyEng into a self-serve learning destination, not just a tutor-booking marketplace. Every Vietnamese learner gets:

1. **Structured curriculum** organized by **CEFR level (A1 → C1)** and aligned to milestones Vietnamese students actually care about — secondary-school graduation, university entrance, IELTS / TOEIC / VSTEP, business communication, and overseas study.
2. **Six material types** that cover every essential modality of English learning: **Vocabulary Pack**, **Grammar Lesson**, **Reading Passage**, **Listening Audio**, **Conversation / Dialogue**, and **Mock Test**.
3. **Vietnamese-native UX**: every prompt, instruction, hint, and explanation localized; vocabulary glossed in Vietnamese; pronunciation hints written in IPA + Vietnamese transliteration; Vietnamese-context examples (Hanoi traffic, Tết, phở, motorbike rentals) instead of generic Western examples.
4. **Progress tracking** that integrates with the existing gem + XP economy: completing a material rewards XP and gems on the same audit-logged ledger; streaks count materials *or* live classes; learning-path widget on the dashboard surfaces "next recommended material."
5. **Admin-curated catalog** with Teacher contributions: Admins publish official content; verified Teachers can submit drafts; both flow through a review pipeline before going live.

The materials feature is the cheapest way to deliver value when a learner is *between* live classes and is the strongest growth lever for SEO and trial conversion in the Vietnamese market.

## Technical Context

**Language/Version**: TypeScript 5.4 (frontend, edge functions); Deno (Supabase Edge Functions); SQL (PostgreSQL 15 via Supabase)
**Primary Dependencies**: Next.js 14.2 App Router, `next-intl` (vi/en, vi default), Supabase JS v2, `@supabase/supabase-js`, Tailwind + editorial `.ed-*` design system, existing Zustand auth, `lucide-react` icons. New: `react-markdown` + `remark-gfm` for lesson body rendering; `react-h5-audio-player` (or native `<audio>`) for listening clips.
**Storage**: Supabase PostgreSQL — new tables `materials`, `material_sections`, `material_translations`, `material_progress`, `material_assets`, `material_tags`, `material_tag_links`, `material_collections`, `material_collection_items`, `material_reviews`. Supabase Storage — new `material-assets` bucket (audio MP3, images, downloadable PDF, vocabulary illustrations).
**Testing**: Jest (unit) + Playwright (E2E); existing 50% coverage threshold per `frontend/jest.config.ts`. Dedicated tests for: RLS policies (admins/teachers/students), gem & XP awarding atomicity, Vietnamese fallback rendering, mock-test scoring.
**Target Platform**: Web (responsive, mobile-first); Vietnamese learners overwhelmingly access via mobile phones on 4G, so payload + offline-friendliness matter.
**Project Type**: Web application (`frontend/` Next.js + `supabase/` edge functions & migrations) — same shape as the rest of the platform.
**Performance Goals**:
- Materials catalog list page p95 ≤ 1.5 s First Contentful Paint on 4G; ≤ 200 ms server response.
- Individual material page interactive ≤ 2 s; audio first-byte ≤ 800 ms via Supabase Storage CDN.
- Mock-test scoring round-trip ≤ 500 ms p95.
**Constraints**:
- Catalog must work for fully-anonymous SEO crawlers (server-rendered, no auth wall on previews); progress + gem rewards require auth.
- All copy + body content authored in **Vietnamese first**; English version is a secondary translation, **never** the source of truth.
- No N+1 queries: a single page render must hit at most 3 Supabase round-trips.
- Audio assets ≤ 3 MB each (MP3, 96 kbps mono is enough for ESL listening); images ≤ 200 KB.
**Scale/Scope**:
- Year-1 catalog target: ~600 materials (100 per CEFR level × 6 types). Per-month publishing rate: ~50 new items.
- ~30k registered learners year-1 (consistent with platform spec). Concurrent material readers peak ~600.
- ~60 admin/teacher contributors authoring content via the admin UI.

## Constitution Check

Per `.specify/memory/constitution.md` v1.1.0. All seven principles evaluated below. **All gates PASS** (no violations to track).

| # | Principle | Compliance plan |
|---|-----------|-----------------|
| I  | **Code Quality Standards** | All new code in TypeScript with strict types. Each `materials.*` query lives in `frontend/src/lib/queries/materials.ts` with single-responsibility helpers (≤ 50 lines). No duplicated content-rendering logic — one `<MaterialBody>` renderer used by all material types. Pre-commit hooks (`husky` already installed) enforce lint + type-check. |
| II | **Testing Discipline (TDD)** | TDD for every new entity: a failing Jest test in `frontend/src/__tests__/materials/` BEFORE implementation; RLS test in `supabase/tests/materials_rls.sql` (using pgTAP) BEFORE migration ships; E2E `tests/e2e/materials.spec.ts` for the student "browse → start → complete → claim gem" journey. Gem & XP awarding is the single most safety-critical path → integration test asserts atomicity (no XP without ledger row). |
| III | **User Experience Consistency** | Materials reuse the editorial `.ed-frame` / `.ed-card` / `.ed-ink-panel` system. Empty/loading/error states for every page. Navigation: catalog under `/{locale}/materials`, detail at `/{locale}/materials/[slug]`, mock-test player at `/{locale}/materials/[slug]/test`. Learning-path widget already exists on dashboard — adds a "Next material" row. WCAG 2.1 AA: every audio has transcript; every image has alt-text in vi + en. **Role-specific surfaces**: Student → consume; Teacher → recommend to assigned students; Admin → curate & moderate. |
| IV | **Performance Requirements** | Catalog list uses cursor pagination (`PostgREST .range()`), filters via indexed columns (`level`, `type`, `is_published`). Material body cached at the edge with 5 min TTL (Vercel `revalidate: 300`). Audio served from Supabase Storage with `cache-control: public, max-age=31536000, immutable` because clips are versioned by hash. No new N+1: each page resolves with at most 3 round-trips (material + sections + progress). Lighthouse budget: LCP ≤ 2 s on 4G, JS ≤ 220 KB gzipped per route. |
| V  | **Role-Based Access Control** | RLS on every materials table. Default deny. Read policies: published materials → any authenticated learner; draft → author + admin only. Write: admin (full) and teacher (own drafts only). Progress rows: owner-only read/write. Server-side checks in edge functions (`materials-publish`, `materials-submit-for-review`, `materials-award-completion`); client-side guarding is **UI only**. Role context lives in `profiles.role` (existing pattern). Audit-logged: publish, unpublish, role change. |
| VI | **Virtual Currency System Integrity** | Non-test material completion awards both **gems** and **XP** through the **existing** `gems_transactions` ledger (no new currency). Atomic Postgres function `award_material_completion(material_id, user_id)` performs: insert into `material_progress` with `completed_at`, insert into `gems_transactions` with `reason='material_completion'` and `material_id` reference, insert into `xp_events`. **Mock tests award zero gems and zero XP** — `grade_mock_test` returns score feedback only and does not call `award_material_completion`. Idempotency: unique index `(user_id, material_id)` on `material_progress` prevents double-rewards. Mock-test scoring deterministic (server-side). Refunds: completing a material is non-refundable; if material is **retracted** by admin, granted gems stay (matches platform "earned gems don't expire by retroactive content change" policy). |
| VII | **UI Design Excellence** | All pages use editorial Direction-A (warm paper, Newsreader serif, GeistSans, coral accents). Mobile-first; catalog uses 1-col on mobile, 2-col tablet, 3-col desktop. Animation: subtle progress-bar fill, gem-burst on completion (uses existing `XPProgressBar` patterns). Empty states with serif headlines + suggested next action. Vietnamese typography: prefer `vi` font features (`'cv11', 'ss01'`) already enabled on `.ed-frame`. Icons from `lucide-react` (consistent with rest of app). |

**Result**: All gates PASS. No violations recorded in Complexity Tracking.

### Post-design re-evaluation (after Phase 1)

After completing `data-model.md`, `contracts/`, and `quickstart.md`, the same seven principles were re-checked. **No new violations introduced.** Notable confirmations:

- **Principle II (TDD)**: every contract document explicitly references its required test file (e.g. `award-concurrent.test.ts`, `MaterialCard.test.tsx`, `materials_rls.sql`). Any task generated by `/speckit.tasks` will have a Red-Green-Refactor pair.
- **Principle V (RBAC)**: the data-model RLS table covers anon / student / teacher / admin per row. `mock_test_items.correct_index` is locked away behind a view + `SECURITY DEFINER` RPC — exactly what Principle V demands for protected data.
- **Principle VI (Currency Integrity)**: `award_material_completion` reuses the existing `gems_transactions` ledger with `reason='material_completion'` for non-test materials. `grade_mock_test` returns score only — **no gem or XP award**. No parallel currency, no client-side awarding, idempotent via unique index. Refund/retraction policy is explicit (see R9).
- **Principle VII (UI Excellence)**: `<MaterialCard>` contract enforces editorial design tokens; the catalog/detail/test pages all sit inside the `.ed-frame` system. Mobile-first viewports + Vietnamese-first typography are part of the design tokens, not bolted on.

## Project Structure

### Documentation (this feature)

```text
specs/001-english-learning-platform/features/materials-library/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
    ├── README.md                    # Contract index
    ├── rest-materials.openapi.yaml  # PostgREST REST surface
    ├── rpc-award-completion.md      # Postgres RPC contract
    ├── rpc-grade-mock-test.md       # Postgres RPC contract
    ├── edge-publish.md              # Supabase Edge Function contract
    └── component-material-card.md   # React component prop contract
```

### Source Code (repository)

The platform is already organized as a Next.js + Supabase web app, so we follow the existing layout — **no new top-level project**, only new modules inside `frontend/` and `supabase/`.

```text
frontend/
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       └── materials/
│   │           ├── page.tsx                    # Catalog (server component, SEO-friendly)
│   │           ├── [slug]/
│   │           │   ├── page.tsx                # Material detail / reader
│   │           │   └── test/
│   │           │       └── page.tsx            # Mock-test player (client)
│   │           ├── library/
│   │           │   └── page.tsx                # Personal library (saved + in-progress)
│   │           └── admin/
│   │               ├── page.tsx                # Admin catalog manager
│   │               └── editor/
│   │                   └── [id]/page.tsx       # Material editor (admin/teacher)
│   ├── components/
│   │   └── materials/
│   │       ├── MaterialCard.tsx                # Catalog tile
│   │       ├── MaterialFilters.tsx             # Level / type / topic filters
│   │       ├── MaterialBody.tsx                # Markdown + glossary renderer
│   │       ├── VocabularyTable.tsx             # Word + IPA + vi gloss + example
│   │       ├── GrammarPattern.tsx              # Pattern + Vietnamese explanation
│   │       ├── ReadingPassage.tsx              # Bilingual toggle (vi gloss on hover)
│   │       ├── ListeningPlayer.tsx             # Audio + transcript reveal
│   │       ├── DialoguePlayer.tsx              # Two-speaker dialogue with IPA
│   │       ├── MockTestPlayer.tsx              # Multi-choice + fill-in-blank
│   │       ├── ProgressRibbon.tsx              # XP/gem reward strip
│   │       └── editor/
│   │           ├── MaterialEditor.tsx          # Admin/teacher composer
│   │           └── SectionEditor.tsx           # Per-section editor
│   ├── lib/
│   │   └── queries/
│   │       └── materials.ts                    # All Supabase data access
│   └── i18n/
│       └── (existing — frontend/messages/{vi,en}.json get new "materials.*" keys)
├── tests/
│   ├── e2e/
│   │   └── materials.spec.ts                   # Playwright: browse → complete → reward
│   └── unit/
│       └── materials/
│           ├── MaterialCard.test.tsx
│           ├── MockTestPlayer.test.tsx
│           └── queries.test.ts
└── messages/
    ├── vi.json                                 # New `materials.*` namespace
    └── en.json                                 # English mirror

supabase/
├── migrations/
│   ├── 080_materials_library.sql               # Tables + indexes
│   ├── 081_materials_rls.sql                   # RLS policies
│   ├── 082_materials_storage.sql               # `material-assets` bucket
│   ├── 083_materials_rpc.sql                   # award_material_completion, grade_mock_test
│   └── 084_materials_seed_vi.sql               # 30 Vietnamese-targeted seed materials
├── functions/
│   ├── materials-publish/
│   │   └── index.ts                            # Edge Function: state transition + audit
│   └── materials-submit-for-review/
│       └── index.ts                            # Edge Function: teacher draft → review
└── tests/
    └── materials_rls.sql                       # pgTAP RLS tests
```

**Structure Decision**: Single-repo web-app split (existing pattern). New code is additive; no migration needed for existing tables. The existing `class_materials` table stays untouched — that feature is "teacher uploads files for one specific class booking". The new `materials` table is for "platform-curated learning content available to all learners". Two clearly different concepts; we keep them apart and never alias.

## Complexity Tracking

> *No constitution violations to justify.* All seven principles evaluated PASS in the matrix above. This section intentionally left empty.

## Phase status

| Phase | Output | Status |
|-------|--------|--------|
| 0 — Research | `research.md` | ✅ generated |
| 1 — Design | `data-model.md`, `quickstart.md`, `contracts/` | ✅ generated |
| 1 — Agent context update | CLAUDE.md technologies | ✅ executed via `update-agent-context.sh` |
| Constitution re-check | here (post-design) | ✅ still passes — no new violations introduced by the data model or contracts |
| 2 — Tasks | `tasks.md` | _Out of scope for `/speckit.plan`. Run `/speckit.tasks` next._ |
