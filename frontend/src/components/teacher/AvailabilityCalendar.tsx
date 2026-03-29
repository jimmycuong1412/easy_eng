'use client';

/**
 * AvailabilityCalendar — Teacher slot management
 *
 * Shows all 7 days. Teachers can add/remove days and toggle individual
 * 30-min slots. State is saved to teacher_availability + teacher_slot_overrides.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface AvailabilityRow {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface SlotState {
  [key: string]: boolean; // "dayOfWeek:HH:MM" -> enabled
}

interface AvailabilityCalendarProps {
  locale?: string;
  onSaved?: () => void;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun

const DEFAULT_START = '00:00:00';
const DEFAULT_END = '23:30:00';

// Canonical 25-min slot grid anchored at midnight — same as schedule/page.tsx
const ALL_SLOTS: string[] = (() => {
  const slots: string[] = [];
  let t = 0;
  while (t < 24 * 60) {
    slots.push(`${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`);
    t += 25;
  }
  return slots;
})();

/** Return grid slots that fall within [startTime, endTime) */
function expandSlots(startTime: string, endTime: string): string[] {
  const startMins = parseInt(startTime.slice(0, 2)) * 60 + parseInt(startTime.slice(3, 5));
  const endMins   = parseInt(endTime.slice(0, 2))   * 60 + parseInt(endTime.slice(3, 5));
  return ALL_SLOTS.filter((slot) => {
    const slotMins = parseInt(slot.slice(0, 2)) * 60 + parseInt(slot.slice(3, 5));
    return slotMins >= startMins && slotMins + 25 <= endMins;
  });
}

