/**
 * Free Shadowing — attempt recording (Phase B, authenticated only).
 *
 * Audio never leaves the browser. Scoring happens client-side and only the
 * resulting integers plus the recogniser's transcript are sent here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Minimum overall score for a clip to count toward pack completion.
 * Mirrors `shadowing_pass_threshold()` in migration 106 — the server enforces
 * the award, this copy exists only so the UI can explain the rule.
 */
export const SHADOWING_PASS_THRESHOLD = 60;

export interface ShadowingAward {
  alreadyCompleted: boolean;
  xpAwarded: number;
}

export interface AttemptResult {
  packComplete: boolean;
  clipsPassed: number;
  clipsTotal: number;
  award: ShadowingAward;
}

export interface RecordAttemptArgs {
  clipId: string;
  /** null when the browser has no SpeechRecognition — must stay null, not 0. */
  wordScore: number | null;
  rhythmScore: number;
  overall: number;
  heardText: string;
  weakWords: string[];
}

interface AttemptRow {
  pack_complete?: boolean;
  clips_passed?: number;
  clips_total?: number;
  award?: { already_completed?: boolean; xp_awarded?: number };
}

export async function recordShadowingAttempt(
  client: SupabaseClient,
  args: RecordAttemptArgs,
): Promise<AttemptResult> {
  const { data, error } = await client.rpc('record_shadowing_attempt', {
    p_clip_id: args.clipId,
    p_word_score: args.wordScore,
    p_rhythm_score: args.rhythmScore,
    p_overall: args.overall,
    p_heard_text: args.heardText,
    p_weak_words: args.weakWords,
  });

  if (error) throw error;

  const row = (data ?? {}) as AttemptRow;
  return {
    packComplete: row.pack_complete ?? false,
    clipsPassed: row.clips_passed ?? 0,
    clipsTotal: row.clips_total ?? 0,
    award: {
      alreadyCompleted: row.award?.already_completed ?? true,
      xpAwarded: row.award?.xp_awarded ?? 0,
    },
  };
}
