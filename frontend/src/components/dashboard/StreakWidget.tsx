'use client';

/**
 * StreakWidget
 *
 * Dashboard hero card: 🔥 streak + calendar views (Tuần / Tháng / Năm).
 * Active dates come from daily_activity_log via useActivityDates (real per-day
 * history). Falls back gracefully to empty set if DB is unavailable.
 */

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { useXpSummary } from '@/hooks/useXpSummary';
import { useActivityDates } from '@/hooks/useActivityDates';
import ShareAchievement from '@/components/common/ShareAchievement';

// ─── Types ───────────────────────────────────────────────────────────────────

type View = 'week' | 'month' | 'year';

const VIEW_LABELS: Record<View, string> = {
  week: 'Tuần',
  month: 'Tháng',
  year: 'Năm',
};

const VI_MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const VI_DAYS   = ['T2','T3','T4','T5','T6','T7','CN'];

// ─── Date helpers (Vietnam TZ) ────────────────────────────────────────────────

function toVNDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function vnToday(): string {
  return toVNDate(new Date());
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  d.setDate(d.getDate() + n);
  return toVNDate(d);
}

function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  d.setMonth(d.getMonth() + n);
  return toVNDate(d);
}

function addYears(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  d.setFullYear(d.getFullYear() + n);
  return toVNDate(d);
}

