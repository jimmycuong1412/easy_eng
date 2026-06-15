'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface WeeklyGoalProgress {
  week_start: string;
  target_sessions: number;
  target_vocab: number;
  target_streak_days: number;
  actual_sessions: number;
  actual_vocab: number;
  actual_streak_days: number;
}

export function useWeeklyGoal() {
  const [progress, setProgress] = useState<WeeklyGoalProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient() as any;
      const { data, error } = await supabase.rpc('get_weekly_goal_progress');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setProgress(row as WeeklyGoalProgress);
    } catch (err) {
      console.error('useWeeklyGoal error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (sessions: number, vocab: number, streakDays: number) => {
    const supabase = createClient() as any;
    const { error } = await supabase.rpc('upsert_weekly_goal', {
      p_target_sessions: sessions,
      p_target_vocab: vocab,
      p_target_streak_days: streakDays,
    });
    if (error) { console.error('upsert_weekly_goal error:', error); return; }
    await load();
  }, [load]);

  return { progress, loading, save, refresh: load };
}
