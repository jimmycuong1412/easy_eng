/**
 * <MockTestPlayer>
 *
 * Client component for rendering and grading a mock_test material.
 *
 * Critical contract:
 *   - Questions come from `mock_test_items_public` (the view, NOT the base
 *     table) so `correct_index` and `explanation_*` are not in the bundle.
 *   - Submission goes through `grade_mock_test` (SECURITY DEFINER RPC).
 *     The server returns per-item correctness + explanations after grading.
 *   - **No gems or XP are awarded** (per 2026-05-10 clarification). The
 *     result screen surfaces score and explanations only.
 */

'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import type {
  MockTestGradeResult,
  MockTestQuestion,
} from '@/lib/queries/materials';

import type { Locale } from './MaterialCard';

export interface MockTestPlayerProps {
  materialId: string;
  questions: MockTestQuestion[];
  userId: string | null;
  locale: Locale;
}

type AnswerMap = Record<string, string | number>;

export function MockTestPlayer({
  materialId,
  questions,
  userId,
  locale,
}: MockTestPlayerProps) {
  const t = useTranslations();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MockTestGradeResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const allAnswered = useMemo(
    () => questions.every((q) => answers[String(q.idx)] !== undefined),
    [answers, questions],
  );

  const submit = async () => {
    if (!userId || !allAnswered || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc('grade_mock_test', {
      p_user_id: userId,
      p_material_id: materialId,
      p_answers: answers,
    });

    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setResult(data as MockTestGradeResult);
  };

  // ============================================================
  // Result view
  // ============================================================
  if (result) {
    return (
      <div className="space-y-5">
        <ResultBanner result={result} t={t} />
        <p className="text-xs text-[color:var(--ed-ink-mute,#6B7280)]">
          {t('materials.test.noReward')}
        </p>
        <ol className="space-y-4">
          {questions.map((q) => {
            const item = result.per_item.find((p) => p.idx === q.idx);
            if (!item) return null;
            const userPick = answers[String(q.idx)];
            return (
              <li
                key={q.id}
                className="ed-card p-4"
                data-testid={`mock-test-result-item-${q.idx}`}
              >
                <div className="flex items-start gap-2">
                  {item.correct ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 text-[color:var(--ed-coral,#F4593A)]"
                      aria-label={t('materials.test.correctAnswer')}
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 h-4 w-4 text-[color:var(--ed-ink-mute,#6B7280)]"
                      aria-label={t('materials.test.yourAnswer')}
                    />
                  )}
                  <div className="flex-1">
                    <p
                      className="font-serif text-base text-[color:var(--ed-ink-2,#0A1F4F)]"
                      style={{ fontFamily: 'var(--font-newsreader, serif)' }}
                    >
                      {q.prompt_en}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ed-ink-mute,#6B7280)]">
                      {t('materials.test.yourAnswer')}: {String(userPick ?? '—')} ·{' '}
                      {t('materials.test.correctAnswer')}: {item.idx}
                    </p>
                    {(item.explanation_vi ?? item.explanation_en) && (
                      <p className="mt-2 text-sm text-[color:var(--ed-ink,#0B2A6B)]">
                        <span className="ed-eyebrow mr-2 text-[10px]">
                          {t('materials.test.explanation')}
                        </span>
                        {locale === 'vi'
                          ? item.explanation_vi ?? item.explanation_en
                          : item.explanation_en ?? item.explanation_vi}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  // ============================================================
  // Anonymous viewer — no submission UI
  // ============================================================
  if (!userId) {
    return (
      <div className="space-y-5">
        <ol className="space-y-4">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              selectedValue={null}
              onSelect={() => {}}
              disabled
            />
          ))}
        </ol>
        <p className="text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
          {t('materials.detail.signInCta')}
        </p>
      </div>
    );
  }

  // ============================================================
  // Active test view (authenticated, not yet submitted)
  // ============================================================
  return (
    <div className="space-y-5">
      <ol className="space-y-4">
        {questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            selectedValue={answers[String(q.idx)] ?? null}
            onSelect={(value) =>
              setAnswers((prev) => ({ ...prev, [String(q.idx)]: value }))
            }
          />
        ))}
      </ol>

      {submitError && (
        <p role="alert" className="text-sm text-[color:var(--ed-coral-ink,#7A2010)]">
          {submitError}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!allAnswered || submitting}
        className="ed-btn ed-btn-primary"
      >
        {submitting ? '…' : t('materials.test.submit')}
      </button>
    </div>
  );
}

// ============================================================
// Question card — multiple-choice radio group, or fill-in text input
// ============================================================
interface QuestionCardProps {
  question: MockTestQuestion;
  selectedValue: string | number | null;
  onSelect: (value: string | number) => void;
  disabled?: boolean;
}

function QuestionCard({
  question,
  selectedValue,
  onSelect,
  disabled = false,
}: QuestionCardProps) {
  const groupName = `q-${question.id}`;

  if (question.format === 'fill_in_blank') {
    return (
      <li className="ed-card p-4">
        <p
          className="font-serif text-base text-[color:var(--ed-ink-2,#0A1F4F)]"
          style={{ fontFamily: 'var(--font-newsreader, serif)' }}
        >
          {question.prompt_en}
        </p>
        <input
          type="text"
          value={(selectedValue as string) ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          className="mt-3 w-full rounded-md border px-3 py-2 text-sm"
          style={{
            background: 'var(--ed-paper-2, #FBF9F4)',
            borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
          }}
          aria-label={question.prompt_en}
        />
      </li>
    );
  }

  return (
    <li className="ed-card p-4">
      <p className="text-xs text-[color:var(--ed-ink-mute,#6B7280)]">
        {question.prompt_vi}
      </p>
      <p
        className="mt-1 font-serif text-base text-[color:var(--ed-ink-2,#0A1F4F)]"
        style={{ fontFamily: 'var(--font-newsreader, serif)' }}
      >
        {question.prompt_en}
      </p>
      <ul className="mt-3 space-y-2">
        {question.options_en.map((opt, i) => {
          const id = `${groupName}-${i}`;
          const isChecked = selectedValue === i;
          return (
            <li key={id}>
              <label
                htmlFor={id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  isChecked
                    ? 'border-[color:var(--ed-coral,#F4593A)] bg-[color:var(--ed-coral-2,#FFE7E0)]'
                    : 'border-[color:var(--ed-rule,rgba(0,0,0,0.08))]'
                }`}
              >
                <input
                  id={id}
                  type="radio"
                  name={groupName}
                  value={i}
                  checked={isChecked}
                  disabled={disabled}
                  onChange={() => onSelect(i)}
                  className="h-3.5 w-3.5"
                />
                <span>{opt}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

// ============================================================
// Result banner — pass/fail headline + score
// ============================================================
function ResultBanner({
  result,
  t,
}: {
  result: MockTestGradeResult;
  t: ReturnType<typeof useTranslations>;
}) {
  const headline = result.passed
    ? t('materials.test.passed')
    : t('materials.test.failed');

  return (
    <div
      data-testid="mock-test-result-banner"
      className="ed-card flex items-center justify-between gap-3 px-4 py-3"
      style={{
        background: result.passed
          ? 'var(--ed-coral-2, #FFE7E0)'
          : 'var(--ed-paper-2, #FBF9F4)',
        borderColor: result.passed
          ? 'var(--ed-coral, #F4593A)'
          : 'var(--ed-rule, rgba(0,0,0,0.08))',
      }}
    >
      <span
        className="font-serif text-lg text-[color:var(--ed-ink-2,#0A1F4F)]"
        style={{ fontFamily: 'var(--font-newsreader, serif)' }}
      >
        {headline}
      </span>
      <span className="font-mono text-sm">
        {t('materials.test.score', { score: result.score_pct })} ·{' '}
        {result.items_correct} / {result.items_total}
      </span>
    </div>
  );
}
