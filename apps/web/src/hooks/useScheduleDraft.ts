'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// key format: "dayOfWeek:HH:MM" (e.g. "1:08:25") → enabled/disabled
type DraftOverrides = Record<string, boolean>;

export interface UseScheduleDraftReturn {
  draft: DraftOverrides;
  isDirty: boolean;
  saving: boolean;
  saveError: string | null;
  toggleDraft: (dayOfWeek: number, slotTime: string, newValue: boolean) => void;
  saveDraft: (teacherId: string) => Promise<void>;
  discardDraft: () => void;
}

export function useScheduleDraft(): UseScheduleDraftReturn {
  const [draft, setDraft] = useState<DraftOverrides>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const supabase = createClient();

  const toggleDraft = useCallback((dayOfWeek: number, slotTime: string, newValue: boolean) => {
    setDraft((prev) => ({ ...prev, [`${dayOfWeek}:${slotTime}`]: newValue }));
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const saveDraft = useCallback(async (teacherId: string) => {
    if (!isDirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      const rows = Object.entries(draft).map(([key, isEnabled]) => {
        const colonIdx = key.indexOf(':');
        const day = parseInt(key.slice(0, colonIdx));
        const hm = key.slice(colonIdx + 1); // "HH:MM"
        return {
          teacher_id: teacherId,
          day_of_week: day,
          slot_time: hm + ':00', // "HH:MM:00" for time column
          is_enabled: isEnabled,
        };
      });

      if (rows.length > 0) {
        const { error } = await supabase
          .from('teacher_slot_overrides')
          .upsert(rows, { onConflict: 'teacher_id,day_of_week,slot_time' });
        if (error) throw error;
      }

      setDraft({});
      setIsDirty(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [draft, isDirty, supabase]);

  const discardDraft = useCallback(() => {
    setDraft({});
    setIsDirty(false);
    setSaveError(null);
  }, []);

  return { draft, isDirty, saving, saveError, toggleDraft, saveDraft, discardDraft };
}
