/**
 * useAwardCompletion — shared hook for non-test material renderers.
 *
 * Wraps `award_material_completion` so each type-specific renderer
 * (Grammar/Reading/Listening/Dialogue) doesn't reimplement the RPC call.
 * Mock-test materials must NOT use this; they go through `grade_mock_test`.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export interface AwardCompletionState {
  awarded: { gems: number; xp: number } | null;
  submitting: boolean;
  error: string | null;
}

export function useAwardCompletion(params: {
  shouldAward: boolean;
  userId: string | null;
  materialId: string;
  alreadyCompleted: boolean;
  score?: number;
}): AwardCompletionState {
  const { shouldAward, userId, materialId, alreadyCompleted, score } = params;
  const [awarded, setAwarded] = useState<{ gems: number; xp: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!shouldAward || !userId || alreadyCompleted) return;

    firedRef.current = true;
    setSubmitting(true);

    (async () => {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('award_material_completion', {
        p_user_id: userId,
        p_material_id: materialId,
        ...(score != null ? { p_score: score } : {}),
      });

      if (rpcError) {
        setError(rpcError.message);
      } else if (data) {
        const payload = data as { gems_awarded?: number; xp_awarded?: number };
        if (payload.gems_awarded != null && payload.xp_awarded != null) {
          setAwarded({ gems: payload.gems_awarded, xp: payload.xp_awarded });
        }
        // Count this completion toward the daily learning streak (idempotent/day)
        supabase.rpc('record_daily_activity', { p_user_id: userId }).then(
          () => {},
          (e: unknown) => console.error('record_daily_activity failed:', e),
        );
      }
      setSubmitting(false);
    })();
  }, [shouldAward, userId, materialId, alreadyCompleted, score]);

  return { awarded, submitting, error };
}
