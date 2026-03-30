import { renderHook, act } from '@testing-library/react';
import { useScheduleDraft } from './useScheduleDraft';

// Mock Supabase client
const mockUpsert = jest.fn();
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }));
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe('useScheduleDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('toggleDraft sets isDirty=true and adds entry to draft', () => {
    const { result } = renderHook(() => useScheduleDraft());

    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft).toEqual({});

    act(() => {
      result.current.toggleDraft(1, '08:00', false);
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.draft).toEqual({ '1:08:00': false });
  });

  it('discardDraft clears draft and sets isDirty=false', () => {
    const { result } = renderHook(() => useScheduleDraft());

    act(() => {
      result.current.toggleDraft(2, '09:00', true);
      result.current.toggleDraft(3, '10:00', false);
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.discardDraft();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft).toEqual({});
  });

  it('saveDraft calls supabase upsert with correct rows and clears draft', async () => {
    const { result } = renderHook(() => useScheduleDraft());

    act(() => {
      result.current.toggleDraft(1, '08:00', false);
      result.current.toggleDraft(2, '09:25', true);
    });

    await act(async () => {
      await result.current.saveDraft('teacher-uuid-123');
    });

    expect(mockFrom).toHaveBeenCalledWith('teacher_slot_overrides');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        { teacher_id: 'teacher-uuid-123', day_of_week: 1, slot_time: '08:00:00', is_enabled: false },
        { teacher_id: 'teacher-uuid-123', day_of_week: 2, slot_time: '09:25:00', is_enabled: true },
      ]),
      { onConflict: 'teacher_id,day_of_week,slot_time' }
    );

    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft).toEqual({});
    expect(result.current.saveError).toBeNull();
  });

  it('saveDraft sets saveError on DB failure and keeps draft', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'DB error' } });

    const { result } = renderHook(() => useScheduleDraft());

    act(() => {
      result.current.toggleDraft(1, '08:00', false);
    });

    await act(async () => {
      await result.current.saveDraft('teacher-uuid-123');
    });

    expect(result.current.saveError).toBe('DB error');
    // Draft is preserved so the teacher can retry
    expect(result.current.isDirty).toBe(true);
    expect(Object.keys(result.current.draft)).toHaveLength(1);
  });
});
