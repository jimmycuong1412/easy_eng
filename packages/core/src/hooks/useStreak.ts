'use client';
/**
 * useStreak
 *
 * Reads the current user's daily-learning streak (get_my_streak) and exposes a
 * recordActivity() to mark today active (record_daily_activity). Call
 * recordActivity after any learning action — completing a material, attending a
 * class, finishing a quiz. Idempotent per day on the server.
 */


import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../adapters/supabase';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastDate: string | null;
  activeToday: boolean;
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    try {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase.rpc('get_my_streak');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setStreak({
          currentStreak: row.current_streak ?? 0,
          longestStreak: row.longest_streak ?? 0,
          lastDate: row.last_attendance_date ?? null,
          activeToday: !!row.active_today,
        });
      }
    } catch (err) {
      console.error('Failed to fetch streak:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const recordActivity = useCallback(async () => {
    try {
      const supabase = createClient() as any;
      const { data, error } = await supabase.rpc('record_daily_activity', { p_user_id: null });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setStreak({
          currentStreak: row.current_streak ?? 0,
          longestStreak: row.longest_streak ?? 0,
          lastDate: row.last_attendance_date ?? null,
          activeToday: true,
        });
        return { isNewDay: !!row.is_new_day, currentStreak: row.current_streak ?? 0 };
      }
    } catch (err) {
      console.error('Failed to record daily activity:', err);
    }
    return { isNewDay: false, currentStreak: streak?.currentStreak ?? 0 };
  }, [streak?.currentStreak]);

  useEffect(() => { fetchStreak(); }, [fetchStreak]);

  return { streak, loading, recordActivity, refresh: fetchStreak };
}
