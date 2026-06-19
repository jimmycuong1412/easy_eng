'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Loader2, Trophy, CheckCircle, Play, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GemImage } from '@/components/common/GemImage';

interface QuizListItem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  question_count: number;
  passing_score: number;
  best_score: number;
  attempts: number;
  passed: boolean;
}
interface PlayQuestion {
  question_id: string;
  question_text: string;
  question_type: string;
  options: string[];
  points: number;
}
interface QuizResult { score: number; passed: boolean; correct: number; total_questions: number; gems_awarded: number }

export default function QuizPage() {
  const supabase = createClient() as any;
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // player state
  const [activeQuiz, setActiveQuiz] = useState<{ title: string; questions: PlayQuestion[] } | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const loadList = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('list_quizzes');
    setQuizzes((data ?? []) as QuizListItem[]);
    setLoading(false);
  };
  useEffect(() => { loadList(); /* eslint-disable-next-line */ }, []);

  const startQuiz = async (id: string, title: string) => {
    setResult(null); setAnswers({});
    const { data } = await supabase.rpc('get_quiz_for_play', { p_quiz_id: id });
    const rows = (data ?? []) as any[];
    const questions: PlayQuestion[] = rows.map((r) => ({
      question_id: r.question_id,
      question_text: r.question_text,
      question_type: r.question_type,
      options: Array.isArray(r.options) ? r.options : [],
      points: r.points,
    }));
    setActiveQuiz({ title, questions });
    setActiveQuizId(id);
  };

  const submit = async () => {
    if (!activeQuizId) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('submit_quiz', { p_quiz_id: activeQuizId, p_answers: answers });
    setSubmitting(false);
    if (!error && data?.ok) setResult(data as QuizResult);
  };

  const exit = () => { setActiveQuiz(null); setActiveQuizId(null); setResult(null); setAnswers({}); loadList(); };

  // ---- Player view ----
  if (activeQuiz) {
    const allAnswered = activeQuiz.questions.every((q) => answers[q.question_id] != null);
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button onClick={exit} className="mb-4 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--et-fg-2)' }}>
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--et-fg)' }}>{activeQuiz.title}</h1>

        {result ? (
          <div className="mt-6 rounded-2xl p-6 text-center" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>
            <div style={{ fontSize: 56 }}>{result.passed ? '🎉' : '💪'}</div>
            <h2 className="mt-3 text-xl font-bold" style={{ color: result.passed ? '#22c55e' : 'var(--et-coral)' }}>
              {result.passed ? 'Đạt yêu cầu!' : 'Chưa đạt — thử lại nhé!'}
            </h2>
            <p className="mt-2" style={{ color: 'var(--et-fg-2)' }}>
              Điểm: <b style={{ color: 'var(--et-fg)' }}>{result.score}%</b> · Đúng {result.correct}/{result.total_questions} câu
            </p>
            {result.gems_awarded > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--et-coral)' }}>
                +{result.gems_awarded} <GemImage size={16} className="inline-block" /> thưởng
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => startQuiz(activeQuizId!, activeQuiz.title)} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg)' }}>Làm lại</button>
              <button onClick={exit} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--et-coral)' }}>Xong</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-5">
              {activeQuiz.questions.map((q, qi) => (
                <div key={q.question_id} className="rounded-xl p-5" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>
                  <p className="font-medium" style={{ color: 'var(--et-fg)' }}>{qi + 1}. {q.question_text}</p>
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, oi) => {
                      const val = String(oi);
                      const selected = answers[q.question_id] === val;
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers((a) => ({ ...a, [q.question_id]: val }))}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-colors"
                          style={{
                            background: selected ? 'var(--et-coral)' : 'var(--et-bg-3)',
                            color: selected ? '#fff' : 'var(--et-fg)',
                            border: '1px solid var(--et-line)',
                          }}
                        >
                          <span className="grid h-5 w-5 place-items-center rounded-full text-xs"
                                style={{ background: selected ? '#fff' : 'var(--et-bg-2)', color: selected ? 'var(--et-coral)' : 'var(--et-fg-2)' }}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={submit}
              disabled={!allAnswered || submitting}
              className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--et-coral)' }}
            >
              {submitting ? 'Đang chấm…' : allAnswered ? 'Nộp bài' : 'Trả lời hết các câu để nộp'}
            </button>
          </>
        )}
      </div>
    );
  }

  // ---- List view ----
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--et-fg)' }}>Quiz luyện tập 📝</h1>
      <p className="mt-1" style={{ color: 'var(--et-fg-2)' }}>Làm quiz để ôn tập và nhận thưởng Gems.</p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--et-coral)' }} /></div>
      ) : quizzes.length === 0 ? (
        <p className="py-16 text-center" style={{ color: 'var(--et-fg-2)' }}>Chưa có quiz nào. Quay lại sau nhé!</p>
      ) : (
        <div className="mt-6 space-y-3">
          {quizzes.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-4 rounded-2xl p-5"
                 style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold" style={{ color: 'var(--et-fg)' }}>{q.title}</p>
                  {q.passed && <CheckCircle className="h-4 w-4" style={{ color: '#22c55e' }} />}
                </div>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--et-fg-2)' }}>
                  {q.question_count} câu · đạt {q.passing_score}%
                  {q.attempts > 0 ? ` · điểm cao nhất ${q.best_score}%` : ''}
                </p>
              </div>
              <button onClick={() => startQuiz(q.id, q.title)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                      style={{ background: q.passed ? 'var(--et-bg-4)' : 'var(--et-coral)' }}>
                {q.passed ? <Trophy className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {q.passed ? 'Làm lại' : 'Bắt đầu'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
