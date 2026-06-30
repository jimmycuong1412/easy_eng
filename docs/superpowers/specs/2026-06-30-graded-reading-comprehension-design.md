# Self-graded reading comprehension — Design

**Date:** 2026-06-30
**Status:** Approved
**Author:** Jimmy Cuong (with Claude Code)
**Feature area:** Materials Library — `apps/web/src/components/materials/`

## Problem

Reading-passage comprehension questions are currently read-only: the user reveals
each answer behind a toggle, and completion is a manual "Tôi đã đọc xong" (mark
done) button on `ReadingPassage` — no score is computed or stored. We want a real
self-graded quiz that produces a `score_pct`, gates completion at ≥ 60%, and feeds
the score into the existing reward path.

## Goal

Replace the reveal-only + manual-mark-done flow (for readings that HAVE comprehension
questions) with a self-graded quiz: reveal each answer, self-mark right/wrong, see a
score, and on ≥ 60% auto-complete with score-boosted rewards. Passage-only readings
(no questions) keep the existing mark-done button unchanged.

## Key finding — no backend changes needed

`award_material_completion(p_user_id, p_material_id, p_score DEFAULT NULL)`
(migration `083_materials_rpc.sql`) already:
- stores `p_score` as `material_progress.score_pct`,
- boosts rewards when a score is given: `gems = gems_reward + (p_score / 20)`,
  `xp = xp_reward + p_score`,
- is idempotent (guards on an existing `material_completion` gem_transaction),
- does **NOT** enforce `min_completion_pct` — so the ≥ 60% gate is the **client's**
  responsibility (only call the RPC when the score passes).

`useAwardCompletion` already accepts an optional `score` and passes it as `p_score`.
So this feature is **frontend-only**: no migration, no RPC, no new query.

## Decisions (locked with user)

