'use client';

/**
 * Per-clip progress for a signed-in learner.
 *
 * The returning-user hook is visible completion: which clips are done, which
 * still need a passing attempt, and how close the pack is to finished.
 */

import { SHADOWING_PASS_THRESHOLD, type ShadowingClip } from '@easyeng/core';

export interface PackProgressProps {
  clips: ShadowingClip[];
  currentIndex: number;
  /** Number of anonymous attempts just replayed into the account, if any. */
  carriedOver: number | null;
  /**
   * Live count of passed clips from the current session's recording result,
   * overriding the server-rendered `bestScore`-derived count. Optional and
   * additive: when omitted, counts fall back to `clips[].bestScore` exactly
   * as before, so callers that don't track live results are unaffected.
   */
  livePassedCount?: number | null;
  /** Live pack-complete flag from the current session's recording result. */
  liveComplete?: boolean | null;
  /**
   * The clip just scored this session and its pass/fail, so its dot can
   * reflect the result immediately without waiting on a reload.
   */
  liveResult?: { clipId: string; passed: boolean } | null;
}

export function PackProgress({
  clips,
  currentIndex,
  carriedOver,
  livePassedCount = null,
  liveComplete = null,
  liveResult = null,
}: PackProgressProps) {
  if (clips.length === 0) return null;

  const serverPassed = clips.filter(
    (c) => c.bestScore !== null && c.bestScore >= SHADOWING_PASS_THRESHOLD,
  ).length;
  const passed = livePassedCount ?? serverPassed;
  const complete = liveComplete ?? passed === clips.length;

  return (
    <div className="space-y-2">
      {carriedOver !== null && (
        <p
          data-testid="progress-carried"
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: 'rgba(52,211,153,0.10)', color: 'var(--et-green)' }}
        >
          ✓ Đã lưu {carriedOver} kết quả bạn luyện trước khi đăng nhập.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {clips.map((c, i) => {
            const liveDone =
              liveResult && liveResult.clipId === c.clipId ? liveResult.passed : null;
            const done =
              liveDone ?? (c.bestScore !== null && c.bestScore >= SHADOWING_PASS_THRESHOLD);
            const label =
              c.bestScore === null && liveDone === null
                ? `Câu ${i + 1}: chưa luyện`
                : `Câu ${i + 1}: ${done ? 'đã đạt' : 'chưa đạt'}${
                    c.bestScore !== null ? ` ${c.bestScore}%` : ''
                  }`;
            return (
              <span
                key={c.clipId}
                data-testid="progress-dot"
                role="img"
                aria-label={label}
                title={c.bestScore === null ? 'Chưa luyện' : `${c.bestScore}%`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: done ? 'var(--et-green)' : 'var(--et-line-2)',
                  outline: i === currentIndex ? '2px solid var(--et-coral)' : 'none',
                  outlineOffset: 2,
                }}
              />
            );
          })}
        </div>

        <span
          data-testid="progress-count"
          className="text-xs tabular-nums"
          style={{ color: 'var(--et-fg-3)' }}
        >
          {passed}/{clips.length} câu đạt
        </span>
      </div>

      {complete && (
        <p
          data-testid="progress-complete"
          className="rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: 'rgba(52,211,153,0.10)', color: 'var(--et-green)' }}
        >
          🎉 Bạn đã hoàn thành gói này!
        </p>
      )}
    </div>
  );
}