export default function AvailabilityCalendar({ locale: _locale, onSaved }: AvailabilityCalendarProps) {
  const t = useTranslations('teacherSchedule');
  const supabase = createClient();

  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [slotState, setSlotState] = useState<SlotState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [availResult, overridesResult] = await Promise.all([
        supabase
          .from('teacher_availability')
          .select('id, day_of_week, start_time, end_time')
          .eq('teacher_id', user.id)
          .eq('is_active', true),
        supabase
          .from('teacher_slot_overrides')
          .select('day_of_week, slot_time, is_enabled')
          .eq('teacher_id', user.id),
      ]);

      if (availResult.error) throw availResult.error;

      const rows = availResult.data ?? [];
      setAvailability(rows);

      const state: SlotState = {};
      rows.forEach((row) => {
        expandSlots(row.start_time, row.end_time).forEach((slot) => {
          state[`${row.day_of_week}:${slot}`] = true;
        });
      });
      (overridesResult.data ?? []).forEach((o) => {
        const key = `${o.day_of_week}:${(o.slot_time as string).slice(0, 5)}`;
        if (key in state) state[key] = o.is_enabled;
      });

      setSlotState(state);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const toggle = (key: string) => {
    setSlotState((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  /** Add a day with full 08:00–21:00 availability */
  const addDay = async (dayIndex: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: insertErr } = await supabase
        .from('teacher_availability')
        .insert({
          teacher_id: user.id,
          day_of_week: dayIndex,
          start_time: DEFAULT_START,
          end_time: DEFAULT_END,
          is_active: true,
        })
        .select('id, day_of_week, start_time, end_time')
        .single();

      if (insertErr) throw insertErr;

      setAvailability((prev) => [...prev, data]);

      // Enable all slots for the new day
      const newSlots = expandSlots(DEFAULT_START, DEFAULT_END);
      setSlotState((prev) => {
        const next = { ...prev };
        newSlots.forEach((s) => { next[`${dayIndex}:${s}`] = true; });
        return next;
      });
      setSaved(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add day');
    }
  };

  /** Remove a day entirely */
  const removeDay = async (dayIndex: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: delErr } = await supabase
        .from('teacher_availability')
        .delete()
        .eq('teacher_id', user.id)
        .eq('day_of_week', dayIndex);

      if (delErr) throw delErr;

      // Also remove slot overrides for this day
      await supabase
        .from('teacher_slot_overrides')
        .delete()
        .eq('teacher_id', user.id)
        .eq('day_of_week', dayIndex);

      setAvailability((prev) => prev.filter((r) => r.day_of_week !== dayIndex));
      setSlotState((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${dayIndex}:`)) delete next[k];
        });
        return next;
      });
      setSaved(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove day');
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const rows = Object.entries(slotState).map(([key, isEnabled]) => {
        const day = parseInt(key.split(':')[0]);
        const hm = key.slice(key.indexOf(':') + 1);
        return { teacher_id: user.id, day_of_week: day, slot_time: hm, is_enabled: isEnabled };
      });

      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('teacher_slot_overrides')
          .upsert(rows, { onConflict: 'teacher_id,day_of_week,slot_time' });
        if (upsertErr) throw upsertErr;
      }

      setSaved(true);
      onSaved?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const activeDays = new Set(availability.map((r) => r.day_of_week));

  // Group availability by day
  const byDay: Record<number, AvailabilityRow[]> = {};
  availability.forEach((row) => {
    if (!byDay[row.day_of_week]) byDay[row.day_of_week] = [];
    byDay[row.day_of_week].push(row);
  });

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-900/20 p-3 text-sm text-red-300">{error}</div>
      )}

      {/* Add day buttons for days not yet active */}
      {ORDERED_DAYS.some((d) => !activeDays.has(d)) && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-slate-400 mb-2">Add availability for:</p>
          <div className="flex flex-wrap gap-2">
            {ORDERED_DAYS.filter((d) => !activeDays.has(d)).map((dayIndex) => (
              <button
                key={dayIndex}
                onClick={() => addDay(dayIndex)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-dashed border-white/20 text-slate-400 hover:border-[#3B82F6]/60 hover:text-[#3B82F6] transition-all"
              >
                <Plus className="w-3 h-3" />
                {DAY_NAMES[dayIndex]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active days */}
      {ORDERED_DAYS.map((dayIndex) => {
        const rows = byDay[dayIndex];
        if (!rows) return null;

        const allSlots = rows.flatMap((r) => expandSlots(r.start_time, r.end_time));
        if (allSlots.length === 0) return null;

        const enabledCount = allSlots.filter((s) => slotState[`${dayIndex}:${s}`] !== false).length;
        const allOn = enabledCount === allSlots.length;
        const dayName = (() => {
          try { return t(`days.${DAY_KEYS[dayIndex]}`); } catch { return DAY_NAMES[dayIndex]; }
        })();

        return (
          <div key={dayIndex} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold text-white">{dayName}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {enabledCount}/{allSlots.length} slots
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newVal = !allOn;
                    setSlotState((prev) => {
                      const next = { ...prev };
                      allSlots.forEach((s) => { next[`${dayIndex}:${s}`] = newVal; });
                      return next;
                    });
                    setSaved(false);
                  }}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  {allOn ? t('availSettings.disableAll') : t('availSettings.enableAll')}
                </button>
                <button
                  onClick={() => removeDay(dayIndex)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  title="Remove day"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {allSlots.map((slot) => {
                const key = `${dayIndex}:${slot}`;
                const enabled = slotState[key] !== false;
                return (
                  <button
                    key={slot}
                    onClick={() => toggle(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                      enabled
                        ? 'bg-[#3B82F6]/20 border-[#3B82F6]/60 text-[#3B82F6] hover:bg-[#3B82F6]/30'
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20 line-through'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {availability.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          {t('availSettings.noSlots')}
        </p>
      )}

      <Button
        onClick={save}
        disabled={saving || saved || availability.length === 0}
        className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90"
      >
        {saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('availSettings.saving')}</>
        ) : saved ? (
          t('availSettings.saved')
        ) : (
          <><Save className="mr-2 h-4 w-4" />{t('availSettings.saveBtn')}</>
        )}
      </Button>
    </div>
  );
}
