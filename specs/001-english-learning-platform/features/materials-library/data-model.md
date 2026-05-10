# Phase 1 — Data Model: Materials Library

This document is the canonical schema reference for the feature. Migrations under `supabase/migrations/080-084_materials_*.sql` MUST match this document. Any change to either MUST update both.

> **Convention**. All tables use `uuid` primary keys (`gen_random_uuid()`), `timestamptz` timestamps in UTC, soft delete via `deleted_at` not `is_deleted`, lowercase snake_case names. Existing platform tables referenced by FK: `profiles`, `gems_transactions`, `xp_events`, `career_paths`, `audit_log`.

---

## Entity overview

```text
                ┌──────────────────────────┐
                │       materials          │
                │ id PK                    │
                │ slug UNIQUE              │
                │ type                     │
                │ level                    │
                │ status                   │  ← draft | in_review | published | archived
                │ title_vi, title_en       │
                │ summary_vi, summary_en   │
                │ body_vi, body_en         │
                │ duration_min             │
                │ author_id  → profiles    │
                │ published_at, ...        │
                └──────────────┬───────────┘
                               │
       ┌───────────────────────┼─────────────────────────┐
       │                       │                         │
       ▼                       ▼                         ▼
┌──────────────┐      ┌──────────────────┐     ┌────────────────────┐
│ vocab_items  │      │ mock_test_items  │     │ material_assets    │
│ (1:N)        │      │ (1:N)            │     │ (1:N)              │
└──────────────┘      └──────────────────┘     └────────────────────┘

       ▲ ▲ ▲ ▲                       ▲                    ▲
       │ │ │ │                       │                    │
       │ │ │ │                  ┌────┴──────┐             │
       │ │ │ │                  │ material_ │             │
       │ │ │ │                  │ progress  │  ← per (user, material) row
       │ │ │ │                  └─────┬─────┘
       │ │ │ │                        │
       │ │ │ │                        ▼ awards
       │ │ │ │                  ┌──────────────────┐
       │ │ │ │                  │ gems_transactions│
       │ │ │ │                  │ (existing)       │
       │ │ │ │                  └──────────────────┘
       │ │ │ │
       │ │ │ └──────────────► material_tag_links → material_tags
       │ │ └────────────────► material_collection_items → material_collections
       │ └──────────────────► material_reviews
       └────────────────────► material_translations  (future locales: zh, km, lo)
```

---

## Enumerated types

```sql
-- Type of material content
CREATE TYPE material_type AS ENUM (
  'vocabulary_pack',
  'grammar_lesson',
  'reading_passage',
  'listening_audio',
  'dialogue',
  'mock_test'
);

-- CEFR level
CREATE TYPE material_level AS ENUM ('a1', 'a2', 'b1', 'b2', 'c1');

-- Authoring lifecycle
CREATE TYPE material_status AS ENUM ('draft', 'in_review', 'published', 'archived');

-- Vietnamese-learner motivations (drives the catalog "goal" filter)
CREATE TYPE material_goal AS ENUM (
  'school',          -- thi học kỳ / thi tốt nghiệp THPT
  'vstep',           -- chứng chỉ B1/B2 cho cán bộ, sinh viên VN
  'toeic',
  'ielts',
  'business',
  'study_abroad',
  'conversation',    -- giao tiếp hằng ngày
  'travel'
);
```

---

## 1. `materials`

