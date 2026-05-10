/**
 * /[locale]/materials/[slug]/test — Mock-test player page
 *
 * Server component for the static shell (title, metadata, SEO),
 * with the interactive `<MockTestPlayer>` hydrated client-side.
 *
 * Auth requirement (per Phase 5 of tasks.md): authenticated users only.
 * Anonymous viewers are redirected to login with a return URL.
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import {
  fetchMaterialDetail,
  fetchMockTestQuestions,
  resolveSummary,
  resolveTitle,
} from '@/lib/queries/materials';
import { locales, type Locale } from '@/i18n/config';

import { MockTestPlayer } from '@/components/materials/MockTestPlayer';

export const revalidate = 0; // Test player is interactive — no static cache

interface PageProps {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = await createClient();
  const material = await fetchMaterialDetail(supabase as any, params.slug);
  if (!material || material.type !== 'mock_test') return { title: 'EasyEng' };
  const locale = params.locale as Locale;
  const title = resolveTitle(material, locale);
  return {
    title,
    description: resolveSummary(material, locale),
    // Test players should not be indexed — they only show questions, not
    // pedagogical content. The catalog detail page is the SEO surface.
    robots: { index: false, follow: false },
  };
}

export default async function MockTestPlayerPage({ params }: PageProps) {
  if (!locales.includes(params.locale as Locale)) {
    notFound();
  }
  const locale = params.locale as Locale;
  const t = await getTranslations({ locale, namespace: 'materials' });
  const supabase = await createClient();

  // 1. Material lookup
  const material = await fetchMaterialDetail(supabase as any, params.slug);
  if (!material) {
    notFound();
  }
  if (material.type !== 'mock_test') {
    // Wrong type for this route — bounce to the regular detail page
    redirect(`/${locale}/materials/${params.slug}`);
  }
  if (material.status !== 'published') {
    notFound();
  }

  // 2. Auth — required to submit a graded test
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/${locale}/auth/login?redirect=/${locale}/materials/${params.slug}/test`,
    );
  }

  // 3. Fetch questions via the public-safe view (no correct_index)
  const questions = await fetchMockTestQuestions(supabase as any, material.id);

  const title = resolveTitle(material, locale);
  const summary = resolveSummary(material, locale);

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
          </div>

          <h1
            className="font-serif text-3xl font-medium leading-tight text-[color:var(--ed-ink-2,#0A1F4F)] md:text-4xl"
            style={{ fontFamily: 'var(--font-newsreader, serif)' }}
          >
            {title}
          </h1>
          <p className="max-w-2xl text-base text-[color:var(--ed-ink-mute,#6B7280)]">
            {summary}
          </p>
        </header>

        {questions.length === 0 ? (
          <p className="text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
            {t('catalog.empty')}
          </p>
        ) : (
          <MockTestPlayer
            materialId={material.id}
            questions={questions}
            userId={user.id}
            locale={locale}
          />
        )}
      </div>
    </main>
  );
}
