/**
 * /[locale]/shadowing — free shadowing hub.
 *
 * Public and server-rendered: this is the organic-search complement to paid
 * traffic, so pack titles and summaries must be indexable.
 */

import Link from 'next/link';
import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { fetchShadowingPacks } from '@easyeng/core';
import { locales, type Locale } from '@/i18n/config';

// SAFE ONLY because this page's content is identical for every visitor:
// fetchShadowingPacks() selects nothing user-scoped (no auth.uid()-dependent
// columns). Next.js caches rendered output by PATH, not by session, so this
// page must stay free of any per-user data for the cache to be safe. If you
// add a query here that depends on auth.uid() (e.g. per-user progress),
// switch this to `export const dynamic = 'force-dynamic'` — see the pack
// page at [packSlug]/page.tsx for the leak this pattern caused there.
export const revalidate = 300;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Luyện nói theo người bản xứ — miễn phí | EasyEng',
  description:
    'Luyện phát âm và nhịp điệu tiếng Anh bằng cách nói theo người bản xứ. Chấm điểm ngay trên trình duyệt, miễn phí, không cần đăng ký.',
};

interface PageProps {
  params: { locale: Locale };
}

export default async function ShadowingHubPage({ params }: PageProps) {
  const supabase = await createClient();

  // fetchShadowingPacks() throws on any Supabase error (by design). This page
  // is the hub for a paid-ads campaign, so a transient DB failure must degrade
  // to the same "no packs" empty state below rather than 500 the whole page —
  // still logged here so the failure stays visible server-side.
  let packs: Awaited<ReturnType<typeof fetchShadowingPacks>> = [];
  try {
    packs = await fetchShadowingPacks(supabase);
  } catch (error) {
    console.error('[shadowing hub] fetchShadowingPacks failed:', error);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--et-fg)' }}>
          Luyện nói theo người bản xứ
        </h1>
        <p className="text-sm" style={{ color: 'var(--et-fg-2)' }}>
          Nghe một câu, nói theo, nhận điểm ngay. Chấm cả từ vựng và nhịp điệu —
          chạy hoàn toàn trên máy bạn, giọng nói không rời khỏi thiết bị.
        </p>
      </div>

      {packs.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--et-fg-3)' }}>
          Chưa có gói luyện tập nào được xuất bản.
        </p>
      ) : (
        <ul className="space-y-3">
          {packs.map((pack) => (
            <li key={pack.id}>
              <Link
                href={`/${params.locale}/shadowing/${pack.slug}`}
                className="block rounded-xl p-4 transition-colors"
                style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold" style={{ color: 'var(--et-fg)' }}>
                    {pack.titleVi}
                  </span>
                  <span className="text-xs uppercase" style={{ color: 'var(--et-fg-3)' }}>
                    {pack.level}
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: 'var(--et-fg-2)' }}>
                  {pack.summaryVi}
                </p>
                <p className="mt-2 text-xs" style={{ color: 'var(--et-fg-3)' }}>
                  {pack.clipCount} câu
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
