/**
 * <ReadingComprehension>
 *
 * Renders the passage section body of a reading_passage material, then a
 * comprehension Q&A list drawn from the drill section's `meta.questions`.
 * Each answer is hidden behind a per-question "Show answer" toggle. Read-only;
 * no scoring (completion stays on the existing "mark done" button).
 */

'use client';

import { useState } from 'react';

import { renderInline } from './markdownInline';

import type { Locale } from './MaterialCard';
import type { MaterialSection } from '@easyeng/core';

export interface ReadingComprehensionProps {
  sections: MaterialSection[];
  locale: Locale;
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

export function ReadingComprehension({ sections, locale }: ReadingComprehensionProps) {
  const passage = sections.find((s) => s.kind === 'passage');
  const drill = sections.find((s) => s.kind === 'drill');
  const questions = drill ? readQuestions(drill.meta) : [];

  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  if (!passage && questions.length === 0) return null;

  const passageBody = passage
    ? locale === 'vi'
      ? passage.body_vi ?? passage.body_en
      : passage.body_en ?? passage.body_vi
    : null;

  return (
    <div className="space-y-5" data-testid="reading-comprehension">
      {passageBody && (
        <p className="whitespace-pre-line text-base leading-relaxed text-[color:var(--ed-ink-2,#0A1F4F)]">
          {renderInline(passageBody, 'rc-passage')}
        </p>
      )}

      {questions.length > 0 && (
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={i} className="ed-card px-4 py-3" data-testid="comprehension-question">
              <p className="text-base text-[color:var(--ed-ink-2,#0A1F4F)]">
                {locale === 'vi' ? q.q_vi || q.q_en : q.q_en}
              </p>
              {revealed[i] ? (
                <p className="mt-2 text-sm font-medium text-[color:var(--ed-ink,#0B2A6B)]">
                  {q.answer_en}
                </p>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-sm underline text-[color:var(--ed-ink-mute,#6B7280)]"
                  data-testid="reveal-answer"
                  onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}
                >
                  {locale === 'vi' ? 'Xem đáp án' : 'Show answer'}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
