/**
 * Public certificate page (Growth 2.4): /{locale}/c/{slug}
 * Readable without login (RLS allows public read); carries OG meta so the
 * credential previews nicely when shared to CV/LinkedIn/Facebook.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface Params { params: { locale: string; slug: string } }

async function fetchCert(slug: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data } = await (supabase as any).rpc('get_certificate', { p_slug: slug });
  return Array.isArray(data) ? data[0] : data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const cert = await fetchCert(params.slug);
  const title = cert ? `${cert.title} — Chứng chỉ EasyEng` : 'Chứng chỉ EasyEng';
  const og = `/api/og/achievement?kind=certificate&value=${encodeURIComponent(cert?.title ?? 'EasyEng')}&name=${encodeURIComponent(cert?.holder_name ?? '')}`;
  return {
    title,
    description: cert ? `${cert.holder_name} đã hoàn thành ${cert.title} trên EasyEng.` : undefined,
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [og] },
  };
}

export default async function CertificatePage({ params }: Params) {
  const cert = await fetchCert(params.slug);
  const { locale } = params;

  if (!cert) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--et-bg)' }}>
        <p style={{ color: 'var(--et-fg-2)' }}>Không tìm thấy chứng chỉ.</p>
      </div>
    );
  }

  const issued = new Date(cert.issued_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--et-bg)' }}>
      <div
        className="w-full max-w-2xl rounded-3xl p-10 text-center"
        style={{ background: 'var(--et-bg-2)', border: '1px solid var(--et-line)' }}
      >
        <div style={{ fontSize: 64 }}>🏆</div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--et-coral)' }}>
          Chứng chỉ EasyEng
        </p>
        <h1 className="mt-4 text-3xl font-bold" style={{ color: 'var(--et-fg)' }}>{cert.title}</h1>
        {cert.subtitle && <p className="mt-2 text-base" style={{ color: 'var(--et-fg-2)' }}>{cert.subtitle}</p>}
        <div className="my-7 h-px w-full" style={{ background: 'var(--et-line)' }} />
        <p className="text-sm" style={{ color: 'var(--et-fg-2)' }}>Chứng nhận cho</p>
        <p className="mt-1 text-xl font-semibold" style={{ color: 'var(--et-fg)' }}>{cert.holder_name}</p>
        {cert.level && (
          <span className="mt-3 inline-block rounded-md px-3 py-1 text-xs font-semibold uppercase"
                style={{ background: 'var(--et-bg-3)', color: 'var(--et-coral)' }}>
            Trình độ {cert.level}
          </span>
        )}
        <p className="mt-6 text-xs" style={{ color: 'var(--et-fg-2)' }}>Cấp ngày {issued}</p>

        <Link
          href={`/${locale}/auth/signup`}
          className="mt-8 inline-block rounded-xl px-6 py-3 text-sm font-semibold text-white"
          style={{ background: 'var(--et-coral)' }}
        >
          Học tiếng Anh miễn phí cùng EasyEng →
        </Link>
      </div>
    </div>
  );
}
