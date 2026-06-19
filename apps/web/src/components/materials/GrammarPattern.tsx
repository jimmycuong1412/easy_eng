/**
 * <GrammarPattern>
 *
 * Renders a grammar_lesson material. Per R3, completion fires when "all
 * drills attempted" — we surface a "Tôi đã làm xong bài tập" button after
 * the body is read.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { MaterialBody } from './MaterialBody';
import { ProgressRibbon } from './ProgressRibbon';
import { useAwardCompletion } from './useAwardCompletion';

import type { Locale } from './MaterialCard';
import type { MaterialDetail } from '@/lib/queries/materials';

export interface GrammarPatternProps {
  material: MaterialDetail;
  locale: Locale;
  userId: string | null;
  alreadyCompleted: boolean;
}

export function GrammarPattern({
  material,
  locale,
  userId,
  alreadyCompleted,
}: GrammarPatternProps) {
  const t = useTranslations();
  const [marked, setMarked] = useState(false);

  const { awarded } = useAwardCompletion({
    shouldAward: marked,
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
          onClick={() => setMarked(true)}
          disabled={marked}
          className="ed-btn"
          data-testid="grammar-mark-done"
        >
          {marked ? '…' : 'Tôi đã làm xong bài tập'}
        </button>
      ) : (
        <p className="text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
          {t('materials.detail.signInCta')}
        </p>
      )}
    </div>
  );
}
