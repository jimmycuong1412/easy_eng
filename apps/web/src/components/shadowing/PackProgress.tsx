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
}

export function PackProgress({ clips, currentIndex, carriedOver }: PackProgressProps) {
  if (clips.length === 0) return null;

  const passed = clips.filter(
    (c) => c.bestScore !== null && c.bestScore >= SHADOWING_PASS_THRESHOLD,
  ).length;
  const complete = passed === clips.length;

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
            const done = c.bestScore !== null && c.bestScore >= SHADOWING_PASS_THRESHOLD;
            return (
              <span
                key={c.clipId}
                data-testid="progress-dot"
                title={c.bestScore === null ? 'Chưa luyện' : `${c.bestScore}%`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: done ? 'var(--et-green)' : 'var(--et-bg-4)',
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
