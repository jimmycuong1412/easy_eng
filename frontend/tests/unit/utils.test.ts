import {
  cn,
  formatCurrency,
  formatCents,
  levelFromXp,
  xpForLevel,
  cookieDiscount,
  truncate,
  getInitials,
} from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('merges conflicting Tailwind classes', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8');
  });
});

describe('formatCurrency', () => {
  it('formats VND correctly', () => {
    const result = formatCurrency(125000, 'VND', 'vi-VN');
    expect(result).toContain('125.000');
  });

  it('formats USD correctly', () => {
    const result = formatCurrency(5, 'USD', 'en-US');
    expect(result).toContain('$5');
  });
});

describe('formatCents', () => {
  it('formats VND cents correctly (no conversion)', () => {
    const result = formatCents(125000, 'VND', 'vi-VN');
    expect(result).toContain('125.000');
  });

  it('formats USD cents correctly (divides by 100)', () => {
    const result = formatCents(500, 'USD', 'en-US');
    expect(result).toContain('$5');
  });
});

describe('XP calculations', () => {
  describe('xpForLevel', () => {
    it('returns correct XP for level 1', () => {
      expect(xpForLevel(1)).toBe(500);
    });

    it('returns correct XP for level 5', () => {
      expect(xpForLevel(5)).toBe(2500);
    });

    it('returns correct XP for level 10', () => {
      expect(xpForLevel(10)).toBe(5000);
    });
  });

  describe('levelFromXp', () => {
    it('calculates level 1 from 0 XP', () => {
      const result = levelFromXp(0);
      expect(result.level).toBe(1);
      expect(result.currentXp).toBe(0);
      expect(result.xpToNext).toBe(500);
    });

    it('calculates level 1 from 250 XP', () => {
      const result = levelFromXp(250);
      expect(result.level).toBe(1);
      expect(result.currentXp).toBe(250);
      expect(result.xpToNext).toBe(250);
    });

    it('calculates level 2 from 500 XP', () => {
      const result = levelFromXp(500);
      expect(result.level).toBe(2);
      expect(result.currentXp).toBe(0);
      expect(result.xpToNext).toBe(500);
    });

    it('calculates level 3 from 1200 XP', () => {
      const result = levelFromXp(1200);
      expect(result.level).toBe(3);
      expect(result.currentXp).toBe(200);
      expect(result.xpToNext).toBe(300);
    });
  });
});

describe('cookieDiscount', () => {
  it('calculates correct discount for 10 cookies', () => {
    expect(cookieDiscount(10)).toBe(10000); // 10,000 VND
  });

  it('calculates correct discount for 50 cookies', () => {
    expect(cookieDiscount(50)).toBe(50000); // 50,000 VND
  });

  it('calculates correct discount for 100 cookies', () => {
    expect(cookieDiscount(100)).toBe(100000); // 100,000 VND
  });
});

describe('truncate', () => {
  it('returns original text if shorter than max length', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('truncates text with ellipsis', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('handles exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });
});

describe('getInitials', () => {
  it('returns initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns single initial from single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('returns first two initials from long name', () => {
    expect(getInitials('John Michael Doe')).toBe('JM');
  });

  it('handles Vietnamese names', () => {
    expect(getInitials('Nguyễn Văn An')).toBe('NV');
  });
});
