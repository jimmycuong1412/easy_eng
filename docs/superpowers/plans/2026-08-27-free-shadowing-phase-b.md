# Free Shadowing — Phase B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the anonymous shadowing page into a returning-user habit: attempts are saved, anonymous scores carry into the account, packs award XP once completed to a real standard, and the daily streak counts shadowing practice.

**Architecture:** Phase A already built every database object Phase B needs; this plan wires them to the UI and corrects two defects the whole-branch review found in them. Attempt recording happens client-side after local scoring (audio still never leaves the browser — only integers and a transcript string are sent). Anonymous `localStorage` progress is replayed on the first authenticated visit to a shadowing page, because signup redirects to `/auth/login` rather than creating a session.

**Tech Stack:** Next.js 14.2 (App Router), TypeScript 5.4, Supabase Postgres, Jest (`@easyeng/core` + `apps/web`), Playwright, Tailwind + existing `--et-*` tokens.

**Spec:** `docs/superpowers/specs/2026-08-21-free-shadowing-design.md`
**Phase A plan:** `docs/superpowers/plans/2026-08-26-free-shadowing-phase-a.md`

## Global Constraints

- **Audio never leaves the browser.** Scoring stays client-side. `record_shadowing_attempt` accepts only integers, a transcript string, and a text array — never audio, never a blob, never a URL to one.
- **No gems.** Shadowing awards XP only. Never call `award_material_completion`; never write `gem_transactions`. (`gems_awarded = 0` on `material_progress` is expected — that column is NOT NULL on an existing table.)
- **XP ledger is `xp_transactions`**: columns `student_id` (NOT `user_id`), `amount`, `activity_type`, `description`, `career_id`. No `metadata` column, no unique constraint, `CHECK (amount > 0)`.
- **Day boundary is `Asia/Ho_Chi_Minh`**, everywhere — implementation, tests, and fixtures. Never `toISOString()`. Matches `anonProgress.ts`, `StreakWidget.tsx`, and migrations 089/101/102.
- **Vietnamese-first UI copy.** Vietnamese strings are literal; English goes in `en.json` alongside if a task adds one.
- **Existing `--et-*` design tokens only.** No new tokens. No hardcoded hex fallbacks inside `var()` — tokens are redefined per theme.
- **Anonymous behaviour must not regress.** A visitor with no session must still reach a pack page, practise, score, and hit the wall. Every Phase B addition is gated on having a session.
- Migrations are plain SQL files in `supabase/migrations/`, numbered sequentially. Do not apply them to any database — applying is a deploy step.
- Run all commands from the repo root `F:\Git\easy_eng` unless stated otherwise.

## Decisions settled before planning

| Decision | Choice |
|---|---|
| Pack award threshold | **Enforce it.** Award only when every clip has an attempt at or above the threshold — matching the spec, which the shipped RPC contradicts. |
| `shadowing_attempts.user_id` FK | **Fix in Phase B.** Repoint from `auth.users(id)` to `profiles(id)` to match `material_progress`. |
| Anonymous score carry-over | **On first authenticated visit to a shadowing page.** Signup redirects to `/auth/login`, so there is no session at signup time to replay into. |
| Content | **Code only.** Seeding real packs stays a separate deploy/content task; the pipeline needs `ffmpeg` + TTS that this environment lacks. |

---

## File Structure

**Create:**
- `supabase/migrations/106_shadowing_phase_b_fixes.sql` — threshold enforcement, FK repoint, `get_shadowing_pack` visibility filter
- `packages/core/src/lib/queries/shadowingAttempts.ts` — attempt recording + history helpers
- `packages/core/src/lib/queries/shadowingAttempts.test.ts`
- `apps/web/src/components/shadowing/useRecordAttempt.ts` — records an attempt, fires the streak, surfaces the award
- `apps/web/src/components/shadowing/__tests__/useRecordAttempt.test.ts`
- `apps/web/src/components/shadowing/useCarryOverAnonProgress.ts` — one-shot replay of anonymous attempts
- `apps/web/src/components/shadowing/__tests__/useCarryOverAnonProgress.test.ts`
- `apps/web/src/components/shadowing/PackProgress.tsx` — per-clip best scores + completion ribbon
- `apps/web/src/components/shadowing/__tests__/PackProgress.test.tsx`

**Modify:**
- `apps/web/src/components/shadowing/ShadowingRep.tsx` — call the recording hook; show best score
- `apps/web/src/components/shadowing/__tests__/ShadowingRep.test.tsx` — cover the authenticated path
- `apps/web/src/app/[locale]/shadowing/[packSlug]/page.tsx` — mount carry-over + progress
- `apps/web/src/app/[locale]/dashboard/page.tsx` — shadowing cross-link
- `packages/core/src/index.ts` — export the new query module
- `apps/web/tests/e2e/shadowing-anonymous.spec.ts` — assert anonymous behaviour is unchanged

---

### Task 1: Correct the pack-award threshold and the attempts FK

Two defects the Phase A whole-branch review found in objects that shipped unused. Both are in `record_shadowing_attempt`'s blast radius, so they land together.

The shipped RPC awards a pack when every clip has **any** attempt — so ten deliberate 0% grunts collect full XP. The spec (`2026-08-21-free-shadowing-design.md:152-153`) says "at or above threshold."

Separately, `shadowing_attempts.user_id` references `auth.users(id)` while `material_progress.user_id` references `profiles(id)`. `record_shadowing_attempt` writes both in one transaction, so a user without a `profiles` row passes the first insert and fails the second with an FK violation, aborting the call.

**Files:**
- Create: `supabase/migrations/106_shadowing_phase_b_fixes.sql`

**Interfaces:**
- Consumes: `shadowing_attempts`, `shadowing_clips`, `record_shadowing_attempt`, `get_shadowing_pack` from migration 104.
- Produces: `SHADOWING_PASS_THRESHOLD` semantics (60) used by Task 4's UI copy; `record_shadowing_attempt` returns `jsonb` with keys `pack_complete` (bool), `clips_passed` (int), `clips_total` (int), `award` (jsonb).

