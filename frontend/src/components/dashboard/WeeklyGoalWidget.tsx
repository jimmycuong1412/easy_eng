'use client';

import { useState } from 'react';
import { Target, Pencil, Check, X } from 'lucide-react';
import { useWeeklyGoal } from '@/hooks/useWeeklyGoal';

function GoalBar({
  label, actual, target, color,
}: { label: string; actual: number; target: number; color: string }) {
  const pct = target === 0 ? 0 : Math.min(100, Math.round((actual / target) * 100));
  const done = actual >= target;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-0.5">
        <span className="text-[11px]" style={{ color: 'var(--et-fg-2)' }}>{label}</span>
        <span className="text-[11px] font-semibold" style={{ color: done ? '#4ade80' : 'var(--et-fg)' }}>
          {actual}/{target} {done && '✓'}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--et-bg-3)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: done ? '#4ade80' : color }}
        />
      </div>
    </div>
  );
}

export default function WeeklyGoalWidget() {
  const { progress, loading, save } = useWeeklyGoal();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ sessions: 3, vocab: 20, streak: 5 });

  if (loading) return (
    <div className="rounded-xl p-3 animate-pulse" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)', minHeight: 100 }} />
  );

  const p = progress;

  const openEdit = () => {
    setDraft({
      sessions: p?.target_sessions ?? 3,
      vocab: p?.target_vocab ?? 20,
      streak: p?.target_streak_days ?? 5,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    await save(draft.sessions, draft.vocab, draft.streak);
    setEditing(false);
  };

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Target className="h-4 w-4 shrink-0" style={{ color: 'var(--et-coral)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--et-fg)' }}>Mục tiêu tuần này</span>
        {!editing && (
          <button onClick={openEdit} className="ml-auto rounded p-0.5" style={{ color: 'var(--et-fg-2)', background: 'var(--et-bg-3)' }}>
            <Pencil className="h-3 w-3" />
          </button>
        )}
        {editing && (
          <div className="ml-auto flex gap-1">
            <button onClick={handleSave} className="rounded p-0.5" style={{ color: '#4ade80', background: 'var(--et-bg-3)' }}>
              <Check className="h-3 w-3" />
            </button>
            <button onClick={() => setEditing(false)} className="rounded p-0.5" style={{ color: 'var(--et-fg-2)', background: 'var(--et-bg-3)' }}>
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {[
            { label: 'Buổi học', key: 'sessions' as const, min: 1, max: 14 },
            { label: 'Từ vựng lưu', key: 'vocab' as const, min: 5, max: 100 },
            { label: 'Ngày streak', key: 'streak' as const, min: 1, max: 7 },
          ].map(({ label, key, min, max }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[11px] w-24 shrink-0" style={{ color: 'var(--et-fg-2)' }}>{label}</span>
              <input
                type="number"
                min={min}
                max={max}
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
                className="w-16 rounded px-2 py-0.5 text-[12px] text-center"
                style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg)', border: '1px solid var(--et-line)' }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <GoalBar
            label="📚 Buổi học"
            actual={p?.actual_sessions ?? 0}
            target={p?.target_sessions ?? 3}
            color="var(--et-coral)"
          />
          <GoalBar
            label="⭐ Từ vựng lưu"
            actual={p?.actual_vocab ?? 0}
            target={p?.target_vocab ?? 20}
            color="#60a5fa"
          />
          <GoalBar
            label="🔥 Ngày streak"
            actual={p?.actual_streak_days ?? 0}
            target={p?.target_streak_days ?? 5}
            color="#fbbf24"
          />
        </div>
      )}
    </div>
  );
}
