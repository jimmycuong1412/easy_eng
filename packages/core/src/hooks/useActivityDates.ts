'use client';

/**
 * useActivityDates
 *
 * Fetches per-day activity from daily_activity_log via get_my_activity_dates RPC.
 * Returns a Set<string> of YYYY-MM-DD dates within the requested range.
 *
 * Falls back to reconstructing from streak aggregate if the RPC returns empty
 * (e.g. for users whose history predates migration 101).
 */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../adapters/supabase';

export function useActivityDates(from: string, to: string) {
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase.rpc('get_my_activity_dates', {
        p_from: from,
        p_to: to,
      });
      if (error) throw error;

      const set = new Set<string>(
        (data as Array<{ activity_date: string }>).map((r) => r.activity_date),
      );
      setDates(set);
    } catch (err) {
      console.error('useActivityDates error:', err);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetch(); }, [fetch]);

  return { dates, loading, refresh: fetch };
}
