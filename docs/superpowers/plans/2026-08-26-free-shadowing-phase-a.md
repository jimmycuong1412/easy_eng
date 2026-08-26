# Free Shadowing — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an anonymous-accessible shadowing practice page that ad traffic can land on, with local word+rhythm scoring and a soft signup wall.

**Architecture:** A pack is a `materials` row of new type `shadowing`; clips are child rows in `shadowing_clips`. All scoring runs in the browser — audio never leaves the device. Anonymous progress lives in `localStorage`; the page reads published content directly through existing RLS with no server round-trip for auth.

**Tech Stack:** Next.js 14.2 (App Router), TypeScript 5.4, Supabase Postgres, Jest (`@easyeng/core` + `apps/web`), Playwright, Tailwind + existing `--et-*` CSS tokens.

**Spec:** `docs/superpowers/specs/2026-08-21-free-shadowing-design.md`

**Scope:** Phase A only. Phase B (logged-in progression, `record_shadowing_attempt`, `award_shadowing_pack` wiring, streaks, score carry-over) is a separate plan. Tasks 2 and 3 create the Phase B database objects because they belong in the same migration, but no Phase A UI calls them.

## Global Constraints

- **Audio never leaves the browser.** Scoring is client-side only. No audio upload, no server-side speech API, ever.
- **No gems.** Shadowing awards XP only. Never call `award_material_completion`.
- **XP ledger is `xp_transactions`** — columns `student_id` (not `user_id`), `amount`, `activity_type`, `description`, `career_id`. No `metadata` column. `CHECK (amount > 0)`. There is no `xp_events` table.
- **Vietnamese-first UI copy.** Vietnamese is the primary language; English strings go in `en.json` alongside.
- **Existing design tokens only.** Use `--et-bg`, `--et-bg-2`, `--et-bg-3`, `--et-fg`, `--et-fg-2`, `--et-fg-3`, `--et-coral`, `--et-green`, `--et-amber`, `--et-line`. No new tokens, no new design system work.
- **Anonymous daily clip limit is a named constant**, not a literal — it will be A/B tested.
- **Migrations are plain SQL files** in `supabase/migrations/`, numbered sequentially. Do not apply them to the remote project as part of a task; applying is a deploy step.
- Run all commands from the repo root `F:\Git\easy_eng` unless stated otherwise.

---

## File Structure

**Create:**
- `supabase/migrations/103_shadowing_enum.sql` — enum value, isolated
- `supabase/migrations/104_shadowing.sql` — tables, RLS, RPCs
- `packages/core/src/lib/shadowing/envelope.ts` — envelope type + extraction from audio samples
- `packages/core/src/lib/shadowing/score.ts` — word + rhythm + overall scoring
- `packages/core/src/lib/shadowing/index.ts` — barrel
- `packages/core/src/lib/shadowing/score.test.ts` — scoring unit tests
- `packages/core/src/lib/shadowing/envelope.test.ts` — envelope unit tests
- `packages/core/src/lib/queries/shadowing.ts` — pack fetch helpers
- `packages/core/src/lib/queries/shadowing.test.ts` — query unit tests
- `apps/web/src/lib/shadowing/anonProgress.ts` — `localStorage` state + daily limit
- `apps/web/src/lib/shadowing/__tests__/anonProgress.test.ts`
- `apps/web/src/components/shadowing/ShadowingRep.tsx` — practice + result screen
- `apps/web/src/components/shadowing/WaveformCompare.tsx` — stacked waveform view
- `apps/web/src/components/shadowing/SignupWall.tsx` — soft wall
- `apps/web/src/components/shadowing/useRecorder.ts` — mic + recognition hook
- `apps/web/src/app/[locale]/shadowing/page.tsx` — hub
- `apps/web/src/app/[locale]/shadowing/[packSlug]/page.tsx` — pack page
- `apps/web/e2e/shadowing-anonymous.spec.ts` — E2E
- `scripts/shadowing/build-clips.ts` — content pipeline (run under `ts-node`; see Task 13)

**Modify:**
- `apps/web/src/middleware.ts:20` — add `/shadowing` to `PUBLIC_ROUTES`
- `packages/core/src/index.ts` — export new modules
- `apps/web/messages/vi.json`, `apps/web/messages/en.json` — copy

---

### Task 1: Add `shadowing` to the `material_type` enum

`ALTER TYPE … ADD VALUE` cannot run in a transaction that later uses the new label, so this is its own migration file with nothing else in it. The codebase documents this at `080_materials_library.sql:38`.

**Files:**
- Create: `supabase/migrations/103_shadowing_enum.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `material_type` enum accepts `'shadowing'`, used by Task 2.

- [ ] **Step 1: Write the migration**

```sql
-- 103_shadowing_enum.sql
-- Adds the 'shadowing' material type.
--
-- ISOLATED ON PURPOSE: ALTER TYPE ... ADD VALUE cannot run in a transaction
-- block that later references the new label (see 080_materials_library.sql:38).
-- Keep this file to this one statement.

ALTER TYPE material_type ADD VALUE IF NOT EXISTS 'shadowing';
```

- [ ] **Step 2: Verify the file contains exactly one statement**

Run:
```bash
grep -c ';' supabase/migrations/103_shadowing_enum.sql
```
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/103_shadowing_enum.sql
git commit -m "feat(db): add shadowing material_type enum value"
```

---

### Task 2: Shadowing tables and RLS

Creates `shadowing_clips` (public-read when the parent pack is published, so anonymous ad traffic can load clips) and `shadowing_attempts` (own-rows-only).

**Files:**
- Create: `supabase/migrations/104_shadowing.sql`

**Interfaces:**
- Consumes: `material_type` enum value `'shadowing'` from Task 1.
- Produces: tables `shadowing_clips` (`id`, `material_id`, `idx`, `text_en`, `text_vi`, `audio_path`, `duration_ms`, `reference_envelope`, `created_at`) and `shadowing_attempts`. Task 3 appends RPCs to this same file. Task 6 queries `shadowing_clips`.

- [ ] **Step 1: Write the migration**

```sql
-- 104_shadowing.sql
-- Free Shadowing — tables, RLS, RPCs.
-- Spec: docs/superpowers/specs/2026-08-21-free-shadowing-design.md
--
-- Model: the PACK is the materials row (type = 'shadowing'); individual clips
-- are child rows here. Clips cannot be their own materials rows because
-- materials.duration_min is CHECK (BETWEEN 1 AND 90) and a clip is ~10s.

-- ============================================================
-- 1. shadowing_clips
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shadowing_clips (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id         uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  idx                 int  NOT NULL CHECK (idx >= 0),
  text_en             text NOT NULL CHECK (length(text_en) BETWEEN 1 AND 300),
  text_vi             text NOT NULL CHECK (length(text_vi) BETWEEN 1 AND 300),
  audio_path          text NOT NULL,
  duration_ms         int  NOT NULL CHECK (duration_ms BETWEEN 500 AND 60000),
  -- Precomputed energy/pause profile the rhythm score compares against.
  -- Built once at content-build time; never computed at runtime.
  reference_envelope  jsonb NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT shadowing_clips_material_idx_unique UNIQUE (material_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_shadowing_clips_material
  ON public.shadowing_clips (material_id, idx);

ALTER TABLE public.shadowing_clips ENABLE ROW LEVEL SECURITY;

-- Anonymous read when the parent pack is published. Mirrors
-- materials_select_published: the published branch has no auth.uid() term,
-- which is what lets cold ad traffic load clips with no session.
DROP POLICY IF EXISTS shadowing_clips_select_published ON public.shadowing_clips;
CREATE POLICY shadowing_clips_select_published
  ON public.shadowing_clips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.materials m
      WHERE m.id = shadowing_clips.material_id
        AND (
          m.status = 'published'
          OR m.author_id = auth.uid()
          OR public.get_my_role() = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS shadowing_clips_write_admin ON public.shadowing_clips;
CREATE POLICY shadowing_clips_write_admin
  ON public.shadowing_clips FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- 2. shadowing_attempts  (append-only history)
-- ============================================================
-- Separate from material_progress because that table is
-- UNIQUE (user_id, material_id) and so cannot hold a history, and
-- improvement-over-time is the retention hook.
CREATE TABLE IF NOT EXISTS public.shadowing_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id        uuid NOT NULL REFERENCES public.shadowing_clips(id) ON DELETE CASCADE,
  word_score     int  NULL CHECK (word_score IS NULL OR word_score BETWEEN 0 AND 100),
  rhythm_score   int  NOT NULL CHECK (rhythm_score BETWEEN 0 AND 100),
  overall_score  int  NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  heard_text     text NOT NULL DEFAULT '',
  -- Stored from day one so adaptive clip selection is possible later
  -- without a backfill. Not read by any Phase A or Phase B code.
  weak_words     text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- word_score is nullable: browsers without SpeechRecognition (Firefox, some
-- Android WebViews) produce a rhythm-only attempt.

CREATE INDEX IF NOT EXISTS idx_shadowing_attempts_user_clip
  ON public.shadowing_attempts (user_id, clip_id, created_at DESC);

ALTER TABLE public.shadowing_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shadowing_attempts_own_select ON public.shadowing_attempts;
CREATE POLICY shadowing_attempts_own_select
  ON public.shadowing_attempts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS shadowing_attempts_own_insert ON public.shadowing_attempts;
CREATE POLICY shadowing_attempts_own_insert
  ON public.shadowing_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Verify the SQL parses**

There is no local Postgres requirement for this step — check structure only.

Run:
```bash
grep -c "CREATE TABLE IF NOT EXISTS" supabase/migrations/104_shadowing.sql
```
Expected: `2`

Run:
```bash
grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/104_shadowing.sql
```
Expected: `2`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/104_shadowing.sql
git commit -m "feat(db): add shadowing_clips and shadowing_attempts tables with RLS"
```

---

### Task 3: Shadowing RPCs

Appends three functions to `104_shadowing.sql`. `get_shadowing_pack` is Phase A (anonymous read); the other two are Phase B objects created here because they belong in the same migration.

`award_shadowing_pack` guards on `material_progress.completed_at`, not the ledger, because `xp_transactions` has no unique constraint and no `metadata` column.

**Files:**
- Modify: `supabase/migrations/104_shadowing.sql` (append)

**Interfaces:**
- Consumes: tables from Task 2.
- Produces: `get_shadowing_pack(p_slug text)` returning columns `(clip_id uuid, idx int, text_en text, text_vi text, audio_path text, duration_ms int, reference_envelope jsonb, best_score int)`. Task 6 calls this.

- [ ] **Step 1: Append the RPCs**

Append to `supabase/migrations/104_shadowing.sql`:

