'use client';

/**
 * StreakWidget
 *
 * Dashboard hero card showing the learner's 🔥 daily streak + a 7-day strip.
 * Reads via useStreak; designed for the EasyEng dark editorial theme.
 */

import React from 'react';
import { useStreak } from '@/hooks/useStreak';
import { useXpSummary } from '@/hooks/useXpSummary';
import ShareAchievement from '@/components/common/ShareAchievement';

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function StreakWidget() {
  const { streak, loading } = useStreak();
  const { xp } = useXpSummary();

  // Build the last-7-days strip (Mon..Sun of the current week), marking days
  // that fall within the active streak window up to today.
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  const active = streak?.activeToday ? streak.currentStreak : (streak?.currentStreak ?? 0);

  const cells = DAY_LABELS.map((label, i) => {
    // distance of this weekday from today (negative = past, 0 = today)
    const offset = i - dow;
    const isToday = offset === 0;
    const isFuture = offset > 0;
    // a past/today cell is "lit" if it's within the streak length counting back from today
    const daysBack = -offset; // today=0, yesterday=1...
    const lit = !isFuture && daysBack < active && (streak?.activeToday || daysBack > 0 ? true : false);
    return { label, isToday, isFuture, lit };
  });

  if (loading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)', minHeight: 110 }} />
    );
  }

  const cur = streak?.currentStreak ?? 0;
  const longest = streak?.longestStreak ?? 0;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 34, lineHeight: 1 }}>{cur > 0 ? '🔥' : '✨'}</span>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold" style={{ color: 'var(--et-fg)' }}>{cur}</span>
              <span className="text-sm" style={{ color: 'var(--et-fg-2)' }}>
                {cur === 1 ? 'ngày' : 'ngày'} liên tục
              </span>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--et-fg-2)' }}>
              {streak?.activeToday
                ? 'Đã học hôm nay — giữ vững nhé! 💪'
                : cur > 0
                  ? 'Học hôm nay để giữ chuỗi 🔥'
                  : 'Bắt đầu chuỗi học của bạn hôm nay!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {/* Level + XP */}
          {xp && (
            <div className="hidden sm:block min-w-[140px]">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--et-fg)' }}>
                  Cấp {xp.level}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--et-fg-2)' }}>
                  {xp.xpInLevel}/{xp.xpForNext} XP
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--et-bg-3)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${xp.progressPct}%`, background: 'var(--et-coral)' }}
                />
              </div>
              <div className="mt-1 text-[10px]" style={{ color: 'var(--et-fg-2)' }}>
                Tổng {xp.totalXp} XP
              </div>
            </div>
          )}
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--et-fg-2)' }}>Kỷ lục</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--et-coral)' }}>{longest} 🔥</div>
          </div>
        </div>
      </div>

      {/* 7-day strip */}
      <div className="mt-4 flex items-center justify-between gap-1.5">
        {cells.map((c, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="grid h-8 w-8 place-items-center rounded-lg text-xs font-medium"
              style={{
                background: c.lit ? 'var(--et-coral)' : 'var(--et-bg-3)',
                color: c.lit ? '#fff' : 'var(--et-fg-2)',
                outline: c.isToday ? '2px solid var(--et-coral)' : 'none',
                outlineOffset: 1,
                opacity: c.isFuture ? 0.4 : 1,
              }}
            >
              {c.lit ? '🔥' : ''}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--et-fg-2)' }}>{c.label}</span>
          </div>
        ))}
      </div>

      {cur > 0 && (
        <div className="mt-4 flex justify-end">
          <ShareAchievement kind="streak" value={cur} compact />
        </div>
      )}
    </div>
  );
}
