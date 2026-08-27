import { renderHook, waitFor } from '@testing-library/react';

import { useCarryOverAnonProgress } from '../useCarryOverAnonProgress';
import { recordAnonAttempt, readAnonProgress } from '@/lib/shadowing/anonProgress';

const mockRecord = jest.fn();

jest.mock('@easyeng/core', () => ({
  recordShadowingAttempt: (...a: unknown[]) => mockRecord(...a),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ rpc: jest.fn() }),
}));

describe('useCarryOverAnonProgress', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    mockRecord.mockResolvedValue({
      packComplete: false,
      clipsPassed: 1,
      clipsTotal: 10,
      award: { alreadyCompleted: true, xpAwarded: 0 },
    });
  });

  it('does nothing without a user', async () => {
    recordAnonAttempt('c1', 82);
    renderHook(() => useCarryOverAnonProgress(null));
    await waitFor(() => expect(mockRecord).not.toHaveBeenCalled());
    // Anonymous progress must survive — they may still be practising.
    expect(readAnonProgress().attempts).toHaveLength(1);
  });

  it('does nothing when there is no stored progress', async () => {
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).not.toHaveBeenCalled());
  });

  it('replays each stored attempt once', async () => {
    recordAnonAttempt('c1', 82);
    recordAnonAttempt('c2', 71);
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(2));
    const clipIds = mockRecord.mock.calls.map((c) => c[1].clipId).sort();
    expect(clipIds).toEqual(['c1', 'c2']);
  });

  it('replays the stored overall score as a rhythm-only attempt', async () => {
    // localStorage keeps only the overall score, so word/rhythm detail is gone.
    // Recording wordScore null keeps the "not measured" meaning honest rather
    // than inventing a word score the user never earned.
    recordAnonAttempt('c1', 82);
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));
    const sent = mockRecord.mock.calls[0][1];
    expect(sent.overall).toBe(82);
    expect(sent.wordScore).toBeNull();
    expect(sent.rhythmScore).toBe(82);
  });

  it('clears stored progress after a successful carry-over', async () => {
    recordAnonAttempt('c1', 82);
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(readAnonProgress().attempts).toHaveLength(0));
  });

  it('reports how many attempts were carried over', async () => {
    recordAnonAttempt('c1', 82);
    recordAnonAttempt('c2', 71);
    const { result } = renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(result.current.carriedOver).toBe(2));
  });

  it('keeps stored progress when the replay fails', async () => {
    // Losing the scores on a transient error would break the wall's promise.
    mockRecord.mockRejectedValue(new Error('offline'));
    recordAnonAttempt('c1', 82);
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalled());
    expect(readAnonProgress().attempts).toHaveLength(1);
  });

  it('runs only once per mount even if re-rendered', async () => {
    recordAnonAttempt('c1', 82);
    const { rerender } = renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));
    rerender();
    rerender();
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  it('replays attempts stored on a previous day', async () => {
    // The registration flow makes crossing midnight the normal case: signUp
    // redirects to /auth/login, the user confirms by email and logs back in
    // — often the next day. Carry-over must not be gated on "today".
    window.localStorage.setItem(
      'easyeng.shadowing.anon',
      JSON.stringify({ date: '2000-01-01', attempts: [{ clipId: 'c1', overall: 82 }] })
    );
    renderHook(() => useCarryOverAnonProgress('u1'));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));
    expect(mockRecord.mock.calls[0][1].clipId).toBe('c1');
    await waitFor(() => expect(readAnonProgress().attempts).toHaveLength(0));
  });
});
