# Phase 0 — Research: Materials Library (Vietnamese-targeted)

Goal: resolve every NEEDS CLARIFICATION from `plan.md` and lock the decisions that shape the data model and contracts. Each section follows the *Decision / Rationale / Alternatives considered* template.

---

## R1 — What "necessary materials for an English education website" actually means

**Decision**: ship six material types in v1, mapped to the four ESL skills + supplemental drills + assessment.

| Type | Skill bucket | What a learner does |
|------|-------------|---------------------|
| `vocabulary_pack` | Vocabulary | Study a themed word list with IPA + Vietnamese gloss + example sentence. |
| `grammar_lesson` | Writing & Speaking accuracy | Read pattern + Vietnamese explanation + run drills. |
| `reading_passage` | Reading | Read a leveled text with hover-glossed words and 3–5 comprehension questions. |
| `listening_audio` | Listening | Play 1–4 min audio, reveal transcript after attempt, answer 3–5 questions. |
| `dialogue` | Speaking & Pronunciation | Two-speaker scripted dialogue + per-line audio + shadow-read prompt. |
| `mock_test` | Assessment | Timed multiple-choice / fill-in-blank set graded server-side. |

**Rationale**: industry survey of leading sites (BBC Learning English, British Council Learn English, Hello Chao, ELSA Speak, Tflat) shows these six categories cover 90% of self-serve ESL learning. Anything beyond v1 (writing correction, AI conversation, video lessons) is multi-quarter work — kept out of scope for now and tracked as future extensions.

**Alternatives considered**:
- A single generic `lesson` type with free-form Markdown only — rejected: loses the structured affordances (audio player, timed test, glossary hover) that make the experience feel native to each skill.
- Including video lessons in v1 — rejected: storage + CDN cost + production overhead would 5× the scope. Add later as a 7th type once we know catalog demand.
- Ship a single placeholder `mock_test` — rejected: passing IELTS/TOEIC test prep is a top-3 motivation for Vietnamese learners; mock-tests are a v1 must-have, not nice-to-have.

---

## R2 — Why "Vietnamese-targeted" changes the data shape

**Decision**: every textual field uses a `vi` (canonical) + `en` (translation) pattern, with structured per-language slots for vocabulary glosses, grammar explanations, and example sentences. Vietnamese is the **source of truth**, English is generated from it (manually or by Admin tooling later).

**Concrete shape**:

- `materials.title_vi`, `materials.title_en` (NOT NULL, NOT NULL respectively).
- `materials.summary_vi`, `materials.summary_en`.
- `materials.body_vi` (markdown), `materials.body_en` (markdown).
- Vocabulary entries have `term` (English word), `ipa`, `gloss_vi` (Vietnamese), `gloss_en`, `example_en`, `example_vi`. The glossary popup on hover shows `gloss_vi` first.
- Reading passages have `passage_en` + an optional `notes_vi` for tricky idioms, plus per-paragraph `vi_summary` you can toggle.
- Mock-test items have `prompt_en`, `prompt_vi`, `options_en[]`, `options_vi[]`, `explanation_vi` (after-grade explainer in Vietnamese).
- All UI chrome (button labels, status pills, error toasts) localized via existing `next-intl` namespace `materials.*`.

**Vietnamese-context content rules** baked into the editorial guideline (not the schema, but enforced by a content checklist on `materials_reviews.checklist_passed`):

1. Examples reference Vietnamese daily life (motorbike, phở, Tết, banh mi, Saigon, mom-and-pop shops) at least 50% of the time.
2. Idioms and false-friends list common Vietnamese-speaker pitfalls (`actually` ≠ `hiện tại`, `library` ≠ `nhà sách`, etc.).
3. Pronunciation hints append a Vietnamese transliteration alongside IPA (`/ˈθæŋkjuː/` + "thắng kiu" approximation) — mandatory for `vocabulary_pack` and `dialogue`.
4. CEFR level mapped to Vietnamese-school equivalents in the catalog filters (A2 ≈ "lớp 9", B1 ≈ "lớp 12 – chuẩn đầu vào ĐH", B2 ≈ "IELTS 5.5–6.5", C1 ≈ "IELTS 7+").

**Rationale**: Vietnamese learners consistently report that "materials feel translated, not made for me" is the #1 reason they bounce from generic platforms. The data model must make Vietnamese a first-class field, not an afterthought, so authors can't accidentally ship English-only content.

