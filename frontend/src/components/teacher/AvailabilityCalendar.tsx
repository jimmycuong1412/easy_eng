'use client';

/**
 * AvailabilityCalendar — Teacher slot management (simplified)
 *
 * 06:00–22:00 × Mon–Sun grid (32 slots × 7 days = 224 cells).
 * Features: multi-select, shift-click range, row/col header select,
 * bulk open/close, quick presets, 800ms debounce auto-save.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

// ---- Constants ----

/** Maps JS day index (0=Sun … 6=Sat) to next-intl translation key suffix */
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun display order

/** Visible slots: 06:00–21:30 (32 slots, 30-min intervals) */
const VISIBLE_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let mins = 0; mins < 24 * 60; mins += 30) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
})();

/** Preset config — keys are fixed English identifiers; labels come from translations */
const PRESET_CONFIG = {
  workHours: { days: [1, 2, 3, 4, 5],          from: '08:00', to: '17:00' },
  morning:   { days: [0, 1, 2, 3, 4, 5, 6],    from: '06:00', to: '12:00' },
  evening:   { days: [0, 1, 2, 3, 4, 5, 6],    from: '18:00', to: '22:00' },
} as const;

// ---- Helpers ----

type Override = { day_of_week: number; slot_time: string; is_enabled: boolean };

/** Convert DB overrides rows to Record<"dayOfWeek:HH:MM", boolean> */
function buildDefaultState(overrides: Override[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const day of ORDERED_DAYS) {
    for (const slot of VISIBLE_SLOTS) {
      state[`${day}:${slot}`] = false;
    }
  }
  for (const o of overrides) {
    const key = `${o.day_of_week}:${(o.slot_time as string).slice(0, 5)}`;
    if (key in state) state[key] = o.is_enabled;
  }
  return state;
}

/** Get all slot keys between anchorKey and clickedKey on the same day */
function getTimeRange(anchorKey: string, clickedKey: string): string[] {
  // Keys are "dayOfWeek:HH:MM" — split on first colon only
  const [anchorDay, anchorTime] = anchorKey.split(/:(.+)/);
  const [clickedDay, clickedTime] = clickedKey.split(/:(.+)/);
  if (anchorDay !== clickedDay) return [clickedKey];

  const anchorIdx = VISIBLE_SLOTS.indexOf(anchorTime);
  const clickedIdx = VISIBLE_SLOTS.indexOf(clickedTime);
  if (anchorIdx === -1 || clickedIdx === -1) return [clickedKey];

  const [start, end] =
    anchorIdx <= clickedIdx ? [anchorIdx, clickedIdx] : [clickedIdx, anchorIdx];
  return VISIBLE_SLOTS.slice(start, end + 1).map((t) => `${anchorDay}:${t}`);
}

// ---- Component ----

interface AvailabilityCalendarProps {
  bookedSlots?: Set<string>;
  weekStart?: Date;
}

