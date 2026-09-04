import { scoreWords, scoreRhythm, scoreAttempt } from './score';
import { BIN_COUNT, type Envelope } from './envelope';

const env = (bins: number[], durationMs: number): Envelope => ({ bins, durationMs });
const flat = (value: number, durationMs = 2000): Envelope =>
  env(new Array(BIN_COUNT).fill(value), durationMs);

describe('scoreWords', () => {
  it('scores an exact match 100', () => {
    const r = scoreWords('the weather is nice', 'the weather is nice');
    expect(r.score).toBe(100);
    expect(r.words.every((w) => w.ok)).toBe(true);
  });

  it('ignores case and punctuation', () => {
    expect(scoreWords('The weather is nice.', 'the WEATHER is nice').score).toBe(100);
  });

  it('marks a missing word as not ok and lowers the score', () => {
    const r = scoreWords('the weather is nice', 'the weather nice');
    expect(r.score).toBe(75);
    expect(r.words.find((w) => w.word === 'is')?.ok).toBe(false);
  });

  it('accepts near-misses within the Levenshtein tolerance', () => {
    // "weather" vs "wether" is one deletion — within tolerance.
    expect(scoreWords('weather', 'wether').score).toBe(100);
  });

  it('scores an empty target 0 without throwing', () => {
    expect(scoreWords('', 'anything').score).toBe(0);
  });
});

describe('scoreRhythm', () => {
  it('scores identical envelopes 100', () => {
    const e = env([0, 0.5, 1, 0.5, ...new Array(BIN_COUNT - 4).fill(0)], 2000);
    expect(scoreRhythm(e, e)).toBe(100);
  });

  it('penalises a large duration mismatch', () => {
    const reference = flat(0.5, 2000);
    const doubled = flat(0.5, 4000);
    expect(scoreRhythm(reference, doubled)).toBeLessThan(70);
  });

  it('penalises misaligned energy at matching duration', () => {
    const front = env([...new Array(BIN_COUNT / 2).fill(1), ...new Array(BIN_COUNT / 2).fill(0)], 2000);
    const back = env([...new Array(BIN_COUNT / 2).fill(0), ...new Array(BIN_COUNT / 2).fill(1)], 2000);
    expect(scoreRhythm(front, back)).toBeLessThan(50);
  });

  it('never returns a value outside 0..100', () => {
    const s = scoreRhythm(flat(1, 500), flat(0, 30000));
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe('scoreAttempt', () => {
  const reference = flat(0.5, 2000);

  it('blends word and rhythm when a transcript is available', () => {
    const r = scoreAttempt({
      target: 'the weather is nice',
      spoken: 'the weather is nice',
      reference,
      attempt: flat(0.5, 2000),
    });
    expect(r.wordScore).toBe(100);
    expect(r.rhythmScore).toBe(100);
    expect(r.overall).toBe(100);
  });

  it('falls back to rhythm-only when no transcript is available', () => {
    // Browsers without SpeechRecognition pass spoken = null. The overall score
    // must equal the rhythm score, NOT treat the missing words as 0.
    const r = scoreAttempt({
      target: 'the weather is nice',
      spoken: null,
      reference,
      attempt: flat(0.5, 2000),
    });
    expect(r.wordScore).toBeNull();
    expect(r.overall).toBe(r.rhythmScore);
  });

  it('collects weak words from the word evaluation', () => {
    const r = scoreAttempt({
      target: 'the weather is nice',
      spoken: 'the weather nice',
      reference,
      attempt: flat(0.5, 2000),
    });
    expect(r.weakWords).toContain('is');
  });

  it('reports no weak words on a perfect attempt', () => {
    const r = scoreAttempt({
      target: 'the weather is nice',
      spoken: 'the weather is nice',
      reference,
      attempt: flat(0.5, 2000),
    });
    expect(r.weakWords).toEqual([]);
  });
});
