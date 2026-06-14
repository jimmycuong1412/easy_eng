/**
 * useXpSummary — career-independent XP/level for the dashboard (get_my_xp_summary).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface XpSummary {
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  progressPct: number;
  careerLevel: number | null;
}

export function useXpSummary() {
  const [xp, setXp] = useState<XpSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchXp = useCallback(async () => {
    try {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase.rpc('get_my_xp_summary');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        const level = row.level ?? 1;
        setXp({
          totalXp: row.total_xp ?? 0,
          level,
          xpInLevel: row.xp_in_level ?? 0,
          xpForNext: row.xp_for_next ?? 0,
          progressPct: row.progress_pct ?? 0,
          careerLevel: row.career_level ?? null,
        });
        // Issue a milestone certificate at levels 5/10/15/… (idempotent server-side)
        if (level >= 5 && level % 5 === 0) {
          supabase.rpc('issue_certificate', {
            p_kind: 'level',
            p_title: `Đạt Cấp ${level}`,
            p_subtitle: `Tích lũy ${row.total_xp ?? 0} XP trên EasyEng`,
            p_level: null,
            p_metadata: {},
          }).then(() => {}, () => {});
        }
      }
    } catch (err) {
      console.error('Failed to fetch XP summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchXp(); }, [fetchXp]);

  return { xp, loading, refresh: fetchXp };
}
