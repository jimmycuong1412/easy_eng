/**
 * /[locale]/materials — Materials catalog (server-rendered for SEO)
 *
 * Per research.md R8: anonymous users see the full catalog; authenticated
 * users see their progress strip on each card. Server-rendered with a 5-minute
 * edge cache (revalidate: 300).
 *
 * Performance budget (plan.md): ≤ 2 round-trips per page render.
 *   1. SELECT materials WHERE status = 'published' (filtered)
 *   2. SELECT material_tags ORDER BY label_vi
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import {
  fetchMaterialsList,
  type CatalogFilters,
  type MaterialCategory,
  type MaterialGoal,
  type MaterialLevel,
  type MaterialType,
} from '@/lib/queries/materials';
import { locales, type Locale } from '@/i18n/config';

import { MaterialCard } from '@/components/materials/MaterialCard';
import { MaterialFilters } from '@/components/materials/MaterialFilters';

export const revalidate = 300;

interface PageProps {
  params: { locale: string };
  searchParams: {
    level?: string;
    type?: string;
    goal?: string;
    category?: string;
    q?: string;
    cursor?: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'materials.catalog' });
  return {
    title: t('title'),
    description: t('subtitle'),
    openGraph: {
      title: t('title'),
      description: t('subtitle'),
      locale: params.locale === 'vi' ? 'vi_VN' : 'en_US',
      type: 'website',
    },
  };
}

const VALID_LEVELS: MaterialLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1'];
const VALID_TYPES: MaterialType[] = [
  'vocabulary_pack',
  'grammar_lesson',
  'reading_passage',
  'listening_audio',
  'dialogue',
  'mock_test',
];
const VALID_GOALS: MaterialGoal[] = [
  'school',
  'vstep',
  'toeic',
  'ielts',
  'business',
  'study_abroad',
  'conversation',
  'travel',
];
const VALID_CATEGORIES: MaterialCategory[] = [
  'daily_news_talk',
  'callan_method',
  'grammar_basics',
  'business_english',
  'daily_travel',
  'pronunciation',
  'exam_prep',
  'kids_english',
];

function parseFilters(sp: PageProps['searchParams']): CatalogFilters {
  const level = sp.level && VALID_LEVELS.includes(sp.level as MaterialLevel)
    ? (sp.level as MaterialLevel)
    : undefined;
  const type = sp.type && VALID_TYPES.includes(sp.type as MaterialType)
    ? (sp.type as MaterialType)
    : undefined;
  const goal = sp.goal && VALID_GOALS.includes(sp.goal as MaterialGoal)
    ? (sp.goal as MaterialGoal)
    : undefined;
  const category = sp.category && VALID_CATEGORIES.includes(sp.category as MaterialCategory)
    ? (sp.category as MaterialCategory)
    : undefined;

  return {
    level,
    type,
    goal,
    category,
    search: sp.q?.trim() || undefined,
    cursor: sp.cursor || undefined,
  };
}

export default async function MaterialsCatalogPage({ params, searchParams }: PageProps) {
  if (!locales.includes(params.locale as Locale)) {
    notFound();
  }
  const locale = params.locale as Locale;
  const t = await getTranslations({ locale, namespace: 'materials.catalog' });
  const supabase = await createClient();

  const filters = parseFilters(searchParams);
  const { items } = await fetchMaterialsList(supabase as any, filters);

  // Course JSON-LD (SEO — see R8)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    inLanguage: locale === 'vi' ? 'vi-VN' : 'en-US',
    name: t('title'),
    description: t('subtitle'),
    hasPart: items.slice(0, 10).map((m) => ({
      '@type': 'Course',
      name: locale === 'vi' ? m.title_vi : m.title_en ?? m.title_vi,
      description: locale === 'vi' ? m.summary_vi : m.summary_en ?? m.summary_vi,
      educationalLevel: m.level.toUpperCase(),
      inLanguage: locale === 'vi' ? 'vi-VN' : 'en-US',
    })),
  };

  return (
    <main className="ed-frame min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="ed-content mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <span className="ed-eyebrow">EasyEng · {locale.toUpperCase()}</span>
          <h1
            className="font-serif text-4xl font-medium leading-tight text-[color:var(--ed-ink-2,#0A1F4F)] md:text-5xl"
            style={{ fontFamily: 'var(--font-newsreader, serif)' }}
          >
            {t('title')}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[color:var(--ed-ink-mute,#6B7280)]">
            {t('subtitle')}
          </p>
        </header>

        <div className="mb-8">
          <Suspense fallback={null}>
            <MaterialFilters />
          </Suspense>
        </div>

        {items.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <MaterialCard key={m.id} material={m} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="ed-card flex min-h-[240px] flex-col items-center justify-center gap-2 px-6 py-12 text-center"
      data-testid="materials-catalog-empty"
    >
      <span
        className="font-serif text-2xl text-[color:var(--ed-ink-2,#0A1F4F)]"
        style={{ fontFamily: 'var(--font-newsreader, serif)' }}
      >
        {message}
      </span>
    </div>
  );
}