export default function AvailabilityCalendar({
  bookedSlots = new Set(),
  weekStart: _weekStart,
}: AvailabilityCalendarProps) {
  const t = useTranslations('teacherSchedule');
  const supabase = createClient();
  const [slotState, setSlotState] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchorKey, setAnchorKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // ---- Past slots (derived from weekStart + current time) ----

  const pastSlots = useMemo<Set<string>>(() => {
    if (!_weekStart) return new Set<string>();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const past = new Set<string>();

    for (const d of ORDERED_DAYS) {
      // Mon=offset 0, Tue=1, ..., Sun=6
      const offset = d === 0 ? 6 : d - 1;
      const date = new Date(_weekStart);
      date.setDate(_weekStart.getDate() + offset);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (dateStart < todayStart) {
        // Entire past day — all slots locked
        VISIBLE_SLOTS.forEach((t) => past.add(`${d}:${t}`));
      } else if (dateStart.getTime() === todayStart.getTime()) {
        // Today — lock slots at or before current time
        VISIBLE_SLOTS.forEach((t) => {
          const [h, m] = t.split(':').map(Number);
          if (h * 60 + m <= nowMins) past.add(`${d}:${t}`);
        });
      }
    }
    return past;
  }, [_weekStart]);

  // ---- Load ----

  const load = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: overrides, error: overridesError } = await (supabase as any)
        .from('teacher_slot_overrides')
        .select('day_of_week, slot_time, is_enabled')
        .eq('teacher_id', user.id);

      if (overridesError) throw overridesError;
      setSlotState(buildDefaultState(overrides ?? []));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Save ----

  const saveToDb = useCallback(
    async (state: Record<string, boolean>) => {
      setSaving(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const rows = Object.entries(state)
          .filter(([, isEnabled]) => isEnabled)
          .map(([key]) => {
            const colonIdx = key.indexOf(':');
            return {
              teacher_id: user.id,
              day_of_week: parseInt(key.slice(0, colonIdx)),
              slot_time: key.slice(colonIdx + 1),
              is_enabled: true,
            };
          });

        const { error: delErr } = await (supabase as any)
          .from('teacher_slot_overrides')
          .delete()
          .eq('teacher_id', user.id);
        if (delErr) throw delErr;

        if (rows.length > 0) {
          const { error: insertErr } = await (supabase as any)
            .from('teacher_slot_overrides')
            .insert(rows);
          if (insertErr) throw insertErr;
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [supabase]
  );

  const scheduleSave = useCallback(
    (newState: Record<string, boolean>) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        saveToDb(newState);
      }, 800);
    },
    [saveToDb]
  );

  // ---- Slot click ----

  const handleSlotClick = (key: string, e: React.MouseEvent) => {
    if (bookedSlots.has(key)) return;
    if (pastSlots.has(key)) return;

    if (e.shiftKey && anchorKey) {
      // Range selection — add to selected (excluding past), do not save yet
      const range = getTimeRange(anchorKey, key).filter((k) => !pastSlots.has(k));
      setSelected((prev) => new Set(Array.from(prev).concat(range)));
      return;
    }

    // Single toggle with debounce save
    const newState = { ...slotState, [key]: !slotState[key] };
    setSlotState(newState);
    scheduleSave(newState);
    setAnchorKey(key);
    setSelected(new Set());
  };

  // ---- Column / Row headers ----

  const handleColumnHeader = (dayIndex: number) => {
    const dayKeys = VISIBLE_SLOTS.map((t) => `${dayIndex}:${t}`).filter(
      (k) => !bookedSlots.has(k) && !pastSlots.has(k)
    );
    setSelected((prev) => {
      const allSelected = dayKeys.every((k) => prev.has(k));
      if (allSelected) {
        const next = new Set(prev);
        dayKeys.forEach((k) => next.delete(k));
        return next;
      }
      return new Set(Array.from(prev).concat(dayKeys));
    });
  };

  const handleRowHeader = (time: string) => {
    const timeKeys = ORDERED_DAYS.map((d) => `${d}:${time}`).filter(
      (k) => !bookedSlots.has(k) && !pastSlots.has(k)
    );
    setSelected((prev) => {
      const allSelected = timeKeys.every((k) => prev.has(k));
      if (allSelected) {
        const next = new Set(prev);
        timeKeys.forEach((k) => next.delete(k));
        return next;
      }
      return new Set(Array.from(prev).concat(timeKeys));
    });
  };

  // ---- Bulk actions ----

  const bulkOpen = () => {
    if (selected.size === 0) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const next = { ...slotState };
    selected.forEach((k) => {
      if (!bookedSlots.has(k) && !pastSlots.has(k)) next[k] = true;
    });
    setSlotState(next);
    setSelected(new Set());
    saveToDb(next);
  };

  const bulkClose = () => {
    if (selected.size === 0) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const next = { ...slotState };
    selected.forEach((k) => {
      if (!bookedSlots.has(k) && !pastSlots.has(k)) next[k] = false;
    });
    setSlotState(next);
    setSelected(new Set());
    saveToDb(next);
  };

  // ---- Presets ----

  const scrollToTime = useCallback((time: string) => {
    if (!tableContainerRef.current) return;
    const row = tableContainerRef.current.querySelector<HTMLElement>(
      `button[data-time="${time}"]`
    )?.closest('tr');
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const applyPreset = (presetName: keyof typeof PRESET_CONFIG) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const preset = PRESET_CONFIG[presetName];
    const presetSlots = VISIBLE_SLOTS.filter(
      (t) => t >= preset.from && t < preset.to
    );
    const next = { ...slotState };
    for (const day of preset.days) {
      for (const t of presetSlots) {
        const key = `${day}:${t}`;
        if (!bookedSlots.has(key)) next[key] = true;
      }
    }
    setSlotState(next);
    saveToDb(next);
    // Scroll to the start of the preset time range
    setTimeout(() => scrollToTime(preset.from), 50);
  };

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quick presets — hidden when slots are selected (swaps with bulk bar) */}
      {selected.size === 0 && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESET_CONFIG) as Array<keyof typeof PRESET_CONFIG>).map((key) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="px-2.5 py-1 rounded-md text-xs border border-white/20 text-slate-300 hover:border-[#3B82F6]/60 hover:text-[#3B82F6] transition-colors"
            >
              {t(`calendar.presets.${key}`)}
            </button>
          ))}
        </div>
      )}

      {/* Bulk action bar — visible only when slots selected */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
          <span className="text-slate-400 mr-1">
            {t('calendar.selectedCount', { count: selected.size })}
          </span>
          <button
            onClick={bulkOpen}
            className="px-2.5 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
          >
            {t('calendar.bulkOpen')}
          </button>
          <button
            onClick={bulkClose}
            className="px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
          >
            {t('calendar.bulkClose')}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-2.5 py-0.5 rounded bg-white/10 text-slate-400 hover:bg-white/20"
          >
            {t('calendar.deselect')}
          </button>
        </div>
      )}

      {/* Legend + saving indicator */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500/30 border border-green-500/50" />
          {t('calendar.legend.open')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-white/5 border border-white/20" />
          {t('calendar.legend.closed')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#3B82F6]/30 border border-[#3B82F6]/50" />
          {t('calendar.legend.booked')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400/20 border border-yellow-400/50" />
          {t('calendar.legend.selected')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-800/60 border border-slate-700/30 opacity-40" />
          {t('calendar.legend.past')}
        </span>
        {saving && (
          <span className="flex items-center gap-1 text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('calendar.saving')}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-900/20 p-3 text-sm text-red-300">{error}</div>
      )}

      {/* Tip */}
      <p className="text-xs text-slate-600">{t('calendar.shiftHint')}</p>

      {/* Grid */}
      <div ref={tableContainerRef} className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[420px] border-collapse table-fixed">
          <thead>
            <tr>
              <th className="w-8 p-1 border-b border-white/10" />
              {ORDERED_DAYS.map((d) => (
                <th key={d} className="p-0.5 border-b border-white/10">
                  <button
                    onClick={() => handleColumnHeader(d)}
                    className="w-full text-xs font-medium text-slate-400 hover:text-white transition-colors py-0.5"
                    title={t('calendar.colSelectTitle')}
                  >
                    {t(`days.${DAY_KEYS[d]}`)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VISIBLE_SLOTS.map((time) => (
              <tr key={time} className="border-b border-white/5 last:border-0">
                <td className="p-px text-right">
                  <button
                    onClick={() => handleRowHeader(time)}
                    data-time={time}
                    className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors w-full leading-none"
                    title={t('calendar.rowSelectTitle')}
                  >
                    {time}
                  </button>
                </td>
                {ORDERED_DAYS.map((d) => {
                  const key = `${d}:${time}`;
                  const isBooked = bookedSlots.has(key);
                  const isPast = pastSlots.has(key);
                  const isOpen = slotState[key] ?? false;
                  const isSelected = selected.has(key);

                  let cellClass =
                    'w-full h-3 rounded-sm transition-colors border ';
                  if (isPast) {
                    cellClass +=
                      'bg-slate-800/60 border-slate-700/30 cursor-not-allowed opacity-40';
                  } else if (isBooked) {
                    cellClass +=
                      'bg-[#3B82F6]/30 border-[#3B82F6]/50 cursor-not-allowed';
                  } else if (isSelected) {
                    cellClass +=
                      'bg-yellow-400/20 border-yellow-400/50 cursor-pointer';
                  } else if (isOpen) {
                    cellClass +=
                      'bg-green-500/20 border-green-500/40 hover:bg-green-500/30 cursor-pointer';
                  } else {
                    cellClass +=
                      'bg-white/5 border-white/10 hover:border-white/25 cursor-pointer';
                  }

                  return (
                    <td key={d} className="p-px">
                      <button
                        className={cellClass}
                        onClick={(e) => handleSlotClick(key, e)}
                        disabled={isBooked || isPast}
                        title={
                          isPast
                            ? t('calendar.pastTooltip')
                            : isBooked
                            ? t('calendar.bookedTooltip')
                            : isOpen
                            ? t('calendar.openTooltip')
                            : t('calendar.closedTooltip')
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
