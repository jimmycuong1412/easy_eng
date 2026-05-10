/**
 * <ReadingPassage>
 *
 * Renders a reading_passage material. Per R3, completion = comprehension
 * quiz attempted with ≥ 60%. The quiz infrastructure ships in a follow-up;
 * for v1 we accept "Tôi đã đọc xong" as the trigger and let admins add a
 * `mock_test` companion when they want quiz-style assessment.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { MaterialBody } from './MaterialBody';
import { ProgressRibbon } from './ProgressRibbon';
import { useAwardCompletion } from './useAwardCompletion';

import type { Locale } from './MaterialCard';
import type { MaterialDetail } from '@/lib/queries/materials';

export interface ReadingPassageProps {
  material: MaterialDetail;
  locale: Locale;
  userId: string | null;
  alreadyCompleted: boolean;
}

export function ReadingPassage({
  material,
  locale,
  userId,
  alreadyCompleted,
}: ReadingPassageProps) {
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
          data-testid="reading-mark-done"
        >
          {marked ? '…' : 'Tôi đã đọc xong'}
        </button>
      ) : (
        <p className="text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
          {t('materials.detail.signInCta')}
        </p>
      )}
    </div>
  );
}