Canonical material row.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `slug` | text | UNIQUE NOT NULL | URL slug, e.g. `vocab-greeting-friends-a2`. ASCII, ≤ 96 chars. |
| `type` | material_type | NOT NULL | |
| `level` | material_level | NOT NULL | |
| `status` | material_status | NOT NULL DEFAULT `'draft'` | |
| `goal` | material_goal | NULL | Optional primary goal tag (filterable). |
| `title_vi` | text | NOT NULL | Vietnamese, source of truth. ≤ 200 chars. |
| `title_en` | text | NULL when `status` ∈ (`draft`, `in_review`); NOT NULL once `published` (CHECK). | English mirror. |
| `summary_vi` | text | NOT NULL | ≤ 500 chars; shown in catalog cards. |
| `summary_en` | text | NULL → NOT NULL on publish (CHECK) | |
| `body_vi` | text | NOT NULL | Markdown. Used by reading/listening/grammar pages and as fallback for English. |
| `body_en` | text | NULL → NOT NULL on publish (CHECK) | Markdown. |
| `duration_min` | int | NOT NULL CHECK (`duration_min BETWEEN 1 AND 90`) | Estimated study time. |
| `gems_reward` | int | NOT NULL DEFAULT 3 CHECK (`gems_reward >= 0`) | See R3 reward table. |
| `xp_reward` | int | NOT NULL DEFAULT 40 CHECK (`xp_reward >= 0`) | |
| `min_completion_pct` | int | NOT NULL DEFAULT 80 CHECK (`min_completion_pct BETWEEN 0 AND 100`) | Threshold to count as "completed". For mock tests this is the pass score; for vocab packs it's the % of cards marked known. |
| `cover_path` | text | NULL | Storage path under `material-assets/` for cover image. |
| `popularity_score` | numeric(10,2) | NOT NULL DEFAULT 0 | Recomputed nightly: `0.6*completions + 0.3*starts + 0.1*saves` over last 30 days. |
| `author_id` | uuid | NOT NULL REFERENCES `profiles(id)` ON DELETE RESTRICT | The person who first authored. |
| `last_editor_id` | uuid | NULL REFERENCES `profiles(id)` ON DELETE SET NULL | |
| `published_at` | timestamptz | NULL; set when status → `published` | |
| `published_by` | uuid | NULL REFERENCES `profiles(id)` ON DELETE SET NULL | |
| `archived_at` | timestamptz | NULL; set when status → `archived` | |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` | |
| `updated_at` | timestamptz | NOT NULL DEFAULT `now()` | Maintained by trigger. Used as optimistic-lock token: editor PATCH must include `?updated_at=eq.<last_fetched>` and will receive HTTP 409 if the row was modified by another session since last fetch. |
| `deleted_at` | timestamptz | NULL | Soft delete; almost never used (use `archived` instead). |

### Constraints / indexes

```sql
-- Title-en, summary-en, body-en required only when published
ALTER TABLE materials
  ADD CONSTRAINT materials_published_bilingual_chk
  CHECK (
    status <> 'published'
    OR (title_en IS NOT NULL AND summary_en IS NOT NULL AND body_en IS NOT NULL)
  );

-- Frequent filters
CREATE INDEX idx_materials_published ON materials (status, level, type) WHERE status = 'published';
CREATE INDEX idx_materials_goal ON materials (goal) WHERE goal IS NOT NULL;
CREATE INDEX idx_materials_popularity ON materials (popularity_score DESC) WHERE status = 'published';

-- Catalog full-text search (vi + en simple stemming)
CREATE INDEX idx_materials_fts ON materials USING gin (
  to_tsvector(
    'simple',
    coalesce(title_vi,'') || ' ' || coalesce(title_en,'') || ' ' ||
    coalesce(summary_vi,'') || ' ' || coalesce(summary_en,'')
  )
) WHERE status = 'published';

