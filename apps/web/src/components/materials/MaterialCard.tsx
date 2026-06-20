/**
 * <MaterialCard>
 *
 * The single catalog tile component. Every list of materials in the app
 * MUST use this; ad-hoc cards break editorial consistency.
 *
 * Contract: specs/001-english-learning-platform/features/materials-library/
 *           contracts/component-material-card.md
 */

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Clock, Lock } from 'lucide-react';

import {
  resolveTitle,
  resolveSummary,
  type MaterialSummary,
  type MaterialProgressLite,
  type MaterialType,
} from '@easyeng/core';

export type Locale = 'vi' | 'en';

export interface MaterialCardProps {
  material: MaterialSummary;
  progress?: MaterialProgressLite | null;
  locale: Locale;
  size?: 'sm' | 'md' | 'lg';
  badge?: 'recommended' | 'new' | 'pinned' | null;
  anonymous?: boolean;
  href?: string;
  className?: string;
}

const TYPE_CHIP_VARIANT: Record<MaterialType, string> = {
  vocabulary_pack: 'ed-chip-sky',
  grammar_lesson: 'ed-chip-coral',
  reading_passage: 'ed-chip-ink',
  listening_audio: 'ed-chip-sky',
  dialogue: 'ed-chip-coral',
  mock_test: 'ed-chip-ink',
};

const SIZE_PADDING: Record<NonNullable<MaterialCardProps['size']>, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function MaterialCard({
  material,
  progress = null,
  locale,
  size = 'md',
  badge = null,
  anonymous = false,
  href,
  className = '',
}: MaterialCardProps) {
  const t = useTranslations();
  const title = resolveTitle(material, locale);
  const summary = resolveSummary(material, locale);
  const showCover = (size === 'md' || size === 'lg') && Boolean(material.cover_path);
  const coverAspect = size === 'lg' ? 'aspect-[4/5]' : 'aspect-[16/10]';
  const linkHref = href ?? `/${locale}/materials/${material.slug}`;

  return (
    <Link
      href={linkHref}
      className={`ed-card relative flex flex-col gap-2 ${SIZE_PADDING[size]} no-underline transition-shadow hover:shadow-md ${className}`}
      style={{ textDecoration: 'none' }}
    >
      {badge && (
        <span
          className="ed-chip ed-chip-coral absolute right-3 top-3 text-[10px] uppercase tracking-wider"
          data-testid="material-card-badge"
        >
          {t(`materials.card.badge.${badge}`)}
        </span>
      )}

      {showCover && material.cover_path && (
        <div className={`overflow-hidden rounded-md ${coverAspect}`}>
          <Image
            src={material.cover_path}
            alt={title}
            width={400}
            height={500}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {material.goal && (
        <span className="ed-eyebrow text-[10px]" data-testid="material-card-goal">
          {t(`materials.goal.${material.goal}`)}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`ed-chip ${TYPE_CHIP_VARIANT[material.type]} text-[11px]`}
          data-testid="material-card-type"
        >
          {t(`materials.type.${material.type}`)}
        </span>
        <span className="ed-chip text-[11px] font-mono uppercase">
          {material.level.toUpperCase()}
        </span>
      </div>

      <h3
        className="font-serif text-lg leading-snug text-[color:var(--ed-ink-2,#0A1F4F)]"
        style={{ fontFamily: 'var(--font-newsreader, serif)' }}
      >
        {title}
      </h3>

      <p
        className="line-clamp-2 text-sm text-[color:var(--ed-ink-mute,#6B7280)]"
        data-testid="material-card-summary"
      >
        {summary}
      </p>

      <div className="mt-1 flex items-center justify-between text-xs text-[color:var(--ed-ink-mute,#6B7280)]">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {t('materials.card.minutes', { count: material.duration_min })}
        </span>

        {material.type !== 'mock_test' && material.gems_reward > 0 && (
          <span className="ed-chip ed-chip-coral text-[11px]">
            {t('materials.card.rewardLabel', { gems: material.gems_reward })}
          </span>
        )}
      </div>

      {progress && (
        <div data-testid="material-card-progress" className="mt-2 flex items-center gap-2">
          <div
            className="h-[3px] flex-1 overflow-hidden rounded-full"
            style={{ background: 'var(--ed-rule, rgba(0,0,0,0.08))' }}
          >
            <div
              className="h-full"
              style={{
                width: `${progress.completion_pct}%`,
                background: 'var(--ed-coral, #F4593A)',
              }}
            />
          </div>
          {progress.state === 'completed' && (
            <span className="text-[11px] font-medium text-[color:var(--ed-coral-ink,#7A2010)]">
              ✓ {t('materials.card.completed')}
            </span>
          )}
        </div>
      )}

      {anonymous && (
        <span
          className="absolute bottom-3 right-3 text-[color:var(--ed-ink-mute,#6B7280)]"
          aria-label={t('materials.card.anonymousLockTooltip')}
          title={t('materials.card.anonymousLockTooltip')}
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}

// ============================================================
// Skeleton — used as Suspense fallback in server components
// ============================================================
MaterialCard.Skeleton = function MaterialCardSkeleton({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg';
}) {
  const showCover = size === 'md' || size === 'lg';
  const coverAspect = size === 'lg' ? 'aspect-[4/5]' : 'aspect-[16/10]';

  return (
    <div
      className={`ed-card flex animate-pulse flex-col gap-2 ${SIZE_PADDING[size]}`}
      data-testid="material-card-skeleton"
    >
      {showCover && (
        <div
          className={`rounded-md ${coverAspect}`}
          style={{ background: 'var(--ed-rule, rgba(0,0,0,0.06))' }}
        />
      )}
      <div className="h-3 w-1/3 rounded-full" style={{ background: 'var(--ed-rule)' }} />
      <div className="h-5 w-3/4 rounded-full" style={{ background: 'var(--ed-rule)' }} />
      <div className="h-3 w-full rounded-full" style={{ background: 'var(--ed-rule)' }} />
      <div className="h-3 w-5/6 rounded-full" style={{ background: 'var(--ed-rule)' }} />
    </div>
  );
};
