'use client';

/**
 * AvailabilityCalendar — Teacher slot management
 *
 * Displays all 48 possible 30-minute slots per day (00:00 – 23:30).
 * Each slot = 25 min teaching + 5 min rest.
 * Teachers toggle slots on/off; state is saved to teacher_slot_overrides.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SlotState {
  // "dayOfWeek:HH:MM" -> true=enabled, false=disabled
  [key: string]: boolean;
}

const DAY_NAMES = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun display order

/** All 48 slot start times: 00:00, 00:30, 01:00, … 23:30 */
const ALL_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let mins = 0; mins < 24 * 60; mins += 30) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
})();

/** Build an empty SlotState with every day × slot = false */
function buildEmptyState(): SlotState {
  const state: SlotState = {};
  for (const day of ORDERED_DAYS) {
    for (const slot of ALL_SLOTS) {
      state[`${day}:${slot}`] = false;
    }
  }
  return state;
}

export default function AvailabilityCalendar() {
  const supabase = createClient();
  const [slotState, setSlotState] = useState<SlotState>(buildEmptyState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: overrides, error: overridesError } = await (supabase as any)
        .from('teacher_slot_overrides')
        .select('day_of_week, slot_time, is_enabled')
        .eq('teacher_id', user.id);

      if (overridesError) throw overridesError;

      // Start with all slots disabled, then apply saved overrides
      const state = buildEmptyState();
      for (const o of (overrides ?? [])) {
        const key = `${o.day_of_week}:${(o.slot_time as string).slice(0, 5)}`;
        if (key in state) state[key] = o.is_enabled;
      }

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

  const toggleDay = (dayIndex: number, enable: boolean) => {
    setSlotState((prev) => {
      const next = { ...prev };
      ALL_SLOTS.forEach((s) => { next[`${dayIndex}:${s}`] = enable; });
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Only upsert enabled slots to keep the table lean;
      // disabled slots not in the table are treated as disabled by default.
      const rows = Object.entries(slotState)
        .filter(([, isEnabled]) => isEnabled)
        .map(([key, isEnabled]) => {
          const [dayStr, ...timeParts] = key.split(':');
          return {
            teacher_id: user.id,
            day_of_week: parseInt(dayStr),
            slot_time: timeParts.join(':'), // "HH:MM"
            is_enabled: isEnabled,
          };
        });

      // First, delete existing records for this teacher so disabled slots are cleared
      const { error: delErr } = await (supabase as any)
        .from('teacher_slot_overrides')
        .delete()
        .eq('teacher_id', user.id);
      if (delErr) throw delErr;

      if (rows.length > 0) {
        const { error: upsertErr } = await (supabase as any)
          .from('teacher_slot_overrides')
          .insert(rows);
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

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-sm text-blue-300">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Mỗi slot = <strong>25 phút dạy</strong> + 5 phút nghỉ.
          Khoảng cách giữa các slot: <strong>30 phút</strong>. Phạm vi: 00:00 – 24:00.
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/20 p-3 text-sm text-red-300">{error}</div>
      )}

      {ORDERED_DAYS.map((dayIndex) => {
        const enabledCount = ALL_SLOTS.filter((s) => slotState[`${dayIndex}:${s}`]).length;
        const allOn = enabledCount === ALL_SLOTS.length;

        return (
          <div key={dayIndex} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold text-white">{DAY_NAMES[dayIndex]}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {enabledCount}/{ALL_SLOTS.length} slot
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => toggleDay(dayIndex, !allOn)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  {allOn ? 'Tắt tất cả' : 'Bật tất cả'}
                </button>
              </div>
            </div>

            {/* Hour-grouped slot grid */}
            <div className="space-y-2">
              {Array.from({ length: 24 }, (_, hour) => {
                const hourSlots = ALL_SLOTS.filter((s) => parseInt(s.split(':')[0]) === hour);
                return (
                  <div key={hour} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-right text-xs text-slate-500 font-mono">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {hourSlots.map((slot) => {
                        const key = `${dayIndex}:${slot}`;
                        const enabled = slotState[key];
                        return (
                          <button
                            key={slot}
                            onClick={() => toggle(key)}
                            title={`${slot} – ${slot.split(':')[0]}:${String(parseInt(slot.split(':')[1]) + 25).padStart(2, '0')} (25 phút dạy)`}
                            className={`w-14 py-1 rounded text-xs font-medium transition-all border ${
                              enabled
                                ? 'bg-[#3B82F6]/20 border-[#3B82F6]/60 text-[#3B82F6] hover:bg-[#3B82F6]/30'
                                : 'bg-white/5 border-white/10 text-slate-600 hover:border-white/20 hover:text-slate-400'
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
            </div>
          </div>
        );
      })}

      <Button
        onClick={save}
        disabled={saving || saved}
        className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90"
      >
        {saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</>
        ) : saved ? (
          '✓ Đã lưu'
        ) : (
          <><Save className="mr-2 h-4 w-4" />Lưu cài đặt slot</>
        )}
      </Button>
    </div>
  );
}
