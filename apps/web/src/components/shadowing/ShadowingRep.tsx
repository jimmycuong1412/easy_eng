'use client';

/**
 * The shadowing rep screen.
 *
 * While practising it is deliberately single-focus — one sentence, its
 * translation, two buttons — because the only thing that matters for cold ad
 * traffic is the time from landing to first mic press. The screen expands into
 * the waveform comparison only AFTER an attempt, where it pays off.
 *
 * All scoring is local. No audio is uploaded.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mic, Square, Volume2, RotateCcw, ChevronRight } from 'lucide-react';

import { scoreAttempt, type ShadowingClip, type ShadowingScore } from '@easyeng/core';

import { useRecorder } from './useRecorder';
import { WaveformCompare } from './WaveformCompare';
import { SignupWall } from './SignupWall';
import {
  isAnonLimitReached,
  recordAnonAttempt,
  readAnonProgress,
} from '@/lib/shadowing/anonProgress';

export interface ShadowingRepProps {
  clips: ShadowingClip[];
  /** Public base URL of the material-assets bucket. */
  audioBaseUrl: string;
  locale: string;
  isAuthenticated: boolean;
}

const ERROR_COPY: Record<string, string> = {
  'mic-denied':
    'Chúng tôi cần quyền dùng micro để chấm điểm. Hãy cho phép trong trình duyệt rồi thử lại.',
  'no-audio': 'Chưa nghe thấy gì cả — hãy thử nói to hơn một chút nhé.',
  unsupported: 'Trình duyệt này chưa hỗ trợ ghi âm. Thử Chrome trên máy tính hoặc Android.',
};

export function ShadowingRep({
  clips,
  audioBaseUrl,
  locale,
  isAuthenticated,
}: ShadowingRepProps) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState<ShadowingScore | null>(null);
  const [walled, setWalled] = useState(false);

  const recorder = useRecorder('en-US');
  const clip = clips[index];

  // Anonymous visitors hit the wall once they have used their daily clips.
  useEffect(() => {
    if (!isAuthenticated) setWalled(isAnonLimitReached());
  }, [isAuthenticated, index]);

  // Score as soon as a recording lands.
  useEffect(() => {
    if (!recorder.result || !clip) return;
    const s = scoreAttempt({
      target: clip.textEn,
      spoken: recorder.result.transcript,
      reference: clip.referenceEnvelope,
      attempt: recorder.result.envelope,
    });
    setScore(s);
    if (!isAuthenticated) {
      recordAnonAttempt(clip.clipId, s.overall);
      setWalled(isAnonLimitReached());
    }
    // Phase B wires record_shadowing_attempt here for authenticated users.
  }, [recorder.result, clip, isAuthenticated]);

  const playReference = useCallback(() => {
    const audio = new Audio(`${audioBaseUrl}${clip.audioPath}`);
    audio.play().catch(() => {
      // Asset missing or autoplay blocked — fall back to browser TTS so the
      // clip is still practisable.
      try {
        const u = new SpeechSynthesisUtterance(clip.textEn);
        u.lang = 'en-US';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch {
        // Nothing further we can do.
      }
    });
  }, [audioBaseUrl, clip]);

  const next = useCallback(() => {
    setScore(null);
    recorder.reset();
    setIndex((i) => Math.min(i + 1, clips.length - 1));
  }, [clips.length, recorder]);

  const retry = useCallback(() => {
    setScore(null);
    recorder.reset();
  }, [recorder]);

  const bestScore = useMemo(() => {
    const attempts = readAnonProgress().attempts;
    return attempts.length ? Math.max(...attempts.map((a) => a.overall)) : null;
  }, [walled]);

  if (!clip) return null;

  if (walled && !isAuthenticated) {
    return <SignupWall bestScore={bestScore} locale={locale} />;
  }

  const recording = recorder.state === 'recording';

  return (
    <div
      className="space-y-4 rounded-xl p-5"
      style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
    >
      <p className="text-xs" style={{ color: 'var(--et-fg-3)' }}>
        Câu {index + 1} / {clips.length}
      </p>

      {/* Target sentence — recoloured per word once scored. */}
      <p className="text-lg font-semibold leading-relaxed" style={{ color: 'var(--et-fg)' }}>
        {score && score.words.length > 0
          ? score.words.map((w, i) => (
              <span
                key={i}
                style={{ color: w.ok ? 'var(--et-green)' : '#ef4444' }}
              >
                {w.word}
                {i < score.words.length - 1 ? ' ' : ''}
              </span>
            ))
          : clip.textEn}
      </p>

      <p className="text-sm italic" style={{ color: 'var(--et-fg-2)' }}>
        {clip.textVi}
      </p>

      {!recorder.hasRecognition && (
        <p data-testid="rep-rhythm-only" className="text-xs" style={{ color: 'var(--et-fg-3)' }}>
          Trình duyệt này chưa nhận dạng được lời nói — bạn vẫn được chấm điểm nhịp điệu.
        </p>
      )}

      {recorder.error && (
        <p
          data-testid="rep-error"
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
        >
          {ERROR_COPY[recorder.error] ?? ERROR_COPY.unsupported}
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={playReference}
          data-testid="rep-play"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}
        >
          <Volume2 className="h-4 w-4" /> Nghe mẫu
        </button>

        {!recording ? (
          <button
            type="button"
            onClick={recorder.start}
            data-testid="rep-record"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--et-coral)' }}
          >
            <Mic className="h-4 w-4" /> {score ? 'Thử lại' : 'Nói theo'}
          </button>
        ) : (
          <button
            type="button"
            onClick={recorder.stop}
            data-testid="rep-stop"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#ef4444' }}
          >
            <Square className="h-4 w-4" /> Dừng
          </button>
        )}

        {score && (
          <>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}
            >
              <RotateCcw className="h-4 w-4" /> Làm lại
            </button>
            {index < clips.length - 1 && (
              <button
                type="button"
                onClick={next}
                data-testid="rep-next"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)' }}
              >
                Câu tiếp <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Live level while recording — confirms the mic is actually hearing you. */}
      {recording && recorder.liveSamples.length > 0 && (
        <div
          className="flex items-end gap-[2px] rounded-lg p-2"
          style={{ background: 'var(--et-bg-3)', height: 40 }}
        >
          {recorder.liveSamples.map((v, i) => (
            <div
              key={i}
              data-testid="live-bar"
              style={{
                flex: 1,
                height: `${Math.max(4, v * 100)}%`,
                background: 'var(--et-coral)',
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      )}

      {/* Result — the payoff view. */}
      {score && recorder.result && (
        <div className="space-y-3 rounded-lg p-3" style={{ background: 'var(--et-bg-3)' }}>
          <div className="flex items-baseline gap-3" data-testid="rep-score">
            <span
              className="text-3xl font-extrabold tabular-nums"
              style={{
                color:
                  score.overall >= 85
                    ? 'var(--et-green)'
                    : score.overall >= 65
                      ? 'var(--et-amber)'
                      : '#ef4444',
              }}
            >
              {score.overall}%
            </span>
            <span className="text-xs" style={{ color: 'var(--et-fg-2)' }}>
              {score.wordScore !== null && <>Từ đúng {score.wordScore}% · </>}
              Nhịp điệu {score.rhythmScore}%
            </span>
          </div>

          <WaveformCompare
            reference={clip.referenceEnvelope}
            attempt={recorder.result.envelope}
          />
        </div>
      )}
    </div>
  );
}