- [ ] **Step 1: Write the migration**

```sql
-- 106_shadowing_phase_b_fixes.sql
-- Phase B corrections to objects created in 104_shadowing.sql.
-- Spec: docs/superpowers/specs/2026-08-21-free-shadowing-design.md
--
-- Three fixes, all found by the Phase A whole-branch review:
--   1. Pack award required only that every clip had SOME attempt. The spec
--      says "at or above threshold". Ten 0% grunts collected full XP.
--   2. shadowing_attempts.user_id referenced auth.users while
--      material_progress.user_id references profiles. record_shadowing_attempt
--      writes both in one transaction, so a user with no profiles row failed
--      mid-transaction with an FK violation.
--   3. get_shadowing_pack ignored status/deleted_at, so authors and admins saw
--      archived and soft-deleted packs as live practice pages.

-- ============================================================
-- 1. Repoint shadowing_attempts.user_id at profiles
-- ============================================================
-- profiles.id is itself FK'd to auth.users, so this is a narrowing, not a
-- widening: every profiles row already corresponds to an auth user.
--
-- PRECONDITION: shadowing_attempts is expected to be empty here (nothing called
-- record_shadowing_attempt before Phase B). If this ever runs against seeded
-- data, any row whose user_id has an auth.users entry but no profiles row will
-- violate the new constraint. Check before applying:
--   SELECT COUNT(*) FROM shadowing_attempts a
--   LEFT JOIN profiles p ON p.id = a.user_id WHERE p.id IS NULL;
ALTER TABLE public.shadowing_attempts
  DROP CONSTRAINT IF EXISTS shadowing_attempts_user_id_fkey;

ALTER TABLE public.shadowing_attempts
  ADD CONSTRAINT shadowing_attempts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================================
-- 2. Threshold-aware get_shadowing_pack (also fixes visibility)
-- ============================================================
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
    -- Archived and soft-deleted packs are not practisable, not even for
    -- their author or an admin (RLS already hides them from anonymous users).
    AND m.status = 'published'
    AND m.deleted_at IS NULL
  ORDER BY c.idx;
$$;

GRANT EXECUTE ON FUNCTION public.get_shadowing_pack(text) TO anon, authenticated;

-- ============================================================
-- 3. Threshold-enforcing record_shadowing_attempt
-- ============================================================
-- The minimum overall score that counts a clip as practised. Kept as a
-- function so the value has exactly one definition on the server side.
CREATE OR REPLACE FUNCTION public.shadowing_pass_threshold()
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$ SELECT 60; $$;

COMMENT ON FUNCTION public.shadowing_pass_threshold IS
  'Minimum overall_score for a shadowing clip to count toward pack completion.';

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
  v_passed      int;
  v_threshold   int := public.shadowing_pass_threshold();
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
    v_uid, p_clip_id, p_word_score, p_rhythm_score, p_overall,
    COALESCE(p_heard_text, ''), COALESCE(p_weak_words, '{}')
  );

  -- Keep an in-progress row warm so the pack shows activity before completion.
  -- (The Phase A version UPDATEd a row that does not exist yet on a first
  -- attempt, silently doing nothing.)
  INSERT INTO material_progress (
    user_id, material_id, started_at, last_activity_at,
    completion_pct, gems_awarded, xp_awarded, state
  )
  VALUES (v_uid, v_material_id, now(), now(), 0, 0, 0, 'in_progress')
  ON CONFLICT (user_id, material_id) DO UPDATE
    SET last_activity_at = now();

  SELECT COUNT(*) INTO v_total
  FROM shadowing_clips WHERE material_id = v_material_id;

  -- Only clips whose BEST attempt reaches the threshold count. A clip the user
  -- has attempted badly many times does not count; one good attempt does, and
  -- a later bad attempt cannot un-count it.
  SELECT COUNT(*) INTO v_passed
  FROM (
    SELECT a.clip_id
    FROM shadowing_attempts a
    JOIN shadowing_clips c ON c.id = a.clip_id
    WHERE a.user_id = v_uid AND c.material_id = v_material_id
    GROUP BY a.clip_id
    HAVING MAX(a.overall_score) >= v_threshold
  ) passed_clips;

  IF v_total > 0 AND v_passed >= v_total THEN
    v_award := public.award_shadowing_pack(v_material_id);
  END IF;

  RETURN jsonb_build_object(
    'pack_complete', (v_total > 0 AND v_passed >= v_total),
    'clips_passed',  v_passed,
    'clips_total',   v_total,
    'award',         v_award
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_shadowing_attempt(uuid, int, int, int, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_shadowing_attempt(uuid, int, int, int, text, text[]) TO authenticated;

COMMENT ON FUNCTION public.record_shadowing_attempt IS
  'Records one shadowing attempt. Awards the pack only when EVERY clip has a best attempt >= shadowing_pass_threshold(). Never grants gems.';
```

- [ ] **Step 2: Verify no gem path was introduced**

Run:
```bash
grep -vn '^\s*--' supabase/migrations/106_shadowing_phase_b_fixes.sql | grep -nE "gem_transactions|award_material_completion\("
```
Expected: no output (exit code 1).

- [ ] **Step 3: Verify the threshold is actually applied**

Run:
```bash
grep -c "HAVING MAX(a.overall_score) >= v_threshold" supabase/migrations/106_shadowing_phase_b_fixes.sql
```
Expected: `1`

- [ ] **Step 4: Verify the FK now points at profiles**