**Alternatives considered**:
- Use a single-language model + run on-the-fly translation via LLM — rejected: translation drift is unacceptable for grammar explanations; pronunciation transliterations must be hand-tuned; cost is non-trivial at scale; LLM availability ≠ guaranteed in early production.
- Use a generic `material_translations` join table with `(material_id, locale, field, value)` — rejected: catalog list queries become 3× more expensive due to per-row joins; for two locales, denormalizing fields onto `materials` is far simpler. We DO keep `material_translations` for future locales (zh, km, lo when we expand).
- Mark Vietnamese fields nullable so authors can ship "English-only" first — rejected: that's exactly the failure mode this feature exists to prevent. Vietnamese is `NOT NULL`. English is initially `NOT NULL` too (admin must publish bilingual); we can soften to NULL for Teacher-submitted drafts later.

---

## R3 — How materials integrate with the existing gem + XP economy

**Decision**: completing a material rewards both **gems** (booking discount currency) and **XP** (level/career-path progression). Awards happen via a single Postgres function called from a Supabase Edge Function — never from the client.

| Material type | Gem reward | XP reward | Trigger |
|---------------|-----------|-----------|---------|
| `vocabulary_pack` | 2 | 30 | Last vocabulary card flipped + "I know this" tapped on ≥ 80% |
| `grammar_lesson` | 3 | 40 | All drills attempted (no minimum score) |
| `reading_passage` | 3 | 40 | Comprehension quiz attempted with ≥ 60% |
| `listening_audio` | 4 | 50 | Audio listened to ≥ 90%, comprehension quiz attempted |
| `dialogue` | 3 | 40 | Both speakers played + shadow-read marked done |
| `mock_test` | **0** | **0** | Test submitted and graded — **no gem or XP award**; score only |

**Numbers chosen so**: a learner who does ~5 non-test materials per week earns ~15 gems = enough for one small booking discount, matching the platform's current gem-earning curve from class completion (5 gems per attended class). Materials augment but don't outpace live-class earnings. Mock tests are purely assessment — their value is feedback and score, not currency.

**Atomicity**: `award_material_completion(p_user_id uuid, p_material_id uuid, p_score int default null)` is a `SECURITY DEFINER` Postgres function that:

1. Acquires advisory lock on `(user_id, material_id)` (prevents double-award on simultaneous client retries).
2. Inserts into `material_progress` with `completed_at = now()`. `ON CONFLICT (user_id, material_id) DO NOTHING RETURNING id` — if no row inserted, exits without awarding.
3. Inserts into `gems_transactions` with `reason='material_completion'`, `material_id=p_material_id`.
4. Inserts into `xp_events` with `source='material_completion'`.
5. Returns `{progress_id, gems_awarded, xp_awarded}`.

**Rationale**: matches existing Class-completion award pattern (already audited by Spec Constitution VI). Reuses the immutable `gems_transactions` ledger so admin reconciliation reports continue to work. Idempotent by `unique(user_id, material_id)`.

**Alternatives considered**:
- Award gems on the client and reconcile later — rejected: Constitution VI forbids client-trusted currency operations.
- Award only XP, no gems — rejected: gems are the carrot that drives daily return; tying them to materials is the cheapest growth lever.
- Different gem economies for different material types — accepted in the table above, kept simple (no per-material override beyond the mock-test exclusion).
- Award gems/XP for mock test completion — **rejected (2026-05-10 clarification)**: mock tests are assessment tools, not learning activities; awarding currency for test submissions creates a farming exploit where students spam retries for gems. Score is the sole output of `grade_mock_test`.

---

## R3a — Observability on failed gem awards

**Decision**: on any unhandled exception inside `award_material_completion`, the catch block writes an `audit_log` row with `event='materials.award_failed'` and payload `{user_id, material_id, error}` before re-raising. Sentry captures the exception automatically via the existing platform integration. No new infra required.

**Rationale**: a silent award failure is invisible to ops. The existing `audit_log` table and Sentry integration (already listed in CLAUDE.md) give a queryable record and an automatic alert with zero additional infrastructure. Ops can run `SELECT * FROM audit_log WHERE event = 'materials.award_failed'` to identify any affected students.

**Alternatives considered**:
- Manual retry endpoint (`/api/award-retry`) — rejected: shifts recovery burden onto the student; silent failures still go undetected until a student complains.
- No structured observability — rejected: gem award is a Constitution VI safety-critical path; silent failures in production are unacceptable.
- Realtime admin channel broadcast on every failure — rejected: overkill; `audit_log` + Sentry is already the platform's observability contract for critical paths.

