/**
 * /[locale]/shadowing/[packSlug] — practice page and per-campaign ad landing target.
 *
 * Server-rendered so clip text is indexable, then hands off to the client
 * component for mic capture and local scoring.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { fetchShadowingPack, fetchShadowingPacks } from '@easyeng/core';
import type { Locale } from '@/i18n/config';

import { ShadowingRep } from '@/components/shadowing/ShadowingRep';

// This page reads a cookie-bound Supabase client (`supabase.auth.getUser()`)
// and a per-user `best_score` (via `get_shadowing_pack`, scoped to
// `auth.uid()` — see supabase/migrations/104_shadowing.sql). Next.js caches
// rendered output by PATH, not by session, so any time-based `revalidate`
// here would bake one visitor's auth state and scores into the HTML served
// to every later visitor for that pack URL. Must stay dynamic.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { locale: Locale; packSlug: string };
}

const DEFAULT_DESCRIPTION =
  'Nghe người bản xứ, nói theo và nhận điểm phát âm cùng nhịp điệu ngay lập tức. Miễn phí, không cần đăng ký.';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const fallback: Metadata = {
    title: `Luyện nói theo: ${params.packSlug} | EasyEng`,
    description: DEFAULT_DESCRIPTION,
  };

  try {
    const supabase = await createClient();
    const packs = await fetchShadowingPacks(supabase);
    const pack = packs.find((p) => p.slug === params.packSlug);
    if (!pack) return fallback;

    const title = pack.titleVi || pack.titleEn;
    if (!title) return fallback;

    return {
      title: `Luyện nói theo: ${title} | EasyEng`,
      description: pack.summaryVi || DEFAULT_DESCRIPTION,
    };
  } catch {
    // A metadata lookup must never break the page — fall back to the slug.
    return fallback;
  }
}

// NEXT_PUBLIC_SUPABASE_URL must be defined at build/boot time. Without it,
// every clip URL silently becomes "undefined/storage/...", audio.play()
// rejects, and playReference() falls back to robotic browser TTS with no
// visible error — on the exact page paid ads point at. Fail loudly instead.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL is not set — required to build shadowing clip audio URLs.',
  );
}

const AUDIO_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/material-assets/`;

export default async function ShadowingPackPage({ params }: PageProps) {
  const supabase = await createClient();

  const clips = await fetchShadowingPack(supabase, params.packSlug);
  if (clips.length === 0) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <ShadowingRep
        clips={clips}
        audioBaseUrl={AUDIO_BASE}
        locale={params.locale}
        isAuthenticated={Boolean(user)}
        userId={user?.id ?? null}
      />

      {/* Server-rendered transcript: indexable content for organic search. */}
      <section className="space-y-1">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--et-fg-2)' }}>
          Các câu trong gói này
        </h2>
        <ol className="space-y-1 text-sm" style={{ color: 'var(--et-fg-3)' }}>
          {clips.map((c) => (
            <li key={c.clipId}>
              {c.textEn} — <em>{c.textVi}</em>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
