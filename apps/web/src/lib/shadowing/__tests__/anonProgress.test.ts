import {
  ANON_DAILY_CLIP_LIMIT,
  readAnonProgress,
  recordAnonAttempt,
  anonClipsUsed,
  isAnonLimitReached,
  clearAnonProgress,
} from '../anonProgress';

describe('anonProgress', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-26T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts empty for today', () => {
    const p = readAnonProgress();
    expect(p.date).toBe('2026-08-26');
    expect(p.attempts).toEqual([]);
    expect(anonClipsUsed()).toBe(0);
  });

  it('records an attempt', () => {
    recordAnonAttempt('c1', 82);
    expect(readAnonProgress().attempts).toEqual([{ clipId: 'c1', overall: 82 }]);
    expect(anonClipsUsed()).toBe(1);
  });

  it('counts distinct clips, not repeated attempts on one clip', () => {
    recordAnonAttempt('c1', 50);
    recordAnonAttempt('c1', 90);
    expect(anonClipsUsed()).toBe(1);
    expect(isAnonLimitReached()).toBe(false);
  });

  it('keeps the best score when a clip is retried', () => {
    recordAnonAttempt('c1', 50);
    recordAnonAttempt('c1', 90);
    expect(readAnonProgress().attempts).toEqual([{ clipId: 'c1', overall: 90 }]);
  });

  it('does not lower a score on a worse retry', () => {
    recordAnonAttempt('c1', 90);
    recordAnonAttempt('c1', 20);
    expect(readAnonProgress().attempts).toEqual([{ clipId: 'c1', overall: 90 }]);
  });

  it('reports the limit reached at ANON_DAILY_CLIP_LIMIT distinct clips', () => {
    for (let i = 0; i < ANON_DAILY_CLIP_LIMIT; i++) {
      recordAnonAttempt(`clip-${i}`, 70);
    }
    expect(isAnonLimitReached()).toBe(true);
  });

  it('resets when the date rolls over', () => {
    recordAnonAttempt('c1', 82);
    jest.setSystemTime(new Date('2026-08-27T01:00:00Z'));
    expect(readAnonProgress().attempts).toEqual([]);
    expect(isAnonLimitReached()).toBe(false);
  });

  it('recovers from corrupt stored JSON instead of throwing', () => {
    window.localStorage.setItem('easyeng.shadowing.anon', 'not json');
    expect(readAnonProgress().attempts).toEqual([]);
  });

  it('clears stored progress', () => {
    recordAnonAttempt('c1', 82);
    clearAnonProgress();
    expect(anonClipsUsed()).toBe(0);
  });
});
