'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  skill: 'grammar' | 'vocabulary' | 'reading';
}

const QUESTIONS: Question[] = [
  {
    id: 1, skill: 'grammar',
    text: 'Choose the correct sentence:',
    options: ['She go to school every day.', 'She goes to school every day.', 'She going to school every day.', 'She gone to school every day.'],
    correct: 1,
  },
  {
    id: 2, skill: 'vocabulary',
    text: '"Abundant" means:',
    options: ['Very little', 'Very large in amount', 'Very fast', 'Very old'],
    correct: 1,
  },
  {
    id: 3, skill: 'grammar',
    text: 'Which is correct?',
    options: ['I have seen him yesterday.', 'I saw him yesterday.', 'I had seen him yesterday.', 'I see him yesterday.'],
    correct: 1,
  },
  {
    id: 4, skill: 'vocabulary',
    text: 'What does "persevere" mean?',
    options: ['To give up easily', 'To continue despite difficulty', 'To move quickly', 'To speak loudly'],
    correct: 1,
  },
  {
    id: 5, skill: 'grammar',
    text: 'Complete: "If I _____ rich, I would travel the world."',
    options: ['am', 'was', 'were', 'be'],
    correct: 2,
  },
  {
    id: 6, skill: 'reading',
    text: '"The results were inconclusive." This means the results:',
    options: ['Were very clear', 'Did not give a definite answer', 'Were very positive', 'Were very negative'],
    correct: 1,
  },
  {
    id: 7, skill: 'grammar',
    text: 'Choose the correct passive form: "They built this house in 1990."',
    options: ['This house built in 1990.', 'This house was built in 1990.', 'This house is built in 1990.', 'This house were built in 1990.'],
    correct: 1,
  },
  {
    id: 8, skill: 'vocabulary',
    text: '"Eloquent" describes someone who:',
    options: ['Is very quiet', 'Speaks fluently and persuasively', 'Works very hard', 'Learns quickly'],
    correct: 1,
  },
  {
    id: 9, skill: 'grammar',
    text: 'Which sentence uses the present perfect correctly?',
    options: ['I have visited Paris last year.', 'I visited Paris already.', 'I have already visited Paris.', 'I have visit Paris.'],
    correct: 2,
  },
  {
    id: 10, skill: 'reading',
    text: '"Despite his lack of experience, he performed remarkably." "Despite" here means:',
    options: ['Because of', 'Although', 'Therefore', 'However'],
    correct: 1,
  },
];

const LEVELS = ['beginner', 'elementary', 'pre-intermediate', 'intermediate', 'upper-intermediate', 'advanced'];
const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Sơ cấp (Beginner)',
  elementary: 'Cơ bản (Elementary)',
  'pre-intermediate': 'Trước trung cấp (Pre-Int)',
  intermediate: 'Trung cấp (Intermediate)',
  'upper-intermediate': 'Trung-cao (Upper-Int)',
  advanced: 'Nâng cao (Advanced)',
};

function scoreToLevel(score: number): string {
  if (score <= 2) return 'beginner';
  if (score <= 4) return 'elementary';
  if (score <= 5) return 'pre-intermediate';
  if (score <= 7) return 'intermediate';
  if (score <= 8) return 'upper-intermediate';
  return 'advanced';
}

const SKILLS = [
  { id: 'speaking', label: '🗣️ Nói (Speaking)' },
  { id: 'listening', label: '👂 Nghe (Listening)' },
  { id: 'reading', label: '📖 Đọc (Reading)' },
  { id: 'writing', label: '✍️ Viết (Writing)' },
];

