'use client';

/**
 * Records one shadowing attempt for an authenticated user.
 *
 * Audio never leaves the browser: scoring already happened locally and only
 * the resulting integers plus the transcript string are sent.
 *
 * Anonymous users are a no-op here — their progress lives in localStorage and
 * is replayed by useCarryOverAnonProgress once they sign in.
 */

import { useCallback, useState } from 'react';
import {
  recordShadowingAttempt,
  type AttemptResult,
  type RecordAttemptArgs,
} from '@easyeng/core';

import { createClient } from '@/lib/supabase/client';

export function useRecordAttempt(userId: string | null) {
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const record = useCallback(
    (args: RecordAttemptArgs) => {
      if (!userId) return;

      const supabase = createClient();
      void (async () => {
        try {
          const out = await recordShadowingAttempt(supabase, args);
          setResult(out);
          setError(null);

          // Count this practice toward the daily learning streak. Idempotent
          // per day; same pattern as materials/useAwardCompletion.ts.
          supabase.rpc('record_daily_activity', { p_user_id: userId }).then(
            () => {},
            (e: unknown) => console.error('record_daily_activity failed:', e),
          );
        } catch (e) {
          // A failed save must never break practice — the score is already on
          // screen and the user can keep going.
          setError(e instanceof Error ? e.message : 'record failed');
        }
      })();
    },
    [userId],
  );

  return { record, result, error };
}
