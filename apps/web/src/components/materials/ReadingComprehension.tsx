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
