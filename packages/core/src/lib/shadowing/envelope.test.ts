import { extractEnvelope, BIN_COUNT, type Envelope } from './envelope';

// 1 second of silence at 8 kHz.
function silence(seconds: number, rate = 8000): Float32Array {
  return new Float32Array(Math.round(seconds * rate));
}

// A tone occupying [startFrac, endFrac] of the buffer, silence elsewhere.
function burst(seconds: number, startFrac: number, endFrac: number, rate = 8000): Float32Array {
  const buf = silence(seconds, rate);
  const from = Math.floor(buf.length * startFrac);
  const to = Math.floor(buf.length * endFrac);
  for (let i = from; i < to; i++) buf[i] = Math.sin(i * 0.3);
  return buf;
}

describe('extractEnvelope', () => {
  it('produces BIN_COUNT bins', () => {
    const env = extractEnvelope(burst(1, 0, 1), 8000);
    expect(env.bins).toHaveLength(BIN_COUNT);
  });

  it('reports duration in milliseconds from sample count and rate', () => {
    const env = extractEnvelope(silence(2), 8000);
    expect(env.durationMs).toBe(2000);
  });

  it('normalises the loudest bin to 1', () => {
    const env = extractEnvelope(burst(1, 0.25, 0.75), 8000);
    expect(Math.max(...env.bins)).toBeCloseTo(1, 5);
  });

  it('marks silent regions near zero and loud regions high', () => {
    // Energy only in the middle half of the clip.
    const env = extractEnvelope(burst(1, 0.5, 1.0), 8000);
    const firstQuarter = env.bins.slice(0, BIN_COUNT / 4);
    const lastQuarter = env.bins.slice(-BIN_COUNT / 4);
    expect(Math.max(...firstQuarter)).toBeLessThan(0.05);
    expect(Math.max(...lastQuarter)).toBeGreaterThan(0.5);
  });

  it('returns all-zero bins and zero duration for an empty buffer', () => {
    const env: Envelope = extractEnvelope(new Float32Array(0), 8000);
    expect(env.durationMs).toBe(0);
    expect(env.bins).toHaveLength(BIN_COUNT);
    expect(env.bins.every((b) => b === 0)).toBe(true);
  });

  it('throws for a zero binCount', () => {
    expect(() => extractEnvelope(burst(1, 0, 1), 8000, 0)).toThrow(RangeError);
  });

  it('throws for a negative binCount', () => {
    expect(() => extractEnvelope(burst(1, 0, 1), 8000, -1)).toThrow(RangeError);
  });

  it('throws for a non-integer binCount', () => {
    expect(() => extractEnvelope(burst(1, 0, 1), 8000, 2.5)).toThrow(RangeError);
  });

  it('produces exactly binCount bins with no NaN values when samples are fewer than bins', () => {
    // 5 samples into 32 bins: most bins get an empty sample range.
    const samples = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
    const env = extractEnvelope(samples, 8000);
    expect(env.bins).toHaveLength(BIN_COUNT);
    expect(env.bins.every((b) => !Number.isNaN(b))).toBe(true);
    expect(env.bins.every((b) => b >= 0 && b <= 1)).toBe(true);
    expect(Math.max(...env.bins)).toBeCloseTo(1, 5);
  });
});
