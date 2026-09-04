import { fetchShadowingPack, fetchShadowingPacks } from './shadowing';

describe('fetchShadowingPack', () => {
  function mockRpc(result: { data?: unknown; error?: unknown }) {
    const rpc = jest.fn().mockResolvedValue(result);
    return { client: { rpc } as any, rpc };
  }

  const row = {
    clip_id: 'c1',
    idx: 0,
    text_en: 'Hello there.',
    text_vi: 'Xin chào.',
    audio_path: 'shadowing/greetings/01.mp3',
    duration_ms: 1800,
    reference_envelope: { bins: [0, 1], durationMs: 1800 },
    best_score: 82,
  };

  it('calls get_shadowing_pack with the slug', async () => {
    const m = mockRpc({ data: [row], error: null });
    await fetchShadowingPack(m.client, 'greetings');
    expect(m.rpc).toHaveBeenCalledWith('get_shadowing_pack', { p_slug: 'greetings' });
  });

  it('maps snake_case rows to camelCase clips', async () => {
    const m = mockRpc({ data: [row], error: null });
    const out = await fetchShadowingPack(m.client, 'greetings');
    expect(out).toEqual([
      {
        clipId: 'c1',
        idx: 0,
        textEn: 'Hello there.',
        textVi: 'Xin chào.',
        audioPath: 'shadowing/greetings/01.mp3',
        durationMs: 1800,
        referenceEnvelope: { bins: [0, 1], durationMs: 1800 },
        bestScore: 82,
      },
    ]);
  });

  it('maps a null best_score to null (anonymous caller)', async () => {
    const m = mockRpc({ data: [{ ...row, best_score: null }], error: null });
    const out = await fetchShadowingPack(m.client, 'greetings');
    expect(out[0].bestScore).toBeNull();
  });

  it('returns [] when data is null', async () => {
    const m = mockRpc({ data: null, error: null });
    expect(await fetchShadowingPack(m.client, 'greetings')).toEqual([]);
  });

  it('throws when the rpc errors', async () => {
    const m = mockRpc({ data: null, error: new Error('boom') });
    await expect(fetchShadowingPack(m.client, 'greetings')).rejects.toThrow('boom');
  });
});

describe('fetchShadowingPacks', () => {
  function mockSelect(result: { data?: unknown; error?: unknown }) {
    const order = jest.fn().mockResolvedValue(result);
    const is = jest.fn(() => ({ order }));
    const eq2 = jest.fn(() => ({ is }));
    const eq1 = jest.fn(() => ({ eq: eq2 }));
    const select = jest.fn(() => ({ eq: eq1 }));
    const from = jest.fn(() => ({ select }));
    return { client: { from } as any, from, select, eq1, eq2, is, order };
  }

  it('selects published, non-deleted shadowing packs only', async () => {
    const m = mockSelect({ data: [], error: null });
    await fetchShadowingPacks(m.client);
    expect(m.from).toHaveBeenCalledWith('materials');
    expect(m.eq1).toHaveBeenCalledWith('type', 'shadowing');
    expect(m.eq2).toHaveBeenCalledWith('status', 'published');
    expect(m.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('maps rows and counts clips', async () => {
    const m = mockSelect({
      data: [
        {
          id: 'm1',
          slug: 'job-interview',
          title_vi: 'Phỏng vấn xin việc',
          title_en: 'Job interview',
          summary_vi: 'Luyện 10 câu.',
          level: 'b1',
          shadowing_clips: [{ count: 10 }],
        },
      ],
      error: null,
    });
    const out = await fetchShadowingPacks(m.client);
    expect(out).toEqual([
      {
        id: 'm1',
        slug: 'job-interview',
        titleVi: 'Phỏng vấn xin việc',
        titleEn: 'Job interview',
        summaryVi: 'Luyện 10 câu.',
        level: 'b1',
        clipCount: 10,
      },
    ]);
  });

  it('reports clipCount 0 when the count aggregate is missing', async () => {
    const m = mockSelect({
      data: [
        {
          id: 'm1',
          slug: 's',
          title_vi: 't',
          title_en: null,
          summary_vi: 'x',
          level: 'a2',
          shadowing_clips: [],
        },
      ],
      error: null,
    });
    expect((await fetchShadowingPacks(m.client))[0].clipCount).toBe(0);
  });
});
