'use client';

/**
 * Stacked reference-vs-attempt waveform.
 *
 * This view carries the feature's core claim. A bare percentage cannot
 * communicate "we score your rhythm, not just your words"; two misaligned
 * waveforms communicate it at a glance. It is also the frame users screenshot,
 * which is unpaid reach — so it is worth rendering well.
 */

import { type Envelope } from '@easyeng/core';

/** Duration gap below which the pacing difference is not worth mentioning. */
const HINT_THRESHOLD_MS = 250;

export function timingHint(reference: Envelope, attempt: Envelope): string | null {
  const delta = attempt.durationMs - reference.durationMs;
  if (Math.abs(delta) < HINT_THRESHOLD_MS) return null;
  const seconds = (Math.abs(delta) / 1000).toFixed(1);
  return delta < 0
    ? `Bạn nói nhanh hơn mẫu ${seconds}s — thử ngắt nghỉ giống người bản xứ.`
    : `Bạn nói chậm hơn mẫu ${seconds}s — thử nối câu liền mạch hơn.`;
}

function Row({
  label,
  bins,
  color,
}: {
  label: string;
  bins: number[];
  color: string;
}) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--et-fg-3)' }}>
        {label}
      </p>
      <div
        className="mt-1 flex items-end gap-[2px] rounded-lg p-2"
        style={{ background: 'var(--et-bg-3)', height: 48 }}
      >
        {bins.map((b, i) => (
          <div
            key={i}
            data-testid="wave-bar"
            style={{
              flex: 1,
              height: `${Math.max(4, b * 100)}%`,
              background: color,
              borderRadius: 2,
              opacity: 0.35 + b * 0.65,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export interface WaveformCompareProps {
  reference: Envelope;
  attempt: Envelope;
}

export function WaveformCompare({ reference, attempt }: WaveformCompareProps) {
  const hint = timingHint(reference, attempt);

  return (
    <div className="space-y-3">
      <Row label="🔊 Người bản xứ" bins={reference.bins} color="var(--et-blue)" />
      <Row label="Bạn" bins={attempt.bins} color="var(--et-coral)" />

      {hint && (
        <p
          data-testid="timing-hint"
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: 'rgba(251,191,36,0.10)', color: 'var(--et-amber)' }}
        >
          ⏱ {hint}
        </p>
      )}
    </div>
  );
}