Run:
```bash
grep -n "REFERENCES public.profiles(id)" supabase/migrations/106_shadowing_phase_b_fixes.sql
```
Expected: one line, inside the `shadowing_attempts_user_id_fkey` constraint.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/106_shadowing_phase_b_fixes.sql
git commit -m "fix(db): enforce shadowing pack threshold and align attempts FK"
```

---

### Task 2: Attempt-recording query helpers

**Files:**
- Create: `packages/core/src/lib/queries/shadowingAttempts.ts`
- Test: `packages/core/src/lib/queries/shadowingAttempts.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `record_shadowing_attempt` from Task 1.
- Produces:
  - `type ShadowingAward = { alreadyCompleted: boolean; xpAwarded: number }`
  - `type AttemptResult = { packComplete: boolean; clipsPassed: number; clipsTotal: number; award: ShadowingAward }`
  - `type RecordAttemptArgs = { clipId: string; wordScore: number | null; rhythmScore: number; overall: number; heardText: string; weakWords: string[] }`
  - `recordShadowingAttempt(client: SupabaseClient, args: RecordAttemptArgs): Promise<AttemptResult>`
  - `SHADOWING_PASS_THRESHOLD = 60`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/lib/queries/shadowingAttempts.test.ts`:

```ts
import { recordShadowingAttempt, SHADOWING_PASS_THRESHOLD } from './shadowingAttempts';

function mockRpc(result: { data?: unknown; error?: unknown }) {
  const rpc = jest.fn().mockResolvedValue(result);
  return { client: { rpc } as any, rpc };
}

const args = {
  clipId: 'c1',
  wordScore: 92,
  rhythmScore: 74,
  overall: 85,
  heardText: 'the weather is nice',
  weakWords: ['is'],
};

describe('SHADOWING_PASS_THRESHOLD', () => {
  it('matches the value the server enforces', () => {
    // Mirrors shadowing_pass_threshold() in migration 106. If the server value
    // changes, this constant and that function must change together.
    expect(SHADOWING_PASS_THRESHOLD).toBe(60);
  });
});