-- Lookups by author for the editor UI
CREATE INDEX idx_materials_author ON materials (author_id, updated_at DESC);
```

### State transitions (enforced by `materials-publish` Edge Function, not DB)

```
draft → in_review     (Teacher or Admin: submit_for_review)
in_review → draft     (Admin: reject, with reason)
in_review → published (Admin only: approve)
published → archived  (Admin only)
archived → published  (Admin only: restore)
```

---

## 2. `material_sections`

Optional ordered children of a material — used by mock tests, dialogues, vocabulary packs to model multi-part content. Reading & listening typically have **one** section (the passage / clip). Grammar lessons can have multiple "examples" / "drills" sections.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `material_id` | uuid | NOT NULL REFERENCES `materials(id)` ON DELETE CASCADE |
| `idx` | int | NOT NULL CHECK (`idx >= 0`) |
| `kind` | text | NOT NULL — one of `'intro' \| 'pattern' \| 'drill' \| 'passage' \| 'audio' \| 'dialogue_line' \| 'test_block'` |
| `body_vi` | text | NULL — Markdown |
| `body_en` | text | NULL — Markdown |
| `audio_path` | text | NULL — for `'audio'` and `'dialogue_line'` kinds |
| `duration_sec` | int | NULL — clip length when applicable |
| `meta` | jsonb | NOT NULL DEFAULT `'{}'::jsonb` — per-kind extras (speaker name, IPA hints, etc.) |
| `created_at` / `updated_at` | timestamptz | |

```sql
ALTER TABLE material_sections
  ADD CONSTRAINT material_sections_material_idx_unique UNIQUE (material_id, idx);

CREATE INDEX idx_material_sections_material ON material_sections (material_id, idx);
```

---

## 3. `vocabulary_items`

Per-vocabulary-pack word entries. (One row per word; ~10–30 rows per pack.)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `material_id` | uuid | NOT NULL REFERENCES `materials(id)` ON DELETE CASCADE |
| `idx` | int | NOT NULL — display order |
| `term` | text | NOT NULL — English headword |
| `pos` | text | NULL — part of speech (`'noun'`, `'verb'`, `'adj'`, etc.) |
| `ipa` | text | NULL — IPA transcription |
| `vi_phonetic_hint` | text | NULL — Vietnamese transliteration ("thắng kiu") |
| `gloss_vi` | text | NOT NULL — Vietnamese meaning |
| `gloss_en` | text | NULL — English-language definition |
| `example_en` | text | NOT NULL |
| `example_vi` | text | NOT NULL — translation of example |
| `audio_path` | text | NULL — pronunciation clip |
| `image_path` | text | NULL — illustration |
| `created_at` / `updated_at` | timestamptz | |

```sql
ALTER TABLE vocabulary_items
  ADD CONSTRAINT vocab_items_material_idx_unique UNIQUE (material_id, idx);

CREATE INDEX idx_vocab_items_material ON vocabulary_items (material_id, idx);
```

**Constraint**: `vocabulary_items` rows MUST belong to a material with `type = 'vocabulary_pack'`. Enforced via trigger `vocab_items_only_in_vocab_pack_trg` (raises if parent type mismatches).

---

## 4. `mock_test_items`

Per-test questions. (10–40 rows per mock test material.)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `material_id` | uuid | NOT NULL REFERENCES `materials(id)` ON DELETE CASCADE |
| `idx` | int | NOT NULL — display order |
| `format` | text | NOT NULL — one of `'multiple_choice' \| 'fill_in_blank' \| 'true_false' \| 'matching'` |
| `prompt_vi` | text | NOT NULL — question stem in Vietnamese (e.g. instructions: "Chọn đáp án đúng:") |
| `prompt_en` | text | NOT NULL — question content in English (the passage / sentence) |
| `options_en` | text[] | NOT NULL CHECK (`array_length(options_en, 1) BETWEEN 2 AND 6`) |
| `options_vi` | text[] | NULL — Vietnamese option translations (optional for fill-in-blank) |
| `correct_index` | int | NOT NULL CHECK (`correct_index >= 0`) — protected by RLS from non-admin readers |
| `explanation_vi` | text | NOT NULL — shown after grading |
| `explanation_en` | text | NULL — shown after grading on en locale |
| `points` | int | NOT NULL DEFAULT 1 CHECK (`points BETWEEN 1 AND 10`) |
| `created_at` / `updated_at` | timestamptz | |

```sql
ALTER TABLE mock_test_items
  ADD CONSTRAINT mock_test_items_idx_unique UNIQUE (material_id, idx);

