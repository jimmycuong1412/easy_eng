/**
 * <DialoguePlayer>
 *
 * Renders a dialogue material — two-speaker scripted exchange. v1 surface
 * is the markdown body (which contains "**Speaker:** line" rows) plus a
 * "shadow-read done" trigger. Per-line audio playback ships in a follow-up
 * once admins start uploading audio assets per dialogue line.
 *
 * Completion (per R3): both speakers played + shadow-read marked done.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { MaterialBody } from './MaterialBody';
import { ProgressRibbon } from './ProgressRibbon';
import { useAwardCompletion } from './useAwardCompletion';

import type { Locale } from './MaterialCard';
import type { MaterialDetail } from '@easyeng/core';

export interface DialoguePlayerProps {
  material: MaterialDetail;
  locale: Locale;
  userId: string | null;
  alreadyCompleted: boolean;
}

export function DialoguePlayer({
  material,
  locale,
  userId,
  alreadyCompleted,
}: DialoguePlayerProps) {
  const t = useTranslations();
  const [shadowed, setShadowed] = useState(false);

  const { awarded } = useAwardCompletion({
    shouldAward: shadowed,
    userId,
    materialId: material.id,
    alreadyCompleted,
  });

  return (
    <div className="space-y-6">
      <MaterialBody material={material} locale={locale} />

      {alreadyCompleted ? (
        <ProgressRibbon gemsAwarded={0} xpAwarded={0} alreadyEarned />
      ) : awarded ? (
        <ProgressRibbon gemsAwarded={awarded.gems} xpAwarded={awarded.xp} />
      ) : userId ? (
        <button
          type="button"
          onClick={() => setShadowed(true)}
          disabled={shadowed}
          className="ed-btn"
          data-testid="dialogue-shadow-done"
        >
          {shadowed ? '…' : 'Tôi đã đọc theo (shadow-read) xong'}
        </button>
      ) : (
        <p className="text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
          {t('materials.detail.signInCta')}
        </p>
      )}
    </div>
  );
}