/** Returns [from, to] date strings for the range needed by the current view+anchor */
function rangeForView(view: View, anchor: string): [string, string] {
  const d = new Date(anchor + 'T00:00:00+07:00');
  if (view === 'week') {
    const dow = (d.getDay() + 6) % 7;
    const mon = new Date(d); mon.setDate(mon.getDate() - dow);
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
    return [toVNDate(mon), toVNDate(sun)];
  }
  if (view === 'month') {
    const y = d.getFullYear(), m = d.getMonth();
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const last  = toVNDate(new Date(y, m + 1, 0));
    return [first, last];
  }
  // year
  const y = d.getFullYear();
  return [`${y}-01-01`, `${y}-12-31`];
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ anchor, activeDates }: { anchor: string; activeDates: Set<string> }) {
  const anchorDate = new Date(anchor + 'T00:00:00+07:00');
  const dow = (anchorDate.getDay() + 6) % 7;
  const monday = new Date(anchorDate);
  monday.setDate(monday.getDate() - dow);
  const today = vnToday();

  const cells = VI_DAYS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const key = toVNDate(d);
    return { label, key, isToday: key === today, lit: activeDates.has(key), isFuture: key > today };
  });

  return (
    <div className="mt-4 flex items-center justify-between gap-1.5">
      {cells.map((c) => (
        <div key={c.key} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="grid h-9 w-9 place-items-center rounded-lg text-xs font-medium transition-all"
            style={{
              background: c.lit ? 'var(--et-coral)' : 'var(--et-bg-3)',
              color: c.lit ? '#fff' : 'var(--et-fg)',
              outline: c.isToday ? '2px solid var(--et-coral)' : 'none',
              outlineOffset: 2,
              opacity: c.isFuture ? 0.3 : 1,
            }}
          >
            {c.lit ? '🔥' : c.isToday ? '·' : ''}
          </div>
          <span className="text-[10px]" style={{ color: c.isToday ? 'var(--et-coral)' : 'var(--et-fg-2)' }}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ anchor, activeDates }: { anchor: string; activeDates: Set<string> }) {
  const anchorDate = new Date(anchor + 'T00:00:00+07:00');
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = vnToday();

  const slots: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < startDow; i++) slots.push({ day: null, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    slots.push({ day: d, key });
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 mb-1">
        {VI_DAYS.map((l) => (
          <div key={l} className="text-center text-[10px]" style={{ color: 'var(--et-fg-2)' }}>{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {slots.map((s, i) => {
          if (!s.key) return <div key={`e-${i}`} />;
          const lit = activeDates.has(s.key);
          const isToday = s.key === today;
          const isFuture = s.key > today;
          return (
            <div key={s.key} className="flex justify-center">
              <div
                className="grid h-7 w-7 place-items-center rounded-md text-[11px] font-medium transition-all"
                style={{
                  background: lit ? 'var(--et-coral)' : isToday ? 'var(--et-bg-3)' : 'transparent',
                  color: lit ? '#fff' : isFuture ? 'var(--et-bg-3)' : 'var(--et-fg)',
                  outline: isToday && !lit ? '1.5px solid var(--et-coral)' : 'none',
                  outlineOffset: 1,
                }}
                title={s.key}
              >
                {lit ? '🔥' : s.day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Year View ────────────────────────────────────────────────────────────────

function YearView({ anchor, activeDates }: { anchor: string; activeDates: Set<string> }) {
  const year = new Date(anchor + 'T00:00:00+07:00').getFullYear();
  const today = vnToday();

  return (
    <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-4">
      {VI_MONTHS.map((mLabel, mIdx) => {
        const monthNum = mIdx + 1;
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        let fireCount = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const key = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (activeDates.has(key)) fireCount++;
        }
        const pct = Math.round((fireCount / daysInMonth) * 100);
        const isCurrent = `${year}-${String(monthNum).padStart(2, '0')}` === today.slice(0, 7);

        return (
          <div key={mLabel}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: isCurrent ? 'var(--et-coral)' : 'var(--et-fg)' }}>
                {mLabel}
              </span>
              {fireCount > 0 && (
                <span className="text-[10px]" style={{ color: 'var(--et-fg-2)' }}>{fireCount}🔥</span>
              )}
            </div>
            <div className="flex flex-wrap gap-0.5">
              {Array.from({ length: daysInMonth }, (_, d) => {
                const key = `${year}-${String(monthNum).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`;
                const lit = activeDates.has(key);
                const isFuture = key > today;
                return (
                  <div
                    key={key}
                    className="h-2 w-2 rounded-sm"
                    title={key}
                    style={{
                      background: lit ? 'var(--et-coral)' : 'var(--et-bg-3)',
                      opacity: lit ? 1 : isFuture ? 0.15 : 0.4,
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--et-bg-3)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: 'var(--et-coral)' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function StreakWidget() {
  const { streak, loading: streakLoading } = useStreak();
  const { xp } = useXpSummary();

  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<string>(vnToday);

  const [from, to] = useMemo(() => rangeForView(view, anchor), [view, anchor]);
  const { dates: activeDates } = useActivityDates(from, to);

  const navigate = (dir: 1 | -1) => {
    if (view === 'week')  setAnchor((a) => addDays(a, dir * 7));
    if (view === 'month') setAnchor((a) => addMonths(a, dir));
    if (view === 'year')  setAnchor((a) => addYears(a, dir));
  };

  const anchorLabel = useMemo(() => {
    const d = new Date(anchor + 'T00:00:00+07:00');
    if (view === 'week') {
      const dow = (d.getDay() + 6) % 7;
      const mon = new Date(d); mon.setDate(mon.getDate() - dow);
      const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
      return `${mon.getDate()}/${mon.getMonth()+1} – ${sun.getDate()}/${sun.getMonth()+1}/${sun.getFullYear()}`;
    }
    if (view === 'month') return `${VI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return `${d.getFullYear()}`;
  }, [anchor, view]);

  const isAtPresent = useMemo(() => {
    const today = vnToday();
    if (view === 'week') {
      const d = new Date(anchor + 'T00:00:00+07:00');
      const dow = (d.getDay() + 6) % 7;
      const sun = new Date(d); sun.setDate(sun.getDate() + (6 - dow));
      return today <= toVNDate(sun);
    }
    if (view === 'month') return anchor.slice(0, 7) >= today.slice(0, 7);
    return anchor.slice(0, 4) >= today.slice(0, 4);
  }, [anchor, view]);

  if (streakLoading) {
    return (
      <div
        className="rounded-2xl p-5 animate-pulse"
        style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)', minHeight: 110 }}
      />
    );
  }

  const cur = streak?.currentStreak ?? 0;
  const longest = streak?.longestStreak ?? 0;

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 34, lineHeight: 1 }}>{cur > 0 ? '🔥' : '✨'}</span>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold" style={{ color: 'var(--et-fg)' }}>{cur}</span>
              <span className="text-sm" style={{ color: 'var(--et-fg-2)' }}>ngày liên tục</span>
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

        <div className="flex items-center gap-4">
          {xp && (
            <div className="hidden sm:block min-w-[140px]">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--et-fg)' }}>Cấp {xp.level}</span>
                <span className="text-[10px]" style={{ color: 'var(--et-fg-2)' }}>{xp.xpInLevel}/{xp.xpForNext} XP</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--et-bg-3)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${xp.progressPct}%`, background: 'var(--et-coral)' }} />
              </div>
              <div className="mt-1 text-[10px]" style={{ color: 'var(--et-fg-2)' }}>Tổng {xp.totalXp} XP</div>
            </div>
          )}
          <div className="text-right">
            <div className="text-xs" style={{ color: 'var(--et-fg-2)' }}>Kỷ lục</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--et-coral)' }}>{longest} 🔥</div>
          </div>
        </div>
      </div>

      {/* ── View switcher + navigator ── */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--et-bg-3)' }}>
          {(['week', 'month', 'year'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setAnchor(vnToday()); }}
              className="rounded-md px-3 py-1 text-xs font-medium transition-all"
              style={view === v
                ? { background: 'var(--et-coral)', color: '#fff' }
                : { color: 'var(--et-fg-2)' }}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md p-1 transition-colors"
            style={{ color: 'var(--et-fg-2)', background: 'var(--et-bg-3)' }}
            aria-label="Kỳ trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[120px] text-center text-xs font-medium" style={{ color: 'var(--et-fg)' }}>
            {anchorLabel}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={isAtPresent}
            className="rounded-md p-1 transition-colors disabled:opacity-30"
            style={{ color: 'var(--et-fg-2)', background: 'var(--et-bg-3)' }}
            aria-label="Kỳ sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Calendar body ── */}
      {view === 'week'  && <WeekView  anchor={anchor} activeDates={activeDates} />}
      {view === 'month' && <MonthView anchor={anchor} activeDates={activeDates} />}
      {view === 'year'  && <YearView  anchor={anchor} activeDates={activeDates} />}

      {cur > 0 && (
        <div className="mt-4 flex justify-end">
          <ShareAchievement kind="streak" value={cur} compact />
        </div>
      )}
    </div>
  );
}