CREATE INDEX idx_mock_test_items_material ON mock_test_items (material_id, idx);

-- Enforce parent material is mock_test
CREATE TRIGGER mock_test_items_parent_type_trg
  BEFORE INSERT OR UPDATE ON mock_test_items
  FOR EACH ROW EXECUTE FUNCTION check_parent_material_type('mock_test');
```

**RLS** (full policy in `supabase/migrations/081_materials_rls.sql`):
- Students: `SELECT` permitted on rows where parent material is `published`, **but a view `mock_test_items_public` excludes `correct_index` and `explanation_*`**. The base table is locked to admin only.
- Edge function `grade_mock_test` queries the base table via `SECURITY DEFINER`.

---

## 5. `material_assets`

Tracks every uploaded file (audio, image, PDF) attached to a material. Decouples asset upload from publish.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `material_id` | uuid | NOT NULL REFERENCES `materials(id)` ON DELETE CASCADE |
| `kind` | text | NOT NULL — `'audio' \| 'image' \| 'pdf' \| 'transcript'` |
| `path` | text | NOT NULL UNIQUE — storage path under `material-assets/` |
| `original_filename` | text | NULL |
| `mime_type` | text | NOT NULL |
| `size_bytes` | bigint | NOT NULL |
| `duration_sec` | int | NULL — populated for audio |
| `width` | int | NULL — populated for images |
| `height` | int | NULL — populated for images |
| `uploaded_by` | uuid | NOT NULL REFERENCES `profiles(id)` |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` |

```sql
CREATE INDEX idx_material_assets_material ON material_assets (material_id, kind);
```

---

## 6. `material_tags` and `material_tag_links`

Free-form tagging surface (topics like "tech", "weather", "Tết", "phỏng-vấn").

```sql
CREATE TABLE material_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label_vi text NOT NULL,
  label_en text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE material_tag_links (
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES material_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (material_id, tag_id)
);

CREATE INDEX idx_material_tag_links_tag ON material_tag_links (tag_id);
```

Catalog filter chip data is `material_tags WHERE slug IN (most-popular-30)`.

---

## 7. `material_collections` and `material_collection_items`

Curated learning paths (e.g. "30-day IELTS Speaking warm-up", "Phỏng vấn xin việc bằng tiếng Anh").

```sql
CREATE TABLE material_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_vi text NOT NULL,
  title_en text NOT NULL,
  summary_vi text NOT NULL,
  summary_en text NULL,
  cover_path text NULL,
  goal material_goal NULL,
  status material_status NOT NULL DEFAULT 'draft',
  author_id uuid NOT NULL REFERENCES profiles(id),
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE material_collection_items (
  collection_id uuid NOT NULL REFERENCES material_collections(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  idx int NOT NULL CHECK (idx >= 0),
  PRIMARY KEY (collection_id, material_id),
  UNIQUE (collection_id, idx)
);
```

---

## 8. `material_progress`

The per-user, per-material progress + completion record. Single source of truth for "did this user finish this?".

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `user_id` | uuid | NOT NULL REFERENCES `profiles(id)` ON DELETE CASCADE |
| `material_id` | uuid | NOT NULL REFERENCES `materials(id)` ON DELETE CASCADE |
| `started_at` | timestamptz | NOT NULL DEFAULT `now()` |
| `last_activity_at` | timestamptz | NOT NULL DEFAULT `now()` |
| `completed_at` | timestamptz | NULL |
| `completion_pct` | int | NOT NULL DEFAULT 0 CHECK (`completion_pct BETWEEN 0 AND 100`) |
| `score_pct` | int | NULL — only for mock tests |
| `gems_awarded` | int | NOT NULL DEFAULT 0 |
| `xp_awarded` | int | NOT NULL DEFAULT 0 |
| `state` | text | NOT NULL DEFAULT `'in_progress'` — `'in_progress' \| 'completed' \| 'abandoned'` |
| `meta` | jsonb | NOT NULL DEFAULT `'{}'::jsonb` — vocab-pack: `{cards_known: [uuid]}`; mock-test: `{answers: {...}}` |