export default function OnboardingQuizPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';

  const [phase, setPhase] = useState<'intro' | 'quiz' | 'skills' | 'done'>('intro');
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [dailyGoal, setDailyGoal] = useState(15);
  const [saving, setSaving] = useState(false);

  const score = answers.filter((a, i) => a === QUESTIONS[i].correct).length;
  const level = scoreToLevel(score);

  const weakAreas = (['grammar', 'vocabulary', 'reading'] as const).filter((skill) => {
    const qs = QUESTIONS.filter((q) => q.skill === skill);
    const correct = qs.filter((q, i) => {
      const globalIdx = QUESTIONS.indexOf(q);
      return answers[globalIdx] === q.correct;
    }).length;
    return correct < qs.length * 0.6;
  });

  const handleAnswer = (optIdx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  const handleNext = () => {
    if (qIdx + 1 < QUESTIONS.length) setQIdx((i) => i + 1);
    else setPhase('skills');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient() as any;
      await supabase.rpc('save_learning_profile', {
        p_assessed_level: level,
        p_quiz_score: score,
        p_weak_areas: weakAreas,
        p_focus_skills: selectedSkills,
        p_daily_goal_mins: dailyGoal,
      });
      setPhase('done');
    } catch (err) {
      console.error('save_learning_profile error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 flex flex-col gap-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--et-fg)' }}>Kiểm tra trình độ</h1>
          <p className="text-sm" style={{ color: 'var(--et-fg-2)' }}>
            10 câu hỏi ngắn giúp hệ thống hiểu trình độ của bạn và gợi ý bài học phù hợp. Mất khoảng 3–5 phút.
          </p>
        </div>
        <button
          onClick={() => setPhase('quiz')}
          className="rounded-xl py-3 text-base font-semibold w-full flex items-center justify-center gap-2"
          style={{ background: 'var(--et-coral)', color: '#fff' }}
        >
          Bắt đầu kiểm tra <ArrowRight className="h-4 w-4" />
        </button>
        <button onClick={() => router.back()} className="text-sm text-center" style={{ color: 'var(--et-fg-2)' }}>
          Bỏ qua
        </button>
      </div>
    );
  }

  if (phase === 'quiz') {
    const q = QUESTIONS[qIdx];
    return (
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--et-bg-3)' }}>
            <div className="h-full rounded-full" style={{ width: `${((qIdx) / QUESTIONS.length) * 100}%`, background: 'var(--et-coral)' }} />
          </div>
          <span className="text-[11px]" style={{ color: 'var(--et-fg-2)' }}>{qIdx + 1}/{QUESTIONS.length}</span>
        </div>

        {/* Question */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--et-coral)' }}>
            {q.skill === 'grammar' ? 'Ngữ pháp' : q.skill === 'vocabulary' ? 'Từ vựng' : 'Đọc hiểu'}
          </p>
          <p className="text-base font-semibold mb-4" style={{ color: 'var(--et-fg)' }}>{q.text}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const selected = answers[qIdx] === i;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className="w-full text-left rounded-xl px-4 py-3 text-sm transition-all"
                  style={{
                    background: selected ? 'var(--et-coral)' : 'var(--et-bg-3)',
                    color: selected ? '#fff' : 'var(--et-fg)',
                    border: selected ? '2px solid var(--et-coral)' : '2px solid transparent',
                  }}
                >
                  <span className="font-mono mr-2" style={{ opacity: 0.6 }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={answers[qIdx] === null}
          className="rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{ background: 'var(--et-coral)', color: '#fff' }}
        >
          {qIdx + 1 === QUESTIONS.length ? 'Xem kết quả' : 'Tiếp theo'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (phase === 'skills') {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--et-fg)' }}>Kết quả: {score}/10</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--et-coral)' }}>Trình độ: {LEVEL_LABELS[level]}</p>
          {weakAreas.length > 0 && (
            <p className="text-[12px] mt-2" style={{ color: 'var(--et-fg-2)' }}>
              Cần cải thiện: {weakAreas.map((a) => a === 'grammar' ? 'Ngữ pháp' : a === 'vocabulary' ? 'Từ vựng' : 'Đọc hiểu').join(', ')}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--et-fg)' }}>Bạn muốn tập trung kỹ năng nào?</p>
          <div className="grid grid-cols-2 gap-2">
            {SKILLS.map(({ id, label }) => {
              const sel = selectedSkills.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => setSelectedSkills((prev) =>
                    sel ? prev.filter((s) => s !== id) : [...prev, id]
                  )}
                  className="rounded-xl px-4 py-3 text-sm font-medium transition-all"
                  style={{
                    background: sel ? 'rgba(244,89,58,0.12)' : 'var(--et-bg-2)',
                    color: sel ? 'var(--et-coral)' : 'var(--et-fg)',
                    border: sel ? '2px solid var(--et-coral)' : '2px solid var(--et-line)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--et-fg)' }}>
            Mục tiêu học mỗi ngày: <span style={{ color: 'var(--et-coral)' }}>{dailyGoal} phút</span>
          </p>
          <input
            type="range" min={5} max={60} step={5}
            value={dailyGoal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
            className="w-full accent-[var(--et-coral)]"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--et-fg-2)' }}>
            <span>5 phút</span><span>60 phút</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || selectedSkills.length === 0}
          className="rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: 'var(--et-coral)', color: '#fff' }}
        >
          {saving ? 'Đang lưu...' : <><Check className="h-4 w-4" /> Lưu lộ trình học</>}
        </button>
      </div>
    );
  }

  // done
  return (
    <div className="max-w-lg mx-auto px-4 py-12 flex flex-col items-center gap-5 text-center">
      <div className="text-5xl">🎉</div>
      <h2 className="text-2xl font-bold" style={{ color: 'var(--et-fg)' }}>Lộ trình đã được tạo!</h2>
      <p className="text-sm" style={{ color: 'var(--et-fg-2)' }}>
        Hệ thống sẽ gợi ý các bài học phù hợp với trình độ <strong>{LEVEL_LABELS[level]}</strong> của bạn.
      </p>
      <button
        onClick={() => router.push(`/${locale}/materials`)}
        className="rounded-xl px-6 py-3 font-semibold flex items-center gap-2"
        style={{ background: 'var(--et-coral)', color: '#fff' }}
      >
        Xem bài học gợi ý <ArrowRight className="h-4 w-4" />
      </button>
      <button onClick={() => router.push(`/${locale}/dashboard`)} className="text-sm" style={{ color: 'var(--et-fg-2)' }}>
        Về dashboard
      </button>
    </div>
  );
}