describe('recordShadowingAttempt', () => {
  const ok = {
    pack_complete: false,
    clips_passed: 3,
    clips_total: 10,
    award: { already_completed: true, xp_awarded: 0 },
  };

  it('sends every score field under the RPC parameter names', async () => {
    const m = mockRpc({ data: ok, error: null });
    await recordShadowingAttempt(m.client, args);
    expect(m.rpc).toHaveBeenCalledWith('record_shadowing_attempt', {
      p_clip_id: 'c1',
      p_word_score: 92,
      p_rhythm_score: 74,
      p_overall: 85,
      p_heard_text: 'the weather is nice',
      p_weak_words: ['is'],
    });
  });

  it('passes a null word score through as null, not zero', async () => {
    // Rhythm-only attempts (no SpeechRecognition) must not be recorded as 0%.
    const m = mockRpc({ data: ok, error: null });
    await recordShadowingAttempt(m.client, { ...args, wordScore: null });
    expect(m.rpc.mock.calls[0][1].p_word_score).toBeNull();
  });

  it('maps the snake_case result to camelCase', async () => {
    const m = mockRpc({ data: ok, error: null });
    expect(await recordShadowingAttempt(m.client, args)).toEqual({
      packComplete: false,
      clipsPassed: 3,
      clipsTotal: 10,
      award: { alreadyCompleted: true, xpAwarded: 0 },
    });
  });

  it('reports an XP award on pack completion', async () => {
    const m = mockRpc({
      data: {
        pack_complete: true,
        clips_passed: 10,
        clips_total: 10,
        award: { already_completed: false, xp_awarded: 40 },
      },
      error: null,
    });
    const out = await recordShadowingAttempt(m.client, args);
    expect(out.packComplete).toBe(true);
    expect(out.award).toEqual({ alreadyCompleted: false, xpAwarded: 40 });
  });

  it('throws when the rpc errors', async () => {
    const m = mockRpc({ data: null, error: new Error('boom') });
    await expect(recordShadowingAttempt(m.client, args)).rejects.toThrow('boom');
  });

  it('tolerates a missing award payload', async () => {
    const m = mockRpc({
      data: { pack_complete: false, clips_passed: 1, clips_total: 5 },
      error: null,
    });
    const out = await recordShadowingAttempt(m.client, args);
    expect(out.award).toEqual({ alreadyCompleted: true, xpAwarded: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter @easyeng/core exec jest src/lib/queries/shadowingAttempts.test.ts
```
Expected: FAIL — `Cannot find module './shadowingAttempts'`.

- [ ] **Step 3: Write the implementation**

Create `packages/core/src/lib/queries/shadowingAttempts.ts`:

```ts
/**
 * Free Shadowing — attempt recording (Phase B, authenticated only).
 *
 * Audio never leaves the browser. Scoring happens client-side and only the
 * resulting integers plus the recogniser's transcript are sent here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Minimum overall score for a clip to count toward pack completion.
 * Mirrors `shadowing_pass_threshold()` in migration 106 — the server enforces
 * the award, this copy exists only so the UI can explain the rule.
 */
export const SHADOWING_PASS_THRESHOLD = 60;

export interface ShadowingAward {
  alreadyCompleted: boolean;
  xpAwarded: number;
}

export interface AttemptResult {
  packComplete: boolean;
  clipsPassed: number;
  clipsTotal: number;
  award: ShadowingAward;
}

export interface RecordAttemptArgs {
  clipId: string;
  /** null when the browser has no SpeechRecognition — must stay null, not 0. */
  wordScore: number | null;
  rhythmScore: number;
  overall: number;
  heardText: string;
  weakWords: string[];
}

interface AttemptRow {
  pack_complete?: boolean;
  clips_passed?: number;
  clips_total?: number;
  award?: { already_completed?: boolean; xp_awarded?: number };
}

export async function recordShadowingAttempt(
  client: SupabaseClient,
  args: RecordAttemptArgs,
): Promise<AttemptResult> {
  const { data, error } = await client.rpc('record_shadowing_attempt', {
    p_clip_id: args.clipId,
    p_word_score: args.wordScore,
    p_rhythm_score: args.rhythmScore,
    p_overall: args.overall,
    p_heard_text: args.heardText,
    p_weak_words: args.weakWords,
  });

  if (error) throw error;

  const row = (data ?? {}) as AttemptRow;
  return {
    packComplete: row.pack_complete ?? false,
    clipsPassed: row.clips_passed ?? 0,
    clipsTotal: row.clips_total ?? 0,
    award: {
      alreadyCompleted: row.award?.already_completed ?? true,
      xpAwarded: row.award?.xp_awarded ?? 0,
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter @easyeng/core exec jest src/lib/queries/shadowingAttempts.test.ts
```
Expected: PASS, 7 tests.

- [ ] **Step 5: Export from the core barrel**

In `packages/core/src/index.ts`, add immediately after the existing `export * from './lib/queries/shadowing';` line:

```ts
export * from './lib/queries/shadowingAttempts';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/lib/queries/shadowingAttempts.ts packages/core/src/lib/queries/shadowingAttempts.test.ts packages/core/src/index.ts
git commit -m "feat(core): add shadowing attempt recording helper"
```

---

### Task 3: Attempt-recording hook

Records an attempt for an authenticated user and fires the daily streak, following the pattern already established in `apps/web/src/components/materials/useAwardCompletion.ts:57-60`.

**Files:**
- Create: `apps/web/src/components/shadowing/useRecordAttempt.ts`
- Test: `apps/web/src/components/shadowing/__tests__/useRecordAttempt.test.ts`

**Interfaces:**
- Consumes: `recordShadowingAttempt`, `AttemptResult` from Task 2.
- Produces: `useRecordAttempt(userId: string | null): { record(args: RecordAttemptArgs): void; result: AttemptResult | null; error: string | null }`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/shadowing/__tests__/useRecordAttempt.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react';

import { useRecordAttempt } from '../useRecordAttempt';

const mockRecord = jest.fn();
const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@easyeng/core', () => ({
  recordShadowingAttempt: (...a: unknown[]) => mockRecord(...a),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

const args = {
  clipId: 'c1',
  wordScore: 90,
  rhythmScore: 80,
  overall: 86,
  heardText: 'hello there',
  weakWords: [],
};

const okResult = {
  packComplete: false,
  clipsPassed: 1,
  clipsTotal: 10,
  award: { alreadyCompleted: true, xpAwarded: 0 },
};

describe('useRecordAttempt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord.mockResolvedValue(okResult);
  });

  it('does nothing when there is no user', async () => {
    const { result } = renderHook(() => useRecordAttempt(null));
    act(() => result.current.record(args));
    await waitFor(() => expect(mockRecord).not.toHaveBeenCalled());
    expect(result.current.result).toBeNull();
  });

  it('records the attempt for an authenticated user', async () => {
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));
    expect(mockRecord.mock.calls[0][1]).toEqual(args);
  });

  it('exposes the result', async () => {
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() => expect(result.current.result).toEqual(okResult));
  });

  it('marks the daily streak after a successful record', async () => {
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('record_daily_activity', { p_user_id: 'u1' }),
    );
  });

  it('surfaces an error without throwing', async () => {
    mockRecord.mockRejectedValue(new Error('rpc down'));
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() => expect(result.current.error).toBe('rpc down'));
  });

  it('does not mark the streak when recording failed', async () => {
    mockRecord.mockRejectedValue(new Error('rpc down'));
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() => expect(result.current.error).toBe('rpc down'));
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/useRecordAttempt.test.ts
```
Expected: FAIL — `Cannot find module '../useRecordAttempt'`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/shadowing/useRecordAttempt.ts`:

```ts
'use client';

/**
 * Records one shadowing attempt for an authenticated user.
 *
 * Audio never leaves the browser: scoring already happened locally and only
 * the resulting integers plus the transcript string are sent.
 *
 * Anonymous users are a no-op here — their progress lives in localStorage and
 * is replayed by useCarryOverAnonProgress once they sign in.
 */

import { useCallback, useState } from 'react';
import {
  recordShadowingAttempt,
  type AttemptResult,
  type RecordAttemptArgs,
} from '@easyeng/core';

import { createClient } from '@/lib/supabase/client';

export function useRecordAttempt(userId: string | null) {
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const record = useCallback(
    (args: RecordAttemptArgs) => {
      if (!userId) return;

      const supabase = createClient();
      void (async () => {
        try {
          const out = await recordShadowingAttempt(supabase, args);
          setResult(out);
          setError(null);

          // Count this practice toward the daily learning streak. Idempotent
          // per day; same pattern as materials/useAwardCompletion.ts.
          supabase.rpc('record_daily_activity', { p_user_id: userId }).then(
            () => {},
            (e: unknown) => console.error('record_daily_activity failed:', e),
          );
        } catch (e) {
          // A failed save must never break practice — the score is already on
          // screen and the user can keep going.
          setError(e instanceof Error ? e.message : 'record failed');
        }
      })();
    },
    [userId],
  );

  return { record, result, error };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/useRecordAttempt.test.ts
```
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shadowing/useRecordAttempt.ts apps/web/src/components/shadowing/__tests__/useRecordAttempt.test.ts
git commit -m "feat(web): record shadowing attempts and mark the daily streak"
```

---

### Task 4: Anonymous score carry-over

Signup redirects to `/auth/login` rather than creating a session, so there is no moment at signup to replay into. Instead, the first authenticated visit to a shadowing page replays whatever anonymous attempts are still in `localStorage`, then clears the key so it runs once.

**Files:**
- Create: `apps/web/src/components/shadowing/useCarryOverAnonProgress.ts`
- Test: `apps/web/src/components/shadowing/__tests__/useCarryOverAnonProgress.test.ts`

**Interfaces:**
- Consumes: `readAnonProgress`, `clearAnonProgress` from `@/lib/shadowing/anonProgress`; `recordShadowingAttempt` from Task 2.
- Produces: `useCarryOverAnonProgress(userId: string | null): { carriedOver: number | null }`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/shadowing/__tests__/useCarryOverAnonProgress.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react';

import { useCarryOverAnonProgress } from '../useCarryOverAnonProgress';
import { recordAnonAttempt, readAnonProgress } from '@/lib/shadowing/anonProgress';

const mockRecord = jest.fn();

jest.mock('@easyeng/core', () => ({
  recordShadowingAttempt: (...a: unknown[]) => mockRecord(...a),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ rpc: jest.fn() }),
}));

describe('useCarryOverAnonProgress', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    mockRecord.mockResolvedValue({
      packComplete: false,
      clipsPassed: 1,
      clipsTotal: 10,
      award: { alreadyCompleted: true, xpAwarded: 0 },
    });
  });

  it('does nothing without a user', async () => {
    recordAnonAttempt('c1', 82);
    renderHook(() => useCarryOverAnonProgress(null));
    await waitFor(() => expect(mockRecord).not.toHaveBeenCalled());
    // Anonymous progress must survive — they may still be practising.
    expect(readAnonProgress().attempts).toHaveLength(1);
  });

  it('does nothing when there is no stored progress', async () => {
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).not.toHaveBeenCalled());
  });

  it('replays each stored attempt once', async () => {
    recordAnonAttempt('c1', 82);
    recordAnonAttempt('c2', 71);
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(2));
    const clipIds = mockRecord.mock.calls.map((c) => c[1].clipId).sort();
    expect(clipIds).toEqual(['c1', 'c2']);
  });

  it('replays the stored overall score as a rhythm-only attempt', async () => {
    // localStorage keeps only the overall score, so word/rhythm detail is gone.
    // Recording wordScore null keeps the "not measured" meaning honest rather
    // than inventing a word score the user never earned.
    recordAnonAttempt('c1', 82);
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));
    const sent = mockRecord.mock.calls[0][1];
    expect(sent.overall).toBe(82);
    expect(sent.wordScore).toBeNull();
    expect(sent.rhythmScore).toBe(82);
  });

  it('clears stored progress after a successful carry-over', async () => {
    recordAnonAttempt('c1', 82);
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(readAnonProgress().attempts).toHaveLength(0));
  });

  it('reports how many attempts were carried over', async () => {
    recordAnonAttempt('c1', 82);
    recordAnonAttempt('c2', 71);
    const { result } = renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(result.current.carriedOver).toBe(2));
  });

  it('keeps stored progress when the replay fails', async () => {
    // Losing the scores on a transient error would break the wall's promise.
    mockRecord.mockRejectedValue(new Error('offline'));
    recordAnonAttempt('c1', 82);
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalled());
    expect(readAnonProgress().attempts).toHaveLength(1);
  });

  it('runs only once per mount even if re-rendered', async () => {
    recordAnonAttempt('c1', 82);
    const { rerender } = renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));
    rerender();
    rerender();
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/useCarryOverAnonProgress.test.ts
```
Expected: FAIL — `Cannot find module '../useCarryOverAnonProgress'`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/shadowing/useCarryOverAnonProgress.ts`:

