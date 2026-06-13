/**
 * <MaterialFilters>
 *
 * Catalog filter chip rail. URL-search-param driven so filters are
 * bookmarkable and SEO-safe (per R8). Used by /[locale]/materials/page.tsx.
 */

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type {
  MaterialCategory,
  MaterialGoal,
  MaterialLevel,
  MaterialType,
} from '@/lib/queries/materials';

// 8 danh mục lớn theo taxonomy EasyEng (hàng filter đầu tiên).
const CATEGORIES: MaterialCategory[] = [
  'daily_news_talk',
  'callan_method',
  'grammar_basics',
  'business_english',
  'daily_travel',
  'pronunciation',
  'exam_prep',
  'kids_english',
];
const LEVELS: MaterialLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1'];
const TYPES: MaterialType[] = [
  'vocabulary_pack',
  'grammar_lesson',
  'reading_passage',
  'listening_audio',
  'dialogue',
  'mock_test',
];
const GOALS: MaterialGoal[] = [
  'school',
  'thpt' as MaterialGoal, // alias for compatibility with seed
  'vstep',
  'toeic',
  'ielts',
  'business',
  'study_abroad',
  'conversation',
  'travel',
].filter((g, i, arr) => arr.indexOf(g) === i) as MaterialGoal[];

export interface MaterialFiltersProps {
  className?: string;
}

export function MaterialFilters({ className = '' }: MaterialFiltersProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = useMemo(
    () => ({
      category: searchParams.get('category') ?? null,
      level: searchParams.get('level') ?? null,
      type: searchParams.get('type') ?? null,
      goal: searchParams.get('goal') ?? null,
    }),
    [searchParams],
  );

  const updateFilter = (key: 'level' | 'type' | 'goal' | 'category', value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null || next.get(key) === value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.delete('cursor'); // reset pagination on filter change
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const clearAll = () => {
    router.push(pathname);
  };

  const hasAnyFilter = current.category || current.level || current.type || current.goal;

  return (
    <div className={`flex flex-col gap-3 ${className}`} data-testid="material-filters">
      <FilterRow
        label={t('materials.catalog.filterCategory')}
        options={CATEGORIES.map((c) => ({ value: c, label: t(`materials.category.${c}`) }))}
        active={current.category}
        onSelect={(v) => updateFilter('category', v)}
      />
      <FilterRow
        label={t('materials.catalog.filterLevel')}
        options={LEVELS.map((l) => ({ value: l, label: t(`materials.level.${l}`) }))}
        active={current.level}
        onSelect={(v) => updateFilter('level', v)}
        mono
      />
      <FilterRow
        label={t('materials.catalog.filterType')}
        options={TYPES.map((tt) => ({ value: tt, label: t(`materials.type.${tt}`) }))}
        active={current.type}
        onSelect={(v) => updateFilter('type', v)}
      />
      <FilterRow
        label={t('materials.catalog.filterGoal')}
        options={GOALS.filter((g) => g !== ('thpt' as MaterialGoal)).map((g) => ({
          value: g,
          label: t(`materials.goal.${g}`),
        }))}
        active={current.goal}
        onSelect={(v) => updateFilter('goal', v)}
      />
      {hasAnyFilter && (
        <button
          type="button"
          onClick={clearAll}
          className="self-start text-xs underline text-[color:var(--ed-ink-mute,#6B7280)] hover:text-[color:var(--ed-ink,#0B2A6B)]"
        >
          {t('materials.catalog.clearFilters')}
        </button>
      )}
    </div>
  );
}

interface FilterRowProps {
  label: string;
  options: { value: string; label: string }[];
  active: string | null;
  onSelect: (value: string) => void;
  mono?: boolean;
}

function FilterRow({ label, options, active, onSelect, mono }: FilterRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="ed-eyebrow w-20 shrink-0 text-[10px]">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isActive = active === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`ed-chip text-[11px] transition-colors ${
                isActive ? 'ed-chip-ink' : ''
              } ${mono ? 'font-mono uppercase' : ''}`}
              aria-pressed={isActive}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
