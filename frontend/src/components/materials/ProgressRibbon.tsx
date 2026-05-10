/**
 * <ProgressRibbon>
 *
 * Coral reward strip shown after a learner completes a non-test material.
 * Used by detail pages (US2). Mock tests do NOT show this — they award no
 * gems or XP per the 2026-05-10 clarification.
 */

'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export interface ProgressRibbonProps {
  gemsAwarded: number;
  xpAwarded: number;
  alreadyEarned?: boolean;
  className?: string;
}

export function ProgressRibbon({
  gemsAwarded,
  xpAwarded,
  alreadyEarned = false,
  className = '',
}: ProgressRibbonProps) {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const timeoutId = window.setTimeout(() => setMounted(true), 50);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (alreadyEarned) {
    return (
      <div
        data-testid="progress-ribbon-already"
        className={`ed-card flex items-center justify-between gap-3 px-4 py-3 ${className}`}
      >
        <span className="text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
          {t('materials.reward.alreadyEarned')}
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="progress-ribbon"
      role="status"
      aria-live="polite"
      className={`ed-card flex items-center justify-between gap-3 px-4 py-3 transition-all ${
        mounted ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      } ${className}`}
      style={{
        background: 'var(--ed-coral-2, #FFE7E0)',
        borderColor: 'var(--ed-coral, #F4593A)',
      }}
    >
      <span
        className="font-serif text-base text-[color:var(--ed-coral-ink,#7A2010)]"
        style={{ fontFamily: 'var(--font-newsreader, serif)' }}
      >
        {t('materials.reward.completed', { gems: gemsAwarded, xp: xpAwarded })}
      </span>
      <span className="font-mono text-sm font-medium text-[color:var(--ed-coral-ink,#7A2010)]">
        {t('materials.reward.earned', { gems: gemsAwarded, xp: xpAwarded })}
      </span>
    </div>
  );
}
