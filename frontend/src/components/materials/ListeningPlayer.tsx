/**
 * <ListeningPlayer>
 *
 * Plays an audio clip and reveals the transcript on demand. Per the
 * 2026-05-10 clarification: if the audio does not reach `canplay` within
 * 5 seconds (poor 4G), automatically reveal the transcript with a
 * Vietnamese notice "Âm thanh không tải được — xem bản ghi".
 *
 * Completion (per R3): audio progress ≥ 90%.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { MaterialBody } from './MaterialBody';
import { ProgressRibbon } from './ProgressRibbon';
import { useAwardCompletion } from './useAwardCompletion';

import type { Locale } from './MaterialCard';
import type { MaterialDetail } from '@/lib/queries/materials';

const AUDIO_LOAD_TIMEOUT_MS = 5_000;
const COMPLETION_THRESHOLD = 0.9;

export interface ListeningPlayerProps {
  material: MaterialDetail;
  locale: Locale;
  userId: string | null;
  alreadyCompleted: boolean;
  audioUrl: string | null;
  /** Optional transcript path (if separately stored); falls back to body. */
  transcriptUrl?: string | null;
}

export function ListeningPlayer({
  material,
  locale,
  userId,
  alreadyCompleted,
  audioUrl,
}: ListeningPlayerProps) {
  const t = useTranslations();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const reachedThreshold = progressPct >= COMPLETION_THRESHOLD * 100;
  const { awarded } = useAwardCompletion({
    shouldAward: reachedThreshold,
    userId,
    materialId: material.id,
    alreadyCompleted,
  });

  // 5-second timeout: if not ready by then, auto-reveal transcript
  useEffect(() => {
    if (!audioUrl) {
      setAudioFailed(true);
      setTranscriptVisible(true);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      if (!audioReady) {
        setAudioFailed(true);
        setTranscriptVisible(true);
      }
    }, AUDIO_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [audioReady, audioUrl]);

  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || !a.duration || !isFinite(a.duration)) return;
    setProgressPct(Math.round((a.currentTime / a.duration) * 100));
  };

  return (
    <div className="space-y-5">
      {audioUrl && (
        <div className="ed-card flex flex-col gap-3 p-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            preload="metadata"
            onCanPlay={() => setAudioReady(true)}
            onError={() => {
              setAudioFailed(true);
              setTranscriptVisible(true);
            }}
            onTimeUpdate={handleTimeUpdate}
            className="w-full"
            data-testid="listening-audio"
          />
          {audioFailed && (
            <p
              role="alert"
              className="text-sm text-[color:var(--ed-coral-ink,#7A2010)]"
              data-testid="listening-audio-failed"
            >
              {t('materials.audio.loadFailed')}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-[color:var(--ed-ink-mute,#6B7280)]">
            <span>{progressPct}%</span>
            <button
              type="button"
              onClick={() => setTranscriptVisible((v) => !v)}
              className="underline"
            >
              {transcriptVisible
                ? t('materials.audio.hideTranscript')
                : t('materials.audio.showTranscript')}
            </button>
          </div>
        </div>
      )}

      {transcriptVisible && (
        <section
          aria-label={t('materials.audio.transcriptLabel')}
          className="ed-card p-4"
        >
          <span className="ed-eyebrow text-[10px]">{t('materials.audio.transcriptLabel')}</span>
          <MaterialBody material={material} locale={locale} className="mt-2" />
        </section>
      )}

      {!transcriptVisible && (
        // Body still rendered when transcript is hidden — listening exercises
        // typically show the prompt above the player.
        <MaterialBody material={material} locale={locale} />
      )}

      {alreadyCompleted ? (
        <ProgressRibbon gemsAwarded={0} xpAwarded={0} alreadyEarned />
      ) : awarded ? (
        <ProgressRibbon gemsAwarded={awarded.gems} xpAwarded={awarded.xp} />
      ) : !userId ? (
        <p className="text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
          {t('materials.detail.signInCta')}
        </p>
      ) : null}
    </div>
  );
}