| Decision | Choice |
|---|---|
| Grading model | Self-graded: user self-marks each revealed answer right/wrong |
| Why not auto-grade | Reading answers are free-text `answer_en` (no options); auto-grading would need a data-model change. Auto-graded MCQs are the separate `mock_test` type. |
| Completion | Replaces "mark done" for readings WITH questions; fires `award_material_completion` with the score at ≥ 60% |
| Pass threshold | ≥ 60% (the catalog's `min_completion_pct` for readings) |
| Reward | Score-boosted via the existing RPC (no client reward math) |
| Passage-only readings | Unchanged — keep the existing mark-done button |

## Architecture / data flow

```
ReadingPassage (client)
  ├─ has comprehension questions?
  │    YES → render <ReadingComprehension userId materialId alreadyCompleted minScore=60 ...>
  │           which OWNS completion (self-grade → score → award at >=60%)
  │           → ReadingPassage does NOT render its own mark-done button
  │    NO  → render <ReadingComprehension> (passage only) + KEEP ReadingPassage's
  │           existing mark-done button (current behavior)
  └─ PronunciationPractice + body unchanged
```

`ReadingComprehension` decides "has questions" the same way it already does
(`readQuestions(drill.meta).length > 0`). `ReadingPassage` computes the same boolean
to pick the completion path. To avoid duplicating the questions-parse, expose a tiny
helper `hasComprehensionQuestions(sections)` from `ReadingComprehension.tsx` and use
it in `ReadingPassage`.

## Components & changes

### `ReadingComprehension.tsx` (bulk of the work)
New props (additive): `userId: string | null`, `materialId: string`,
`alreadyCompleted: boolean`. (Keeps `sections`, `locale`.)

State:
- `revealed: Record<number, boolean>` (existing)
- `marks: Record<number, 'right' | 'wrong'>` (new)

Per question, after the answer is revealed, render two buttons:
- **"Tôi trả lời đúng" / "I got it right"** → sets `marks[i]='right'`
- **"Tôi trả lời sai" / "I got it wrong"** → sets `marks[i]='wrong'`
Once marked, show which was chosen (highlight) and allow changing it until graded.

Derived:
- `allMarked = questions.length > 0 && every question has a mark`
- `correct = count(marks === 'right')`, `scorePct = round(correct/total*100)`
- `passed = scorePct >= 60`

When `allMarked`, render a **result panel**:
- score line: e.g. "Bạn đúng 4/5 (80%)"
- pass → `useAwardCompletion({ shouldAward: passed && allMarked, score: scorePct, userId, materialId, alreadyCompleted })`; show `ProgressRibbon` with the awarded gems/xp (or already-earned ribbon).
- fail → message + **"Thử lại" / "Try again"** button that clears `marks` (and `revealed`) so the user can re-read and re-mark. No award.
- anonymous (`userId == null`) → show the score but NOT an award; render the existing sign-in CTA (`materials.detail.signInCta`).

Completion gating lives entirely here via `shouldAward = passed && allMarked && userId != null`. `useAwardCompletion` already no-ops when `alreadyCompleted` or `!userId`.

Defensive behavior retained: `Array.isArray(meta.questions)` guard; passage-only render when no questions; returns `null` when neither passage nor questions exist.

Export `hasComprehensionQuestions(sections: MaterialSection[]): boolean`.

### `ReadingPassage.tsx`
- Import `ReadingComprehension` (already does) + `hasComprehensionQuestions`.
- Compute `const graded = hasComprehensionQuestions(sections)`.
- Pass `userId`, `materialId`, `alreadyCompleted` into `<ReadingComprehension>`.
- When `graded`, do **not** render the existing `marked`/`useAwardCompletion`/"mark done"
  button (ReadingComprehension owns completion). When `!graded`, keep it exactly as today.
- The `PronunciationPractice` block and `MaterialBody` stay.

(Note: `ReadingPassage` already receives `userId`, `alreadyCompleted` as props and has
`material.id`; no new props from the page are needed.)

## Locale

All new UI strings are bilingual via the existing pattern (vi primary on `vi`, en on
`en`). Reuse i18n keys if present under `materials.detail.*`; otherwise inline literal
bilingual strings consistent with the existing components (which already inline e.g.
"Xem đáp án"/"Show answer"). New strings: right/wrong self-mark labels, score line,
pass/fail messages, "Try again".

## Error handling

- Award RPC error → surfaced via `useAwardCompletion`'s `error`; show a small inline
  error, keep the score visible. (Matches existing hook usage.)
- Re-grade after a pass: idempotent RPC + `firedRef` in the hook prevent double-award;
  "Try again" only appears on fail, so a passed quiz can't be re-submitted.
- Changing a mark before all-marked is fine; once the result panel renders and an award
  has fired, marks are frozen (no further toggling needed — passed state is terminal;
  failed state offers Try again which resets).

## Testing

`ReadingComprehension.test.tsx` (extend; mock `useAwardCompletion` to capture args):
- all-right (5/5) → score 100%, pass message, `shouldAward=true` + `score=100`.
- mixed (e.g. 4 right / 1 wrong) → score 80%, pass, `score=80`.
- below threshold (2/5 = 40%) → fail message + "Try again"; `shouldAward=false`; clicking Try again clears marks (right/wrong buttons reappear, result panel gone).
- anonymous (`userId=null`) → score shown, no award (`shouldAward=false`), sign-in CTA present.
- already-completed (`alreadyCompleted=true`) → completed ribbon; `shouldAward` may be true but hook no-ops (assert hook called with `alreadyCompleted=true`).
- missing `meta.questions` → passage only, no grading UI (existing guard).

`ReadingPassage.test.tsx` (add if absent, else extend):
- material WITH questions → no `[data-testid="reading-mark-done"]` button (grading owns completion).
- material WITHOUT questions → `reading-mark-done` present (unchanged).

Mock `useAwardCompletion` (and `@/lib/supabase/client` as needed) so tests don't hit Supabase.

## App verification

- `reading-urbanization-c1` (has 5 questions): reveal + self-mark all right → score 100%, pass, ribbon with boosted reward; reload as a fresh state and mark <60% → fail + Try again.
- `reading-hanoi-traffic-a2` (no questions): still shows the plain "mark done" button.
- Both `vi` and `en` locales for labels.

## Out of scope

- Auto-grading reading answers (free-text; would need structured options → that's `mock_test`).
- Retry limits / cooldowns.
- Storing per-attempt history beyond `material_progress.score_pct`.
- Any RPC, migration, or schema change.
- Changes to grammar/dialogue/vocab/listening completion.

## Open questions

None — all decisions locked above.
