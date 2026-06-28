/**
 * /[locale]/materials/[slug] — Material detail page
 *
 * Server-rendered for SEO (research.md R8). Anonymous users see the full
 * body and a sign-in CTA; authenticated users see the type-specific
 * interactive renderer (vocab cards, listening player, etc.) with their
 * progress strip and gem-award flow.
 *
 * Performance budget: ≤ 3 round-trips (material + sections/items + progress).
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import {
  fetchMaterialAssets,
  fetchMaterialDetail,
  fetchMaterialSections,
  fetchUserProgress,
  fetchVocabularyItems,
  resolveSummary,
  resolveTitle,
  type MaterialSection,
} from '@easyeng/core';
import { locales, type Locale } from '@/i18n/config';

import { MaterialBody } from '@/components/materials/MaterialBody';
import { VocabularyTable } from '@/components/materials/VocabularyTable';
import { GrammarPattern } from '@/components/materials/GrammarPattern';
import { ReadingPassage } from '@/components/materials/ReadingPassage';
import { ListeningPlayer } from '@/components/materials/ListeningPlayer';
import { DialoguePlayer } from '@/components/materials/DialoguePlayer';

export const revalidate = 300;

interface PageProps {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = await createClient();
  const material = await fetchMaterialDetail(supabase as any, params.slug);
  if (!material) return { title: 'EasyEng' };
  const locale = params.locale as Locale;
  const title = resolveTitle(material, locale);
  const summary = resolveSummary(material, locale);
  return {
    title,
    description: summary,
    openGraph: {
      title,
      description: summary,
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      type: 'article',
    },
  };
}

export default async function MaterialDetailPage({ params }: PageProps) {
  if (!locales.includes(params.locale as Locale)) {
    notFound();
  }
  const locale = params.locale as Locale;
  const t = await getTranslations({ locale, namespace: 'materials' });
  const supabase = await createClient();

  // 1. Fetch material
  const material = await fetchMaterialDetail(supabase as any, params.slug);
  if (!material) {
    notFound();
  }
  if (material.status !== 'published') {
    // Anonymous + non-author users land on a 404; admins can preview drafts
    notFound();
  }

  // Mock tests live at a separate route
  if (material.type === 'mock_test') {
    redirect(`/${locale}/materials/${params.slug}/test`);
  }

  // 2. Get current user (may be anonymous)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // 3. Parallel: progress + type-specific items
  const [progress, vocabularyItems, assets, sections] = await Promise.all([
    userId ? fetchUserProgress(supabase as any, userId, material.id) : Promise.resolve(null),
    material.type === 'vocabulary_pack'
      ? fetchVocabularyItems(supabase as any, material.id)
      : Promise.resolve([]),
    material.type === 'listening_audio'
      ? fetchMaterialAssets(supabase as any, material.id)
      : Promise.resolve([]),
    ['grammar_lesson', 'dialogue', 'reading_passage'].includes(material.type)
      ? fetchMaterialSections(supabase as any, material.id)
      : Promise.resolve([] as MaterialSection[]),
  ]);

  const alreadyCompleted = progress?.state === 'completed';
  const title = resolveTitle(material, locale);
  const summary = resolveSummary(material, locale);

  // Resolve the audio URL for listening players (first audio asset wins)
  const audioAsset = assets.find((a) => a.kind === 'audio');
  const audioUrl = audioAsset
    ? supabase.storage.from('material-assets').getPublicUrl(audioAsset.path).data.publicUrl
    : null;

  return (
    <main className="ed-frame min-h-screen">
      <div className="ed-content mx-auto max-w-3xl px-6 py-10">
        <nav className="mb-6">
          <Link
            href={`/${locale}/materials`}
            className="text-sm underline text-[color:var(--ed-ink-mute,#6B7280)] hover:text-[color:var(--ed-ink,#0B2A6B)]"
          >
            ← {t('catalog.title')}
          </Link>
        </nav>

        <header className="mb-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ed-chip ed-chip-ink text-[11px]">
              {t(`type.${material.type}`)}
            </span>
            <span className="ed-chip text-[11px] font-mono uppercase">
              {material.level.toUpperCase()}
            </span>
            {material.goal && (
              <span className="ed-chip ed-chip-coral text-[11px]">
                {t(`goal.${material.goal}`)}
              </span>
            )}
            <span className="text-xs text-[color:var(--ed-ink-mute,#6B7280)]">
              {t('card.minutes', { count: material.duration_min })}
            </span>
            {material.gems_reward > 0 && (
              <span className="ed-chip ed-chip-coral text-[11px]">
                {t('card.rewardLabel', { gems: material.gems_reward })}
              </span>
            )}
          </div>

          <h1
            className="font-serif text-4xl font-medium leading-tight text-[color:var(--ed-ink-2,#0A1F4F)] md:text-5xl"
            style={{ fontFamily: 'var(--font-newsreader, serif)' }}
          >
            {title}
          </h1>
          <p className="max-w-2xl text-base text-[color:var(--ed-ink-mute,#6B7280)]">
            {summary}
          </p>
        </header>

        {!userId && (
          <div className="ed-card mb-6 px-4 py-3 text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
            <Link
              href={`/${locale}/auth/login?redirect=/${locale}/materials/${params.slug}`}
              className="underline"
            >
              {t('detail.signInCta')}
            </Link>
          </div>
        )}

        <Suspense fallback={null}>
          <MaterialRenderer
            material={material}
            locale={locale}
            userId={userId}
            alreadyCompleted={alreadyCompleted}
            vocabularyItems={vocabularyItems}
            audioUrl={audioUrl}
            sections={sections}
          />
        </Suspense>
      </div>
    </main>
  );
}

interface RendererProps {
  material: Awaited<ReturnType<typeof fetchMaterialDetail>>;
  locale: Locale;
  userId: string | null;
  alreadyCompleted: boolean;
  vocabularyItems: Awaited<ReturnType<typeof fetchVocabularyItems>>;
  audioUrl: string | null;
  sections: MaterialSection[];
}

function MaterialRenderer({
  material,
  locale,
  userId,
  alreadyCompleted,
  vocabularyItems,
  audioUrl,
  sections,
}: RendererProps) {
  if (!material) return null;

  switch (material.type) {
    case 'vocabulary_pack':
      return (
        <VocabularyTable
          items={vocabularyItems as any}
          materialId={material.id}
          userId={userId}
          alreadyCompleted={alreadyCompleted}
          minCompletionPct={material.min_completion_pct}
        />
      );
    case 'grammar_lesson':
      return (
        <GrammarPattern
          material={material}
          locale={locale}
          userId={userId}
          alreadyCompleted={alreadyCompleted}
          sections={sections}
        />
      );
    case 'reading_passage':
      return (
        <ReadingPassage
          material={material}
          locale={locale}
          userId={userId}
          alreadyCompleted={alreadyCompleted}
          sections={sections}
        />
      );
    case 'listening_audio':
      return (
        <ListeningPlayer
          material={material}
          locale={locale}
          userId={userId}
          alreadyCompleted={alreadyCompleted}
          audioUrl={audioUrl}
        />
      );
    case 'dialogue':
      return (
        <DialoguePlayer
          material={material}
          locale={locale}
          userId={userId}
          alreadyCompleted={alreadyCompleted}
          sections={sections}
        />
      );
    default:
      return <MaterialBody material={material} locale={locale} />;
  }
}
