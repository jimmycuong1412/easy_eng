import {
  fetchMaterialsList,
  fetchMaterialDetail,
  fetchUserProgress,
  resolveTitle,
  resolveSummary,
  resolveBody,
  type MaterialSummary,
  type MaterialDetail,
} from '@easyeng/core';

/**
 * These tests exercise the query helpers against a thin Supabase mock — they
 * do not hit a real database. The goal is to lock in:
 *   - The exact column projection used (catalog payload size matters).
 *   - Filter handling when scalar vs. array values are passed.
 *   - Cursor pagination math.
 *   - Locale-fallback rules from research.md R10.
 */

interface MockBuilder {
  filters: Record<string, unknown>;
  ordering: { column: string; ascending: boolean }[];
  limitValue: number | null;
  ltField?: string;
  ltValue?: unknown;
  textSearchArgs?: { columns: string; query: string; opts: unknown };
  selectColumns?: string;
  fromTable?: string;
  result: { data: unknown; error: null };
}

function makeMock(items: MaterialSummary[] = []): {
  client: { from: jest.Mock };
  builder: MockBuilder;
} {
  const builder: MockBuilder = {
    filters: {},
    ordering: [],
    limitValue: null,
    result: { data: items, error: null },
  };

  const chain: any = {
    select: jest.fn((cols: string) => {
      builder.selectColumns = cols;
      return chain;
    }),
    eq: jest.fn((column: string, value: unknown) => {
      builder.filters[`eq:${column}`] = value;
      return chain;
    }),
    in: jest.fn((column: string, values: unknown[]) => {
      builder.filters[`in:${column}`] = values;
      return chain;
    }),
    order: jest.fn((column: string, opts: { ascending: boolean }) => {
      builder.ordering.push({ column, ascending: opts.ascending });
      return chain;
    }),
    limit: jest.fn((n: number) => {
      builder.limitValue = n;
      return chain;
    }),
    lt: jest.fn((column: string, value: unknown) => {
      builder.ltField = column;
      builder.ltValue = value;
      return chain;
    }),
    textSearch: jest.fn((columns: string, query: string, opts: unknown) => {
      builder.textSearchArgs = { columns, query, opts };
      return chain;
    }),
    maybeSingle: jest.fn(async () => builder.result),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(builder.result).then(resolve),
  };

  const client = {
    from: jest.fn((table: string) => {
      builder.fromTable = table;
      return chain;
    }),
  };

  return { client, builder };
}

const sampleMaterial: MaterialSummary = {
  id: 'mat-1',
  slug: 'vocab-greetings-a1',
  type: 'vocabulary_pack',
  level: 'a1',
  goal: 'conversation',
  title_vi: 'Từ vựng chào hỏi',
  title_en: 'Greeting vocabulary',
  summary_vi: 'Học 10 từ',
  summary_en: 'Ten greetings',
  duration_min: 8,
  gems_reward: 2,
  xp_reward: 30,
  cover_path: null,
  popularity_score: 5,
  published_at: '2026-05-09T10:00:00Z',
};

