import { fetchMaterialSections } from './materials';

function mockClient(result: { data?: unknown; error?: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { client: { from } as any, from, select, eq, order };
}

describe('fetchMaterialSections', () => {
  it('selects sections for a material ordered by idx', async () => {
    const rows = [
      { id: 's1', idx: 0, kind: 'intro', body_vi: 'a', body_en: 'b', meta: {} },
      { id: 's2', idx: 1, kind: 'drill', body_vi: 'c', body_en: 'd', meta: { rule: 'x' } },
    ];
    const m = mockClient({ data: rows, error: null });
    const out = await fetchMaterialSections(m.client, 'mat-1');
    expect(m.from).toHaveBeenCalledWith('material_sections');
    expect(m.eq).toHaveBeenCalledWith('material_id', 'mat-1');
    expect(m.order).toHaveBeenCalledWith('idx', { ascending: true });
    expect(out).toEqual(rows);
  });

  it('returns [] when data is null', async () => {
    const m = mockClient({ data: null, error: null });
    expect(await fetchMaterialSections(m.client, 'mat-1')).toEqual([]);
  });

  it('throws when the query errors', async () => {
    const m = mockClient({ data: null, error: new Error('boom') });
    await expect(fetchMaterialSections(m.client, 'mat-1')).rejects.toThrow('boom');
  });
});