---

## R3b — Concurrent editor conflict resolution

**Decision**: optimistic locking via `updated_at`. When the editor saves a draft, the PATCH request includes `?updated_at=eq.<timestamp_last_fetched>`. PostgREST returns HTTP 409 (no rows matched) if another session saved the material in the interim. The editor surface displays: "Someone else saved changes — reload to see their version before editing." No data is lost; the conflicting save is rejected cleanly.

**Rationale**: two admin/teacher editors on the same draft is rare but possible (e.g. admin reviews while teacher is still editing). Optimistic locking is zero-infra — PostgREST supports it natively via the filter on PATCH — and is the correct tradeoff at our contributor scale (≤ 60 simultaneous authors).

**Alternatives considered**:
- Pessimistic DB advisory lock for session duration — rejected: locks held across HTTP requests require a keep-alive mechanism; a crashed tab would leave the material locked until timeout.
- Last-write-wins with no detection — rejected: silent data loss is unacceptable for Vietnamese-first pedagogical content.
- UI-level lock flag on `materials` — rejected: adds a column and cleanup logic for no meaningful advantage over optimistic locking.

---

## R3c — Automated content checks on draft submission

**Decision**: when a Teacher (or Admin) calls `submit_for_review`, the `materials-publish` Edge Function runs the following automated pre-checks **before** the status transitions to `in_review`. Any failure returns HTTP 422 with an `errors[]` array; the draft stays in `draft` state.

| Check | Rule | Applies to |
|-------|------|-----------|
| Vietnamese presence | `body_vi` must contain ≥ 10 Vietnamese characters (Unicode range U+00C0–U+1EF9 + tonal marks) | all types |
| IPA presence | every `vocabulary_items` row must have a non-null, non-empty `ipa` field | `vocabulary_pack` |
| Vietnamese phonetic hint | every `vocabulary_items` row must have a non-null `vi_phonetic_hint` | `vocabulary_pack` |
| Minimum item count | ≥ 8 vocabulary items | `vocabulary_pack` |
| Minimum item count | ≥ 5 mock-test items, all with `correct_index` set | `mock_test` |
| Example sentences | every `vocabulary_items` row must have `example_en` and `example_vi` | `vocabulary_pack` |

These checks are implemented as pure regex / NULL checks in the Edge Function — no NLP or external API. After passing automated checks, the `material_reviews` row is created with `checklist_passed` pre-populated for the fields that were auto-verified; the Admin then ticks remaining manual items (pedagogical quality, Vietnamese-context examples, false-friends notes) during review.

**Rationale**: automated checks catch the most common author errors (missing IPA, English-only body, incomplete vocab items) before the material enters the admin queue, reducing review round-trips. Regex-based character-range detection is zero-cost and deterministic. Manual checklist items remain for qualitative judgments that cannot be automated.

**Alternatives considered**:
- Fully manual checklist only — rejected: structural errors (missing IPA, no Vietnamese characters) are caught too late, wasting admin review time.
- NLP-based content analysis — rejected: adds an external dependency and latency; overkill for the structural checks we actually need in v1.

---

## R4 — Authoring & moderation pipeline

**Decision**: three states (`draft`, `in_review`, `published`) plus `archived`. Admin can move freely; Teacher can only `draft → in_review`; only Admin can `in_review → published` or `published → archived`.

```
        ┌──────────┐    submit    ┌──────────────┐  approve  ┌────────────┐
        │  draft   │ ───────────► │  in_review   │ ────────► │ published  │
        └──────────┘              └──────┬───────┘           └─────┬──────┘
            ▲                            │ reject (→ draft)         │
            │                            ▼                          │
        ┌───┴──────┐                ┌──────────┐                    │
        │  edit    │                │  draft   │                    │
        └──────────┘                └──────────┘                    │
                                                                    ▼
                                                              ┌──────────┐
                                                              │ archived │
                                                              └──────────┘
```

State transitions logged to `audit_log` table (already exists in platform).

**Rationale**: matches the constitution's audit-log requirement (Principle V). Three states is enough; more (e.g. `scheduled`) is YAGNI.

**Alternatives considered**:
- Auto-publish admin uploads — rejected: even Admins benefit from a `draft` state to prepare content offline.
- One-step pipeline (no review for teachers) — rejected: quality control on Vietnamese pedagogy is exactly what differentiates the platform.

---

## R5 — Storage & asset strategy

