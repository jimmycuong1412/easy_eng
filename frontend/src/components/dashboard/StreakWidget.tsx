'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { useXpSummary } from '@/hooks/useXpSummary';
import { useActivityDates } from '@/hooks/useActivityDates';
import ShareAchievement from '@/components/common/ShareAchievement';

type View = 'week' | 'month' | 'year';

const VI_MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const VI_DAYS   = ['T2','T3','T4','T5','T6','T7','CN'];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toVNDate(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
function vnToday() { return toVNDate(new Date()); }

function addDays(s: string, n: number) {
  const d = new Date(s + 'T00:00:00+07:00'); d.setDate(d.getDate() + n); return toVNDate(d);
}
function addMonths(s: string, n: number) {
  const d = new Date(s + 'T00:00:00+07:00'); d.setMonth(d.getMonth() + n); return toVNDate(d);
}
function addYears(s: string, n: number) {
  const d = new Date(s + 'T00:00:00+07:00'); d.setFullYear(d.getFullYear() + n); return toVNDate(d);
}

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
    return [`${y}-${String(m+1).padStart(2,'0')}-01`, toVNDate(new Date(y, m+1, 0))];
  }
  const y = d.getFullYear();
  return [`${y}-01-01`, `${y}-12-31`];
}

// ─── Week calendar ────────────────────────────────────────────────────────────

