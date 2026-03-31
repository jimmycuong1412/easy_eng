'use client';

/**
 * AvailabilityCalendar — Teacher slot management
 *
 * Full 00:00–23:30 × Mon–Sun grid (48 slots × 7 days = 336 cells).
 *
 * Features:
 *  - Batch save: explicit "Save Changes" / "Discard" — no auto-save debounce
 *  - Click-and-drag OR Shift+click multi-select
 *  - Scrollable grid (max-h-400) with sticky day-header row
 *  - High-contrast state colours: emerald open, slate closed, blue booked,
 *    amber selected, diagonal-stripe past
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save } from 'lucide-react';

// ---- Constants ----

/** Maps JS day index (0=Sun … 6=Sat) to next-intl translation key suffix */
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun display order

/** Full 24-hour slots at 30-min intervals (48 total) */
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
  workHours: { days: [1, 2, 3, 4, 5],       from: '08:00', to: '17:00' },
  morning:   { days: [0, 1, 2, 3, 4, 5, 6], from: '06:00', to: '12:00' },
  evening:   { days: [0, 1, 2, 3, 4, 5, 6], from: '18:00', to: '22:00' },
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

  // ---- Core slot state ----
  const [slotState, setSlotState] = useState<Record<string, boolean>>({});
  const savedStateRef = useRef<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ---- Selection state ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchorKey, setAnchorKey] = useState<string | null>(null);

  // ---- Drag state ----
  const [isDragging, setIsDragging] = useState(false);
  const dragStartKeyRef = useRef<string | null>(null);

  // ---- Loading / saving / error ----
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Past slots (derived from weekStart + current time) ----
  const pastSlots = useMemo<Set<string>>(() => {
    if (!_weekStart) return new Set<string>();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const past = new Set<string>();

    for (const d of ORDERED_DAYS) {
      const offset = d === 0 ? 6 : d - 1; // Mon=0 offset … Sun=6 offset
      const date = new Date(_weekStart);
      date.setDate(_weekStart.getDate() + offset);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (dateStart < todayStart) {
        VISIBLE_SLOTS.forEach((slot) => past.add(`${d}:${slot}`));
      } else if (dateStart.getTime() === todayStart.getTime()) {
        VISIBLE_SLOTS.forEach((slot) => {
          const [h, m] = slot.split(':').map(Number);
          if (h * 60 + m <= nowMins) past.add(`${d}:${slot}`);
        });
      }
    }
    return past;
  }, [_weekStart]);

  // ---- Unsaved change detection ----
  const checkUnsaved = useCallback((s: Record<string, boolean>) => {
    setHasUnsavedChanges(
      JSON.stringify(s) !== JSON.stringify(savedStateRef.current)
    );
  }, []);

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
      const built = buildDefaultState(overrides ?? []);
      savedStateRef.current = built;
      setSlotState(built);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Document-level mouseup to end drag ----
  useEffect(() => {
    const onMouseUp = () => setIsDragging(false);
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  // ---- Save / Discard ----
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

        // On success — update saved reference
        savedStateRef.current = { ...state };
        setHasUnsavedChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : t('calendar.saveError')
        );
      } finally {
        setSaving(false);
      }
    },
    [supabase, t]
  );

  const handleSave = useCallback(() => {
    saveToDb(slotState);
  }, [saveToDb, slotState]);

  const handleDiscard = useCallback(() => {
    setSlotState({ ...savedStateRef.current });
    setHasUnsavedChanges(false);
    setSelected(new Set());
  }, []);

  // ---- Slot click (single toggle + shift-click range) ----
  const handleSlotClick = (key: string, e: React.MouseEvent) => {
    if (bookedSlots.has(key) || pastSlots.has(key)) return;

    if (e.shiftKey && anchorKey) {
      // Shift+click range selection
      const range = getTimeRange(anchorKey, key).filter(
        (k) => !pastSlots.has(k) && !bookedSlots.has(k)
      );
      setSelected((prev) => new Set(Array.from(prev).concat(range)));
      return;
    }

    // Single toggle
    const newState = { ...slotState, [key]: !slotState[key] };
    setSlotState(newState);
    checkUnsaved(newState);
    setAnchorKey(key);
    setSelected(new Set());
  };

  // ---- Column / Row header selection ----
  const handleColumnHeader = (dayIndex: number) => {
    const dayKeys = VISIBLE_SLOTS.map((slot) => `${dayIndex}:${slot}`).filter(
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

  // ---- Bulk actions (defer to explicit Save) ----
  const bulkOpen = () => {
    if (selected.size === 0) return;
    const next = { ...slotState };
    selected.forEach((k) => {
      if (!bookedSlots.has(k) && !pastSlots.has(k)) next[k] = true;
    });
    setSlotState(next);
    checkUnsaved(next);
    setSelected(new Set());
  };

  const bulkClose = () => {
    if (selected.size === 0) return;
    const next = { ...slotState };
    selected.forEach((k) => {
      if (!bookedSlots.has(k) && !pastSlots.has(k)) next[k] = false;
    });
    setSlotState(next);
    checkUnsaved(next);
    setSelected(new Set());
  };

  // ---- Presets (defer to explicit Save) ----
  const applyPreset = (presetName: keyof typeof PRESET_CONFIG) => {
    const preset = PRESET_CONFIG[presetName];
    const presetSlots = VISIBLE_SLOTS.filter(
      (slot) => slot >= preset.from && slot < preset.to
    );
    const next = { ...slotState };
    for (const day of preset.days) {
      for (const slot of presetSlots) {
        const key = `${day}:${slot}`;
        if (!bookedSlots.has(key)) next[key] = true;
      }
    }
    setSlotState(next);
    checkUnsaved(next);
  };

  // ---- Unsaved change count (for display) ----
  const unsavedCount = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(slotState)) {
      if (slotState[key] !== savedStateRef.current[key]) count++;
    }
    return count;
  }, [slotState]);

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
              className="px-2.5 py-1 rounded-md text-xs border border-white/20 text-slate-300 hover:border-blue-500/60 hover:text-blue-400 transition-colors"
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
            className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
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

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500/70 border border-emerald-400" />
          {t('calendar.legend.open')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-700/50 border border-slate-600/40" />
          {t('calendar.legend.closed')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500/70 border border-blue-400" />
          {t('calendar.legend.booked')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400/80 border border-amber-300" />
          {t('calendar.legend.selected')}
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm border border-slate-700/20 opacity-60"
            style={{
              background:
                'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.06) 3px,rgba(255,255,255,0.06) 6px)',
            }}
          />
          {t('calendar.legend.past')}
        </span>
      </div>

      {/* Save / Discard bar */}
      <div className="flex items-center gap-2 min-h-[28px]">
        {saveSuccess && !hasUnsavedChanges && (
          <span className="text-xs text-emerald-400 font-medium">
            ✓ {t('calendar.saved')}
          </span>
        )}
        {hasUnsavedChanges && (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium transition-colors"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {t('calendar.saveChanges')}
            </button>
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-60 text-slate-300 text-xs transition-colors"
            >
              {t('calendar.discardChanges')}
            </button>
            <span className="text-xs text-slate-500">
              {t('calendar.unsavedChanges', { count: unsavedCount })}
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-900/20 p-3 text-sm text-red-300">{error}</div>
      )}

      {/* Tip */}
      <p className="text-xs text-slate-600">{t('calendar.shiftHint')}</p>

      {/* Grid — scrollable with sticky header */}
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full min-w-[420px] border-collapse table-fixed select-none">
            <thead className="sticky top-0 z-10 bg-[#0d1f3c]">
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
                <tr
                  key={time}
                  className={
                    time.endsWith(':00')
                      ? 'border-t border-white/10'
                      : 'border-b border-white/5 last:border-0'
                  }
                >
                  {/* Time label — only show on :00 rows */}
                  <td className="p-px text-right">
                    {time.endsWith(':00') ? (
                      <button
                        onClick={() => handleRowHeader(time)}
                        className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors w-full leading-none"
                        title={t('calendar.rowSelectTitle')}
                      >
                        {time.slice(0, 2)}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRowHeader(time)}
                        className="w-full h-full opacity-0 cursor-pointer"
                        aria-label={time}
                      />
                    )}
                  </td>

                  {/* Slot cells */}
                  {ORDERED_DAYS.map((d) => {
                    const key = `${d}:${time}`;
                    const isBooked = bookedSlots.has(key);
                    const isPast = pastSlots.has(key);
                    const isOpen = slotState[key] ?? false;
                    const isSelected = selected.has(key);

                    let cellClass = 'w-full h-3 rounded-sm transition-colors border ';
                    if (isPast) {
                      cellClass +=
                        'border-slate-700/20 cursor-not-allowed opacity-60';
                    } else if (isBooked) {
                      cellClass +=
                        'bg-blue-500/70 border-blue-400 cursor-not-allowed';
                    } else if (isSelected) {
                      cellClass +=
                        'bg-amber-400/80 border-amber-300 cursor-pointer';
                    } else if (isOpen) {
                      cellClass +=
                        'bg-emerald-500/70 border-emerald-400 hover:bg-emerald-500/80 cursor-pointer';
                    } else {
                      cellClass +=
                        'bg-slate-700/50 border-slate-600/40 hover:bg-slate-600/60 cursor-pointer';
                    }

                    return (
                      <td key={d} className="p-px">
                        <button
                          className={cellClass}
                          style={
                            isPast
                              ? {
                                  background:
                                    'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.06) 3px,rgba(255,255,255,0.06) 6px)',
                                }
                              : undefined
                          }
                          onClick={(e) => handleSlotClick(key, e)}
                          onMouseDown={(e) => {
                            if (isBooked || isPast) return;
                            e.preventDefault(); // prevent text selection
                            setIsDragging(true);
                            dragStartKeyRef.current = key;
                            setSelected((prev) => new Set(Array.from(prev).concat([key])));
                            setAnchorKey(key);
                          }}
                          onMouseEnter={() => {
                            if (!isDragging || !dragStartKeyRef.current) return;
                            if (isBooked || isPast) return;
                            const range = getTimeRange(
                              dragStartKeyRef.current,
                              key
                            ).filter(
                              (k) => !pastSlots.has(k) && !bookedSlots.has(k)
                            );
                            setSelected(new Set(range));
                          }}
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
    </div>
  );
}
