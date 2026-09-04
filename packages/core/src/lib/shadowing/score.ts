/**
 * Shadowing scoring — runs entirely in the browser. No audio is ever uploaded.
 *
 * Two independent dimensions:
 *   wordScore   — did the recogniser understand the same words? (intelligibility)
 *   rhythmScore — did the attempt's loudness profile match the reference?
 *                 (pacing, pauses, stress placement — what shadowing trains)
 *
 * Word alignment (LCS + Levenshtein tolerance) is lifted from
 * apps/web/src/components/materials/PronunciationPractice.tsx so it can be
 * unit-tested without a DOM.
 */

import { type Envelope } from './envelope';

export interface WordEval {
  word: string;
  ok: boolean;
}

export interface ShadowingScore {
  /** null when the browser has no SpeechRecognition support. */
  wordScore: number | null;
  rhythmScore: number;
  overall: number;
  words: WordEval[];
  weakWords: string[];
}

/** Weight of the word dimension when both dimensions are available. */
const WORD_WEIGHT = 0.6;

/**
 * Weight of the duration term within the rhythm score; the remainder goes to
 * envelope shape. Shape carries slightly more because matching a clip's length
 * while stressing the wrong syllables is the failure this feature exists to catch.
 */
const DURATION_WEIGHT = 0.45;

const normWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const tokenize = (s: string) => s.split(/\s+/).map(normWord).filter(Boolean);

function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}

const wordClose = (a: string, b: string) =>
  a === b || lev(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.2));

export function scoreWords(
  target: string,
  spoken: string,
): { score: number; words: WordEval[] } {
  const t = tokenize(target);
  const s = tokenize(spoken);
  if (!t.length) return { score: 0, words: [] };

  const m = t.length;
  const n = s.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = wordClose(t[i - 1], s[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const matched = new Array<boolean>(m).fill(false);
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (wordClose(t[i - 1], s[j - 1])) {
      matched[i - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const rawWords = target.split(/\s+/).filter(Boolean);
  const correct = matched.filter(Boolean).length;
  return {
    score: Math.round((correct / m) * 100),
    words: t.map((w, k) => ({ word: rawWords[k] ?? w, ok: matched[k] })),
  };
}

/**
 * Compare an attempt's envelope against the reference.
 *
 * Two terms, weighted slightly toward shape: duration agreement (are you pacing
 * it like the speaker?) and bin-by-bin shape agreement (are your pauses and
 * stresses in the same places?). Both are needed — matching the duration with
 * the wrong internal rhythm is a common and important failure mode, so shape
 * carries the larger weight.
 *
 * The duration term is SQUARED. A linear ratio is far too forgiving: speaking a
 * clip in half the reference time would otherwise still score 75, which is not
 * a passing rhythm. Squaring makes the penalty grow with the size of the error.
 */
export function scoreRhythm(reference: Envelope, attempt: Envelope): number {
  if (reference.durationMs <= 0 || attempt.durationMs <= 0) return 0;

  // Duration agreement: ratio of shorter to longer, so it is symmetric.
  // Squared so large pacing errors are penalised sharply (see above).
  const rawRatio =
    Math.min(reference.durationMs, attempt.durationMs) /
    Math.max(reference.durationMs, attempt.durationMs);
  const ratio = rawRatio * rawRatio;

  // Shape agreement: 1 - mean absolute difference across bins.
  const n = Math.min(reference.bins.length, attempt.bins.length);
  if (n === 0) return 0;
  let diff = 0;
  for (let k = 0; k < n; k++) {
    diff += Math.abs(reference.bins[k] - attempt.bins[k]);
  }
  const shape = Math.max(0, 1 - diff / n);

  const blended = DURATION_WEIGHT * ratio + (1 - DURATION_WEIGHT) * shape;
  return Math.max(0, Math.min(100, Math.round(blended * 100)));
}

export function scoreAttempt(args: {
  target: string;
  /** null when SpeechRecognition is unavailable — yields a rhythm-only score. */
  spoken: string | null;
  reference: Envelope;
  attempt: Envelope;
}): ShadowingScore {
  const rhythmScore = scoreRhythm(args.reference, args.attempt);

  if (args.spoken === null) {
    // Rhythm-only. Missing word data must not be scored as zero — that would
    // punish Firefox and Android WebView users for their browser.
    return {
      wordScore: null,
      rhythmScore,
      overall: rhythmScore,
      words: [],
      weakWords: [],
    };
  }

  const { score: wordScore, words } = scoreWords(args.target, args.spoken);
  const overall = Math.round(WORD_WEIGHT * wordScore + (1 - WORD_WEIGHT) * rhythmScore);

  return {
    wordScore,
    rhythmScore,
    overall: Math.max(0, Math.min(100, overall)),
    words,
    weakWords: words.filter((w) => !w.ok).map((w) => w.word),
  };
}
