/**
 * Loudness envelope extraction for shadowing rhythm scoring.
 *
 * The same function runs in two places — the content build script (over decoded
 * reference audio) and the browser (over a recorded attempt) — so a reference
 * and an attempt are always directly comparable.
 *
 * The envelope is intentionally tiny: 32 normalised RMS bins plus a duration.
 * It is stored per clip in shadowing_clips.reference_envelope.
 */

export const BIN_COUNT = 32;

export interface Envelope {
  /** Normalised RMS per bin, loudest bin == 1. Length is always BIN_COUNT. */
  bins: number[];
  /** Clip length in milliseconds. */
  durationMs: number;
}

/**
 * Reduce raw PCM samples to a normalised loudness envelope.
 *
 * @param samples   Mono PCM in [-1, 1].
 * @param sampleRate Samples per second.
 * @param binCount  Number of bins; defaults to BIN_COUNT. Must be a positive
 *   integer — a reference envelope and an attempt envelope are only
 *   comparable when built with the same bin count, so an invalid value is
 *   rejected rather than silently coerced or substituted.
 * @throws {RangeError} If `binCount` is not a positive integer.
 */
export function extractEnvelope(
  samples: Float32Array,
  sampleRate: number,
  binCount: number = BIN_COUNT,
): Envelope {
  if (!Number.isInteger(binCount) || binCount <= 0) {
    throw new RangeError(`binCount must be a positive integer, got ${binCount}`);
  }

  const bins = new Array<number>(binCount).fill(0);

  if (samples.length === 0 || sampleRate <= 0) {
    return { bins, durationMs: 0 };
  }

  const perBin = samples.length / binCount;

  for (let b = 0; b < binCount; b++) {
    const from = Math.floor(b * perBin);
    const to = Math.min(samples.length, Math.floor((b + 1) * perBin));
    let sumSquares = 0;
    let n = 0;
    for (let i = from; i < to; i++) {
      sumSquares += samples[i] * samples[i];
      n++;
    }
    bins[b] = n > 0 ? Math.sqrt(sumSquares / n) : 0;
  }

  let peak = 0;
  for (let b = 0; b < binCount; b++) {
    if (bins[b] > peak) peak = bins[b];
  }
  if (peak > 0) {
    for (let b = 0; b < binCount; b++) bins[b] = bins[b] / peak;
  }

  return {
    bins,
    durationMs: Math.round((samples.length / sampleRate) * 1000),
  };
}