```sql
ALTER TABLE material_progress
  ADD CONSTRAINT material_progress_unique_user_material UNIQUE (user_id, material_id);

CREATE INDEX idx_material_progress_user ON material_progress (user_id, last_activity_at DESC);
CREATE INDEX idx_material_progress_completed ON material_progress (user_id, completed_at DESC) WHERE completed_at IS NOT NULL;
```

**Idempotency**. Award path checks `completed_at IS NULL` before awarding; a second award attempt is a no-op.

---

## 9. `material_reviews`

Admin/teacher review queue + comments.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `material_id` | uuid | NOT NULL REFERENCES `materials(id)` ON DELETE CASCADE |
| `submitted_by` | uuid | NOT NULL REFERENCES `profiles(id)` |
| `reviewed_by` | uuid | NULL REFERENCES `profiles(id)` |
| `submitted_at` | timestamptz | NOT NULL DEFAULT `now()` |
| `decided_at` | timestamptz | NULL |
| `decision` | text | NULL — `'approved' \| 'rejected'` |
| `comment` | text | NULL — reviewer's notes |
| `checklist_passed` | jsonb | NOT NULL DEFAULT `'{}'::jsonb` — `{"vi_examples": true, "ipa": true, "translit": true, ...}` |

```sql
CREATE INDEX idx_material_reviews_material ON material_reviews (material_id, submitted_at DESC);
CREATE INDEX idx_material_reviews_pending ON material_reviews (submitted_at) WHERE decision IS NULL;
```

---

## 10. `material_translations` (forward-compatible scaffold for zh / km / lo)

Empty in v1 but structured so future locales don't require a schema migration of `materials` itself.

| Column | Type | Constraints |
|--------|------|-------------|
| `material_id` | uuid | NOT NULL REFERENCES materials(id) ON DELETE CASCADE |
| `locale` | text | NOT NULL CHECK (`locale ~ '^[a-z]{2}(-[A-Z]{2})?$'`) |
| `field` | text | NOT NULL — `'title' \| 'summary' \| 'body'` |
| `value` | text | NOT NULL |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` |
| | | PRIMARY KEY (material_id, locale, field) |

For v1, we always read `title_vi/title_en` etc. from `materials` directly. This table is filled in only when adding a 3rd locale.

---

## RPC functions

### `award_material_completion(p_user_id uuid, p_material_id uuid, p_score int default null) RETURNS jsonb`

`SECURITY DEFINER`. Atomic. Idempotent. On any unhandled exception the function writes an `audit_log` row with `event='materials.award_failed'` and payload `{user_id, material_id, error}` before re-raising; Sentry captures the exception via the existing integration. Pseudocode:

```sql
PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_material_id::text));

SELECT * INTO mat FROM materials WHERE id = p_material_id;
IF mat.status <> 'published' THEN RAISE EXCEPTION 'material not published'; END IF;

INSERT INTO material_progress (user_id, material_id, completed_at, completion_pct, score_pct, state, gems_awarded, xp_awarded)
VALUES (p_user_id, p_material_id, now(), 100, p_score,
        'completed',
        compute_gems(mat, p_score),
        compute_xp(mat, p_score))
ON CONFLICT (user_id, material_id) DO UPDATE
  SET completed_at = COALESCE(material_progress.completed_at, EXCLUDED.completed_at),
      completion_pct = GREATEST(material_progress.completion_pct, EXCLUDED.completion_pct),
      score_pct = COALESCE(material_progress.score_pct, EXCLUDED.score_pct)
  WHERE material_progress.completed_at IS NULL  -- only first time
RETURNING gems_awarded, xp_awarded INTO awarded;