```sql
-- ============================================================
-- 3. get_shadowing_pack — anonymous-safe pack + clips read
-- ============================================================
-- SECURITY INVOKER on purpose: it must run as the caller so the RLS policies
-- above decide visibility. Anonymous callers see published packs only.
CREATE OR REPLACE FUNCTION public.get_shadowing_pack(p_slug text)
RETURNS TABLE (
  clip_id            uuid,
  idx                int,
  text_en            text,
  text_vi            text,
  audio_path         text,
  duration_ms        int,
  reference_envelope jsonb,
  best_score         int
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    c.idx,
    c.text_en,
    c.text_vi,
    c.audio_path,
    c.duration_ms,
    c.reference_envelope,
    (
      SELECT MAX(a.overall_score)
      FROM shadowing_attempts a
      WHERE a.clip_id = c.id
        AND a.user_id = auth.uid()
    )::int AS best_score
  FROM shadowing_clips c
  JOIN materials m ON m.id = c.material_id
  WHERE m.slug = p_slug
    AND m.type = 'shadowing'
  ORDER BY c.idx;
$$;

GRANT EXECUTE ON FUNCTION public.get_shadowing_pack(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_shadowing_pack IS
  'Ordered clips for a shadowing pack. Anonymous-safe: SECURITY INVOKER, relies on RLS. best_score is NULL for anonymous callers.';

-- ============================================================
-- 4. award_shadowing_pack — XP only, once per pack  [PHASE B]
-- ============================================================
-- Deliberately NOT award_material_completion: that function grants gems, and
-- its idempotency guard IS the gem transaction, so a gems-free path through it
-- would have no replay protection and would re-grant XP on every call.
--
-- Guard here is material_progress.completed_at, which is safe because
-- material_progress is UNIQUE (user_id, material_id) — the NULL -> non-NULL
-- transition happens at most once.
CREATE OR REPLACE FUNCTION public.award_shadowing_pack(p_material_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_material     materials%ROWTYPE;
  v_was_complete boolean;
  v_xp           int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Serialize concurrent completions for this (user, material).
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_uid::text || p_material_id::text, 0)
  );

  SELECT * INTO v_material FROM materials WHERE id = p_material_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_material.type <> 'shadowing' THEN
    RAISE EXCEPTION 'not a shadowing pack' USING ERRCODE = 'P0001';
  END IF;

  IF v_material.status <> 'published' THEN
    RAISE EXCEPTION 'material not publishable' USING ERRCODE = 'P0001';
  END IF;

  -- Was this pack already completed before this call?
  SELECT (completed_at IS NOT NULL) INTO v_was_complete
  FROM material_progress
  WHERE user_id = v_uid AND material_id = p_material_id;

  INSERT INTO material_progress (
    user_id, material_id, started_at, last_activity_at, completed_at,
    completion_pct, gems_awarded, xp_awarded, state
  )
  VALUES (
    v_uid, p_material_id, now(), now(), now(),
    100, 0, v_material.xp_reward, 'completed'
  )
  ON CONFLICT (user_id, material_id) DO UPDATE
    SET completed_at     = COALESCE(material_progress.completed_at, EXCLUDED.completed_at),
        last_activity_at = EXCLUDED.last_activity_at,
        completion_pct   = GREATEST(material_progress.completion_pct, EXCLUDED.completion_pct),
        xp_awarded       = CASE WHEN material_progress.completed_at IS NULL
                                THEN EXCLUDED.xp_awarded
                                ELSE material_progress.xp_awarded END,
        state            = 'completed';

  -- Already complete before this call: no ledger write.
  IF COALESCE(v_was_complete, false) THEN
    RETURN jsonb_build_object('already_completed', true, 'xp_awarded', 0);
  END IF;

  v_xp := COALESCE(v_material.xp_reward, 0);

  -- xp_transactions has CHECK (amount > 0): a zero-XP pack must skip the
  -- insert rather than raise. NOTE: column is student_id, not user_id, and
  -- there is no metadata column.
  IF v_xp > 0 THEN
    INSERT INTO xp_transactions (student_id, amount, activity_type, description)
    VALUES (
      v_uid,
      v_xp,
      'shadowing_pack_completion',
      'Hoàn thành gói luyện nói theo: ' || v_material.title_vi
    );
  END IF;

  -- Gems are deliberately never granted for shadowing.
  RETURN jsonb_build_object('already_completed', false, 'xp_awarded', v_xp);
END;
$$;

REVOKE ALL ON FUNCTION public.award_shadowing_pack(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_shadowing_pack(uuid) TO authenticated;

COMMENT ON FUNCTION public.award_shadowing_pack IS
  'XP-only grant for shadowing pack completion. Never grants gems. Idempotent via material_progress.completed_at.';

-- ============================================================
-- 5. record_shadowing_attempt  [PHASE B]
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_shadowing_attempt(
  p_clip_id      uuid,
  p_word_score   int,
  p_rhythm_score int,
  p_overall      int,
  p_heard_text   text DEFAULT '',
  p_weak_words   text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_material_id uuid;
  v_total       int;
  v_done        int;
  v_award       jsonb := jsonb_build_object('already_completed', true, 'xp_awarded', 0);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT material_id INTO v_material_id
  FROM shadowing_clips WHERE id = p_clip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clip not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO shadowing_attempts (
    user_id, clip_id, word_score, rhythm_score, overall_score, heard_text, weak_words
  )
  VALUES (
    v_uid, p_clip_id, p_word_score, p_rhythm_score, p_overall, COALESCE(p_heard_text, ''), COALESCE(p_weak_words, '{}')
  );

  UPDATE material_progress
     SET last_activity_at = now()
   WHERE user_id = v_uid AND material_id = v_material_id;

  -- Award once every clip in the pack has at least one attempt.
  SELECT COUNT(*) INTO v_total
  FROM shadowing_clips WHERE material_id = v_material_id;

  SELECT COUNT(DISTINCT a.clip_id) INTO v_done
  FROM shadowing_attempts a
  JOIN shadowing_clips c ON c.id = a.clip_id
  WHERE a.user_id = v_uid AND c.material_id = v_material_id;

  IF v_total > 0 AND v_done >= v_total THEN
    v_award := public.award_shadowing_pack(v_material_id);
  END IF;

  RETURN jsonb_build_object('pack_complete', v_done >= v_total, 'award', v_award);
END;
$$;

REVOKE ALL ON FUNCTION public.record_shadowing_attempt(uuid, int, int, int, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_shadowing_attempt(uuid, int, int, int, text, text[]) TO authenticated;
```

- [ ] **Step 2: Verify no gem grant slipped in**

Run:
```bash
grep -vn '^\s*--' supabase/migrations/104_shadowing.sql | grep -nE "gem_transactions|award_material_completion\("
```
Expected: no output (exit code 1). Any match is a bug — shadowing must never touch the gem ledger.

Comment lines are excluded because the file's own explanatory comments name
`award_material_completion` to record why it is NOT used; a bare grep would
match its own documentation. `gems_awarded = 0` written to `material_progress`
is expected and is not a gem grant — that column is NOT NULL on an existing
table.

- [ ] **Step 3: Verify the XP insert uses the real column names**

Run:
```bash
grep -n "INSERT INTO xp_transactions" -A 2 supabase/migrations/104_shadowing.sql
```
Expected: shows `(student_id, amount, activity_type, description)` — not `user_id`, and no `metadata`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/104_shadowing.sql
git commit -m "feat(db): add shadowing RPCs with XP-only, gem-free awards"
```

---

### Task 4: Envelope extraction module

The `reference_envelope` is a normalised loudness profile. Both the content pipeline (Task 9) and the browser produce one using this same function, so a reference and an attempt are always comparable.

**Files:**
- Create: `packages/core/src/lib/shadowing/envelope.ts`
- Test: `packages/core/src/lib/shadowing/envelope.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Envelope = { bins: number[]; durationMs: number }`
  - `extractEnvelope(samples: Float32Array, sampleRate: number, binCount?: number): Envelope`
  - `BIN_COUNT = 32`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/lib/shadowing/envelope.test.ts`:

```ts
import { extractEnvelope, BIN_COUNT, type Envelope } from './envelope';

// 1 second of silence at 8 kHz.
function silence(seconds: number, rate = 8000): Float32Array {
  return new Float32Array(Math.round(seconds * rate));
}

// A tone occupying [startFrac, endFrac] of the buffer, silence elsewhere.
function burst(seconds: number, startFrac: number, endFrac: number, rate = 8000): Float32Array {
  const buf = silence(seconds, rate);
  const from = Math.floor(buf.length * startFrac);
  const to = Math.floor(buf.length * endFrac);
  for (let i = from; i < to; i++) buf[i] = Math.sin(i * 0.3);
  return buf;
}

describe('extractEnvelope', () => {
  it('produces BIN_COUNT bins', () => {
    const env = extractEnvelope(burst(1, 0, 1), 8000);
    expect(env.bins).toHaveLength(BIN_COUNT);
  });

  it('reports duration in milliseconds from sample count and rate', () => {
    const env = extractEnvelope(silence(2), 8000);
    expect(env.durationMs).toBe(2000);
  });

  it('normalises the loudest bin to 1', () => {
    const env = extractEnvelope(burst(1, 0.25, 0.75), 8000);
    expect(Math.max(...env.bins)).toBeCloseTo(1, 5);
  });

  it('marks silent regions near zero and loud regions high', () => {
    // Energy only in the middle half of the clip.
    const env = extractEnvelope(burst(1, 0.5, 1.0), 8000);
    const firstQuarter = env.bins.slice(0, BIN_COUNT / 4);
    const lastQuarter = env.bins.slice(-BIN_COUNT / 4);
    expect(Math.max(...firstQuarter)).toBeLessThan(0.05);
    expect(Math.max(...lastQuarter)).toBeGreaterThan(0.5);
  });

  it('returns all-zero bins and zero duration for an empty buffer', () => {
    const env: Envelope = extractEnvelope(new Float32Array(0), 8000);
    expect(env.durationMs).toBe(0);
    expect(env.bins).toHaveLength(BIN_COUNT);
    expect(env.bins.every((b) => b === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter @easyeng/core exec jest src/lib/shadowing/envelope.test.ts
```
Expected: FAIL — `Cannot find module './envelope'`.

- [ ] **Step 3: Write the implementation**

Create `packages/core/src/lib/shadowing/envelope.ts`:

```ts
/**
 * Loudness envelope extraction for shadowing rhythm scoring.
 *
 * The same function runs in two places — the content build script (over decoded
 * reference audio) and the browser (over a recorded attempt) — so a reference
 * and an attempt are always directly comparable.
 *
 * The envelope is intentionally tiny: 32 normalised RMS bins plus a duration.
 * It is stored per clip in shadowing_clips.reference_envelope.
 */

export const BIN_COUNT = 32;

export interface Envelope {
  /** Normalised RMS per bin, loudest bin == 1. Length is always BIN_COUNT. */
  bins: number[];
  /** Clip length in milliseconds. */
  durationMs: number;
}

/**
 * Reduce raw PCM samples to a normalised loudness envelope.
 *
 * @param samples   Mono PCM in [-1, 1].
 * @param sampleRate Samples per second.
 * @param binCount  Number of bins; defaults to BIN_COUNT.
 */
export function extractEnvelope(
  samples: Float32Array,
  sampleRate: number,
  binCount: number = BIN_COUNT,
): Envelope {
  const bins = new Array<number>(binCount).fill(0);

  if (samples.length === 0 || sampleRate <= 0) {
    return { bins, durationMs: 0 };
  }

  const perBin = samples.length / binCount;

  for (let b = 0; b < binCount; b++) {
    const from = Math.floor(b * perBin);
    const to = Math.min(samples.length, Math.floor((b + 1) * perBin));
    let sumSquares = 0;
    let n = 0;
    for (let i = from; i < to; i++) {
      sumSquares += samples[i] * samples[i];
      n++;
    }
    bins[b] = n > 0 ? Math.sqrt(sumSquares / n) : 0;
  }

  const peak = Math.max(...bins);
  if (peak > 0) {
    for (let b = 0; b < binCount; b++) bins[b] = bins[b] / peak;
  }

  return {
    bins,
    durationMs: Math.round((samples.length / sampleRate) * 1000),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter @easyeng/core exec jest src/lib/shadowing/envelope.test.ts
```
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/lib/shadowing/envelope.ts packages/core/src/lib/shadowing/envelope.test.ts
git commit -m "feat(core): add loudness envelope extraction for shadowing"
```

---

### Task 5: Scoring module

Word scoring is lifted from `apps/web/src/components/materials/PronunciationPractice.tsx:27-75` (LCS + Levenshtein) into a React-free module so it is unit-testable. Rhythm scoring is new.

**Files:**
- Create: `packages/core/src/lib/shadowing/score.ts`
- Create: `packages/core/src/lib/shadowing/index.ts`
- Test: `packages/core/src/lib/shadowing/score.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `Envelope`, `extractEnvelope`, `BIN_COUNT` from Task 4.
- Produces:
  - `type WordEval = { word: string; ok: boolean }`
  - `type ShadowingScore = { wordScore: number | null; rhythmScore: number; overall: number; words: WordEval[]; weakWords: string[] }`
  - `scoreWords(target: string, spoken: string): { score: number; words: WordEval[] }`
  - `scoreRhythm(reference: Envelope, attempt: Envelope): number`
  - `scoreAttempt(args: { target: string; spoken: string | null; reference: Envelope; attempt: Envelope }): ShadowingScore`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/lib/shadowing/score.test.ts`:

```ts
import { scoreWords, scoreRhythm, scoreAttempt } from './score';
import { BIN_COUNT, type Envelope } from './envelope';