describe('fetchMaterialsList', () => {
  it('selects from the materials table with the published filter', async () => {
    const { client, builder } = makeMock([sampleMaterial]);
    const result = await fetchMaterialsList(client as any, {});

    expect(builder.fromTable).toBe('materials');
    expect(builder.filters['eq:status']).toBe('published');
    expect(builder.limitValue).toBe(24);
    expect(result.items).toHaveLength(1);
  });

  it('uses scalar eq when a single level is passed and array in() when many', async () => {
    const { client: c1, builder: b1 } = makeMock();
    await fetchMaterialsList(c1 as any, { level: 'a2' });
    expect(b1.filters['eq:level']).toBe('a2');

    const { client: c2, builder: b2 } = makeMock();
    await fetchMaterialsList(c2 as any, { level: ['a1', 'b1'] });
    expect(b2.filters['in:level']).toEqual(['a1', 'b1']);
  });

  it('forwards the search term to PostgREST text-search', async () => {
    const { client, builder } = makeMock();
    await fetchMaterialsList(client as any, { search: 'phở' });
    expect(builder.textSearchArgs?.query).toBe('phở');
  });

  it('returns nextCursor only when the page is full', async () => {
    const filled = Array.from({ length: 24 }, (_, i) => ({
      ...sampleMaterial,
      id: `mat-${i}`,
      published_at: `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
    }));
    const { client } = makeMock(filled);
    const result = await fetchMaterialsList(client as any, {});
    expect(result.nextCursor).toBe('2026-05-24T10:00:00Z');

    const { client: shortClient } = makeMock([sampleMaterial]);
    const shortResult = await fetchMaterialsList(shortClient as any, {});
    expect(shortResult.nextCursor).toBeNull();
  });

  it('caps the limit at 60 even if a larger value is requested', async () => {
    const { client, builder } = makeMock();
    await fetchMaterialsList(client as any, { limit: 1000 });
    expect(builder.limitValue).toBe(60);
  });
});

describe('fetchMaterialDetail', () => {
  it('uses maybeSingle and projects body columns', async () => {
    const { client, builder } = makeMock();
    builder.result = { data: { ...sampleMaterial, body_vi: '#x' } as MaterialDetail, error: null };

    const result = await fetchMaterialDetail(client as any, 'vocab-greetings-a1');
    expect(builder.fromTable).toBe('materials');
    expect(builder.filters['eq:slug']).toBe('vocab-greetings-a1');
    expect(builder.selectColumns).toContain('body_vi');
    expect(builder.selectColumns).toContain('body_en');
    expect(result?.slug).toBe('vocab-greetings-a1');
  });

  it('returns null when the row is not found', async () => {
    const { client, builder } = makeMock();
    builder.result = { data: null, error: null };
    const result = await fetchMaterialDetail(client as any, 'missing');
    expect(result).toBeNull();
  });
});

describe('fetchUserProgress', () => {
  it('queries material_progress filtered by user and material', async () => {
    const { client, builder } = makeMock();
    builder.result = { data: null, error: null };
    const result = await fetchUserProgress(client as any, 'u1', 'm1');
    expect(builder.fromTable).toBe('material_progress');
    expect(builder.filters['eq:user_id']).toBe('u1');
    expect(builder.filters['eq:material_id']).toBe('m1');
    expect(result).toBeNull();
  });
});

describe('locale resolvers (R10 fallback rule)', () => {
  it('resolveTitle returns vi for the Vietnamese locale', () => {
    expect(resolveTitle(sampleMaterial, 'vi')).toBe('Từ vựng chào hỏi');
  });

  it('resolveTitle returns en for the English locale', () => {
    expect(resolveTitle(sampleMaterial, 'en')).toBe('Greeting vocabulary');
  });

  it('resolveTitle falls back to vi when title_en is null on the en locale', () => {
    expect(resolveTitle({ ...sampleMaterial, title_en: null }, 'en')).toBe('Từ vựng chào hỏi');
  });

  it('resolveSummary follows the same fallback rule', () => {
    expect(resolveSummary({ ...sampleMaterial, summary_en: null }, 'en')).toBe('Học 10 từ');
  });

  it('resolveBody returns fallbackUsed=true when body_en is missing on the en locale', () => {
    const { body, fallbackUsed } = resolveBody(
      { body_vi: '# Vi body', body_en: null },
      'en',
    );
    expect(body).toBe('# Vi body');
    expect(fallbackUsed).toBe(true);
  });

  it('resolveBody returns fallbackUsed=false when both bodies exist', () => {
    const { fallbackUsed } = resolveBody(
      { body_vi: '# Vi', body_en: '# En' },
      'en',
    );
    expect(fallbackUsed).toBe(false);
  });
});