IF awarded.gems_awarded IS NULL THEN
  RETURN jsonb_build_object('already_completed', true);
END IF;

INSERT INTO gems_transactions (user_id, amount, reason, material_id)
VALUES (p_user_id, awarded.gems_awarded, 'material_completion', p_material_id);

INSERT INTO xp_events (user_id, amount, source, reference_id)
VALUES (p_user_id, awarded.xp_awarded, 'material_completion', p_material_id);

RETURN jsonb_build_object(
  'already_completed', false,
  'gems_awarded', awarded.gems_awarded,
  'xp_awarded', awarded.xp_awarded
);
```

### `grade_mock_test(p_user_id uuid, p_material_id uuid, p_answers jsonb) RETURNS jsonb`

`SECURITY DEFINER`. Computes correctness server-side. **Does NOT call `award_material_completion` — mock tests award zero gems and zero XP.** If score ≥ `min_completion_pct`, upserts `material_progress` with `state='completed'`.

Returns `{ score_pct, items_correct, items_total, passed, per_item: [{idx, correct, explanation_vi}] }`.

### `recommend_next_material(p_user_id uuid) RETURNS uuid`

Plain SQL ranking by (a) user CEFR level, (b) types not completed in last 7 days, (c) overlap with user's `career_path` tags. Returns one material id.

### `compute_popularity_scores() RETURNS void`

Nightly job. Updates `materials.popularity_score`.

---

## RLS summary (full SQL in migration 081)

| Table | Role | SELECT | INSERT | UPDATE | DELETE |
|-------|------|--------|--------|--------|--------|
| `materials` | anon | published only | ✗ | ✗ | ✗ |
| `materials` | student | published, OR rows authored by self | ✗ | ✗ | ✗ |
| `materials` | teacher | published + own drafts/in_review | own (status=draft) | own (only when status ∈ draft, in_review) | ✗ |
| `materials` | admin | all | ✓ | ✓ | ✗ (use archive) |
| `material_sections` | anon | when parent published | ✗ | ✗ | ✗ |
| `material_sections` | student | when parent published or own draft | ✗ | ✗ | ✗ |
| `material_sections` | teacher | as student + own drafts | own | own | own |
| `material_sections` | admin | all | ✓ | ✓ | ✓ |
| `mock_test_items` | anon, student | **only via `mock_test_items_public` view** (no `correct_index`, no `explanation_*`) | ✗ | ✗ | ✗ |
| `mock_test_items` | teacher | full on own draft | own | own | own |
| `mock_test_items` | admin | all | ✓ | ✓ | ✓ |
| `material_progress` | student | own rows only | own (server only via RPC) | own (server only) | ✗ |
| `material_progress` | admin | all | ✗ (manual edits forbidden) | ✗ | ✗ |
| `material_reviews` | teacher | own submissions | own | ✗ | ✗ |
| `material_reviews` | admin | all | ✓ | ✓ | ✗ |
| Storage `material-assets` | anon | read public assets | ✗ | ✗ | ✗ |
| Storage `material-assets` | teacher | read all + write own | own paths | own paths | own paths |
| Storage `material-assets` | admin | all | ✓ | ✓ | ✓ |

---

## Migration order

1. `080_materials_library.sql` — types + tables + indexes + triggers
2. `081_materials_rls.sql` — policies + the `mock_test_items_public` view
3. `082_materials_storage.sql` — bucket + storage policies
4. `083_materials_rpc.sql` — `award_material_completion`, `grade_mock_test`, `recommend_next_material`, `compute_popularity_scores`
5. `084_materials_seed_vi.sql` — 30 seed materials (5 per type) with Vietnamese-first content + tags + one curated collection ("Thi tốt nghiệp THPT — Bộ luyện thi 30 ngày")

Each migration MUST have a corresponding pgTAP test file under `supabase/tests/` that asserts schema, constraints, and RLS behaviour BEFORE it is applied to staging. (TDD per Constitution II.)