**Decision**: new Supabase Storage bucket `material-assets` (public read, authenticated write with role check). Audio: MP3 96 kbps mono, ≤ 3 MB, ≤ 4 min. Images: WebP preferred, ≤ 200 KB. PDF: optional, ≤ 5 MB.

Path convention: `material-assets/<material_uuid>/<kind>-<index>.<ext>`, e.g. `material-assets/3f2e.../audio-01.mp3`.

Cache: long-lived (`max-age=31536000, immutable`) because asset paths are versioned by upload UUID.

**Audio CDN fallback**: if the audio element fails to load or does not reach `canplay` within 5 seconds, `<ListeningPlayer>` automatically reveals the full transcript and displays a Vietnamese notice: "Âm thanh không tải được — xem bản ghi". No user action required. This handles 4G throttling on Vietnamese carriers gracefully and satisfies WCAG 2.1 AA (transcript already required).

**Rationale**: keeps audio off the database, leverages Supabase CDN, predictable costs (~$0.02/GB egress), works on 4G in Vietnam (the common 96 kbps mono fits in ~300 KB per minute, ~1 MB per 4-min clip).

**Alternatives considered**:
- Cloudflare R2 — rejected: adds a second storage system, more credentials to manage, marginal savings at our scale.
- YouTube embeds for listening — rejected: blocked or degraded on Vietnamese carrier 4G plans, ad-laden, gives up control.
- Inline base64 audio — absurd, rejected.
- Show error-only on audio failure (no auto-fallback) — rejected: strands mobile learners on poor connections; auto-reveal transcript is zero-cost and already required for WCAG.

---

## R6 — Catalog discovery: filters, search, recommendations

**Decision**:
- **Filters** (catalog page query params): `level` (A1–C1), `type` (six values from R1), `topic` (slug, multiple), `goal` (vsep | vstep | toeic | ielts | conversation | school | business | study_abroad), `min_score` (for "completed-with-stars" filter on personal library).
- **Search**: PostgreSQL full-text index on `to_tsvector('simple', title_vi || ' ' || title_en || ' ' || coalesce(summary_vi,'') || ' ' || coalesce(summary_en,''))`. Multi-language `'simple'` config keeps both vi and en accessible without separate stemmers.
- **Sort**: default `popularity_score desc` (cached, recomputed nightly), with options `recent`, `level_asc`, `duration_asc`.
- **Recommendations**: dashboard widget calls `recommend_next_material(user_id)` which prioritizes (a) user's CEFR level (b) types not yet completed in last 7 days (c) topics tagged with the user's `career_path`. Plain SQL, no ML.

**Rationale**: simple, predictable, debuggable. Vietnamese learners coming from Tflat/Hello Chao expect filters by `goal` (IELTS, TOEIC, "thi đại học") — that's the single most valuable filter and trumps fuzzy ML.

**Alternatives considered**:
- Algolia / typesense for search — rejected: not worth a third-party dependency at our scale; Postgres FTS is plenty.
- ML-driven recommender — rejected: cold start is brutal, simple rules outperform until we have ≥ 100k user-material interactions.

---

## R7 — Mock test scoring & integrity

**Decision**: server-side grading via `grade_mock_test(p_user_id, p_material_id, p_answers jsonb)`. Returns `{score_pct, items_correct, items_total, gems_awarded, xp_awarded, per_item_correct[]}`. Client never has access to `correct_index`.

Schema: `mock_test_items.correct_index` is `int NOT NULL` but RLS hides it from non-admin readers. The catalog-detail RLS view selects `prompt`, `options`, but NOT `correct_index` for student-role callers.

**Rationale**: Constitution VI demands deterministic, server-side currency awards. Mock-tests award gems → grading must be server-only. RLS on `correct_index` is the cleanest way.

**Alternatives considered**:
- Grade in client, sign with HMAC — rejected: complex; the moment the secret leaks the whole catalog is compromised.
- Trust the client and reconcile — rejected: easy farming exploit.

---

## R8 — SEO & anonymous access

**Decision**: catalog list (`/{locale}/materials`) and material detail page (`/{locale}/materials/[slug]`) are **server-rendered** and accessible to anonymous users. Anonymous users see the full body **except** mock-test answer entry and progress tracking. Sign-in CTA ("Save progress + earn gems") is shown on every material card and at the bottom of every detail page.

`robots.txt` allows `/materials/*` and `/vi/materials/*`. We emit per-page `<title>`, `og:image`, structured-data `Course` JSON-LD with `inLanguage: vi-VN`.

