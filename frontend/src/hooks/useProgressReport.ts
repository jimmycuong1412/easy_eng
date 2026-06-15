'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ProgressReport {
  total_sessions_completed: number;
  total_vocab_saved: number;
  total_vocab_reviewed: number;
  current_streak: number;
  longest_streak: number;
  current_level: string | null;
  total_xp: number;
  active_days_30: number;
  materials_completed: number;
}

export function useProgressReport() {
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient() as any;
      const { data, error } = await supabase.rpc('get_my_progress_report');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setReport(row as ProgressReport);
    } catch (err) {
      console.error('useProgressReport error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { report, loading, refresh: load };
}