```ts
'use client';

/**
 * Replays anonymous shadowing scores into the user's account.
 *
 * The signup flow redirects to /auth/login rather than creating a session, so
 * there is no moment at signup to replay into. Instead this runs on the first
 * authenticated visit to a shadowing page and then clears the stored key.
 *
 * This is what makes the signup wall's promise true: the wall sells "keep your
 * 82%", so losing those scores on a transient error would be worse than not
 * carrying them at all. Stored progress is cleared only after every replay
 * succeeds.
 */

import { useEffect, useRef, useState } from 'react';
import { recordShadowingAttempt } from '@easyeng/core';

import { createClient } from '@/lib/supabase/client';
import { readAnonProgress, clearAnonProgress } from '@/lib/shadowing/anonProgress';

export function useCarryOverAnonProgress(userId: string | null) {
  const [carriedOver, setCarriedOver] = useState<number | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!userId || ranRef.current) return;

    const stored = readAnonProgress().attempts;
    if (stored.length === 0) return;

    ranRef.current = true;
    const supabase = createClient();

    void (async () => {
      try {
        for (const attempt of stored) {
          await recordShadowingAttempt(supabase, {
            clipId: attempt.clipId,
            // localStorage keeps only the overall score — the word/rhythm split
            // is gone. Record it as rhythm-only rather than inventing a word
            // score the user never earned.
            wordScore: null,
            rhythmScore: attempt.overall,
            overall: attempt.overall,
            heardText: '',
            weakWords: [],
          });
        }
        clearAnonProgress();
        setCarriedOver(stored.length);
      } catch (e) {
        // Keep the stored scores so a later visit can retry. Allow another
        // attempt on the next mount rather than burning the one-shot guard.
        ranRef.current = false;
        console.error('shadowing carry-over failed:', e);
      }
    })();
  }, [userId]);

  return { carriedOver };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/useCarryOverAnonProgress.test.ts
```
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shadowing/useCarryOverAnonProgress.ts apps/web/src/components/shadowing/__tests__/useCarryOverAnonProgress.test.ts
git commit -m "feat(web): carry anonymous shadowing scores into the account"
```

---

### Task 5: Pack progress strip

Shows per-clip best scores and how many clips still need a passing attempt. This is the returning-user payoff: the reason to come back is visible completion.

**Files:**
- Create: `apps/web/src/components/shadowing/PackProgress.tsx`
- Test: `apps/web/src/components/shadowing/__tests__/PackProgress.test.tsx`

**Interfaces:**
- Consumes: `SHADOWING_PASS_THRESHOLD` from Task 2; `ShadowingClip` from `@easyeng/core`.
- Produces: `<PackProgress clips={ShadowingClip[]} currentIndex={number} carriedOver={number | null} />`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/shadowing/__tests__/PackProgress.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import { PackProgress } from '../PackProgress';
import { BIN_COUNT, type ShadowingClip } from '@easyeng/core';

const clip = (idx: number, bestScore: number | null): ShadowingClip => ({
  clipId: `c${idx}`,
  idx,
  textEn: `Sentence ${idx}.`,
  textVi: `Câu ${idx}.`,
  audioPath: `shadowing/pack/${idx}.mp3`,
  durationMs: 2000,
  referenceEnvelope: { bins: new Array(BIN_COUNT).fill(0.5), durationMs: 2000 },
  bestScore,
});

describe('PackProgress', () => {
  it('renders one marker per clip', () => {
    render(
      <PackProgress clips={[clip(0, 80), clip(1, null), clip(2, 40)]} currentIndex={0} carriedOver={null} />,
    );
    expect(screen.getAllByTestId('progress-dot')).toHaveLength(3);
  });

  it('counts only clips at or above the pass threshold', () => {
    // 80 passes, 40 does not, null was never attempted.
    render(
      <PackProgress clips={[clip(0, 80), clip(1, null), clip(2, 40)]} currentIndex={0} carriedOver={null} />,
    );
    expect(screen.getByTestId('progress-count')).toHaveTextContent('1/3');
  });

  it('marks a clip exactly at the threshold as passed', () => {
    render(<PackProgress clips={[clip(0, 60)]} currentIndex={0} carriedOver={null} />);
    expect(screen.getByTestId('progress-count')).toHaveTextContent('1/1');
  });

  it('celebrates a fully completed pack', () => {
    render(
      <PackProgress clips={[clip(0, 90), clip(1, 75)]} currentIndex={0} carriedOver={null} />,
    );
    expect(screen.getByTestId('progress-complete')).toBeInTheDocument();
  });

  it('does not celebrate an incomplete pack', () => {
    render(
      <PackProgress clips={[clip(0, 90), clip(1, 20)]} currentIndex={0} carriedOver={null} />,
    );
    expect(screen.queryByTestId('progress-complete')).not.toBeInTheDocument();
  });

  it('announces carried-over scores', () => {
    render(<PackProgress clips={[clip(0, 82)]} currentIndex={0} carriedOver={2} />);
    expect(screen.getByTestId('progress-carried')).toHaveTextContent('2');
  });

  it('says nothing about carry-over when there was none', () => {
    render(<PackProgress clips={[clip(0, 82)]} currentIndex={0} carriedOver={null} />);
    expect(screen.queryByTestId('progress-carried')).not.toBeInTheDocument();
  });

  it('renders nothing for an empty pack', () => {
    const { container } = render(<PackProgress clips={[]} currentIndex={0} carriedOver={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/PackProgress.test.tsx
```
Expected: FAIL — `Cannot find module '../PackProgress'`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/shadowing/PackProgress.tsx`:

```tsx
'use client';

