'use client';

/**
 * Replays anonymous shadowing scores into the user's account.
 *
 * The signup flow redirects to /auth/login rather than creating a session, so
 * there is no moment at signup to replay into. Instead this runs on the first
 * authenticated visit to a shadowing page and then clears the stored key.
 *
 * This is what makes the signup wall's promise true: the wall sells "keep your
 * 82%", so losing those scores on a transient error would be worse than not
 * carrying them at all. Stored progress is cleared only after every replay
 * succeeds.
 */

import { useEffect, useRef, useState } from 'react';
import { recordShadowingAttempt } from '@easyeng/core';

import { createClient } from '@/lib/supabase/client';
import { readAnonProgress, clearAnonProgress } from '@/lib/shadowing/anonProgress';

export function useCarryOverAnonProgress(userId: string | null) {
  const [carriedOver, setCarriedOver] = useState<number | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!userId || ranRef.current) return;

    const stored = readAnonProgress().attempts;
    if (stored.length === 0) return;

    ranRef.current = true;
    const supabase = createClient();

    void (async () => {
      try {
        for (const attempt of stored) {
          await recordShadowingAttempt(supabase, {
            clipId: attempt.clipId,
            // localStorage keeps only the overall score — the word/rhythm split
            // is gone. Record it as rhythm-only rather than inventing a word
            // score the user never earned.
            wordScore: null,
            rhythmScore: attempt.overall,
            overall: attempt.overall,
            heardText: '',
            weakWords: [],
          });
        }
        clearAnonProgress();
        setCarriedOver(stored.length);
      } catch (e) {
        // Keep the stored scores so a later visit can retry. Allow another
        // attempt on the next mount rather than burning the one-shot guard.
        ranRef.current = false;
        console.error('shadowing carry-over failed:', e);
      }
    })();
  }, [userId]);

  return { carriedOver };
}
