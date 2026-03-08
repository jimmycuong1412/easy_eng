'use client';

/**
 * AvailabilityCalendar — Teacher slot management
 *
 * Shows each day's 30-min slots derived from teacher_availability ranges.
 * Teachers toggle individual slots on/off; state is saved to teacher_slot_overrides.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface AvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface SlotState {
  // "dayOfWeek:HH:MM" -> true=enabled, false=disabled
  [key: string]: boolean;
}

interface AvailabilityCalendarProps {
  locale?: string;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun display order

/** Expand an availability range into 30-min slot start times */
function expandSlots(startTime: string, endTime: string): string[] {
  const [sh, sm] = startTime.slice(0, 5).split(':').map(Number);
  const [eh, em] = endTime.slice(0, 5).split(':').map(Number);
  let mins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const slots: string[] = [];
  while (mins + 25 <= endMins) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    mins += 30;
  }
  return slots;
}

export default function AvailabilityCalendar({ locale: _locale }: AvailabilityCalendarProps) {
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
          .select('day_of_week, start_time, end_time')
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

      // Build initial slot state: all slots enabled by default,
      // then apply saved overrides
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

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const rows = Object.entries(slotState).map(([key, isEnabled]) => {
        const day = parseInt(key.split(':')[0]);
        const hm = key.slice(key.indexOf(':') + 1);
        return {
          teacher_id: user.id,
          day_of_week: day,
          slot_time: hm,
          is_enabled: isEnabled,
        };
      });

      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('teacher_slot_overrides')
          .upsert(rows, { onConflict: 'teacher_id,day_of_week,slot_time' });
        if (upsertErr) throw upsertErr;
      }

      setSaved(true);
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

      {availability.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          {t('availSettings.noSlots')}
        </p>
      ) : (
        ORDERED_DAYS.map((dayIndex) => {
          const rows = byDay[dayIndex];
          if (!rows) return null;

          const allSlots = rows.flatMap((r) => expandSlots(r.start_time, r.end_time));
          if (allSlots.length === 0) return null;

          const enabledCount = allSlots.filter((s) => slotState[`${dayIndex}:${s}`] !== false).length;
          const allOn = enabledCount === allSlots.length;
          const dayName = t(`days.${DAY_KEYS[dayIndex]}`);

          return (
            <div key={dayIndex} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold text-white">{dayName}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {enabledCount}/{allSlots.length} slot
                  </span>
                </div>
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
        })
      )}

      <Button
        onClick={save}
        disabled={saving || saved}
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
