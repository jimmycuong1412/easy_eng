/**
 * Share landing page (Growth 2.3). Carries OG meta pointing at the generated
 * achievement card so Facebook/Zalo render a rich preview. Humans see a CTA
 * to join EasyEng.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

interface Params { params: { locale: string; kind: string }; searchParams: { value?: string; name?: string } }

const TITLES: Record<string, string> = {
  streak: 'Chuỗi ngày học liên tục trên EasyEng',
  level: 'Cấp độ học tiếng Anh trên EasyEng',
  referral: 'Mời bạn học tiếng Anh trên EasyEng',
  certificate: 'Chứng chỉ EasyEng',
};

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const kind = params.kind;
  const value = searchParams.value ?? '0';
  const name = searchParams.name ?? '';
  const og = `/api/og/achievement?kind=${encodeURIComponent(kind)}&value=${encodeURIComponent(value)}${name ? `&name=${encodeURIComponent(name)}` : ''}`;
  const title = TITLES[kind] ?? 'EasyEng';
  return {
    title,
    description: 'Học tiếng Anh vui mỗi ngày cùng EasyEng — giáo viên bản ngữ, bài học hằng ngày, phần thưởng.',
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [og] },
  };
}

export default function SharePage({ params, searchParams }: Params) {
  const { locale, kind } = params;
  const og = `/api/og/achievement?kind=${encodeURIComponent(kind)}&value=${encodeURIComponent(searchParams.value ?? '0')}${searchParams.name ? `&name=${encodeURIComponent(searchParams.name)}` : ''}`;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6" style={{ background: 'var(--et-bg)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={og} alt="Thành tích EasyEng" style={{ maxWidth: 600, width: '100%', borderRadius: 16 }} />
      <Link
        href={`/${locale}/auth/signup`}
        className="rounded-xl px-6 py-3 text-base font-semibold text-white"
        style={{ background: 'var(--et-coral)' }}
      >
        Học tiếng Anh miễn phí cùng EasyEng →
      </Link>
    </div>
  );
}