function WeekView({ anchor, activeDates }: { anchor: string; activeDates: Set<string> }) {
  const d = new Date(anchor + 'T00:00:00+07:00');
  const dow = (d.getDay() + 6) % 7;
  const monday = new Date(d); monday.setDate(monday.getDate() - dow);
  const today = vnToday();

  return (
    <div className="mt-2 flex gap-1">
      {VI_DAYS.map((label, i) => {
        const key = toVNDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
        const lit = activeDates.has(key);
        const isToday = key === today;
        const future = key > today;
        return (
          <div key={key} className="flex flex-1 flex-col items-center gap-0.5">
            <div
              className="grid h-7 w-7 place-items-center rounded-md text-[11px] font-medium"
              style={{
                background: lit ? 'var(--et-coral)' : 'var(--et-bg-3)',
                color: lit ? '#fff' : 'var(--et-fg-2)',
                outline: isToday ? '1.5px solid var(--et-coral)' : 'none',
                outlineOffset: 1,
                opacity: future ? 0.3 : 1,
              }}
            >
              {lit ? '🔥' : isToday ? '•' : ''}
            </div>
            <span className="text-[9px]" style={{ color: isToday ? 'var(--et-coral)' : 'var(--et-fg-2)' }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Month calendar ───────────────────────────────────────────────────────────

function MonthView({ anchor, activeDates }: { anchor: string; activeDates: Set<string> }) {
  const d = new Date(anchor + 'T00:00:00+07:00');
  const y = d.getFullYear(), m = d.getMonth();
  const startDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const today = vnToday();

  const slots: Array<{ n: number | null; key: string | null }> = [];
  for (let i = 0; i < startDow; i++) slots.push({ n: null, key: null });
  for (let n = 1; n <= days; n++) {
    slots.push({ n, key: `${y}-${String(m+1).padStart(2,'0')}-${String(n).padStart(2,'0')}` });
  }

  return (
    <div className="mt-2">
      <div className="grid grid-cols-7 mb-0.5">
        {VI_DAYS.map(l => (
          <div key={l} className="text-center text-[9px]" style={{ color: 'var(--et-fg-2)' }}>{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {slots.map((s, i) => {
          if (!s.key) return <div key={`e${i}`} />;
          const lit = activeDates.has(s.key);
          const isToday = s.key === today;
          const future = s.key > today;
          return (
            <div key={s.key} className="flex justify-center">
              <div
                className="grid h-6 w-6 place-items-center rounded text-[10px] font-medium"
                style={{
                  background: lit ? 'var(--et-coral)' : 'transparent',
                  color: lit ? '#fff' : future ? 'var(--et-bg-3)' : 'var(--et-fg)',
                  outline: isToday && !lit ? '1.5px solid var(--et-coral)' : 'none',
                  outlineOffset: 1,
                }}
                title={s.key}
              >
                {lit ? '🔥' : s.n}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Year heatmap ─────────────────────────────────────────────────────────────

function YearView({ anchor, activeDates }: { anchor: string; activeDates: Set<string> }) {
  const year = new Date(anchor + 'T00:00:00+07:00').getFullYear();
  const today = vnToday();

  return (
    <div className="mt-2 grid grid-cols-4 gap-x-3 gap-y-3">
      {VI_MONTHS.map((mLabel, mIdx) => {
        const mn = mIdx + 1;
        const days = new Date(year, mn, 0).getDate();
        let fires = 0;
        for (let d = 1; d <= days; d++) {
          if (activeDates.has(`${year}-${String(mn).padStart(2,'0')}-${String(d).padStart(2,'0')}`)) fires++;
        }
        const isCur = `${year}-${String(mn).padStart(2,'0')}` === today.slice(0,7);
        return (
          <div key={mLabel}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: isCur ? 'var(--et-coral)' : 'var(--et-fg-2)' }}>
                {mLabel}
              </span>
              {fires > 0 && <span className="text-[9px]" style={{ color: 'var(--et-fg-2)' }}>{fires}🔥</span>}
            </div>
            <div className="flex flex-wrap gap-px">
              {Array.from({ length: days }, (_, i) => {
                const key = `${year}-${String(mn).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
                const lit = activeDates.has(key);
                return (
                  <div key={key} title={key}
                    className="h-1.5 w-1.5 rounded-sm"
                    style={{ background: lit ? 'var(--et-coral)' : 'var(--et-bg-3)', opacity: lit ? 1 : key > today ? 0.15 : 0.4 }}
                  />
                );
              })}
            </div>
            {/* thin completion bar */}
            <div className="mt-1 h-0.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--et-bg-3)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(fires/days*100)}%`, background: 'var(--et-coral)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StreakWidget() {
  const { streak, loading } = useStreak();
  const { xp } = useXpSummary();
  const [view, setView]     = useState<View>('week');
  const [anchor, setAnchor] = useState<string>(vnToday);

  const [from, to] = useMemo(() => rangeForView(view, anchor), [view, anchor]);
  const { dates: activeDates } = useActivityDates(from, to);

  const navigate = (dir: 1 | -1) => {
    if (view === 'week')  setAnchor(a => addDays(a, dir * 7));
    if (view === 'month') setAnchor(a => addMonths(a, dir));
    if (view === 'year')  setAnchor(a => addYears(a, dir));
  };

  const anchorLabel = useMemo(() => {
    const d = new Date(anchor + 'T00:00:00+07:00');
    if (view === 'week') {
      const dow = (d.getDay() + 6) % 7;
      const mon = new Date(d); mon.setDate(mon.getDate() - dow);
      const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
      return `${mon.getDate()}/${mon.getMonth()+1}–${sun.getDate()}/${sun.getMonth()+1}`;
    }
    if (view === 'month') return `${VI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return `${d.getFullYear()}`;
  }, [anchor, view]);

  const isAtPresent = useMemo(() => {
    const today = vnToday();
    if (view === 'week') {
      const d = new Date(anchor + 'T00:00:00+07:00');
      const sun = new Date(d); sun.setDate(sun.getDate() + (6 - (d.getDay()+6)%7));
      return today <= toVNDate(sun);
    }
    if (view === 'month') return anchor.slice(0,7) >= today.slice(0,7);
    return anchor.slice(0,4) >= today.slice(0,4);
  }, [anchor, view]);

  if (loading) return (
    <div className="rounded-xl p-3 animate-pulse"
      style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)', minHeight: 80 }} />
  );

  const cur = streak?.currentStreak ?? 0;
  const longest = streak?.longestStreak ?? 0;

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}>

      {/* ── Single compact header row ── */}
      <div className="flex items-center gap-2">

        {/* Streak count */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span style={{ fontSize: 22, lineHeight: 1 }}>{cur > 0 ? '🔥' : '✨'}</span>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold leading-none" style={{ color: 'var(--et-fg)' }}>{cur}</span>
              <span className="text-[10px]" style={{ color: 'var(--et-fg-2)' }}>ngày</span>
            </div>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--et-fg-2)' }}>
              {streak?.activeToday ? '✓ Đã học hôm nay' : cur > 0 ? 'Học hôm nay!' : 'Bắt đầu nào!'}
            </p>
          </div>
        </div>

        {/* XP bar — flexible middle */}
        {xp && (
          <div className="hidden sm:flex flex-col flex-1 min-w-0 px-2">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--et-fg)' }}>Cấp {xp.level}</span>
              <span className="text-[9px]" style={{ color: 'var(--et-fg-2)' }}>{xp.xpInLevel}/{xp.xpForNext} XP</span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--et-bg-3)' }}>
              <div className="h-full rounded-full" style={{ width: `${xp.progressPct}%`, background: 'var(--et-coral)' }} />
            </div>
          </div>
        )}

        {/* Record + tabs + nav — right side */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Kỷ lục */}
          <div className="text-right mr-1 hidden xs:block">
            <div className="text-[9px]" style={{ color: 'var(--et-fg-2)' }}>Kỷ lục</div>
            <div className="text-sm font-semibold leading-none" style={{ color: 'var(--et-coral)' }}>{longest}🔥</div>
          </div>

          {/* View tabs */}
          <div className="flex rounded p-0.5 gap-px" style={{ background: 'var(--et-bg-3)' }}>
            {(['week','month','year'] as View[]).map(v => (
              <button key={v}
                onClick={() => { setView(v); setAnchor(vnToday()); }}
                className="rounded px-2 py-0.5 text-[10px] font-medium transition-all"
                style={view === v
                  ? { background: 'var(--et-coral)', color: '#fff' }
                  : { color: 'var(--et-fg-2)' }}
              >
                {v === 'week' ? 'T' : v === 'month' ? 'M' : 'N'}
              </button>
            ))}
          </div>

          {/* Period navigator */}
          <button onClick={() => navigate(-1)} aria-label="Trước"
            className="rounded p-0.5" style={{ color: 'var(--et-fg-2)', background: 'var(--et-bg-3)' }}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-medium w-[68px] text-center" style={{ color: 'var(--et-fg)' }}>
            {anchorLabel}
          </span>
          <button onClick={() => navigate(1)} disabled={isAtPresent} aria-label="Sau"
            className="rounded p-0.5 disabled:opacity-30"
            style={{ color: 'var(--et-fg-2)', background: 'var(--et-bg-3)' }}>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Share */}
          {cur > 0 && <ShareAchievement kind="streak" value={cur} compact />}
        </div>
      </div>

      {/* ── Calendar — tight, no gap above ── */}
      {view === 'week'  && <WeekView  anchor={anchor} activeDates={activeDates} />}
      {view === 'month' && <MonthView anchor={anchor} activeDates={activeDates} />}
      {view === 'year'  && <YearView  anchor={anchor} activeDates={activeDates} />}
    </div>
  );
}
