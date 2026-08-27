import { renderHook, act, waitFor } from '@testing-library/react';

import { useRecordAttempt } from '../useRecordAttempt';

const mockRecord = jest.fn();
const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@easyeng/core', () => ({
  recordShadowingAttempt: (...a: unknown[]) => mockRecord(...a),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

const args = {
  clipId: 'c1',
  wordScore: 90,
  rhythmScore: 80,
  overall: 86,
  heardText: 'hello there',
  weakWords: [],
};

const okResult = {
  packComplete: false,
  clipsPassed: 1,
  clipsTotal: 10,
  award: { alreadyCompleted: true, xpAwarded: 0 },
};

describe('useRecordAttempt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord.mockResolvedValue(okResult);
  });

  it('does nothing when there is no user', async () => {
    const { result } = renderHook(() => useRecordAttempt(null));
    act(() => result.current.record(args));
    await waitFor(() => expect(mockRecord).not.toHaveBeenCalled());
    expect(result.current.result).toBeNull();
  });

  it('records the attempt for an authenticated user', async () => {
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1));
    expect(mockRecord.mock.calls[0][1]).toEqual(args);
  });

  it('exposes the result', async () => {
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() => expect(result.current.result).toEqual(okResult));
  });

  it('marks the daily streak after a successful record', async () => {
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('record_daily_activity', { p_user_id: 'u1' }),
    );
  });

  it('surfaces an error without throwing', async () => {
    mockRecord.mockRejectedValue(new Error('rpc down'));
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() => expect(result.current.error).toBe('rpc down'));
  });

  it('does not mark the streak when recording failed', async () => {
    mockRecord.mockRejectedValue(new Error('rpc down'));
    const { result } = renderHook(() => useRecordAttempt('u1'));
    act(() => result.current.record(args));
    await waitFor(() => expect(result.current.error).toBe('rpc down'));
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
