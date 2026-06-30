# Self-graded Reading Comprehension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn read-only reading comprehension into a self-graded quiz: reveal each answer, self-mark right/wrong, see a score, and auto-complete (with score-boosted rewards) at ≥ 60% — replacing the manual "mark done" button for readings that have questions.

**Architecture:** Frontend-only. `ReadingComprehension` gains self-grading state + completion ownership (calls the existing `useAwardCompletion` with a `score`). `ReadingPassage` delegates completion to `ReadingComprehension` when questions exist, and keeps its existing mark-done button only for passage-only readings. No RPC/migration/schema/page changes.

**Tech Stack:** Next.js 14 client components, TypeScript, Jest + React Testing Library, next-intl.

## Global Constraints

- **No backend changes.** `award_material_completion(p_user_id, p_material_id, p_score)` already stores `p_score` as `score_pct`, boosts rewards (`gems += score/20`, `xp += score`), and is idempotent. It does NOT enforce the threshold — the **client** only calls it when `score >= 60`.
- Use the existing `useAwardCompletion` hook (`apps/web/src/components/materials/useAwardCompletion.ts`) — it already accepts `{ shouldAward, userId, materialId, alreadyCompleted, score }` and no-ops when `!userId` or `alreadyCompleted`. Do not modify it.
- Pass threshold: **60** (hardcode as a named const `PASS_PCT = 60`; readings' `min_completion_pct` is 60 in the catalog).
- `score_pct = Math.round(correct / total * 100)`.
- Self-assessment model: answers are free-text `answer_en`; the user self-marks right/wrong after revealing. No auto-grading.
- Locale: vi → vi strings, en → en strings; inline bilingual literals consistent with the existing component (which inlines "Xem đáp án"/"Show answer").
- Completion ownership is exclusive: when a reading HAS questions, `ReadingComprehension` renders the ribbon / sign-in CTA AND `ReadingPassage` renders NEITHER its mark-done button NOR its ribbon. When a reading has NO questions, `ReadingPassage` keeps its exact current button/ribbon/CTA block.
- `Locale` imported from `./MaterialCard`; `MaterialSection` from `@easyeng/core`.
- Commit trailer on every commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Don't bypass the pre-commit hook (lint warnings are pre-existing, non-blocking).
- Run tests: `pnpm --filter web test -- <pattern>`. Typecheck: `pnpm --filter web run type-check`.

---

### Task 1: Self-grading in ReadingComprehension

**Files:**
- Modify: `apps/web/src/components/materials/ReadingComprehension.tsx`
- Test: `apps/web/src/components/materials/__tests__/ReadingComprehension.test.tsx` (extend)

**Interfaces:**
- Consumes: `useAwardCompletion` (existing), `ProgressRibbon` (existing), `MaterialSection`.
- Produces:
  - Updated `ReadingComprehensionProps`: adds `userId: string | null; materialId: string; alreadyCompleted: boolean;` (keeps `sections`, `locale`).
  - Exported helper `hasComprehensionQuestions(sections: MaterialSection[]): boolean`.

- [ ] **Step 1: Write the failing tests (extend the existing file)**

Add these tests. They mock `useAwardCompletion` to capture its args without hitting Supabase. Put the mock at the top of the file (jest hoists `jest.mock`). If the existing file already renders `ReadingComprehension` with only `sections`/`locale`, update those existing calls to also pass the new required props (`userId="u1" materialId="m1" alreadyCompleted={false}`) so they keep compiling.

```tsx
// at top of ReadingComprehension.test.tsx, before other imports of the component:
const awardSpy = jest.fn();
jest.mock('../useAwardCompletion', () => ({
  useAwardCompletion: (args: any) => {
    awardSpy(args);
    // emulate an award when it should fire
    return {
      awarded: args.shouldAward && !args.alreadyCompleted && args.userId
        ? { gems: 3, xp: 80 }
        : null,
      submitting: false,
      error: null,
    };
  },
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { ReadingComprehension, hasComprehensionQuestions } from '../ReadingComprehension';
import type { MaterialSection } from '@easyeng/core';

beforeEach(() => awardSpy.mockClear());

const fiveQ = (n = 5) =>
  Array.from({ length: n }, (_, i) => ({ q_en: `Q${i}?`, q_vi: `Câu ${i}?`, answer_en: `A${i}` }));

const sectionsWith = (questions: any[]): MaterialSection[] => [
  { id: 'p', idx: 0, kind: 'passage', body_vi: 'Đoạn.', body_en: 'Passage.', meta: {} },
  { id: 'd', idx: 1, kind: 'drill', body_vi: 'q', body_en: 'q', meta: { questions } },
];

function markAll(mark: ('right' | 'wrong')[]) {
  // reveal + mark each question per the mark[] array
  const reveals = screen.getAllByTestId('reveal-answer');
  reveals.forEach((b) => fireEvent.click(b));
  const rightBtns = screen.getAllByTestId('mark-right');
  const wrongBtns = screen.getAllByTestId('mark-wrong');
  mark.forEach((m, i) => fireEvent.click(m === 'right' ? rightBtns[i] : wrongBtns[i]));
}

describe('ReadingComprehension self-grading', () => {
  const base = { locale: 'en' as const, userId: 'u1', materialId: 'm1', alreadyCompleted: false };

  it('all-right scores 100% and fires award with score=100', () => {
    render(<ReadingComprehension sections={sectionsWith(fiveQ())} {...base} />);
    markAll(['right', 'right', 'right', 'right', 'right']);
    expect(screen.getByTestId('comprehension-score')).toHaveTextContent('100%');
    const lastCall = awardSpy.mock.calls.at(-1)![0];
    expect(lastCall.shouldAward).toBe(true);
    expect(lastCall.score).toBe(100);
  });

  it('mixed 4/5 scores 80% and passes', () => {
    render(<ReadingComprehension sections={sectionsWith(fiveQ())} {...base} />);
    markAll(['right', 'right', 'right', 'right', 'wrong']);
    expect(screen.getByTestId('comprehension-score')).toHaveTextContent('80%');
    expect(awardSpy.mock.calls.at(-1)![0].shouldAward).toBe(true);
  });

  it('below threshold (2/5=40%) fails, no award, Try again resets', () => {
    render(<ReadingComprehension sections={sectionsWith(fiveQ())} {...base} />);
    markAll(['right', 'right', 'wrong', 'wrong', 'wrong']);
    expect(screen.getByTestId('comprehension-score')).toHaveTextContent('40%');
    expect(awardSpy.mock.calls.at(-1)![0].shouldAward).toBe(false);
    const retry = screen.getByTestId('comprehension-retry');
    fireEvent.click(retry);
    // after reset: result panel gone, reveal buttons back
    expect(screen.queryByTestId('comprehension-score')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('reveal-answer').length).toBe(5);
  });

  it('anonymous user sees score but no award + sign-in CTA', () => {
    render(<ReadingComprehension sections={sectionsWith(fiveQ())} {...base} userId={null} />);
    markAll(['right', 'right', 'right', 'right', 'right']);
    expect(screen.getByTestId('comprehension-score')).toHaveTextContent('100%');
    expect(awardSpy.mock.calls.at(-1)![0].shouldAward).toBe(false);
    expect(screen.getByTestId('comprehension-signin')).toBeInTheDocument();
  });

  it('hasComprehensionQuestions reflects presence of questions', () => {
    expect(hasComprehensionQuestions(sectionsWith(fiveQ()))).toBe(true);
    expect(hasComprehensionQuestions([
      { id: 'p', idx: 0, kind: 'passage', body_vi: 'x', body_en: 'y', meta: {} },
    ])).toBe(false);
  });
});
```

Keep the existing tests in the file (passage render, missing-meta.questions guard, none→null), updating their `ReadingComprehension` calls to include the new props.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- ReadingComprehension`
Expected: FAIL — `hasComprehensionQuestions` not exported / `mark-right` testid not found / props type error.

- [ ] **Step 3: Rewrite `ReadingComprehension.tsx`**

```tsx
/**
 * <ReadingComprehension>
 *
 * Renders the passage body of a reading_passage material, then a self-graded
 * comprehension quiz from the drill section's `meta.questions`. The user reveals
 * each answer and self-marks right/wrong; once all are marked we compute a score
 * and, at >= 60%, fire award_material_completion (score-boosted) via
 * useAwardCompletion. Owns completion for readings that have questions.
 */

'use client';

import { useState } from 'react';

import { renderInline } from './markdownInline';
import { ProgressRibbon } from './ProgressRibbon';
import { useAwardCompletion } from './useAwardCompletion';

import type { Locale } from './MaterialCard';
import type { MaterialSection } from '@easyeng/core';

const PASS_PCT = 60;

export interface ReadingComprehensionProps {
  sections: MaterialSection[];
  locale: Locale;
  userId: string | null;
  materialId: string;
  alreadyCompleted: boolean;
}

interface ComprehensionQuestion {
  q_en: string;
  q_vi: string;
  answer_en: string;
}

function readQuestions(meta: Record<string, unknown>): ComprehensionQuestion[] {
  const q = meta?.questions;
  if (!Array.isArray(q)) return [];
  return q.filter(
    (item): item is ComprehensionQuestion =>
      !!item && typeof item === 'object' &&
      typeof (item as any).answer_en === 'string',
  );
}

/** True when a reading's sections include at least one comprehension question. */
export function hasComprehensionQuestions(sections: MaterialSection[]): boolean {
  const drill = sections.find((s) => s.kind === 'drill');
  return drill ? readQuestions(drill.meta).length > 0 : false;
}

export function ReadingComprehension({
  sections,
  locale,
  userId,
  materialId,
  alreadyCompleted,
}: ReadingComprehensionProps) {
  const passage = sections.find((s) => s.kind === 'passage');
  const drill = sections.find((s) => s.kind === 'drill');
  const questions = drill ? readQuestions(drill.meta) : [];

  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [marks, setMarks] = useState<Record<number, 'right' | 'wrong'>>({});

  const total = questions.length;
  const markedCount = Object.keys(marks).length;
  const allMarked = total > 0 && markedCount === total;
  const correct = Object.values(marks).filter((m) => m === 'right').length;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = scorePct >= PASS_PCT;

  const { awarded } = useAwardCompletion({
    shouldAward: allMarked && passed && userId != null,
    userId,
    materialId,
    alreadyCompleted,
    score: scorePct,
  });

  if (!passage && total === 0) return null;

  const passageBody = passage
    ? locale === 'vi'
      ? passage.body_vi ?? passage.body_en
      : passage.body_en ?? passage.body_vi
    : null;

  const t = (vi: string, en: string) => (locale === 'vi' ? vi : en);

  const reset = () => {
    setMarks({});
    setRevealed({});
  };

  return (
    <div className="space-y-5" data-testid="reading-comprehension">
      {passageBody && (
        <p className="whitespace-pre-line text-base leading-relaxed text-[color:var(--ed-ink-2,#0A1F4F)]">
          {renderInline(passageBody, 'rc-passage')}
        </p>
      )}

      {total > 0 && (
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={i} className="ed-card px-4 py-3" data-testid="comprehension-question">
              <p className="text-base text-[color:var(--ed-ink-2,#0A1F4F)]">
                {locale === 'vi' ? q.q_vi || q.q_en : q.q_en}
              </p>

              {revealed[i] ? (
                <>
                  <p className="mt-2 text-sm font-medium text-[color:var(--ed-ink,#0B2A6B)]">
                    {q.answer_en}
                  </p>
                  {!allMarked && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        data-testid="mark-right"
                        aria-pressed={marks[i] === 'right'}
                        onClick={() => setMarks((m) => ({ ...m, [i]: 'right' }))}
                        className={`ed-chip text-xs ${marks[i] === 'right' ? 'ed-chip-ink' : ''}`}
                      >
                        {t('Tôi trả lời đúng', 'I got it right')}
                      </button>
                      <button
                        type="button"
                        data-testid="mark-wrong"
                        aria-pressed={marks[i] === 'wrong'}
                        onClick={() => setMarks((m) => ({ ...m, [i]: 'wrong' }))}
                        className={`ed-chip text-xs ${marks[i] === 'wrong' ? 'ed-chip-coral' : ''}`}
                      >
                        {t('Tôi trả lời sai', 'I got it wrong')}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-sm underline text-[color:var(--ed-ink-mute,#6B7280)]"
                  data-testid="reveal-answer"
                  onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}
                >
                  {t('Xem đáp án', 'Show answer')}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {allMarked && (
        <div className="ed-card px-4 py-3" data-testid="comprehension-result">
          <p className="text-base font-medium text-[color:var(--ed-ink-2,#0A1F4F)]" data-testid="comprehension-score">
            {t(
              `Bạn đúng ${correct}/${total} (${scorePct}%)`,
              `You got ${correct}/${total} (${scorePct}%)`,
            )}
          </p>

          {passed ? (
            alreadyCompleted ? (
              <ProgressRibbon gemsAwarded={0} xpAwarded={0} alreadyEarned />
            ) : awarded ? (
              <ProgressRibbon gemsAwarded={awarded.gems} xpAwarded={awarded.xp} />
            ) : userId ? (
              <p className="mt-2 text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
                {t('Đã đạt! Đang ghi nhận…', 'Passed! Recording…')}
              </p>
            ) : (
              <p className="mt-2 text-sm text-[color:var(--ed-ink-mute,#6B7280)]" data-testid="comprehension-signin">
                {t('Đăng nhập để lưu tiến độ và nhận thưởng', 'Sign in to save progress and earn rewards')}
              </p>
            )
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-[color:var(--ed-coral-ink,#7A2010)]">
                {t(
                  `Chưa đạt (cần ${PASS_PCT}%). Hãy đọc lại và thử lại.`,
                  `Not passed (need ${PASS_PCT}%). Re-read and try again.`,
                )}
              </p>
              <button
                type="button"
                className="ed-btn"
                data-testid="comprehension-retry"
                onClick={reset}
              >
                {t('Thử lại', 'Try again')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Note: for the anonymous case, `shouldAward` is already false (`userId != null` guard), so the `awarded` branch won't fire; the `userId ?` ternary routes anon users to the `comprehension-signin` block.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter web test -- ReadingComprehension`
Expected: PASS (existing tests + 5 new).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter web run type-check`
Expected: no new errors. (Callers of `ReadingComprehension` that don't yet pass the new required props will error — that's `ReadingPassage`, fixed in Task 2. If running tsc now flags ONLY `ReadingPassage.tsx`, that's expected; proceed to Task 2. If you prefer a clean intermediate typecheck, do Task 2's edit before running type-check.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/materials/ReadingComprehension.tsx apps/web/src/components/materials/__tests__/ReadingComprehension.test.tsx
git commit -m "feat(materials): self-graded reading comprehension quiz + scoring"
```

---

### Task 2: Delegate completion in ReadingPassage

**Files:**
- Modify: `apps/web/src/components/materials/ReadingPassage.tsx`
- Test: `apps/web/src/components/materials/__tests__/ReadingPassage.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `hasComprehensionQuestions` + `ReadingComprehension` (Task 1).
- Produces: ReadingPassage that delegates completion to ReadingComprehension when questions exist; keeps its mark-done button only for passage-only readings.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/materials/__tests__/ReadingPassage.test.tsx`. Mock `useAwardCompletion` and next-intl's `useTranslations` (ReadingPassage calls it). Mock `PronunciationPractice` to a no-op (it may use browser APIs).

```tsx
jest.mock('../useAwardCompletion', () => ({
  useAwardCompletion: () => ({ awarded: null, submitting: false, error: null }),
}));
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock('../PronunciationPractice', () => ({
  __esModule: true,
  default: () => null,
}));

import { render, screen } from '@testing-library/react';
import { ReadingPassage } from '../ReadingPassage';
import type { MaterialDetail, MaterialSection } from '@easyeng/core';

const material = {
  id: 'm1',
  body_vi: '# Bài đọc\nNội dung.',
  body_en: '# Reading\nContent.',
} as unknown as MaterialDetail;

const withQuestions: MaterialSection[] = [
  { id: 'p', idx: 0, kind: 'passage', body_vi: 'Đoạn.', body_en: 'Passage.', meta: {} },
  { id: 'd', idx: 1, kind: 'drill', body_vi: 'q', body_en: 'q',
    meta: { questions: [{ q_en: 'Q?', q_vi: 'Câu?', answer_en: 'A' }] } },
];
const noQuestions: MaterialSection[] = [];

describe('ReadingPassage completion path', () => {
  const base = { material, locale: 'en' as const, userId: 'u1', alreadyCompleted: false };

  it('hides its own mark-done button when comprehension questions exist', () => {
    render(<ReadingPassage {...base} sections={withQuestions} />);
    expect(screen.queryByTestId('reading-mark-done')).not.toBeInTheDocument();
    // grading UI present instead
    expect(screen.getByTestId('reading-comprehension')).toBeInTheDocument();
  });

  it('keeps the mark-done button for passage-only readings (no questions)', () => {
    render(<ReadingPassage {...base} sections={noQuestions} />);
    expect(screen.getByTestId('reading-mark-done')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- ReadingPassage`
Expected: FAIL — both `reading-mark-done` present regardless of questions (current behavior).

- [ ] **Step 3: Edit `ReadingPassage.tsx`**

Replace the import of `ReadingComprehension` and the render/completion section. Specifically:

(a) Update the import:
```ts
import { ReadingComprehension, hasComprehensionQuestions } from './ReadingComprehension';
```

(b) In the component body, after the `practiceSentence` memo, add:
```ts
  const graded = hasComprehensionQuestions(sections);
```

(c) Replace the `return (...)` JSX with:
```tsx
  return (
    <div className="space-y-6">
      <MaterialBody material={material} locale={locale} />

      <ReadingComprehension
        sections={sections}
        locale={locale}
        userId={userId}
        materialId={material.id}
        alreadyCompleted={alreadyCompleted}
      />

      {practiceSentence && <PronunciationPractice text={practiceSentence} />}

      {/* Passage-only readings keep the manual mark-done completion. When the
          reading has comprehension questions, ReadingComprehension owns the
          score-based completion and we render no button/ribbon here. */}
      {!graded &&
        (alreadyCompleted ? (
          <ProgressRibbon gemsAwarded={0} xpAwarded={0} alreadyEarned />
        ) : awarded ? (
          <ProgressRibbon gemsAwarded={awarded.gems} xpAwarded={awarded.xp} />
        ) : userId ? (
          <button
            type="button"
            onClick={() => setMarked(true)}
            disabled={marked}
            className="ed-btn"
            data-testid="reading-mark-done"
          >
            {marked ? '…' : 'Tôi đã đọc xong'}
          </button>
        ) : (
          <p className="text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
            {t('materials.detail.signInCta')}
          </p>
        ))}
    </div>
  );
```

Leave the `marked` state, `useAwardCompletion` call, and `practiceSentence` memo as-is — the hook with `shouldAward: marked` only fires when the passage-only button is clicked, which can't happen when `graded` (button isn't rendered). This keeps the diff minimal and the hook order stable.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- ReadingPassage`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck + full materials suite**

Run: `pnpm --filter web run type-check`
Expected: clean.
Run: `pnpm --filter web test -- materials`
Expected: all green (existing + new).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/materials/ReadingPassage.tsx apps/web/src/components/materials/__tests__/ReadingPassage.test.tsx
git commit -m "feat(materials): ReadingPassage delegates completion to graded comprehension"
```

---

### Task 3: Verify in the running app

**Files:** none.

- [ ] **Step 1: Ensure a clean dev server**

Per repo HMR notes, after these client-component edits, stop any running server, `Remove-Item -Recurse -Force apps/web/.next` (bash: `rm -rf apps/web/.next`), and `preview_start` config "Frontend (Next.js)" (port 3000). It talks to the remote DB that has `reading-urbanization-c1` (5 questions) and `reading-hanoi-traffic-a2` (no questions).

- [ ] **Step 2: Graded path — pass**

Navigate to `http://localhost:3000/vi/materials/reading-urbanization-c1`. Reveal all 5 answers, click "Tôi trả lời đúng" on all 5. Confirm via preview_eval:
- `[data-testid="comprehension-score"]` shows `100%`,
- the `ProgressRibbon` (awarded gems/xp) appears,
- no `[data-testid="reading-mark-done"]` button exists.

- [ ] **Step 3: Graded path — fail + retry**

Reload the page (fresh state). Mark ≤ 2 of 5 right. Confirm: score shows the right %, a `comprehension-retry` button appears, no award ribbon. Click Try again → result panel disappears, reveal buttons return.

- [ ] **Step 4: Passage-only path unchanged**

Navigate to `http://localhost:3000/vi/materials/reading-hanoi-traffic-a2`. Confirm `[data-testid="reading-mark-done"]` is present (no grading UI).

- [ ] **Step 5: en locale + console**

Repeat step 2 briefly on `/en/materials/reading-urbanization-c1`; confirm English labels ("I got it right", "You got 5/5 (100%)"). Check `preview_console_logs` (level error) → none.

- [ ] **Step 6: Report** pass/fail per step + screenshot of the graded result panel.

---

## Self-Review

**Spec coverage:**
- Self-mark right/wrong after reveal → Task 1 component. ✓
- score_pct = round(correct/total*100), pass at ≥60 → Task 1 (`PASS_PCT`, derived score). ✓
- Award via existing RPC with score; client gates threshold → Task 1 `useAwardCompletion({ shouldAward: allMarked && passed && userId!=null, score })`. ✓
- Replaces mark-done for readings WITH questions; keeps it for passage-only → Task 2 (`!graded` guard + `hasComprehensionQuestions`). ✓
- Anonymous → score, no award, sign-in CTA → Task 1 (`comprehension-signin`). ✓
- Already-completed → completed ribbon, no double award → Task 1 (`alreadyCompleted` branch + idempotent hook). ✓
- Retry resets on fail → Task 1 `reset()` + `comprehension-retry`. ✓
- No backend/page change → no migration/RPC/page tasks. ✓
- App verification both locales → Task 3. ✓

**Placeholder scan:** none — full code in every step, exact commands + expected output.

**Type consistency:** `ReadingComprehensionProps` adds `userId/materialId/alreadyCompleted`; `ReadingPassage` passes exactly those (it already holds `userId`, `material.id`, `alreadyCompleted`). `hasComprehensionQuestions(sections: MaterialSection[]): boolean` signature identical in Task 1 (export) and Task 2 (consume). `PASS_PCT=60` single source. Test data shape `{q_en,q_vi,answer_en}` matches `ComprehensionQuestion`. ✓

**Deviation note:** Task 1 Step 5 may show a transient tsc error in `ReadingPassage.tsx` (new required props not yet passed) until Task 2 lands — called out explicitly so the reviewer expects it. The two tasks are sequential and the branch is only green after Task 2.