const env = (bins: number[], durationMs: number): Envelope => ({ bins, durationMs });
const flat = (value: number, durationMs = 2000): Envelope =>
  env(new Array(BIN_COUNT).fill(value), durationMs);

describe('scoreWords', () => {
  it('scores an exact match 100', () => {
    const r = scoreWords('the weather is nice', 'the weather is nice');
    expect(r.score).toBe(100);
    expect(r.words.every((w) => w.ok)).toBe(true);
  });

  it('ignores case and punctuation', () => {
    expect(scoreWords('The weather is nice.', 'the WEATHER is nice').score).toBe(100);
  });

  it('marks a missing word as not ok and lowers the score', () => {
    const r = scoreWords('the weather is nice', 'the weather nice');
    expect(r.score).toBe(75);
    expect(r.words.find((w) => w.word === 'is')?.ok).toBe(false);
  });

  it('accepts near-misses within the Levenshtein tolerance', () => {
    // "weather" vs "wether" is one deletion — within tolerance.
    expect(scoreWords('weather', 'wether').score).toBe(100);
  });

  it('scores an empty target 0 without throwing', () => {
    expect(scoreWords('', 'anything').score).toBe(0);
  });
});

describe('scoreRhythm', () => {
  it('scores identical envelopes 100', () => {
    const e = env([0, 0.5, 1, 0.5, ...new Array(BIN_COUNT - 4).fill(0)], 2000);
    expect(scoreRhythm(e, e)).toBe(100);
  });

  it('penalises a large duration mismatch', () => {
    const reference = flat(0.5, 2000);
    const doubled = flat(0.5, 4000);
    expect(scoreRhythm(reference, doubled)).toBeLessThan(70);
  });

  it('penalises misaligned energy at matching duration', () => {
    const front = env([...new Array(BIN_COUNT / 2).fill(1), ...new Array(BIN_COUNT / 2).fill(0)], 2000);
    const back = env([...new Array(BIN_COUNT / 2).fill(0), ...new Array(BIN_COUNT / 2).fill(1)], 2000);
    expect(scoreRhythm(front, back)).toBeLessThan(50);
  });

  it('never returns a value outside 0..100', () => {
    const s = scoreRhythm(flat(1, 500), flat(0, 30000));
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe('scoreAttempt', () => {
  const reference = flat(0.5, 2000);

  it('blends word and rhythm when a transcript is available', () => {
    const r = scoreAttempt({
      target: 'the weather is nice',
      spoken: 'the weather is nice',
      reference,
      attempt: flat(0.5, 2000),
    });
    expect(r.wordScore).toBe(100);
    expect(r.rhythmScore).toBe(100);
    expect(r.overall).toBe(100);
  });

  it('falls back to rhythm-only when no transcript is available', () => {
    // Browsers without SpeechRecognition pass spoken = null. The overall score
    // must equal the rhythm score, NOT treat the missing words as 0.
    const r = scoreAttempt({
      target: 'the weather is nice',
      spoken: null,
      reference,
      attempt: flat(0.5, 2000),
    });
    expect(r.wordScore).toBeNull();
    expect(r.overall).toBe(r.rhythmScore);
  });

  it('collects weak words from the word evaluation', () => {
    const r = scoreAttempt({
      target: 'the weather is nice',
      spoken: 'the weather nice',
      reference,
      attempt: flat(0.5, 2000),
    });
    expect(r.weakWords).toContain('is');
  });

  it('reports no weak words on a perfect attempt', () => {
    const r = scoreAttempt({
      target: 'the weather is nice',
      spoken: 'the weather is nice',
      reference,
      attempt: flat(0.5, 2000),
    });
    expect(r.weakWords).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter @easyeng/core exec jest src/lib/shadowing/score.test.ts
```
Expected: FAIL — `Cannot find module './score'`.

- [ ] **Step 3: Write the implementation**

Create `packages/core/src/lib/shadowing/score.ts`:

```ts
/**
 * Shadowing scoring — runs entirely in the browser. No audio is ever uploaded.
 *
 * Two independent dimensions:
 *   wordScore   — did the recogniser understand the same words? (intelligibility)
 *   rhythmScore — did the attempt's loudness profile match the reference?
 *                 (pacing, pauses, stress placement — what shadowing trains)
 *
 * Word alignment (LCS + Levenshtein tolerance) is lifted from
 * apps/web/src/components/materials/PronunciationPractice.tsx so it can be
 * unit-tested without a DOM.
 */

import { type Envelope } from './envelope';

export interface WordEval {
  word: string;
  ok: boolean;
}

export interface ShadowingScore {
  /** null when the browser has no SpeechRecognition support. */
  wordScore: number | null;
  rhythmScore: number;
  overall: number;
  words: WordEval[];
  weakWords: string[];
}

/** Weight of the word dimension when both dimensions are available. */
const WORD_WEIGHT = 0.6;

/**
 * Weight of the duration term within the rhythm score; the remainder goes to
 * envelope shape. Shape carries slightly more because matching a clip's length
 * while stressing the wrong syllables is the failure this feature exists to catch.
 */
const DURATION_WEIGHT = 0.45;

const normWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const tokenize = (s: string) => s.split(/\s+/).map(normWord).filter(Boolean);

function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}

const wordClose = (a: string, b: string) =>
  a === b || lev(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.2));

export function scoreWords(
  target: string,
  spoken: string,
): { score: number; words: WordEval[] } {
  const t = tokenize(target);
  const s = tokenize(spoken);
  if (!t.length) return { score: 0, words: [] };

  const m = t.length;
  const n = s.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = wordClose(t[i - 1], s[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const matched = new Array<boolean>(m).fill(false);
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (wordClose(t[i - 1], s[j - 1])) {
      matched[i - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const rawWords = target.split(/\s+/).filter(Boolean);
  const correct = matched.filter(Boolean).length;
  return {
    score: Math.round((correct / m) * 100),
    words: t.map((w, k) => ({ word: rawWords[k] ?? w, ok: matched[k] })),
  };
}

/**
 * Compare an attempt's envelope against the reference.
 *
 * Two terms, weighted slightly toward shape: duration agreement (are you pacing
 * it like the speaker?) and bin-by-bin shape agreement (are your pauses and
 * stresses in the same places?). Both are needed — matching the duration with
 * the wrong internal rhythm is a common and important failure mode, so shape
 * carries the larger weight.
 *
 * The duration term is SQUARED. A linear ratio is far too forgiving: speaking a
 * clip in half the reference time would otherwise still score 75, which is not
 * a passing rhythm. Squaring makes the penalty grow with the size of the error.
 */
export function scoreRhythm(reference: Envelope, attempt: Envelope): number {
  if (reference.durationMs <= 0 || attempt.durationMs <= 0) return 0;

  // Duration agreement: ratio of shorter to longer, so it is symmetric.
  // Squared so large pacing errors are penalised sharply (see above).
  const rawRatio =
    Math.min(reference.durationMs, attempt.durationMs) /
    Math.max(reference.durationMs, attempt.durationMs);
  const ratio = rawRatio * rawRatio;

  // Shape agreement: 1 - mean absolute difference across bins.
  const n = Math.min(reference.bins.length, attempt.bins.length);
  if (n === 0) return 0;
  let diff = 0;
  for (let k = 0; k < n; k++) {
    diff += Math.abs(reference.bins[k] - attempt.bins[k]);
  }
  const shape = Math.max(0, 1 - diff / n);

  const blended = DURATION_WEIGHT * ratio + (1 - DURATION_WEIGHT) * shape;
  return Math.max(0, Math.min(100, Math.round(blended * 100)));
}

export function scoreAttempt(args: {
  target: string;
  /** null when SpeechRecognition is unavailable — yields a rhythm-only score. */
  spoken: string | null;
  reference: Envelope;
  attempt: Envelope;
}): ShadowingScore {
  const rhythmScore = scoreRhythm(args.reference, args.attempt);

  if (args.spoken === null) {
    // Rhythm-only. Missing word data must not be scored as zero — that would
    // punish Firefox and Android WebView users for their browser.
    return {
      wordScore: null,
      rhythmScore,
      overall: rhythmScore,
      words: [],
      weakWords: [],
    };
  }

  const { score: wordScore, words } = scoreWords(args.target, args.spoken);
  const overall = Math.round(WORD_WEIGHT * wordScore + (1 - WORD_WEIGHT) * rhythmScore);

  return {
    wordScore,
    rhythmScore,
    overall: Math.max(0, Math.min(100, overall)),
    words,
    weakWords: words.filter((w) => !w.ok).map((w) => w.word),
  };
}
```

Create `packages/core/src/lib/shadowing/index.ts`:

```ts
export * from './envelope';
export * from './score';
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter @easyeng/core exec jest src/lib/shadowing
```
Expected: PASS, 18 tests across both files.

- [ ] **Step 5: Export from the core barrel**

In `packages/core/src/index.ts`, add after the existing `export * from './lib/queries/materials';` line:

```ts
export * from './lib/shadowing';
```

- [ ] **Step 6: Type-check**

Run:
```bash
pnpm --filter @easyeng/core exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/lib/shadowing packages/core/src/index.ts
git commit -m "feat(core): add shadowing word and rhythm scoring"
```

---

### Task 6: Pack query helper

**Files:**
- Create: `packages/core/src/lib/queries/shadowing.ts`
- Test: `packages/core/src/lib/queries/shadowing.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `get_shadowing_pack` RPC from Task 3; `Envelope` from Task 4.
- Produces:
  - `type ShadowingClip = { clipId: string; idx: number; textEn: string; textVi: string; audioPath: string; durationMs: number; referenceEnvelope: Envelope; bestScore: number | null }`
  - `fetchShadowingPack(client: SupabaseClient, slug: string): Promise<ShadowingClip[]>`
  - `fetchShadowingPacks(client: SupabaseClient): Promise<ShadowingPackSummary[]>`
  - `type ShadowingPackSummary = { id: string; slug: string; titleVi: string; titleEn: string | null; summaryVi: string; level: string; clipCount: number }`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/lib/queries/shadowing.test.ts`:

```ts
import { fetchShadowingPack, fetchShadowingPacks } from './shadowing';

describe('fetchShadowingPack', () => {
  function mockRpc(result: { data?: unknown; error?: unknown }) {
    const rpc = jest.fn().mockResolvedValue(result);
    return { client: { rpc } as any, rpc };
  }

  const row = {
    clip_id: 'c1',
    idx: 0,
    text_en: 'Hello there.',
    text_vi: 'Xin chào.',
    audio_path: 'shadowing/greetings/01.mp3',
    duration_ms: 1800,
    reference_envelope: { bins: [0, 1], durationMs: 1800 },
    best_score: 82,
  };

  it('calls get_shadowing_pack with the slug', async () => {
    const m = mockRpc({ data: [row], error: null });
    await fetchShadowingPack(m.client, 'greetings');
    expect(m.rpc).toHaveBeenCalledWith('get_shadowing_pack', { p_slug: 'greetings' });
  });

  it('maps snake_case rows to camelCase clips', async () => {
    const m = mockRpc({ data: [row], error: null });
    const out = await fetchShadowingPack(m.client, 'greetings');
    expect(out).toEqual([
      {
        clipId: 'c1',
        idx: 0,
        textEn: 'Hello there.',
        textVi: 'Xin chào.',
        audioPath: 'shadowing/greetings/01.mp3',
        durationMs: 1800,
        referenceEnvelope: { bins: [0, 1], durationMs: 1800 },
        bestScore: 82,
      },
    ]);
  });

  it('maps a null best_score to null (anonymous caller)', async () => {
    const m = mockRpc({ data: [{ ...row, best_score: null }], error: null });
    const out = await fetchShadowingPack(m.client, 'greetings');
    expect(out[0].bestScore).toBeNull();
  });

  it('returns [] when data is null', async () => {
    const m = mockRpc({ data: null, error: null });
    expect(await fetchShadowingPack(m.client, 'greetings')).toEqual([]);
  });

  it('throws when the rpc errors', async () => {
    const m = mockRpc({ data: null, error: new Error('boom') });
    await expect(fetchShadowingPack(m.client, 'greetings')).rejects.toThrow('boom');
  });
});

describe('fetchShadowingPacks', () => {
  function mockSelect(result: { data?: unknown; error?: unknown }) {
    const order = jest.fn().mockResolvedValue(result);
    const eq2 = jest.fn(() => ({ order }));
    const eq1 = jest.fn(() => ({ eq: eq2 }));
    const select = jest.fn(() => ({ eq: eq1 }));
    const from = jest.fn(() => ({ select }));
    return { client: { from } as any, from, select, eq1, eq2, order };
  }

  it('selects published shadowing packs only', async () => {
    const m = mockSelect({ data: [], error: null });
    await fetchShadowingPacks(m.client);
    expect(m.from).toHaveBeenCalledWith('materials');
    expect(m.eq1).toHaveBeenCalledWith('type', 'shadowing');
    expect(m.eq2).toHaveBeenCalledWith('status', 'published');
  });

  it('maps rows and counts clips', async () => {
    const m = mockSelect({
      data: [
        {
          id: 'm1',
          slug: 'job-interview',
          title_vi: 'Phỏng vấn xin việc',
          title_en: 'Job interview',
          summary_vi: 'Luyện 10 câu.',
          level: 'b1',
          shadowing_clips: [{ count: 10 }],
        },
      ],
      error: null,
    });
    const out = await fetchShadowingPacks(m.client);
    expect(out).toEqual([
      {
        id: 'm1',
        slug: 'job-interview',
        titleVi: 'Phỏng vấn xin việc',
        titleEn: 'Job interview',
        summaryVi: 'Luyện 10 câu.',
        level: 'b1',
        clipCount: 10,
      },
    ]);
  });

  it('reports clipCount 0 when the count aggregate is missing', async () => {
    const m = mockSelect({
      data: [
        {
          id: 'm1',
          slug: 's',
          title_vi: 't',
          title_en: null,
          summary_vi: 'x',
          level: 'a2',
          shadowing_clips: [],
        },
      ],
      error: null,
    });
    expect((await fetchShadowingPacks(m.client))[0].clipCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter @easyeng/core exec jest src/lib/queries/shadowing.test.ts
```
Expected: FAIL — `Cannot find module './shadowing'`.

- [ ] **Step 3: Write the implementation**

Create `packages/core/src/lib/queries/shadowing.ts`:

```ts
/**
 * Free Shadowing — Supabase data-access helpers.
 *
 * Both helpers work for anonymous callers: shadowing packs and clips are
 * readable without a session when the pack is published (see migration 104).
 * That is what lets cold ad traffic load a practice page with no signup.
 *
 * Server-side: import `createClient` from '@/lib/supabase/server'.
 * Client-side: import `getSupabaseClient` from '@/lib/supabase/client'.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Envelope } from '../shadowing/envelope';

export interface ShadowingClip {
  clipId: string;
  idx: number;
  textEn: string;
  textVi: string;
  audioPath: string;
  durationMs: number;
  referenceEnvelope: Envelope;
  /** Caller's best score for this clip; null when anonymous or never attempted. */
  bestScore: number | null;
}

export interface ShadowingPackSummary {
  id: string;
  slug: string;
  titleVi: string;
  titleEn: string | null;
  summaryVi: string;
  level: string;
  clipCount: number;
}

interface ClipRow {
  clip_id: string;
  idx: number;
  text_en: string;
  text_vi: string;
  audio_path: string;
  duration_ms: number;
  reference_envelope: Envelope;
  best_score: number | null;
}

export async function fetchShadowingPack(
  client: SupabaseClient,
  slug: string,
): Promise<ShadowingClip[]> {
  const { data, error } = await client.rpc('get_shadowing_pack', { p_slug: slug });
  if (error) throw error;
  const rows = (data ?? []) as ClipRow[];
  return rows.map((r) => ({
    clipId: r.clip_id,
    idx: r.idx,
    textEn: r.text_en,
    textVi: r.text_vi,
    audioPath: r.audio_path,
    durationMs: r.duration_ms,
    referenceEnvelope: r.reference_envelope,
    bestScore: r.best_score ?? null,
  }));
}

interface PackRow {
  id: string;
  slug: string;
  title_vi: string;
  title_en: string | null;
  summary_vi: string;
  level: string;
  shadowing_clips: Array<{ count: number }>;
}

export async function fetchShadowingPacks(
  client: SupabaseClient,
): Promise<ShadowingPackSummary[]> {
  const { data, error } = await client
    .from('materials')
    .select('id, slug, title_vi, title_en, summary_vi, level, shadowing_clips(count)')
    .eq('type', 'shadowing')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as unknown as PackRow[];
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    titleVi: r.title_vi,
    titleEn: r.title_en,
    summaryVi: r.summary_vi,
    level: r.level,
    clipCount: r.shadowing_clips?.[0]?.count ?? 0,
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter @easyeng/core exec jest src/lib/queries/shadowing.test.ts
```
Expected: PASS, 8 tests.

- [ ] **Step 5: Export from the core barrel**

In `packages/core/src/index.ts`, add next to the other query exports:

```ts
export * from './lib/queries/shadowing';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/lib/queries/shadowing.ts packages/core/src/lib/queries/shadowing.test.ts packages/core/src/index.ts
git commit -m "feat(core): add shadowing pack query helpers"
```

---

### Task 7: Anonymous progress and the daily limit

Tracks anonymous reps in `localStorage`. Deliberately not hardened — a visitor who clears storage gets more reps, and defending against that would cost more than it saves.

**Files:**
- Create: `apps/web/src/lib/shadowing/anonProgress.ts`
- Test: `apps/web/src/lib/shadowing/__tests__/anonProgress.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ANON_DAILY_CLIP_LIMIT: number` (value `3`)
  - `type AnonProgress = { date: string; attempts: Array<{ clipId: string; overall: number }> }`
  - `readAnonProgress(): AnonProgress`
  - `recordAnonAttempt(clipId: string, overall: number): AnonProgress`
  - `anonClipsUsed(): number`
  - `isAnonLimitReached(): boolean`
  - `clearAnonProgress(): void`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/shadowing/__tests__/anonProgress.test.ts`:

```ts
import {
  ANON_DAILY_CLIP_LIMIT,
  readAnonProgress,
  recordAnonAttempt,
  anonClipsUsed,
  isAnonLimitReached,
  clearAnonProgress,
} from '../anonProgress';

describe('anonProgress', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-26T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts empty for today', () => {
    const p = readAnonProgress();
    expect(p.date).toBe('2026-08-26');
    expect(p.attempts).toEqual([]);
    expect(anonClipsUsed()).toBe(0);
  });

  it('records an attempt', () => {
    recordAnonAttempt('c1', 82);
    expect(readAnonProgress().attempts).toEqual([{ clipId: 'c1', overall: 82 }]);
    expect(anonClipsUsed()).toBe(1);
  });

  it('counts distinct clips, not repeated attempts on one clip', () => {
    recordAnonAttempt('c1', 50);
    recordAnonAttempt('c1', 90);
    expect(anonClipsUsed()).toBe(1);
    expect(isAnonLimitReached()).toBe(false);
  });

  it('keeps the best score when a clip is retried', () => {
    recordAnonAttempt('c1', 50);
    recordAnonAttempt('c1', 90);
    expect(readAnonProgress().attempts).toEqual([{ clipId: 'c1', overall: 90 }]);
  });

  it('does not lower a score on a worse retry', () => {
    recordAnonAttempt('c1', 90);
    recordAnonAttempt('c1', 20);
    expect(readAnonProgress().attempts).toEqual([{ clipId: 'c1', overall: 90 }]);
  });

  it('reports the limit reached at ANON_DAILY_CLIP_LIMIT distinct clips', () => {
    for (let i = 0; i < ANON_DAILY_CLIP_LIMIT; i++) {
      recordAnonAttempt(`clip-${i}`, 70);
    }
    expect(isAnonLimitReached()).toBe(true);
  });

  it('resets when the date rolls over', () => {
    recordAnonAttempt('c1', 82);
    jest.setSystemTime(new Date('2026-08-27T01:00:00Z'));
    expect(readAnonProgress().attempts).toEqual([]);
    expect(isAnonLimitReached()).toBe(false);
  });

  it('recovers from corrupt stored JSON instead of throwing', () => {
    window.localStorage.setItem('easyeng.shadowing.anon', 'not json');
    expect(readAnonProgress().attempts).toEqual([]);
  });

  it('clears stored progress', () => {
    recordAnonAttempt('c1', 82);
    clearAnonProgress();
    expect(anonClipsUsed()).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter web exec jest src/lib/shadowing
```
Expected: FAIL — `Cannot find module '../anonProgress'`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/lib/shadowing/anonProgress.ts`:

```ts
/**
 * Anonymous shadowing progress — localStorage only.
 *
 * Deliberately NOT hardened. A visitor who clears localStorage gets more reps;
 * that is not an attack worth engineering against, and treating it as one would
 * cost more than it saves.
 *
 * On signup this record is replayed into the account so the user's first
 * logged-in view already shows their scores (Phase B).
 */

const STORAGE_KEY = 'easyeng.shadowing.anon';

/**
 * Distinct clips an anonymous visitor may practise per day before the wall.
 * A named constant because this number will be A/B tested against real ad
 * traffic — the page's SEO value and its conversion value pull in opposite
 * directions here.
 */
export const ANON_DAILY_CLIP_LIMIT = 3;

export interface AnonAttempt {
  clipId: string;
  overall: number;
}

export interface AnonProgress {
  /** ISO date (YYYY-MM-DD) the attempts belong to. */
  date: string;
  attempts: AnonAttempt[];
}

/**
 * Day boundary is fixed to Vietnam time, matching the rest of the app
 * (StreakWidget.tsx and migrations 089/102 both use Asia/Ho_Chi_Minh).
 * Using UTC here would reset the quota at 07:00 local instead of midnight.
 */
const ANON_PROGRESS_TIMEZONE = 'Asia/Ho_Chi_Minh';

function today(): string {
  // 'en-CA' yields YYYY-MM-DD.
  return new Date().toLocaleDateString('en-CA', { timeZone: ANON_PROGRESS_TIMEZONE });
}

function empty(): AnonProgress {
  return { date: today(), attempts: [] };
}

export function readAnonProgress(): AnonProgress {
  if (typeof window === 'undefined') return empty();

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage disabled (private mode, blocked cookies) — behave as if empty.
    return empty();
  }
  if (!raw) return empty();

  try {
    const parsed = JSON.parse(raw) as Partial<AnonProgress>;
    if (
      typeof parsed?.date !== 'string' ||
      !Array.isArray(parsed?.attempts) ||
      parsed.date !== today()
    ) {
      // Missing, malformed, or from a previous day — start fresh.
      return empty();
    }
    return { date: parsed.date, attempts: parsed.attempts as AnonAttempt[] };
  } catch {
    return empty();
  }
}

function write(progress: AnonProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or disabled — progress is best-effort, never fatal.
  }
}

/** Record an attempt, keeping the best score per clip. */
export function recordAnonAttempt(clipId: string, overall: number): AnonProgress {
  const progress = readAnonProgress();
  const existing = progress.attempts.find((a) => a.clipId === clipId);
  if (existing) {
    existing.overall = Math.max(existing.overall, overall);
  } else {
    progress.attempts.push({ clipId, overall });
  }
  write(progress);
  return progress;
}

/** Distinct clips practised today. Retries of one clip count once. */
export function anonClipsUsed(): number {
  return readAnonProgress().attempts.length;
}

export function isAnonLimitReached(): boolean {
  return anonClipsUsed() >= ANON_DAILY_CLIP_LIMIT;
}

export function clearAnonProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter web exec jest src/lib/shadowing
```
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/shadowing
git commit -m "feat(web): add anonymous shadowing progress with daily clip limit"
```

---

### Task 8: Recorder hook

Wraps mic capture and speech recognition. Every failure mode degrades rather than blanking the screen — this is an ad landing page, so a blank render is a wasted click.

**Files:**
- Create: `apps/web/src/components/shadowing/useRecorder.ts`

**Interfaces:**
- Consumes: `extractEnvelope`, `Envelope` from `@easyeng/core`.
- Produces:
  - `type RecorderState = 'idle' | 'recording' | 'processing'`
  - `type RecordingResult = { envelope: Envelope; transcript: string | null }`
  - `useRecorder(): { state, error, hasRecognition, start, stop, result, reset, liveSamples }`
  - `type RecorderError = 'mic-denied' | 'no-audio' | 'unsupported' | null`

- [ ] **Step 1: Write the implementation**

Create `apps/web/src/components/shadowing/useRecorder.ts`:

```ts
'use client';

/**
 * Mic capture + optional speech recognition for shadowing.
 *
 * Audio never leaves the browser: samples are reduced to an Envelope in-page
 * and the raw buffer is discarded.
 *
 * Degradation matters more than usual here because this runs on an anonymous
 * ad landing page across the full device spread:
 *   - No SpeechRecognition (Firefox, many Android WebViews) -> transcript is
 *     null and the caller falls back to a rhythm-only score. NOT an error.
 *   - Mic denied -> 'mic-denied', with a retry offered by the caller.
 *   - Silence recorded -> 'no-audio', so the caller can treat it as a no-op
 *     rather than showing a discouraging 0%.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { extractEnvelope, type Envelope } from '@easyeng/core';

export type RecorderState = 'idle' | 'recording' | 'processing';
export type RecorderError = 'mic-denied' | 'no-audio' | 'unsupported' | null;

export interface RecordingResult {
  envelope: Envelope;
  /** null when the browser cannot transcribe — caller scores rhythm only. */
  transcript: string | null;
}

/** Below this peak amplitude we treat the take as silence. */
const SILENCE_PEAK_THRESHOLD = 0.01;

function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
  );
}

export function useRecorder(lang = 'en-US') {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<RecorderError>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [hasRecognition, setHasRecognition] = useState(false);
  const [liveSamples, setLiveSamples] = useState<number[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string | null>(null);
  const sampleRateRef = useRef<number>(44100);

  useEffect(() => {
    setHasRecognition(getSpeechRecognition() !== null);
  }, []);

  const cleanup = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped.
    }
    recognitionRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    chunksRef.current = [];
    transcriptRef.current = null;
    setLiveSamples([]);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('mic-denied');
      setState('idle');
      return;
    }

    streamRef.current = stream;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    sampleRateRef.current = ctx.sampleRate;

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      chunksRef.current.push(new Float32Array(input));
      // Cheap live level for the waveform: peak of this block.
      let peak = 0;
      for (let i = 0; i < input.length; i++) {
        const v = Math.abs(input[i]);
        if (v > peak) peak = v;
      }
      setLiveSamples((prev) => [...prev.slice(-63), peak]);
    };

    source.connect(processor);
    processor.connect(ctx.destination);

    const SR = getSpeechRecognition();
    if (SR) {
      const rec = new SR();
      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        transcriptRef.current = e.results[0][0].transcript as string;
      };
      // Recognition failure is non-fatal: we still have a rhythm score.
      rec.onerror = () => undefined;
      recognitionRef.current = rec;
      try {
        rec.start();
      } catch {
        recognitionRef.current = null;
      }
    }

    setState('recording');
  }, [lang]);

  const stop = useCallback(async () => {
    setState('processing');

    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped.
    }

    // Give recognition a moment to deliver its final result.
    await new Promise((r) => setTimeout(r, 350));

    const chunks = chunksRef.current;
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    const rate = sampleRateRef.current;
    cleanup();
    setLiveSamples([]);

    let peak = 0;
    for (let i = 0; i < merged.length; i++) {
      const v = Math.abs(merged[i]);
      if (v > peak) peak = v;
    }

    if (merged.length === 0 || peak < SILENCE_PEAK_THRESHOLD) {
      // Recording nothing is not the same as failing. Surfacing a 0% here
      // would be discouraging at exactly the wrong moment.
      setError('no-audio');
      setState('idle');
      return;
    }

    setResult({
      envelope: extractEnvelope(merged, rate),
      transcript: transcriptRef.current,
    });
    setState('idle');
  }, [cleanup]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setState('idle');
  }, []);

  return { state, error, hasRecognition, start, stop, result, reset, liveSamples };
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
pnpm --filter web exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/shadowing/useRecorder.ts
git commit -m "feat(web): add shadowing recorder hook with graceful degradation"
```

---

### Task 9: Waveform comparison component

The stacked reference-vs-attempt view. This is the frame that makes the rhythm score legible and the one users screenshot, so it renders both envelopes at the same horizontal scale.

**Files:**
- Create: `apps/web/src/components/shadowing/WaveformCompare.tsx`
- Test: `apps/web/src/components/shadowing/__tests__/WaveformCompare.test.tsx`

**Interfaces:**
- Consumes: `Envelope` from `@easyeng/core`.
- Produces: `<WaveformCompare reference={Envelope} attempt={Envelope} />`, plus exported `timingHint(reference, attempt): string | null`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/shadowing/__tests__/WaveformCompare.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { WaveformCompare, timingHint } from '../WaveformCompare';
import { BIN_COUNT, type Envelope } from '@easyeng/core';

const flat = (value: number, durationMs: number): Envelope => ({
  bins: new Array(BIN_COUNT).fill(value),
  durationMs,
});

describe('timingHint', () => {
  it('reports speaking faster when the attempt is meaningfully shorter', () => {
    expect(timingHint(flat(0.5, 3000), flat(0.5, 2000))).toMatch(/nhanh hơn/);
  });

  it('reports speaking slower when the attempt is meaningfully longer', () => {
    expect(timingHint(flat(0.5, 2000), flat(0.5, 3000))).toMatch(/chậm hơn/);
  });

  it('returns null when the durations are close enough', () => {
    expect(timingHint(flat(0.5, 2000), flat(0.5, 2050))).toBeNull();
  });
});

describe('WaveformCompare', () => {
  it('renders a bar per bin for both envelopes', () => {
    const { container } = render(
      <WaveformCompare reference={flat(0.5, 2000)} attempt={flat(0.4, 2100)} />,
    );
    expect(container.querySelectorAll('[data-testid="wave-bar"]')).toHaveLength(BIN_COUNT * 2);
  });

  it('labels both rows', () => {
    render(<WaveformCompare reference={flat(0.5, 2000)} attempt={flat(0.4, 2000)} />);
    expect(screen.getByText(/Người bản xứ/)).toBeInTheDocument();
    expect(screen.getByText(/^Bạn$/)).toBeInTheDocument();
  });

  it('shows the timing hint when durations differ', () => {
    render(<WaveformCompare reference={flat(0.5, 3000)} attempt={flat(0.5, 2000)} />);
    expect(screen.getByTestId('timing-hint')).toBeInTheDocument();
  });

  it('omits the timing hint when durations match', () => {
    render(<WaveformCompare reference={flat(0.5, 2000)} attempt={flat(0.5, 2000)} />);
    expect(screen.queryByTestId('timing-hint')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing
```
Expected: FAIL — `Cannot find module '../WaveformCompare'`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/shadowing/WaveformCompare.tsx`:

```tsx
'use client';

/**
 * Stacked reference-vs-attempt waveform.
 *
 * This view carries the feature's core claim. A bare percentage cannot
 * communicate "we score your rhythm, not just your words"; two misaligned
 * waveforms communicate it at a glance. It is also the frame users screenshot,
 * which is unpaid reach — so it is worth rendering well.
 */

import { type Envelope } from '@easyeng/core';

/** Duration gap below which the pacing difference is not worth mentioning. */
const HINT_THRESHOLD_MS = 250;

export function timingHint(reference: Envelope, attempt: Envelope): string | null {
  const delta = attempt.durationMs - reference.durationMs;
  if (Math.abs(delta) < HINT_THRESHOLD_MS) return null;
  const seconds = (Math.abs(delta) / 1000).toFixed(1);
  return delta < 0
    ? `Bạn nói nhanh hơn mẫu ${seconds}s — thử ngắt nghỉ giống người bản xứ.`
    : `Bạn nói chậm hơn mẫu ${seconds}s — thử nối câu liền mạch hơn.`;
}

function Row({
  label,
  bins,
  color,
}: {
  label: string;
  bins: number[];
  color: string;
}) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--et-fg-3)' }}>
        {label}
      </p>
      <div
        className="mt-1 flex items-end gap-[2px] rounded-lg p-2"
        style={{ background: 'var(--et-bg-3)', height: 48 }}
      >
        {bins.map((b, i) => (
          <div
            key={i}
            data-testid="wave-bar"
            style={{
              flex: 1,
              height: `${Math.max(4, b * 100)}%`,
              background: color,
              borderRadius: 2,
              opacity: 0.35 + b * 0.65,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export interface WaveformCompareProps {
  reference: Envelope;
  attempt: Envelope;
}

export function WaveformCompare({ reference, attempt }: WaveformCompareProps) {
  const hint = timingHint(reference, attempt);

  return (
    <div className="space-y-3">
      <Row label="🔊 Người bản xứ" bins={reference.bins} color="var(--et-blue)" />
      <Row label="Bạn" bins={attempt.bins} color="var(--et-coral)" />

      {hint && (
        <p
          data-testid="timing-hint"
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: 'rgba(251,191,36,0.10)', color: 'var(--et-amber)' }}
        >
          ⏱ {hint}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing
```
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shadowing/WaveformCompare.tsx apps/web/src/components/shadowing/__tests__/WaveformCompare.test.tsx
git commit -m "feat(web): add stacked waveform comparison for shadowing results"
```

---

### Task 10: Signup wall

Frames the wall as saving work, not losing access. The carry-over promise matters more than the limit number.

**Files:**
- Create: `apps/web/src/components/shadowing/SignupWall.tsx`
- Test: `apps/web/src/components/shadowing/__tests__/SignupWall.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<SignupWall bestScore={number | null} locale={string} />`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/shadowing/__tests__/SignupWall.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { SignupWall } from '../SignupWall';

describe('SignupWall', () => {
  it('shows the best score so the user sees what is at stake', () => {
    render(<SignupWall bestScore={82} locale="vi" />);
    expect(screen.getByText(/82%/)).toBeInTheDocument();
  });

  it('links to registration with the locale prefix', () => {
    render(<SignupWall bestScore={82} locale="vi" />);
    expect(screen.getByTestId('wall-signup')).toHaveAttribute('href', '/vi/auth/register');
  });

  it('links to login for returning users', () => {
    render(<SignupWall bestScore={70} locale="en" />);
    expect(screen.getByTestId('wall-login')).toHaveAttribute('href', '/en/auth/login');
  });

  it('renders without a score', () => {
    render(<SignupWall bestScore={null} locale="vi" />);
    expect(screen.getByTestId('wall-signup')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/SignupWall.test.tsx
```
Expected: FAIL — `Cannot find module '../SignupWall'`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/shadowing/SignupWall.tsx`:

```tsx
'use client';

/**
 * Soft wall shown after the anonymous daily clip limit.
 *
 * Deliberately framed as SAVING work rather than blocking access: a wall that
 * says "you'll lose your 82%" converts better than one that says "you've hit
 * your limit". Everything already earned stays visible behind it.
 */

import Link from 'next/link';

export interface SignupWallProps {
  bestScore: number | null;
  locale: string;
}

export function SignupWall({ bestScore, locale }: SignupWallProps) {
  return (
    <div
      className="space-y-3 rounded-xl p-5 text-center"
      style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
    >
      {bestScore !== null && (
        <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--et-green)' }}>
          {bestScore}%
        </p>
      )}

      <p className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>
        Đăng ký miễn phí để lưu kết quả của bạn
      </p>
      <p className="text-xs" style={{ color: 'var(--et-fg-2)' }}>
        Giữ chuỗi ngày luyện tập, xem tiến bộ theo thời gian và mở khoá toàn bộ thư viện.
      </p>

      <div className="flex flex-col gap-2 pt-1">
        <Link
          href={`/${locale}/auth/register`}
          data-testid="wall-signup"
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--et-coral)' }}
        >
          Đăng ký miễn phí
        </Link>
        <Link
          href={`/${locale}/auth/login`}
          data-testid="wall-login"
          className="text-xs"
          style={{ color: 'var(--et-fg-2)' }}
        >
          Đã có tài khoản? Đăng nhập
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/SignupWall.test.tsx
```
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shadowing/SignupWall.tsx apps/web/src/components/shadowing/__tests__/SignupWall.test.tsx
git commit -m "feat(web): add shadowing signup wall framed as saving progress"
```

---

### Task 11: The rep screen

Single-focus while practising; expands to the comparison after an attempt.

**Files:**
- Create: `apps/web/src/components/shadowing/ShadowingRep.tsx`
- Test: `apps/web/src/components/shadowing/__tests__/ShadowingRep.test.tsx`

**Interfaces:**
- Consumes: `useRecorder` (Task 8), `WaveformCompare` (Task 9), `SignupWall` (Task 10), `anonProgress` (Task 7), `scoreAttempt` + `ShadowingClip` from `@easyeng/core`.
- Produces: `<ShadowingRep clips={ShadowingClip[]} audioBaseUrl={string} locale={string} isAuthenticated={boolean} />`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/shadowing/__tests__/ShadowingRep.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ShadowingRep } from '../ShadowingRep';
import { BIN_COUNT, type ShadowingClip } from '@easyeng/core';

const mockRecorder = {
  state: 'idle' as const,
  error: null as string | null,
  hasRecognition: true,
  start: jest.fn(),
  stop: jest.fn(),
  result: null as unknown,
  reset: jest.fn(),
  liveSamples: [] as number[],
};

jest.mock('../useRecorder', () => ({
  useRecorder: () => mockRecorder,
}));

const clip = (idx: number): ShadowingClip => ({
  clipId: `c${idx}`,
  idx,
  textEn: `Sentence number ${idx}.`,
  textVi: `Câu số ${idx}.`,
  audioPath: `shadowing/pack/${idx}.mp3`,
  durationMs: 2000,
  referenceEnvelope: { bins: new Array(BIN_COUNT).fill(0.5), durationMs: 2000 },
  bestScore: null,
});

const clips = [clip(0), clip(1), clip(2), clip(3)];

describe('ShadowingRep', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    // Reset EVERY mutable mock field here, not in test bodies: a test that
    // throws before its cleanup line would otherwise leak state into the rest
    // of the file.
    mockRecorder.result = null;
    mockRecorder.error = null;
    mockRecorder.state = 'idle';
    mockRecorder.hasRecognition = true;
    mockRecorder.liveSamples = [];
  });

  it('shows the first clip text and position', () => {
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByText('Sentence number 0.')).toBeInTheDocument();
    expect(screen.getByText(/1\s*\/\s*4/)).toBeInTheDocument();
  });

  it('shows the Vietnamese translation', () => {
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByText('Câu số 0.')).toBeInTheDocument();
  });

  it('does not show the waveform comparison before an attempt', () => {
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.queryByText(/Người bản xứ/)).not.toBeInTheDocument();
  });

  it('starts recording when the mic button is pressed', async () => {
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    await userEvent.click(screen.getByTestId('rep-record'));
    expect(mockRecorder.start).toHaveBeenCalled();
  });

  it('shows a live level meter while recording', () => {
    mockRecorder.state = 'recording';
    mockRecorder.liveSamples = [0.2, 0.8, 0.5];
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getAllByTestId('live-bar')).toHaveLength(3);
  });

  it('explains a denied mic instead of dead-ending', () => {
    mockRecorder.error = 'mic-denied';
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByTestId('rep-error')).toHaveTextContent(/micro/i);
  });

  it('treats a silent take as a no-op rather than a zero score', () => {
    mockRecorder.error = 'no-audio';
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByTestId('rep-error')).toBeInTheDocument();
    expect(screen.queryByTestId('rep-score')).not.toBeInTheDocument();
  });

  it('notes that word scoring is unavailable without recognition support', () => {
    mockRecorder.hasRecognition = false;
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByTestId('rep-rhythm-only')).toBeInTheDocument();
  });

  it('walls an anonymous user after the daily clip limit', () => {
    window.localStorage.setItem(
      'easyeng.shadowing.anon',
      JSON.stringify({
        // Vietnam-local date, matching anonProgress.today() (see Task 7).
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
        attempts: [
          { clipId: 'c0', overall: 80 },
          { clipId: 'c1', overall: 70 },
          { clipId: 'c2', overall: 90 },
        ],
      }),
    );
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated={false} />,
    );
    expect(screen.getByTestId('wall-signup')).toBeInTheDocument();
  });

  it('never walls an authenticated user', () => {
    window.localStorage.setItem(
      'easyeng.shadowing.anon',
      JSON.stringify({
        // Vietnam-local date, matching anonProgress.today() (see Task 7).
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
        attempts: [
          { clipId: 'c0', overall: 80 },
          { clipId: 'c1', overall: 70 },
          { clipId: 'c2', overall: 90 },
        ],
      }),
    );
    render(
      <ShadowingRep clips={clips} audioBaseUrl="https://cdn.test/" locale="vi" isAuthenticated />,
    );
    expect(screen.queryByTestId('wall-signup')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/ShadowingRep.test.tsx
```
Expected: FAIL — `Cannot find module '../ShadowingRep'`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/shadowing/ShadowingRep.tsx`:

```tsx
'use client';

/**
 * The shadowing rep screen.
 *
 * While practising it is deliberately single-focus — one sentence, its
 * translation, two buttons — because the only thing that matters for cold ad
 * traffic is the time from landing to first mic press. The screen expands into
 * the waveform comparison only AFTER an attempt, where it pays off.
 *
 * All scoring is local. No audio is uploaded.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mic, Square, Volume2, RotateCcw, ChevronRight } from 'lucide-react';

import { scoreAttempt, type ShadowingClip, type ShadowingScore } from '@easyeng/core';

import { useRecorder } from './useRecorder';
import { WaveformCompare } from './WaveformCompare';
import { SignupWall } from './SignupWall';
import {
  isAnonLimitReached,
  recordAnonAttempt,
  readAnonProgress,
} from '@/lib/shadowing/anonProgress';

export interface ShadowingRepProps {
  clips: ShadowingClip[];
  /** Public base URL of the material-assets bucket. */
  audioBaseUrl: string;
  locale: string;
  isAuthenticated: boolean;
}

const ERROR_COPY: Record<string, string> = {
  'mic-denied':
    'Chúng tôi cần quyền dùng micro để chấm điểm. Hãy cho phép trong trình duyệt rồi thử lại.',
  'no-audio': 'Chưa nghe thấy gì cả — hãy thử nói to hơn một chút nhé.',
  unsupported: 'Trình duyệt này chưa hỗ trợ ghi âm. Thử Chrome trên máy tính hoặc Android.',
};

export function ShadowingRep({
  clips,
  audioBaseUrl,
  locale,
  isAuthenticated,
}: ShadowingRepProps) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState<ShadowingScore | null>(null);
  const [walled, setWalled] = useState(false);

  const recorder = useRecorder('en-US');
  const clip = clips[index];

  // Anonymous visitors hit the wall once they have used their daily clips.
  useEffect(() => {
    if (!isAuthenticated) setWalled(isAnonLimitReached());
  }, [isAuthenticated, index]);

  // Score as soon as a recording lands.
  useEffect(() => {
    if (!recorder.result || !clip) return;
    const s = scoreAttempt({
      target: clip.textEn,
      spoken: recorder.result.transcript,
      reference: clip.referenceEnvelope,
      attempt: recorder.result.envelope,
    });
    setScore(s);
    if (!isAuthenticated) {
      recordAnonAttempt(clip.clipId, s.overall);
      setWalled(isAnonLimitReached());
    }
    // Phase B wires record_shadowing_attempt here for authenticated users.
  }, [recorder.result, clip, isAuthenticated]);

  const playReference = useCallback(() => {
    const audio = new Audio(`${audioBaseUrl}${clip.audioPath}`);
    audio.play().catch(() => {
      // Asset missing or autoplay blocked — fall back to browser TTS so the
      // clip is still practisable.
      try {
        const u = new SpeechSynthesisUtterance(clip.textEn);
        u.lang = 'en-US';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch {
        // Nothing further we can do.
      }
    });
  }, [audioBaseUrl, clip]);

  const next = useCallback(() => {
    setScore(null);
    recorder.reset();
    setIndex((i) => Math.min(i + 1, clips.length - 1));
  }, [clips.length, recorder]);

  const retry = useCallback(() => {
    setScore(null);
    recorder.reset();
  }, [recorder]);

  const bestScore = useMemo(() => {
    const attempts = readAnonProgress().attempts;
    return attempts.length ? Math.max(...attempts.map((a) => a.overall)) : null;
  }, [walled]);

  if (!clip) return null;

  if (walled && !isAuthenticated) {
    return <SignupWall bestScore={bestScore} locale={locale} />;
  }

  const recording = recorder.state === 'recording';

  return (
    <div
      className="space-y-4 rounded-xl p-5"
      style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
    >
      <p className="text-xs" style={{ color: 'var(--et-fg-3)' }}>
        Câu {index + 1} / {clips.length}
      </p>

      {/* Target sentence — recoloured per word once scored. */}
      <p className="text-lg font-semibold leading-relaxed" style={{ color: 'var(--et-fg)' }}>
        {score && score.words.length > 0
          ? score.words.map((w, i) => (
              <span
                key={i}
                style={{ color: w.ok ? 'var(--et-green)' : '#ef4444' }}
              >
                {w.word}
                {i < score.words.length - 1 ? ' ' : ''}
              </span>
            ))
          : clip.textEn}
      </p>

      <p className="text-sm italic" style={{ color: 'var(--et-fg-2)' }}>
        {clip.textVi}
      </p>

      {!recorder.hasRecognition && (
        <p data-testid="rep-rhythm-only" className="text-xs" style={{ color: 'var(--et-fg-3)' }}>
          Trình duyệt này chưa nhận dạng được lời nói — bạn vẫn được chấm điểm nhịp điệu.
        </p>
      )}

      {recorder.error && (
        <p
          data-testid="rep-error"
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
        >
          {ERROR_COPY[recorder.error] ?? ERROR_COPY.unsupported}
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={playReference}
          data-testid="rep-play"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}
        >
          <Volume2 className="h-4 w-4" /> Nghe mẫu
        </button>

        {!recording ? (
          <button
            type="button"
            onClick={recorder.start}
            data-testid="rep-record"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--et-coral)' }}
          >
            <Mic className="h-4 w-4" /> {score ? 'Thử lại' : 'Nói theo'}
          </button>
        ) : (
          <button
            type="button"
            onClick={recorder.stop}
            data-testid="rep-stop"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#ef4444' }}
          >
            <Square className="h-4 w-4" /> Dừng
          </button>
        )}

        {score && (
          <>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}
            >
              <RotateCcw className="h-4 w-4" /> Làm lại
            </button>
            {index < clips.length - 1 && (
              <button
                type="button"
                onClick={next}
                data-testid="rep-next"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}
              >
                Câu tiếp <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Live level while recording — confirms the mic is actually hearing you. */}
      {recording && recorder.liveSamples.length > 0 && (
        <div
          className="flex items-end gap-[2px] rounded-lg p-2"
          style={{ background: 'var(--et-bg-3)', height: 40 }}
        >
          {recorder.liveSamples.map((v, i) => (
            <div
              key={i}
              data-testid="live-bar"
              style={{
                flex: 1,
                height: `${Math.max(4, v * 100)}%`,
                background: 'var(--et-coral)',
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      )}

      {/* Result — the payoff view. */}
      {score && recorder.result && (
        <div className="space-y-3 rounded-lg p-3" style={{ background: 'var(--et-bg-3)' }}>
          <div className="flex items-baseline gap-3" data-testid="rep-score">
            <span
              className="text-3xl font-extrabold tabular-nums"
              style={{
                color:
                  score.overall >= 85
                    ? 'var(--et-green)'
                    : score.overall >= 65
                      ? 'var(--et-amber)'
                      : '#ef4444',
              }}
            >
              {score.overall}%
            </span>
            <span className="text-xs" style={{ color: 'var(--et-fg-2)' }}>
              {score.wordScore !== null && <>Từ đúng {score.wordScore}% · </>}
              Nhịp điệu {score.rhythmScore}%
            </span>
          </div>

          <WaveformCompare
            reference={clip.referenceEnvelope}
            attempt={recorder.result.envelope}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/ShadowingRep.test.tsx
```
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shadowing/ShadowingRep.tsx apps/web/src/components/shadowing/__tests__/ShadowingRep.test.tsx
git commit -m "feat(web): add single-focus shadowing rep screen with compare result"
```

---

### Task 12: Public routes and pages

Adds the hub and pack pages and opens them to anonymous visitors. `middleware.ts` currently allows only `/auth/*`, so without this change the whole feature is unreachable without a session.

**Files:**
- Modify: `apps/web/src/middleware.ts:20`
- Create: `apps/web/src/app/[locale]/shadowing/page.tsx`
- Create: `apps/web/src/app/[locale]/shadowing/[packSlug]/page.tsx`

**Interfaces:**
- Consumes: `fetchShadowingPacks`, `fetchShadowingPack` (Task 6); `ShadowingRep` (Task 11).
- Produces: routes `/[locale]/shadowing` and `/[locale]/shadowing/[packSlug]`.

- [ ] **Step 1: Open the routes in middleware**

In `apps/web/src/middleware.ts`, replace line 20:

```ts
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password'];
```

with:

```ts
// '/shadowing' is public on purpose: it is the paid-ads landing surface and
// must work with no session at all.
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/shadowing',
];
```

- [ ] **Step 2: Write the hub page**

Create `apps/web/src/app/[locale]/shadowing/page.tsx`:

```tsx
/**
 * /[locale]/shadowing — free shadowing hub.
 *
 * Public and server-rendered: this is the organic-search complement to paid
 * traffic, so pack titles and summaries must be indexable.
 */

import Link from 'next/link';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { fetchShadowingPacks } from '@easyeng/core';
import { locales, type Locale } from '@/i18n/config';

// SAFE ONLY because this page's content is identical for every visitor:
// fetchShadowingPacks() selects nothing user-scoped (no auth.uid()-dependent
// columns). Next.js caches rendered output by PATH, not by session, so this
// page must stay free of any per-user data for the cache to be safe. If you
// add a query here that depends on auth.uid() (e.g. per-user progress),
// switch this to `export const dynamic = 'force-dynamic'` — see the pack
// page at [packSlug]/page.tsx for the leak this pattern caused there.
export const revalidate = 300;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Luyện nói theo người bản xứ — miễn phí | EasyEng',
  description:
    'Luyện phát âm và nhịp điệu tiếng Anh bằng cách nói theo người bản xứ. Chấm điểm ngay trên trình duyệt, miễn phí, không cần đăng ký.',
};

interface PageProps {
  params: { locale: Locale };
}

export default async function ShadowingHubPage({ params }: PageProps) {
  // createClient() is async in this app (see lib/supabase/server.ts).
  const supabase = await createClient();
  const packs = await fetchShadowingPacks(supabase);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--et-fg)' }}>
          Luyện nói theo người bản xứ
        </h1>
        <p className="text-sm" style={{ color: 'var(--et-fg-2)' }}>
          Nghe một câu, nói theo, nhận điểm ngay. Chấm cả từ vựng và nhịp điệu —
          chạy hoàn toàn trên máy bạn, giọng nói không rời khỏi thiết bị.
        </p>
      </div>

      {packs.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--et-fg-3)' }}>
          Chưa có gói luyện tập nào được xuất bản.
        </p>
      ) : (
        <ul className="space-y-3">
          {packs.map((pack) => (
            <li key={pack.id}>
              <Link
                href={`/${params.locale}/shadowing/${pack.slug}`}
                className="block rounded-xl p-4 transition-colors"
                style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold" style={{ color: 'var(--et-fg)' }}>
                    {pack.titleVi}
                  </span>
                  <span className="text-xs uppercase" style={{ color: 'var(--et-fg-3)' }}>
                    {pack.level}
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: 'var(--et-fg-2)' }}>
                  {pack.summaryVi}
                </p>
                <p className="mt-2 text-xs" style={{ color: 'var(--et-fg-3)' }}>
                  {pack.clipCount} câu
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write the pack page**

Create `apps/web/src/app/[locale]/shadowing/[packSlug]/page.tsx`:

```tsx
/**
 * /[locale]/shadowing/[packSlug] — practice page and per-campaign ad landing target.
 *
 * Server-rendered so clip text is indexable, then hands off to the client
 * component for mic capture and local scoring.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { fetchShadowingPack } from '@easyeng/core';
import type { Locale } from '@/i18n/config';

import { ShadowingRep } from '@/components/shadowing/ShadowingRep';

// This page reads a cookie-bound Supabase client (`supabase.auth.getUser()`)
// and a per-user `best_score` (via `get_shadowing_pack`, scoped to
// `auth.uid()` — see supabase/migrations/104_shadowing.sql). Next.js caches
// rendered output by PATH, not by session, so any time-based `revalidate`
// here would bake one visitor's auth state and scores into the HTML served
// to every later visitor for that pack URL. Must stay dynamic.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { locale: Locale; packSlug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Luyện nói theo: ${params.packSlug} | EasyEng`,
    description:
      'Nghe người bản xứ, nói theo và nhận điểm phát âm cùng nhịp điệu ngay lập tức. Miễn phí, không cần đăng ký.',
  };
}

const AUDIO_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/material-assets/`;

export default async function ShadowingPackPage({ params }: PageProps) {
  // createClient() is async in this app (see lib/supabase/server.ts).
  const supabase = await createClient();

  const clips = await fetchShadowingPack(supabase, params.packSlug);
  if (clips.length === 0) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <ShadowingRep
        clips={clips}
        audioBaseUrl={AUDIO_BASE}
        locale={params.locale}
        isAuthenticated={Boolean(user)}
      />

      {/* Server-rendered transcript: indexable content for organic search. */}
      <section className="space-y-1">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--et-fg-2)' }}>
          Các câu trong gói này
        </h2>
        <ol className="space-y-1 text-sm" style={{ color: 'var(--et-fg-3)' }}>
          {clips.map((c) => (
            <li key={c.clipId}>
              {c.textEn} — <em>{c.textVi}</em>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Verify the routes build and type-check**

Run:
```bash
pnpm --filter web exec tsc --noEmit
```
Expected: no errors.

Run:
```bash
pnpm --filter web exec next lint
```
Expected: no new errors for `src/app/[locale]/shadowing` or `src/components/shadowing`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/middleware.ts "apps/web/src/app/[locale]/shadowing"
git commit -m "feat(web): add public shadowing hub and pack pages"
```

---

### Task 13: Content build script

Turns a JSON manifest of clip texts into audio files plus precomputed envelopes and a seed migration. The repeatable script matters more than the first batch — clip libraries grow, and hand-running envelope computation will not scale.

**Files:**
- Create: `scripts/shadowing/build-clips.ts`
- Create: `scripts/shadowing/tsconfig.json`
- Create: `scripts/shadowing/packs/job-interview.json`
- Edit: root `package.json` — add a `shadowing:build` script

**Interfaces:**
- Consumes: `extractEnvelope` from `@easyeng/core` (imported directly from `packages/core/src/lib/shadowing/envelope`, not duplicated — the same function scores attempts in the browser, so a copy would silently drift).
- Produces: `.mp3` files under `scripts/shadowing/out/<slug>/`, and `supabase/migrations/105_shadowing_seed.sql`.

**Why TypeScript, not `.mjs`:** `@easyeng/core` ships raw TypeScript with no build step (`"main": "src/index.ts"`), so any Node script that imports it needs a TS loader regardless. Plain `node` cannot load a `.ts` file — importing `envelope.ts` from a `.mjs` script crashes with `ERR_UNKNOWN_FILE_EXTENSION` before the script's own logic ever runs. Write the script as `.ts` and run it under `ts-node` (already a dependency in this repo) using a tsconfig scoped to `scripts/shadowing/` — do not change `packages/core`'s or the web app's tsconfig for this.

- [ ] **Step 1: Write the manifest**

Create `scripts/shadowing/packs/job-interview.json`:

```json
{
  "slug": "job-interview",
  "titleVi": "Phỏng vấn xin việc",
  "titleEn": "Job interview",
  "summaryVi": "10 câu thường gặp khi phỏng vấn xin việc bằng tiếng Anh.",
  "summaryEn": "Ten common English job-interview lines.",
  "bodyVi": "Nghe và nói theo từng câu. Chú ý nhịp điệu và trọng âm.",
  "bodyEn": "Listen and shadow each line. Focus on rhythm and stress.",
  "level": "b1",
  "goal": "business",
  "xpReward": 40,
  "clips": [
    { "en": "Thanks for taking the time to meet me today.", "vi": "Cảm ơn anh/chị đã dành thời gian gặp tôi hôm nay." },
    { "en": "I'm really excited about this opportunity.", "vi": "Tôi rất hào hứng với cơ hội này." },
    { "en": "I have three years of experience in this field.", "vi": "Tôi có ba năm kinh nghiệm trong lĩnh vực này." },
    { "en": "My greatest strength is attention to detail.", "vi": "Điểm mạnh nhất của tôi là sự tỉ mỉ." },
    { "en": "I work well under pressure and tight deadlines.", "vi": "Tôi làm việc tốt dưới áp lực và hạn chót gấp." },
    { "en": "Could you tell me more about the team?", "vi": "Anh/chị có thể nói thêm về đội ngũ không?" },
    { "en": "I'm looking for a role where I can grow.", "vi": "Tôi đang tìm một vị trí giúp tôi phát triển." },
    { "en": "I led a project that increased sales by twenty percent.", "vi": "Tôi đã dẫn dắt một dự án tăng doanh số hai mươi phần trăm." },
    { "en": "What does a typical day look like in this role?", "vi": "Một ngày làm việc điển hình ở vị trí này thế nào?" },
    { "en": "When can I expect to hear back from you?", "vi": "Khi nào tôi có thể nhận được phản hồi ạ?" }
  ]
}
```

- [ ] **Step 2: Write the build script**

Create `scripts/shadowing/build-clips.ts`. It is written as TypeScript (not `.mjs`) because it imports `extractEnvelope` straight from `@easyeng/core`'s source, and `@easyeng/core` ships raw `.ts` with no build step — plain `node` cannot load that import. Run it under `ts-node` instead of `node`.

The TTS command handling avoids the shell entirely: the `SHADOWING_TTS_CMD` template is tokenized into argv (double-quoted runs become one token, no other shell syntax is interpreted), placeholders are substituted per-token, and the result is invoked with `execFileSync(cmd, args)` — never `execSync` on a concatenated string. That way a clip's text can contain `$`, backticks, or anything else without it ever being interpreted by a shell, because there is no shell in the loop.

```ts
/**
 * Shadowing content pipeline.
 *
 * Reads a pack manifest, generates one audio file per clip, computes each
 * clip's reference envelope, and emits a seed migration.
 *
 * This script imports `extractEnvelope` directly from `@easyeng/core`
 * (shipped as raw TypeScript, no build step) so the reference envelopes it
 * generates are always produced by the exact same code that scores attempts
 * in the browser. Do not inline or duplicate that function here.
 *
 * Usage (run under ts-node, via the root npm script):
 *   npm run shadowing:build -- scripts/shadowing/packs/job-interview.json
 * or directly:
 *   node_modules/.bin/ts-node -P scripts/shadowing/tsconfig.json scripts/shadowing/build-clips.ts scripts/shadowing/packs/job-interview.json
 *
 * TTS: set SHADOWING_TTS_CMD to a command template that writes an MP3.
 * The template is split into argv tokens (double-quoted segments are kept
 * together as one token; unquoted whitespace separates tokens) and each
 * token containing {{text}} or {{out}} has that placeholder substituted as
 * a literal string value — the whole thing is then run WITHOUT a shell
 * (execFileSync), so no shell-escaping is needed or possible: quote a
 * token in the template only to keep embedded spaces together, never to
 * guard against $, `, or \. Example using piper:
 *   SHADOWING_TTS_CMD='piper --text "{{text}}" --output_file "{{out}}"'
 *
 * Hero clips (those used in ads and on the landing page) are re-recorded by a
 * human afterwards: drop the replacement MP3 over the generated file and re-run
 * with --envelopes-only to recompute envelopes without regenerating audio.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';

import { extractEnvelope } from '../../packages/core/src/lib/shadowing/envelope';

const manifestPath = process.argv[2];
const envelopesOnly = process.argv.includes('--envelopes-only');

if (!manifestPath) {
  console.error('Usage: npm run shadowing:build -- <manifest.json> [--envelopes-only]');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const outDir = join('scripts', 'shadowing', 'out', manifest.slug);
mkdirSync(outDir, { recursive: true });

const ttsTemplate = process.env.SHADOWING_TTS_CMD;
if (!envelopesOnly && !ttsTemplate) {
  console.error('SHADOWING_TTS_CMD is not set. See the header of this file.');
  process.exit(1);
}

/**
 * Split a command template into argv tokens without invoking a shell.
 * A double-quoted run (`"..."`) is kept as a single token with the quotes
 * stripped; everything else is split on runs of whitespace. This is
 * intentionally minimal — just enough to let a template like
 * `piper --text "{{text}}" --output_file "{{out}}"` name its placeholders,
 * not a general shell-syntax parser.
 */
function tokenizeTemplate(template: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(template)) !== null) {
    tokens.push(match[1] !== undefined ? match[1] : match[2]);
  }
  return tokens;
}

/** Substitute {{text}} / {{out}} placeholders into one argv token. */
function fillToken(token: string, text: string, out: string): string {
  return token.replaceAll('{{text}}', text).replaceAll('{{out}}', out);
}

/** Decode an MP3 to mono Float32 PCM at 16 kHz using ffmpeg. */
function decodeToPcm(mp3Path: string): Float32Array {
  const raw = execFileSync(
    'ffmpeg',
    ['-v', 'quiet', '-i', mp3Path, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'],
    { maxBuffer: 1024 * 1024 * 64, encoding: 'buffer' },
  );
  return new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
}

interface Row {
  idx: number;
  textEn: string;
  textVi: string;
  audioPath: string;
  durationMs: number;
  envelope: unknown;
}

const rows: Row[] = [];

manifest.clips.forEach((clip: { en: string; vi: string }, idx: number) => {
  const filename = `${String(idx).padStart(2, '0')}.mp3`;
  const outPath = join(outDir, filename);

  if (!envelopesOnly || !existsSync(outPath)) {
    const tokens = tokenizeTemplate(ttsTemplate as string).map((t) => fillToken(t, clip.en, outPath));
    const [cmd, ...args] = tokens;
    execFileSync(cmd, args, { stdio: 'inherit' });
  }

  const pcm = decodeToPcm(outPath);
  const envelope = extractEnvelope(pcm, 16000);

  rows.push({
    idx,
    textEn: clip.en,
    textVi: clip.vi,
    audioPath: `shadowing/${manifest.slug}/${filename}`,
    durationMs: envelope.durationMs,
    envelope,
  });

  console.log(`[${idx}] ${basename(outPath)}  ${envelope.durationMs}ms`);
});

function sqlStr(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replaceAll("'", "''")}'`;
}

const sql = `-- 105_shadowing_seed.sql (generated by scripts/shadowing/build-clips.ts)
-- Pack: ${manifest.slug}
-- Regenerate rather than hand-editing.

DO $$
DECLARE
  v_author uuid;
  v_material uuid;
BEGIN
  SELECT id INTO v_author FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  IF v_author IS NULL THEN
    RAISE EXCEPTION 'no admin profile to own the seeded pack';
  END IF;

  INSERT INTO materials (
    slug, type, level, status, goal,
    title_vi, title_en, summary_vi, summary_en, body_vi, body_en,
    duration_min, gems_reward, xp_reward, author_id, published_at, published_by
  )
  VALUES (
    ${sqlStr(manifest.slug)}, 'shadowing', ${sqlStr(manifest.level)}, 'published', ${sqlStr(manifest.goal)},
    ${sqlStr(manifest.titleVi)}, ${sqlStr(manifest.titleEn)},
    ${sqlStr(manifest.summaryVi)}, ${sqlStr(manifest.summaryEn)},
    ${sqlStr(manifest.bodyVi)}, ${sqlStr(manifest.bodyEn)},
    ${Math.max(1, Math.round(rows.reduce((n, r) => n + r.durationMs, 0) / 60000))},
    0, ${manifest.xpReward}, v_author, now(), v_author
  )
  ON CONFLICT (slug) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_material;

  DELETE FROM shadowing_clips WHERE material_id = v_material;

${rows
  .map(
    (r) => `  INSERT INTO shadowing_clips (material_id, idx, text_en, text_vi, audio_path, duration_ms, reference_envelope)
  VALUES (v_material, ${r.idx}, ${sqlStr(r.textEn)}, ${sqlStr(r.textVi)}, ${sqlStr(r.audioPath)}, ${r.durationMs}, ${sqlStr(JSON.stringify(r.envelope))}::jsonb);`,
  )
  .join('\n')}
END $$;
`;

writeFileSync('supabase/migrations/105_shadowing_seed.sql', sql, 'utf8');
console.log(`\nWrote supabase/migrations/105_shadowing_seed.sql (${rows.length} clips)`);
console.log(`Upload ${outDir}/*.mp3 to material-assets under shadowing/${manifest.slug}/`);
```

- [ ] **Step 3: Add a scoped tsconfig for the script**

Create `scripts/shadowing/tsconfig.json`. Kept local to `scripts/shadowing/` rather than touching the repo-wide `tsconfig.base.json`, `packages/core`'s tsconfig, or the web app's tsconfig:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "isolatedModules": false,
    "types": ["node"]
  },
  "ts-node": {
    "transpileOnly": true
  },
  "include": ["./build-clips.ts", "../../packages/core/src/lib/shadowing/**/*.ts"]
}
```

- [ ] **Step 4: Add the root npm script**

Add to the root `package.json` `scripts` block:

```json
"shadowing:build": "ts-node -P scripts/shadowing/tsconfig.json scripts/shadowing/build-clips.ts"
```

`ts-node` is already present (a devDependency of `apps/web`, hoisted to the root `node_modules/.bin` by pnpm) — no new dependency is required.

- [ ] **Step 5: Verify the script reports its usage when called with no arguments**

Run:
```bash
npm run shadowing:build
```
Expected: prints the usage line and exits non-zero — reaching the script's own argument-handling logic rather than crashing in the module loader on the `.ts` import.

- [ ] **Step 6: Commit**

```bash
git add scripts/shadowing package.json
git commit -m "feat(scripts): add shadowing content build pipeline"
```

---

### Task 14: Anonymous end-to-end test

The single most important regression guard: if this breaks, every ad click lands on a broken page.

**Files:**
- Create: `apps/web/e2e/shadowing-anonymous.spec.ts`

**Interfaces:**
- Consumes: routes from Task 12.
- Produces: nothing.

- [ ] **Step 1: Write the test**

Create `apps/web/e2e/shadowing-anonymous.spec.ts`:

```ts
/**
 * Anonymous shadowing journey.
 *
 * Guards the property the whole feature depends on: a visitor with NO session
 * can reach a pack page and practise. Mic and SpeechRecognition are stubbed —
 * this asserts routing, rendering, and the wall, not audio quality.
 */

import { test, expect } from '@playwright/test';

const PACK_SLUG = 'job-interview';

test.describe('anonymous shadowing', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('hub is reachable without a session', async ({ page }) => {
    await page.goto('/vi/shadowing');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luyện nói theo');
  });

  test('pack page renders clips without a session', async ({ page }) => {
    await page.goto(`/vi/shadowing/${PACK_SLUG}`);
    await expect(page.getByTestId('rep-record')).toBeVisible();
    await expect(page.getByTestId('rep-play')).toBeVisible();
    // Server-rendered transcript is present for SEO.
    await expect(page.getByText('Các câu trong gói này')).toBeVisible();
  });

  test('does not redirect anonymous visitors to login', async ({ page }) => {
    await page.goto(`/vi/shadowing/${PACK_SLUG}`);
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test('shows the signup wall once the daily limit is stored', async ({ page }) => {
    await page.goto(`/vi/shadowing/${PACK_SLUG}`);

    await page.evaluate(() => {
      // Vietnam-local date, matching anonProgress.today() (see Task 7).
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      window.localStorage.setItem(
        'easyeng.shadowing.anon',
        JSON.stringify({
          date: today,
          attempts: [
            { clipId: 'a', overall: 80 },
            { clipId: 'b', overall: 70 },
            { clipId: 'c', overall: 90 },
          ],
        }),
      );
    });

    await page.reload();
    await expect(page.getByTestId('wall-signup')).toBeVisible();
    await expect(page.getByText('90%')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the E2E test**

The dev server and a seeded `job-interview` pack must be running. Run:
```bash
pnpm --filter web exec playwright test e2e/shadowing-anonymous.spec.ts
```
Expected: 4 passed.

If the pack is not yet seeded, the two content-dependent tests fail with a 404 — seed via Task 13's generated migration first.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/shadowing-anonymous.spec.ts
git commit -m "test(e2e): guard anonymous shadowing access and signup wall"
```

---

### Task 15: Cross-links and full verification

Links the feature from the existing free-tools page so it is discoverable in-product, and runs the whole suite.

**Files:**
- Modify: `apps/web/src/app/[locale]/ai-tools/page.tsx`

**Interfaces:**
- Consumes: route from Task 12.
- Produces: nothing.

- [ ] **Step 1: Add the cross-link**

In `apps/web/src/app/[locale]/ai-tools/page.tsx`, immediately after the page-header `</div>` that closes the block containing the `<h1>`, insert:

```tsx
      <a
        href="/vi/shadowing"
        className="block rounded-xl p-4"
        style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>
          🎧 Luyện nói theo người bản xứ
        </span>
        <p className="mt-1 text-xs" style={{ color: 'var(--et-fg-2)' }}>
          Chấm điểm cả từ vựng và nhịp điệu — miễn phí, không cần đăng ký.
        </p>
      </a>
```

- [ ] **Step 2: Run the core test suite**

Run:
```bash
pnpm --filter @easyeng/core exec jest
```
Expected: all pass, including 18 shadowing tests and 8 query tests.

- [ ] **Step 3: Run the web test suite**

Run:
```bash
pnpm --filter web exec jest
```
Expected: all pass, including 9 anonProgress, 7 WaveformCompare, 4 SignupWall, and 10 ShadowingRep tests.

- [ ] **Step 4: Type-check and lint the whole repo**

Run:
```bash
pnpm type-check
```
Expected: no errors.

Run:
```bash
pnpm lint
```
Expected: no new errors (pre-existing `no-explicit-any` warnings elsewhere are unrelated).

- [ ] **Step 5: Verify no gem path exists anywhere in the feature**

Run:
```bash
grep -rn --exclude-dir=__tests__ -E "gem_transactions|award_material_completion\(" supabase/migrations/104_shadowing.sql apps/web/src/components/shadowing packages/core/src/lib/shadowing
```
Expected: no output. Shadowing must never touch the gem ledger.

Matches `gem_transactions` and calls to `award_material_completion` only —
not the substring "gem". The migration legitimately writes `gems_awarded = 0`
to `material_progress` (a NOT NULL column on an existing table) and names
`award_material_completion` in a comment explaining why it is not used.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/[locale]/ai-tools/page.tsx"
git commit -m "feat(web): cross-link shadowing from the free AI tools page"
```

---

## Deployment notes

Not part of any task — these are deploy steps for a human.

1. Apply migrations in order: `103_shadowing_enum.sql`, then `104_shadowing.sql`, then the generated `105_shadowing_seed.sql`. 103 must land in its own transaction before 104 runs.
2. Upload generated MP3s to the `material-assets` bucket under `shadowing/<pack-slug>/`.
3. Confirm anonymous access against the deployed URL in a private window with no session.
4. Manually verify one full rep on a low-end Android device before any ad spend — that is the modal device for Vietnamese ad traffic and the most likely place Web Speech support and TTS quality disappoint.

## Known follow-ups

- `get_my_progress_report` in `102_student_free_features.sql` queries a non-existent `xp_events` table and fails at runtime. Out of scope here; worth a separate fix.
- Phase B: `record_shadowing_attempt` wiring from the UI, anonymous-to-account score carry-over on signup, streaks, and the remaining packs.