/**
 * Per-clip progress for a signed-in learner.
 *
 * The returning-user hook is visible completion: which clips are done, which
 * still need a passing attempt, and how close the pack is to finished.
 */

import { SHADOWING_PASS_THRESHOLD, type ShadowingClip } from '@easyeng/core';

export interface PackProgressProps {
  clips: ShadowingClip[];
  currentIndex: number;
  /** Number of anonymous attempts just replayed into the account, if any. */
  carriedOver: number | null;
}

export function PackProgress({ clips, currentIndex, carriedOver }: PackProgressProps) {
  if (clips.length === 0) return null;

  const passed = clips.filter(
    (c) => c.bestScore !== null && c.bestScore >= SHADOWING_PASS_THRESHOLD,
  ).length;
  const complete = passed === clips.length;

  return (
    <div className="space-y-2">
      {carriedOver !== null && (
        <p
          data-testid="progress-carried"
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: 'rgba(52,211,153,0.10)', color: 'var(--et-green)' }}
        >
          ✓ Đã lưu {carriedOver} kết quả bạn luyện trước khi đăng nhập.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {clips.map((c, i) => {
            const done = c.bestScore !== null && c.bestScore >= SHADOWING_PASS_THRESHOLD;
            return (
              <span
                key={c.clipId}
                data-testid="progress-dot"
                title={c.bestScore === null ? 'Chưa luyện' : `${c.bestScore}%`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: done ? 'var(--et-green)' : 'var(--et-bg-4)',
                  outline: i === currentIndex ? '2px solid var(--et-coral)' : 'none',
                  outlineOffset: 2,
                }}
              />
            );
          })}
        </div>

        <span
          data-testid="progress-count"
          className="text-xs tabular-nums"
          style={{ color: 'var(--et-fg-3)' }}
        >
          {passed}/{clips.length} câu đạt
        </span>
      </div>

      {complete && (
        <p
          data-testid="progress-complete"
          className="rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: 'rgba(52,211,153,0.10)', color: 'var(--et-green)' }}
        >
          🎉 Bạn đã hoàn thành gói này!
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/PackProgress.test.tsx
```
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shadowing/PackProgress.tsx apps/web/src/components/shadowing/__tests__/PackProgress.test.tsx
git commit -m "feat(web): add shadowing pack progress strip"
```

---

### Task 6: Wire recording and progress into the rep screen

**Files:**
- Modify: `apps/web/src/components/shadowing/ShadowingRep.tsx`
- Modify: `apps/web/src/components/shadowing/__tests__/ShadowingRep.test.tsx`

**Interfaces:**
- Consumes: `useRecordAttempt` (Task 3), `useCarryOverAnonProgress` (Task 4), `PackProgress` (Task 5).
- Produces: `<ShadowingRep>` gains no new props — `isAuthenticated` already exists; it gains a `userId?: string | null` prop consumed by Task 7's page.

- [ ] **Step 1: Add the failing tests**

In `apps/web/src/components/shadowing/__tests__/ShadowingRep.test.tsx`, add these mocks immediately after the existing `jest.mock('../useRecorder', …)` block:

```tsx
const mockRecordAttempt = jest.fn();
jest.mock('../useRecordAttempt', () => ({
  useRecordAttempt: () => ({ record: mockRecordAttempt, result: null, error: null }),
}));

jest.mock('../useCarryOverAnonProgress', () => ({
  useCarryOverAnonProgress: () => ({ carriedOver: null }),
}));
```

Add `mockRecordAttempt.mockClear();` to the existing `beforeEach` block, then append these tests inside the existing `describe('ShadowingRep', …)`:

```tsx
  it('shows pack progress to an authenticated user', () => {
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated
        userId="u1"
      />,
    );
    expect(screen.getByTestId('progress-count')).toBeInTheDocument();
  });

  it('hides pack progress from an anonymous visitor', () => {
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated={false}
      />,
    );
    expect(screen.queryByTestId('progress-count')).not.toBeInTheDocument();
  });

  it('records the attempt when a signed-in user scores', async () => {
    mockRecorder.result = {
      envelope: { bins: new Array(BIN_COUNT).fill(0.5), durationMs: 2000 },
      transcript: 'Sentence number 0.',
    };
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated
        userId="u1"
      />,
    );
    await waitFor(() => expect(mockRecordAttempt).toHaveBeenCalledTimes(1));
    expect(mockRecordAttempt.mock.calls[0][0].clipId).toBe('c0');
  });

  it('does not record anything for an anonymous visitor', async () => {
    mockRecorder.result = {
      envelope: { bins: new Array(BIN_COUNT).fill(0.5), durationMs: 2000 },
      transcript: 'Sentence number 0.',
    };
    render(
      <ShadowingRep
        clips={clips}
        audioBaseUrl="https://cdn.test/"
        locale="vi"
        isAuthenticated={false}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('rep-score')).toBeInTheDocument());
    expect(mockRecordAttempt).not.toHaveBeenCalled();
  });
```

Add `waitFor` to the existing `@testing-library/react` import.

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing/__tests__/ShadowingRep.test.tsx
```
Expected: FAIL — `Cannot find module '../useRecordAttempt'` (the mock's target does not exist until Task 3 lands; if Task 3 is already committed, the failures are the four new assertions).

- [ ] **Step 3: Wire the hooks into the component**

In `apps/web/src/components/shadowing/ShadowingRep.tsx`:

Add to the imports:

```tsx
import { useRecordAttempt } from './useRecordAttempt';
import { useCarryOverAnonProgress } from './useCarryOverAnonProgress';
import { PackProgress } from './PackProgress';
```

Add `userId` to the props interface:

```tsx
export interface ShadowingRepProps {
  clips: ShadowingClip[];
  /** Public base URL of the material-assets bucket. */
  audioBaseUrl: string;
  locale: string;
  isAuthenticated: boolean;
  /** Present only for signed-in users; drives attempt recording. */
  userId?: string | null;
}
```

Change the destructure to include it:

```tsx
export function ShadowingRep({
  clips,
  audioBaseUrl,
  locale,
  isAuthenticated,
  userId = null,
}: ShadowingRepProps) {
```

Immediately after the `const recorder = useRecorder('en-US');` line, add:

```tsx
  const { record } = useRecordAttempt(userId);
  const { carriedOver } = useCarryOverAnonProgress(userId);
```

In the scoring effect, replace the comment line `// Phase B wires record_shadowing_attempt here for authenticated users.` with the real call, so the effect body ends:

```tsx
    setScore(s);
    if (!isAuthenticated) {
      recordAnonAttempt(clip.clipId, s.overall);
      setWalled(isAnonLimitReached());
    } else {
      record({
        clipId: clip.clipId,
        wordScore: s.wordScore,
        rhythmScore: s.rhythmScore,
        overall: s.overall,
        heardText: recorder.result.transcript ?? '',
        weakWords: s.weakWords,
      });
    }
  }, [recorder.result, clip, isAuthenticated, record]);
```

Finally, render the progress strip for signed-in users only. Immediately after the `Câu {index + 1} / {clips.length}` paragraph, add:

```tsx
      {isAuthenticated && (
        <PackProgress clips={clips} currentIndex={index} carriedOver={carriedOver} />
      )}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing
```
Expected: PASS. The ShadowingRep suite grows from 10 to 14 tests; the directory total is 37.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shadowing/ShadowingRep.tsx apps/web/src/components/shadowing/__tests__/ShadowingRep.test.tsx
git commit -m "feat(web): record attempts and show pack progress when signed in"
```

---

### Task 7: Pass the user id from the pack page

**Files:**
- Modify: `apps/web/src/app/[locale]/shadowing/[packSlug]/page.tsx`

**Interfaces:**
- Consumes: `<ShadowingRep userId>` from Task 6.
- Produces: nothing.

- [ ] **Step 1: Pass the id through**

In `apps/web/src/app/[locale]/shadowing/[packSlug]/page.tsx`, the page already resolves `user` via `supabase.auth.getUser()`. Update the `<ShadowingRep>` element to pass the id:

```tsx
      <ShadowingRep
        clips={clips}
        audioBaseUrl={AUDIO_BASE}
        locale={params.locale}
        isAuthenticated={Boolean(user)}
        userId={user?.id ?? null}
      />
```

- [ ] **Step 2: Type-check**

Run:
```bash
pnpm --filter web exec tsc --noEmit
```
Expected: no errors. (Test files report `Cannot find name 'it'/'expect'` — that gap is pre-existing across both packages and out of scope.)

- [ ] **Step 3: Confirm the page still renders for anonymous visitors**

Run:
```bash
pnpm --filter web exec jest src/components/shadowing
```
Expected: PASS, 37 tests — including the anonymous cases, which must be unaffected.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/[locale]/shadowing/[packSlug]/page.tsx"
git commit -m "feat(web): pass the signed-in user id to the shadowing rep screen"
```

---

### Task 8: Dashboard cross-link, E2E guard, and full verification

Makes shadowing discoverable for signed-in users, guards the anonymous path against Phase B regressions, and runs the whole sweep.

**Files:**
- Modify: `apps/web/src/app/[locale]/dashboard/page.tsx`
- Modify: `apps/web/tests/e2e/shadowing-anonymous.spec.ts`

**Interfaces:**
- Consumes: the `/[locale]/shadowing` route.
- Produces: nothing.

- [ ] **Step 1: Add the E2E regression guard**

Append this test inside the existing `test.describe('anonymous shadowing', …)` block in `apps/web/tests/e2e/shadowing-anonymous.spec.ts`:

```ts
  test('shows no signed-in progress UI to an anonymous visitor', async ({ page }) => {
    // Phase B added a progress strip and attempt recording. Neither may appear
    // for a visitor with no session — the anonymous path is the ad landing
    // surface and must stay exactly as it was.
    await page.goto(`/vi/shadowing/${PACK_SLUG}`);
    await expect(page.getByTestId('progress-count')).toHaveCount(0);
    await expect(page.getByTestId('progress-carried')).toHaveCount(0);
  });
```

- [ ] **Step 2: Add the dashboard cross-link**

Read `apps/web/src/app/[locale]/dashboard/page.tsx` first and match its existing card/section markup. Insert this block alongside the other learning-activity entries, adapting only the wrapper element to match the surrounding style:

```tsx
      <a
        href={`/${locale}/shadowing`}
        className="block rounded-xl p-4"
        style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--et-fg)' }}>
          🎧 Luyện nói theo người bản xứ
        </span>
        <p className="mt-1 text-xs" style={{ color: 'var(--et-fg-2)' }}>
          Chấm điểm từ vựng và nhịp điệu — giữ chuỗi ngày luyện tập của bạn.
        </p>
      </a>
```

If the dashboard page has no `locale` variable in scope, use the same locale source its other internal links use. If it uses a `Link` component rather than a bare anchor, use that instead.

- [ ] **Step 3: Run the core suite**

Run:
```bash
pnpm --filter @easyeng/core exec jest
```
Expected: PASS, 49 tests (42 from Phase A plus 7 from Task 2).

- [ ] **Step 4: Run the web suite**

Run:
```bash
pnpm --filter web exec jest
```
Expected: PASS, 232 tests (210 from Phase A, plus 6 from Task 3, 8 from Task 4, 8 from Task 5, and 4 added in Task 6 — minus none removed).

- [ ] **Step 5: Type-check and lint**

Run:
```bash
pnpm type-check
```
Expected: no errors.

Run:
```bash
pnpm lint
```
Expected: no new errors. Several hundred pre-existing `@typescript-eslint/no-explicit-any` warnings in unrelated files are expected and out of scope.

- [ ] **Step 6: Verify the no-gems invariant across Phase B**

Run:
```bash
grep -rn --exclude-dir=__tests__ -E "gem_transactions|award_material_completion\(" supabase/migrations/106_shadowing_phase_b_fixes.sql apps/web/src/components/shadowing packages/core/src/lib/queries/shadowingAttempts.ts
```
Expected: no output. Shadowing awards XP only.

- [ ] **Step 7: Verify audio never leaves the browser**

Run:
```bash
grep -rnE "FormData|MediaRecorder|\.upload\(|fetch\(" apps/web/src/components/shadowing packages/core/src/lib/queries/shadowingAttempts.ts
```
Expected: no output. The only data crossing the wire is integers and a transcript string.

- [ ] **Step 8: Commit**

```bash
git add "apps/web/src/app/[locale]/dashboard/page.tsx" apps/web/tests/e2e/shadowing-anonymous.spec.ts
git commit -m "feat(web): cross-link shadowing from the dashboard and guard the anonymous path"
```

---

## Deployment notes

Not part of any task — deploy steps for a human.

1. Apply `106_shadowing_phase_b_fixes.sql` after `103`/`104`/`105`.
2. **The FK repoint fails if any `shadowing_attempts` row references a user with no `profiles` row.** With zero rows today this is safe; if Phase A has been live, check first:
   ```sql
   SELECT COUNT(*) FROM shadowing_attempts a
   LEFT JOIN profiles p ON p.id = a.user_id WHERE p.id IS NULL;
   ```
   Resolve any orphans before applying.
3. Confirm `xp_transactions` accepts the insert `award_shadowing_pack` performs — migration `028_xp_system.sql` declares `level_before`/`level_after` NOT NULL without defaults, which contradicts the deployed `083_materials_rpc.sql` insert shape. Run `\d xp_transactions` against the real project and confirm before enabling any pack completion. **This is the single most likely Phase B production failure.**
4. Regenerate `@easyeng/types` so `Database` knows `shadowing_clips` and `shadowing_attempts`.
5. Re-run the E2E after seeding a pack: `pnpm --filter web exec playwright test tests/e2e/shadowing-anonymous.spec.ts`.

## Known follow-ups (not in this plan)

- `get_my_progress_report` in `102_student_free_features.sql` queries a non-existent `xp_events` table and fails at runtime. Unrelated to shadowing.
- `useRecorder`'s 350ms recognition grace window can silently degrade to rhythm-only on slow devices — validate on a real low-end Android before ad spend.
- `ScriptProcessorNode` is deprecated in favour of AudioWorklet.
- `middleware.ts` matches `PUBLIC_ROUTES` by substring; `/shadowing` is the first feature namespace in that list.
- Envelope shape is unvalidated crossing Node → jsonb → browser.
- Re-running the generated seed migration replaces clips, which CASCADEs and erases attempt history for that pack. Harmless at zero users; destructive after launch.
