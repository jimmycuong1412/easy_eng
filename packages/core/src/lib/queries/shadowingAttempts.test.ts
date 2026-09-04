import { recordShadowingAttempt, SHADOWING_PASS_THRESHOLD } from './shadowingAttempts';

function mockRpc(result: { data?: unknown; error?: unknown }) {
  const rpc = jest.fn().mockResolvedValue(result);
  return { client: { rpc } as any, rpc };
}

const args = {
  clipId: 'c1',
  wordScore: 92,
  rhythmScore: 74,
  overall: 85,
  heardText: 'the weather is nice',
  weakWords: ['is'],
};

describe('SHADOWING_PASS_THRESHOLD', () => {
  it('matches the value the server enforces', () => {
    // Mirrors shadowing_pass_threshold() in migration 106. If the server value
    // changes, this constant and that function must change together.
    expect(SHADOWING_PASS_THRESHOLD).toBe(60);
  });
});

describe('recordShadowingAttempt', () => {
  const ok = {
    pack_complete: false,
    clips_passed: 3,
    clips_total: 10,
    award: { already_completed: true, xp_awarded: 0 },
  };

  it('sends every score field under the RPC parameter names', async () => {
    const m = mockRpc({ data: ok, error: null });
    await recordShadowingAttempt(m.client, args);
    expect(m.rpc).toHaveBeenCalledWith('record_shadowing_attempt', {
      p_clip_id: 'c1',
      p_word_score: 92,
      p_rhythm_score: 74,
      p_overall: 85,
      p_heard_text: 'the weather is nice',
      p_weak_words: ['is'],
    });
  });

  it('passes a null word score through as null, not zero', async () => {
    // Rhythm-only attempts (no SpeechRecognition) must not be recorded as 0%.
    const m = mockRpc({ data: ok, error: null });
    await recordShadowingAttempt(m.client, { ...args, wordScore: null });
    expect(m.rpc.mock.calls[0][1].p_word_score).toBeNull();
  });

  it('maps the snake_case result to camelCase', async () => {
    const m = mockRpc({ data: ok, error: null });
    expect(await recordShadowingAttempt(m.client, args)).toEqual({
      packComplete: false,
      clipsPassed: 3,
      clipsTotal: 10,
      award: { alreadyCompleted: true, xpAwarded: 0 },
    });
  });

  it('reports an XP award on pack completion', async () => {
    const m = mockRpc({
      data: {
        pack_complete: true,
        clips_passed: 10,
        clips_total: 10,
        award: { already_completed: false, xp_awarded: 40 },
      },
      error: null,
    });
    const out = await recordShadowingAttempt(m.client, args);
    expect(out.packComplete).toBe(true);
    expect(out.award).toEqual({ alreadyCompleted: false, xpAwarded: 40 });
  });

  it('throws when the rpc errors', async () => {
    const m = mockRpc({ data: null, error: new Error('boom') });
    await expect(recordShadowingAttempt(m.client, args)).rejects.toThrow('boom');
  });

  it('tolerates a missing award payload', async () => {
    const m = mockRpc({
      data: { pack_complete: false, clips_passed: 1, clips_total: 5 },
      error: null,
    });
    const out = await recordShadowingAttempt(m.client, args);
    expect(out.award).toEqual({ alreadyCompleted: true, xpAwarded: 0 });
  });
});
