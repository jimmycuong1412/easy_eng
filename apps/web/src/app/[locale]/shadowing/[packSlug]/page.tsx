/**
 * /[locale]/shadowing/[packSlug] — practice page and per-campaign ad landing target.
 *
 * Server-rendered so clip text is indexable, then hands off to the client
 * component for mic capture and local scoring.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { fetchShadowingPack } from '@easyeng/core';
import type { Locale } from '@/i18n/config';

import { ShadowingRep } from '@/components/shadowing/ShadowingRep';

export const revalidate = 300;

interface PageProps {
  params: { locale: Locale; packSlug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Luyện nói theo: ${params.packSlug} | EasyEng`,
    description:
      'Nghe người bản xứ, nói theo và nhận điểm phát âm cùng nhịp điệu ngay lập tức. Miễn phí, không cần đăng ký.',
  };
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