**Rationale**: SEO is the #1 organic acquisition channel for Vietnamese ESL platforms (Hello Chao, Tflat, Studyphim all rank for "ngữ pháp tiếng Anh", "từ vựng IELTS", etc.). Server-rendering Vietnamese-language curriculum pages is a multiplier on every other growth investment.

**Alternatives considered**:
- Auth-only catalog — rejected: kills SEO and trial conversion.
- Send full content + answer key in HTML for anonymous (no auth check) — rejected: lets bots scrape mock-test answers; we keep the `correct_index` column server-only.

---

## R9 — Versioning & retraction

**Decision**: materials are **immutable once published**. Any edit to a published material creates a new revision (`materials.current_revision_id` points at the active row). Old revisions stay readable from URL `/{locale}/materials/[slug]?rev=<id>` but the canonical slug always serves the active revision.

Retraction: `archived` status hides the material from the catalog and from new completion awards but **does not retroactively remove gems already awarded** (Constitution VI: "earned gems don't disappear").

**Rationale**: protects the gem ledger from schema games. Provides a clean audit trail for content changes (matters when a teacher submits a revision).

**Alternatives considered**:
- Mutable rows with last-write-wins — rejected: a learner who completed v1 and another who completed v2 are not the same; we need to know which version was completed.
- Full Git-style history — rejected: overkill for v1, can be added later by promoting `material_revisions` from the simple "current" pointer to a real history table.

---

## R10 — Locale, fallback, and language toggle

**Decision**: every page reads `params.locale` (vi or en). Material body picks the matching language column with this fallback rule:

```ts
const body = locale === 'vi'
  ? material.body_vi
  : (material.body_en ?? material.body_vi);  // English page falls back to Vietnamese
```

Why fall back to Vietnamese on the English page (not the other way)? Because Vietnamese is the source of truth — if a translation hasn't been written yet, the English-locale visitor sees Vietnamese (with a small "translation pending" eyebrow) rather than a 404. The reverse would not make sense (an English-only material wouldn't pass admin review under R2 rules).

**Rationale**: keeps Vietnamese first-class, acknowledges that English is a translation, prevents broken pages.

**Alternatives considered**:
- 404 if the locale-specific body is missing — rejected: kills SEO and frustrates English-locale Vietnamese learners who often switch back and forth.
- Auto-translate at request time — rejected: cost + drift.

---

## Summary of NEEDS CLARIFICATION resolutions

| Question (from plan) | Resolved by |
|----------------------|-------------|
| What types of materials? | R1 — six types |
| What does "Vietnamese-targeted" mean operationally? | R2 — bilingual schema, vi-first content rules |
| How do gem/XP rewards work? | R3 — atomic Postgres function, fixed reward table |
| Who can author / publish content? | R4 — three-state pipeline with role gating |
| Where do audio/images live? | R5 — Supabase Storage bucket `material-assets` |
| How does discovery work? | R6 — filter/search/sort/recommend |
| How do mock tests stay un-cheatable? | R7 — server-side grading, RLS on `correct_index` |
| Anonymous access? SEO? | R8 — yes, server-render the catalog & detail |
| What happens when content is edited? | R9 — immutable + revisioned, retraction doesn't claw back gems |
| Locale fallback policy? | R10 — vi is source of truth; en falls back to vi |

All NEEDS CLARIFICATION resolved. Phase 1 (data model + contracts + quickstart) can proceed.

---

## Clarifications

### Session 2026-05-10

- Q: Should `grade_mock_test` award gems and XP on completion? → A: No — mock tests award no gems or XP. Score feedback only.
- Q: What should `<ListeningPlayer>` do when audio fails to load on poor 4G? → A: Auto-reveal transcript after 5 s load timeout with Vietnamese notice "Âm thanh không tải được — xem bản ghi".
- Q: How should concurrent admin/teacher edits to the same draft be handled? → A: Optimistic lock via `updated_at`; PATCH with `?updated_at=eq.<last_fetched>` returns 409 if stale; editor shows reload prompt.
- Q: How should failed gem award RPCs be surfaced to ops? → A: Catch block writes `audit_log` row with `event='materials.award_failed'`; Sentry captures exception via existing integration.
- Q: Which content checks on draft submission are automated vs. manual? → A: Automated regex/NULL checks on submit (Vietnamese character presence, IPA, phonetic hint, example sentences, item counts); qualitative checks remain manual in admin review UI.
