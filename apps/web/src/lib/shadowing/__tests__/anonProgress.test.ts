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

  describe('Vietnam-local day boundary', () => {
    // Vietnam is UTC+7, so VN midnight on 2026-08-27 is 2026-08-26T17:00:00Z.
    // Both instants below share the same UTC calendar date (2026-08-26) but
    // fall on different VN-local dates — the case UTC-based day logic misses.
    it('treats a timestamp just before VN midnight as the earlier VN day', () => {
      jest.setSystemTime(new Date('2026-08-26T16:59:00Z'));
      expect(readAnonProgress().date).toBe('2026-08-26');
    });

    it('treats a timestamp just after VN midnight as the next VN day', () => {
      jest.setSystemTime(new Date('2026-08-26T17:01:00Z'));
      expect(readAnonProgress().date).toBe('2026-08-27');
    });

    it('resets the daily limit across the VN midnight boundary even though the UTC date is unchanged', () => {
      jest.setSystemTime(new Date('2026-08-26T16:59:00Z'));
      for (let i = 0; i < ANON_DAILY_CLIP_LIMIT; i++) {
        recordAnonAttempt(`clip-${i}`, 70);
      }
      expect(isAnonLimitReached()).toBe(true);

      // Two minutes later in UTC, but now the next day in Vietnam.
      jest.setSystemTime(new Date('2026-08-26T17:01:00Z'));
      expect(isAnonLimitReached()).toBe(false);
      expect(readAnonProgress().attempts).toEqual([]);
    });
  });

  describe('attempts shape validation', () => {
    it('discards stored progress when attempts is present but not an array', () => {
      window.localStorage.setItem(
        'easyeng.shadowing.anon',
        JSON.stringify({ date: '2026-08-26', attempts: 'nope' })
      );
      expect(readAnonProgress().attempts).toEqual([]);
    });

    it('drops non-object entries from attempts', () => {
      window.localStorage.setItem(
        'easyeng.shadowing.anon',
        JSON.stringify({ date: '2026-08-26', attempts: ['not-an-object', { clipId: 'c1', overall: 50 }] })
      );
      expect(readAnonProgress().attempts).toEqual([{ clipId: 'c1', overall: 50 }]);
    });

    it('drops entries with wrong-typed fields', () => {
      window.localStorage.setItem(
        'easyeng.shadowing.anon',
        JSON.stringify({
          date: '2026-08-26',
          attempts: [
            { clipId: 123, overall: 50 },
            { clipId: 'c2', overall: 'bad' },
            { clipId: 'c3', overall: NaN },
            { clipId: 'c4', overall: 77 },
          ],
        })
      );
      expect(readAnonProgress().attempts).toEqual([{ clipId: 'c4', overall: 77 }]);
    });
  });
});
