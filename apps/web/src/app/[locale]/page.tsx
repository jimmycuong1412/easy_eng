'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/common';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #7c5cff, #4c6bff)',
  'linear-gradient(135deg, #ec4899, #7c5cff)',
  'linear-gradient(135deg, #34d399, #4c6bff)',
  'linear-gradient(135deg, #fbbf24, #ff7a59)',
  'linear-gradient(135deg, #ff7a59, #ec4899)',
  'linear-gradient(135deg, #4c6bff, #34d399)',
];

function Avatar({
  initials,
  size = 40,
  gradient,
}: {
  initials: string;
  size?: number;
  gradient?: string;
}) {
  const g =
    gradient ?? AVATAR_GRADIENTS[(initials?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length];
  return (
    <span
      className="et-avatar"
      style={{ width: size, height: size, fontSize: size * 0.36, background: g }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function Stars({
  value = 4.7,
  count,
  big = false,
}: {
  value?: number;
  count?: number;
  big?: boolean;
}) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="et-stars">
      {big && <span className="et-stars-num">{value.toFixed(1)}</span>}
      <span className="et-stars-row" aria-label={`Rated ${value} out of 5`}>
        {[...Array(5)].map((_, i) => {
          const isFull = i < full;
          const isHalf = !isFull && i === full && half;
          return (
            <svg key={i} viewBox="0 0 24 24" className={isFull || isHalf ? '' : 'et-stars-empty'}>
              {isHalf ? (
                <>
                  <defs>
                    <linearGradient id={`half-${i}`}>
                      <stop offset="50%" stopColor="currentColor" />
                      <stop offset="50%" stopColor="rgba(255,255,255,0.13)" />
                    </linearGradient>
                  </defs>
                  <path
                    fill={`url(#half-${i})`}
                    d="M12 2l2.9 6.3 6.7.7-5 4.5 1.5 6.6L12 16.8 5.9 20l1.5-6.6-5-4.5 6.7-.7z"
                  />
                </>
              ) : (
                <path d="M12 2l2.9 6.3 6.7.7-5 4.5 1.5 6.6L12 16.8 5.9 20l1.5-6.6-5-4.5 6.7-.7z" />
              )}
            </svg>
          );
        })}
      </span>
      {count !== undefined && (
        <span className="et-stars-count">({count.toLocaleString()})</span>
      )}
    </span>
  );
}

function ImageSlot({
  label,
  height = 180,
  accent,
}: {
  label: string;
  height?: number;
  accent?: string;
}) {
  return (
    <div className="et-image-slot" style={{ height }}>
      {accent && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 75% 25%, ${accent}55, transparent 60%)`,
          }}
        />
      )}
      <div className="et-image-meta">{label}</div>
    </div>
  );
}

function PricingToggle({
  value,
  onChange,
  monthlyLabel,
  yearlyLabel,
  saveLabel,
}: {
  value: 'month' | 'year';
  onChange: (v: 'month' | 'year') => void;
  monthlyLabel: string;
  yearlyLabel: string;
  saveLabel: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const monthRef = React.useRef<HTMLButtonElement>(null);
  const yearRef = React.useRef<HTMLButtonElement>(null);
  const [pill, setPill] = React.useState({ left: 4, width: 100 });

  React.useEffect(() => {
    const active = value === 'year' ? yearRef.current : monthRef.current;
    if (!active || !ref.current) return;
    const a = active.getBoundingClientRect();
    const w = ref.current.getBoundingClientRect();
    setPill({ left: a.left - w.left, width: a.width });
  }, [value]);

  return (
    <div className="et-toggle" ref={ref} role="group" aria-label="Billing period">
      <span className="et-toggle-pill" style={{ left: pill.left, width: pill.width }} />
      <button
        ref={monthRef}
        aria-pressed={value === 'month'}
        onClick={() => onChange('month')}
        type="button"
      >
        {monthlyLabel}
      </button>
      <button
        ref={yearRef}
        aria-pressed={value === 'year'}
        onClick={() => onChange('year')}
        type="button"
      >
        {yearlyLabel}{' '}
        <span
          style={{
            marginLeft: 6,
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 999,
            background: value === 'year' ? 'rgba(255,255,255,0.25)' : 'rgba(52, 211, 153, 0.13)',
            color: value === 'year' ? '#fff' : '#34d399',
          }}
        >
          {saveLabel}
        </span>
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Top nav
// -----------------------------------------------------------------------------

function TopNav({ locale, t }: { locale: string; t: ReturnType<typeof useTranslations<'landing'>> }) {
  const items = [
    { label: t('nav.courses'), href: '#courses' },
    { label: t('nav.categories'), href: '#categories' },
    { label: t('nav.tutors'), href: '#instructors' },
    { label: t('nav.pricing'), href: '#pricing' },
    { label: t('nav.about'), href: '#why' },
  ];
  return (
    <header className="et-topbar">
      <div className="et-row et-gap-10">
        <Link href={`/${locale}`} className="et-brand">
          <span className="et-mark">e</span>
          <span>easyeng</span>
        </Link>
        <nav className="et-nav" aria-label="Primary">
          {items.map((i) => (
            <a key={i.label} href={i.href}>
              {i.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="et-row et-gap-2">
        <LanguageSwitcher />
        <ThemeToggle className="et-iconbtn" />
        <button className="et-iconbtn" aria-label="Search" type="button">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
        </button>
        <Link href={`/${locale}/auth/login`} className="et-btn ghost">
          {t('nav.signIn')}
        </Link>
        <Link href={`/${locale}/auth/signup`} className="et-btn primary">
          {t('nav.getStarted')}
        </Link>
      </div>
    </header>
  );
}

// -----------------------------------------------------------------------------
// Hero
// -----------------------------------------------------------------------------

function Hero({ locale, t }: { locale: string; t: ReturnType<typeof useTranslations<'landing'>> }) {
  return (
    <section
      className="et-section"
      style={{ paddingTop: 64, paddingBottom: 80, overflow: 'hidden' }}
    >
      <div
        className="et-glow"
        style={{ width: 520, height: 520, background: '#7c5cff', top: -120, left: '10%' }}
      />
      <div
        className="et-glow"
        style={{ width: 460, height: 460, background: '#4c6bff', top: -80, right: '8%', opacity: 0.35 }}
      />
      <div
        className="et-glow"
        style={{ width: 360, height: 360, background: '#ec4899', bottom: -120, left: '40%', opacity: 0.18 }}
      />
      <div className="et-gridlines" />

      <div className="et-container" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div
            className="et-row et-gap-3"
            style={{
              padding: '6px 6px 6px 14px',
              background: 'linear-gradient(180deg, #1a2b6f 0%, #0d1a4a 100%)',
              border: '1px solid rgba(91, 141, 255, 0.35)',
              borderRadius: 999,
              fontSize: 13,
              color: 'var(--et-fg-2)',
            }}
          >
            <span className="et-row et-gap-2">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: 'var(--et-green)',
                  boxShadow: '0 0 10px var(--et-green)',
                }}
              />
              {t('hero.trusted')}
            </span>
            <span style={{ display: 'inline-flex' }}>
              {['A', 'M', 'S', 'K'].map((c, i) => (
                <span key={c} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  <Avatar initials={c} size={26} />
                </span>
              ))}
            </span>
          </div>
        </div>

        <h1 className="et-h1" style={{ maxWidth: 920, margin: '0 auto' }}>
          {t('hero.headline')} <span className="et-grad-text">{t('hero.headlineAccent')}</span>
        </h1>

        <p
          className="et-body"
          style={{ maxWidth: 640, margin: '22px auto 0', fontSize: 18 }}
        >
          {t('hero.subhead')}
        </p>

        <div
          className="et-row et-gap-3"
          style={{ justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}
        >
          <Link href={`/${locale}/auth/signup`} className="et-btn white lg" aria-label={t('hero.exploreCourses')}>
            {t('hero.exploreCourses')}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <a href="#pricing" className="et-btn outline lg" aria-label={t('hero.viewPricing')}>
            {t('hero.viewPricing')}
          </a>
        </div>

        <div
          className="et-row et-gap-6"
          style={{ justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}
        >
          <span
            className="et-row et-gap-2"
            style={{ color: 'var(--et-fg-2)', fontSize: 13 }}
          >
            <span style={{ color: 'var(--et-amber)', fontWeight: 600 }}>★ 4.8</span>
            <span className="et-tiny">{t('hero.fromReviews')}</span>
          </span>
          <span style={{ width: 1, height: 14, background: 'rgba(91, 141, 255, 0.20)' }} />
          <span
            className="et-row et-gap-2"
            style={{ color: 'var(--et-fg-2)', fontSize: 13 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            {t('hero.moneyBack')}
          </span>
          <span style={{ width: 1, height: 14, background: 'rgba(91, 141, 255, 0.20)' }} />
          <span
            className="et-row et-gap-2"
            style={{ color: 'var(--et-fg-2)', fontSize: 13 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7c5cff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
            </svg>
            {t('hero.lifetimeAccess')}
          </span>
        </div>

        <div
          className="et-quickstats"
          style={{
            marginTop: 64,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            background: 'linear-gradient(180deg, #11205a 0%, #0a1845 100%)',
            border: '1px solid rgba(91, 141, 255, 0.27)',
            borderRadius: 'var(--et-r-lg)',
            overflow: 'hidden',
            boxShadow: '0 30px 60px -30px rgba(0,0,0,0.40), 0 0 0 1px rgba(124, 92, 255, 0.06)',
          }}
        >
          {[
            { num: t('hero.stat1Num'), label: t('hero.stat1Label'), sub: t('hero.stat1Sub') },
            { num: t('hero.stat2Num'), label: t('hero.stat2Label'), sub: t('hero.stat2Sub') },
            { num: t('hero.stat3Num'), label: t('hero.stat3Label'), sub: t('hero.stat3Sub') },
            { num: t('hero.stat4Num'), label: t('hero.stat4Label'), sub: t('hero.stat4Sub') },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: '28px 24px',
                borderLeft: i === 0 ? '0' : '1px solid rgba(91, 141, 255, 0.13)',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  background: 'linear-gradient(135deg, #fff 0%, #a4c0ff 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {s.num}
              </div>
              <div
                className="et-meta"
                style={{ marginTop: 6, color: 'var(--et-fg-2)', fontWeight: 500 }}
              >
                {s.label}
              </div>
              <div className="et-tiny" style={{ marginTop: 2 }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Free Features Section
// -----------------------------------------------------------------------------

type FreeFeatureItem = { icon: string; title: string; desc: string; badge: string; href: string };

function FreeFeatureIcon({ kind }: { kind: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'check':
      return <svg viewBox="0 0 24 24" width="20" height="20" {...common}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>;
    case 'mic':
      return <svg viewBox="0 0 24 24" width="20" height="20" {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6" /></svg>;
    case 'book':
      return <svg viewBox="0 0 24 24" width="20" height="20" {...common}><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>;
    case 'path':
      return <svg viewBox="0 0 24 24" width="20" height="20" {...common}><circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /><path d="M5 17V7a2 2 0 012-2h10" /><path d="M10 19h9" /></svg>;
    case 'target':
      return <svg viewBox="0 0 24 24" width="20" height="20" {...common}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
    case 'chart':
      return <svg viewBox="0 0 24 24" width="20" height="20" {...common}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" width="20" height="20" {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

function FreeFeaturesSection({ locale, t }: { locale: string; t: ReturnType<typeof useTranslations<'landing'>> }) {
  const isVi = locale === 'vi';
  const COLORS = ['#7c5cff', '#34d399', '#4c6bff', '#ec4899', '#fbbf24', '#ff7a59'];

  const items: FreeFeatureItem[] = isVi ? [
    { icon: 'check', title: 'Kiểm tra ngữ pháp AI', desc: 'Phân tích câu tức thì, giải thích bằng tiếng Việt, gợi ý sửa lỗi thông minh.', badge: 'Không giới hạn', href: '/ai-tools' },
    { icon: 'mic', title: 'Phản hồi phát âm', desc: 'Thu âm giọng nói, nhận điểm phát âm và hướng dẫn cải thiện chi tiết.', badge: 'Không giới hạn', href: '/ai-tools' },
    { icon: 'book', title: 'Sổ từ vựng + Flashcard SRS', desc: 'Lưu từ mới, ôn tập theo thuật toán spaced-repetition để nhớ lâu hơn.', badge: 'Miễn phí', href: '/student/vocabulary' },
    { icon: 'path', title: 'Lộ trình học cá nhân hóa', desc: 'Hệ thống tự động thiết kế lộ trình A1→C2 theo mục tiêu và trình độ của bạn.', badge: 'Miễn phí', href: '/learning-path' },
    { icon: 'target', title: 'Mục tiêu học hàng tuần', desc: 'Đặt mục tiêu, theo dõi streak và nhận nhắc nhở để duy trì thói quen học.', badge: 'Miễn phí', href: '/dashboard' },
    { icon: 'chart', title: 'Báo cáo tiến độ', desc: 'Xem thống kê chi tiết: số từ học, thời gian luyện, điểm phát âm qua từng tháng.', badge: 'Miễn phí', href: '/student/report' },
  ] : [
    { icon: 'check', title: 'AI Grammar Checker', desc: 'Instant sentence analysis, plain-English explanations, smart correction suggestions.', badge: 'Unlimited', href: '/ai-tools' },
    { icon: 'mic', title: 'Pronunciation Feedback', desc: 'Record your voice, get a pronunciation score and detailed improvement guidance.', badge: 'Unlimited', href: '/ai-tools' },
    { icon: 'book', title: 'Vocabulary Notebook + SRS Flashcards', desc: 'Save new words, review with a spaced-repetition algorithm so they stick.', badge: 'Free', href: '/student/vocabulary' },
    { icon: 'path', title: 'Personalized Learning Path', desc: 'The system auto-designs an A1→C2 roadmap based on your goals and level.', badge: 'Free', href: '/learning-path' },
    { icon: 'target', title: 'Weekly Learning Goals', desc: 'Set targets, track your streak and get reminders to keep the habit going.', badge: 'Free', href: '/dashboard' },
    { icon: 'chart', title: 'Progress Report', desc: 'Detailed stats: words learned, practice time, pronunciation scores month over month.', badge: 'Free', href: '/student/report' },
  ];

  const ui = {
    eyebrow: isVi ? '100% miễn phí, không cần thẻ' : '100% free, no credit card',
    heading: isVi ? 'Bắt đầu ngay hôm nay.' : 'Start today.',
    headingAccent: isVi ? 'Không tốn một đồng.' : 'Spend nothing.',
    subhead: isVi
      ? '6 công cụ học tiếng Anh mạnh mẽ — hoàn toàn miễn phí mãi mãi. Không cần thẻ tín dụng, không cần cam kết.'
      : '6 powerful English learning tools — completely free forever. No credit card, no commitment.',
    startFree: isVi ? 'Tạo tài khoản miễn phí' : 'Create your free account',
    learnMore: isVi ? 'Xem tất cả tính năng' : 'See all features',
    tryIt: isVi ? 'Dùng thử →' : 'Try it →',
  };

  return (
    <section
      className="et-section et-section-free"
      id="free-features"
      style={{
        paddingTop: 64,
        paddingBottom: 64,
        borderTop: '1px solid var(--et-line)',
        borderBottom: '1px solid var(--et-line)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="et-glow" style={{ width: 520, height: 520, background: '#34d399', top: -160, right: '5%', opacity: 0.07 }} />
      <div className="et-glow" style={{ width: 420, height: 420, background: '#7c5cff', bottom: -120, left: '5%', opacity: 0.1 }} />

      <div className="et-container" style={{ position: 'relative' }}>
        <div className="et-col et-gap-4" style={{ alignItems: 'center', textAlign: 'center', marginBottom: 52 }}>
          <span
            className="et-chip"
            style={{
              background: 'rgba(52, 211, 153, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.08em',
              padding: '5px 14px',
            }}
          >
            {ui.eyebrow}
          </span>
          <h2 className="et-h2" style={{ maxWidth: 580 }}>
            {ui.heading}{' '}
            <span className="et-grad-text">{ui.headingAccent}</span>
          </h2>
          <p className="et-body" style={{ maxWidth: 520 }}>
            {ui.subhead}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 18,
            marginBottom: 40,
          }}
        >
          {items.map((item, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <Link
                key={item.title}
                href={`/${locale}${item.href}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div
                  className="et-card hoverable"
                  style={{
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    height: '100%',
                    cursor: 'pointer',
                  }}
                >
                  <div className="et-row et-gap-3" style={{ alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        flex: 'none',
                        borderRadius: 12,
                        background: `${color}1f`,
                        border: `1px solid ${color}55`,
                        display: 'grid',
                        placeItems: 'center',
                        color,
                      }}
                    >
                      <FreeFeatureIcon kind={item.icon} />
                    </div>
                    <div className="et-col" style={{ flex: 1, gap: 4 }}>
                      <div className="et-h3" style={{ fontSize: 15 }}>{item.title}</div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.07em',
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: `${color}18`,
                          color,
                          border: `1px solid ${color}40`,
                          alignSelf: 'flex-start',
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>
                  </div>
                  <p className="et-meta" style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>
                    {item.desc}
                  </p>
                  <div
                    className="et-row et-gap-2"
                    style={{ marginTop: 'auto', color, fontSize: 13, fontWeight: 500 }}
                  >
                    <span>{ui.tryIt}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="et-row et-gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={`/${locale}/auth/signup`} className="et-btn primary lg">
            {ui.startFree}
          </Link>
          <a href="#pricing" className="et-btn ghost lg">
            {ui.learnMore}
          </a>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Categories
// -----------------------------------------------------------------------------

type CategoryIcon =
  | 'speech'
  | 'case'
  | 'paper'
  | 'wave'
  | 'abc'
  | 'pen'
  | 'plane'
  | 'users';

function CategoryIconSvg({ kind, color }: { kind: CategoryIcon; color: string }) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (kind) {
    case 'speech':
      return (
        <svg viewBox="0 0 24 24" {...common} width="22" height="22">
          <path d="M4 6h16v10H8l-4 4z" />
          <path d="M8 11h8M8 14h5" />
        </svg>
      );
    case 'case':
      return (
        <svg viewBox="0 0 24 24" {...common} width="22" height="22">
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
          <path d="M3 13h18" />
        </svg>
      );
    case 'paper':
      return (
        <svg viewBox="0 0 24 24" {...common} width="22" height="22">
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h7M9 16h7M9 10h4" />
        </svg>
      );
    case 'wave':
      return (
        <svg viewBox="0 0 24 24" {...common} width="22" height="22">
          <path d="M3 12c2 0 2-6 4-6s2 12 4 12 2-8 4-8 2 4 4 4" />
        </svg>
      );
    case 'abc':
      return (
        <svg viewBox="0 0 24 24" {...common} width="22" height="22">
          <path d="M3 17l3-9 3 9" />
          <path d="M4 14h4" />
          <path d="M11 8h3a2 2 0 010 4h-3zM11 12h4a2.5 2.5 0 010 5h-4zM11 8v9" />
          <path d="M22 11a2.5 2.5 0 00-5 0v3a2.5 2.5 0 005 0" />
        </svg>
      );
    case 'pen':
      return (
        <svg viewBox="0 0 24 24" {...common} width="22" height="22">
          <path d="M4 20l4-1 11-11-3-3L5 16z" />
          <path d="M14 6l3 3" />
        </svg>
      );
    case 'plane':
      return (
        <svg viewBox="0 0 24 24" {...common} width="22" height="22">
          <path d="M3 13l18-7-7 18-2-7z" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" {...common} width="22" height="22">
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M3 19a6 6 0 0112 0" />
          <path d="M14 19a4 4 0 017-2.5" />
        </svg>
      );
  }
}

function Categories({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  const cats: { key: 'business' | 'ielts' | 'conversation' | 'grammar' | 'corporate' | 'pronunciation' | 'writing' | 'travel'; count: number; hue: string; icon: CategoryIcon }[] = [
    { key: 'business', count: 124, hue: '#4c6bff', icon: 'case' },
    { key: 'ielts', count: 86, hue: '#ec4899', icon: 'paper' },
    { key: 'conversation', count: 162, hue: '#7c5cff', icon: 'speech' },
    { key: 'grammar', count: 74, hue: '#34d399', icon: 'abc' },
    { key: 'corporate', count: 38, hue: '#fbbf24', icon: 'users' },
    { key: 'pronunciation', count: 52, hue: '#ff7a59', icon: 'wave' },
    { key: 'writing', count: 41, hue: '#a48bff', icon: 'pen' },
    { key: 'travel', count: 24, hue: '#22d3ee', icon: 'plane' },
  ];

  return (
    <section className="et-section" id="categories" style={{ paddingTop: 40 }}>
      <div className="et-container">
        <div
          className="et-row et-gap-4"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 40,
            flexWrap: 'wrap',
          }}
        >
          <div className="et-col et-gap-3">
            <span className="et-eyebrow">{t('categories.eyebrow')}</span>
            <h2 className="et-h2" style={{ maxWidth: 520 }}>
              {t('categories.heading')}
            </h2>
          </div>
          <a href="#" className="et-btn ghost" aria-label={t('categories.seeAll')}>
            {t('categories.seeAll')}
          </a>
        </div>

        <div
          className="et-grid-4"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
        >
          {cats.map((c) => (
            <a
              key={c.key}
              className="et-card hoverable"
              href="#"
              style={{
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                textDecoration: 'none',
                color: 'inherit',
                minHeight: 200,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${c.hue}1f`,
                  border: `1px solid ${c.hue}40`,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <CategoryIconSvg kind={c.icon} color={c.hue} />
              </div>
              <div className="et-col et-gap-2">
                <div className="et-h3">{t(`categories.items.${c.key}.name`)}</div>
                <div className="et-meta" style={{ lineHeight: 1.45 }}>
                  {t(`categories.items.${c.key}.blurb`)}
                </div>
              </div>
              <div
                className="et-row"
                style={{
                  marginTop: 'auto',
                  justifyContent: 'space-between',
                  color: c.hue,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span>{t('categories.coursesCount', { count: c.count })}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Featured courses
// -----------------------------------------------------------------------------

type CourseKey = 'course1' | 'course2' | 'course3' | 'course4' | 'course5' | 'course6';

type Course = {
  key: CourseKey;
  level: string;
  hours: number;
  lessons: number;
  teacher: string;
  teacherInitials: string;
  rating: number;
  reviews: number;
  price: number;
  oldPrice?: number;
  bestseller: boolean;
  imageLabel: string;
  accent: string;
};

function CourseCard({ course, t }: { course: Course; t: ReturnType<typeof useTranslations<'landing'>> }) {
  const title = t(`courses.items.${course.key}.title`);
  const tag = t(`courses.items.${course.key}.tag`);
  return (
    <article
      className="et-card hoverable"
      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ position: 'relative' }}>
        <ImageSlot label={course.imageLabel} height={170} accent={course.accent} />
        {course.bestseller && (
          <span className="et-badge" style={{ position: 'absolute', top: 12, left: 12 }}>
            {t('courses.bestseller')}
          </span>
        )}
        <span
          className="et-chip"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(10, 21, 56, 0.70)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {course.level}
        </span>
      </div>

      <div
        style={{
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
        }}
      >
        <div className="et-row et-gap-2" style={{ flexWrap: 'wrap' }}>
          <span className="et-chip violet">{tag}</span>
          <span className="et-tiny">
            {t('courses.hoursLessons', { hours: course.hours, lessons: course.lessons })}
          </span>
        </div>

        <h3 className="et-h3" style={{ lineHeight: 1.3 }}>
          {title}
        </h3>

        <div className="et-row et-gap-2" style={{ marginTop: 'auto' }}>
          <Avatar initials={course.teacherInitials} size={26} />
          <span className="et-meta">{course.teacher}</span>
        </div>

        <Stars value={course.rating} count={course.reviews} big />

        <div
          className="et-row et-gap-3"
          style={{
            alignItems: 'baseline',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTop: '1px solid var(--et-line)',
          }}
        >
          <div className="et-row et-gap-2" style={{ alignItems: 'baseline' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--et-fg)' }}>
              ${course.price}
            </span>
            {course.oldPrice && (
              <span
                style={{
                  fontSize: 14,
                  color: 'var(--et-fg-4)',
                  textDecoration: 'line-through',
                }}
              >
                ${course.oldPrice}
              </span>
            )}
          </div>
          <button
            className="et-btn sm secondary"
            aria-label={`${t('courses.enroll')} ${title}`}
            type="button"
          >
            {t('courses.enroll')}
          </button>
        </div>
      </div>
    </article>
  );
}

function Courses({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  const courses: Course[] = [
    {
      key: 'course1',
      level: 'A2–B1', hours: 14, lessons: 32,
      teacher: 'Maya Reyes', teacherInitials: 'MR',
      rating: 4.9, reviews: 4821, price: 49, oldPrice: 89, bestseller: true,
      imageLabel: 'course · conversation cover', accent: '#7c5cff',
    },
    {
      key: 'course2',
      level: 'B1–B2', hours: 18, lessons: 40,
      teacher: 'Daniel Cho', teacherInitials: 'DC',
      rating: 4.8, reviews: 3104, price: 59, oldPrice: 99, bestseller: true,
      imageLabel: 'course · business cover', accent: '#4c6bff',
    },
    {
      key: 'course3',
      level: 'B2–C1', hours: 22, lessons: 48,
      teacher: 'Priya Nair', teacherInitials: 'PN',
      rating: 4.9, reviews: 5910, price: 79, oldPrice: 129, bestseller: false,
      imageLabel: 'course · IELTS cover', accent: '#ec4899',
    },
    {
      key: 'course4',
      level: 'A2–C1', hours: 10, lessons: 24,
      teacher: 'Sam Okafor', teacherInitials: 'SO',
      rating: 4.7, reviews: 1822, price: 39, oldPrice: 69, bestseller: false,
      imageLabel: 'course · pronunciation cover', accent: '#ff7a59',
    },
    {
      key: 'course5',
      level: 'A1–B1', hours: 12, lessons: 28,
      teacher: 'Linda Park', teacherInitials: 'LP',
      rating: 4.8, reviews: 2390, price: 44, oldPrice: 79, bestseller: false,
      imageLabel: 'course · grammar cover', accent: '#34d399',
    },
    {
      key: 'course6',
      level: 'B1–C1', hours: 16, lessons: 36,
      teacher: 'Owen Hart', teacherInitials: 'OH',
      rating: 4.7, reviews: 1455, price: 54, oldPrice: 89, bestseller: false,
      imageLabel: 'course · writing cover', accent: '#fbbf24',
    },
  ];

  const filterAll = t('courses.filterAll');
  const filterTags = [
    filterAll,
    t('courses.items.course1.tag'),
    t('courses.items.course2.tag'),
    t('courses.items.course3.tag'),
    t('courses.items.course4.tag'),
    t('courses.items.course5.tag'),
    t('courses.items.course6.tag'),
  ];
  // Deduplicate while preserving order
  const filters = filterTags.filter((f, i) => filterTags.indexOf(f) === i);

  const [filter, setFilter] = React.useState(filterAll);
  const shown = filter === filterAll
    ? courses
    : courses.filter((c) => t(`courses.items.${c.key}.tag`) === filter);

  return (
    <section className="et-section" id="courses" style={{ paddingTop: 32 }}>
      <div className="et-container">
        <div
          className="et-row et-gap-4"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          <div className="et-col et-gap-3">
            <span className="et-eyebrow">{t('courses.eyebrow')}</span>
            <h2 className="et-h2" style={{ maxWidth: 520 }}>
              {t('courses.heading')}
            </h2>
          </div>
          <div
            className="et-row et-gap-2"
            style={{ flexWrap: 'wrap' }}
            role="tablist"
            aria-label="Filter courses by category"
          >
            {filters.map((f) => (
              <button
                key={f}
                className={`et-btn sm ${f === filter ? 'primary' : 'secondary'}`}
                onClick={() => setFilter(f)}
                role="tab"
                aria-selected={f === filter}
                type="button"
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div
          className="et-grid-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
        >
          {shown.map((c) => (
            <CourseCard key={c.key} course={c} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Why (dual column + dashboard mockup)
// -----------------------------------------------------------------------------

function WhyEasyEng({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  const pillars = [
    {
      title: t('why.pillar1Title'),
      desc: t('why.pillar1Desc'),
      ring: '#7c5cff',
      icon: (
        <path
          d="M12 8v5l3 2"
          stroke="#7c5cff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
    {
      title: t('why.pillar2Title'),
      desc: t('why.pillar2Desc'),
      ring: '#4c6bff',
      icon: (
        <path
          d="M5 12l4 4 10-10"
          stroke="#4c6bff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
    {
      title: t('why.pillar3Title'),
      desc: t('why.pillar3Desc'),
      ring: '#ec4899',
      icon: (
        <path
          d="M12 4a4 4 0 014 4v4a4 4 0 01-8 0V8a4 4 0 014-4zM6 12a6 6 0 0012 0M12 18v3"
          stroke="#ec4899"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ),
    },
    {
      title: t('why.pillar4Title'),
      desc: t('why.pillar4Desc'),
      ring: '#34d399',
      icon: (
        <>
          <circle cx="12" cy="9" r="5" stroke="#34d399" strokeWidth="2" fill="none" />
          <path
            d="M9 14l-2 7 5-3 5 3-2-7"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      ),
    },
  ];

  return (
    <section className="et-section" id="why" style={{ paddingTop: 32 }}>
      <div className="et-container">
        <div
          className="et-why-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: 56,
            alignItems: 'center',
          }}
        >
          <div className="et-col et-gap-6">
            <div className="et-col et-gap-3">
              <span className="et-eyebrow">{t('why.eyebrow')}</span>
              <h2 className="et-h2" style={{ maxWidth: 460 }}>
                {t('why.heading')} <span className="et-grad-text">{t('why.headingAccent')}</span>
              </h2>
            </div>
            <div className="et-col et-gap-5">
              {pillars.map((p) => (
                <div
                  key={p.title}
                  className="et-row et-gap-4"
                  style={{ alignItems: 'flex-start' }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      flex: 'none',
                      borderRadius: 12,
                      background: `${p.ring}1f`,
                      border: `1px solid ${p.ring}55`,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      {p.icon}
                    </svg>
                  </div>
                  <div className="et-col et-gap-2">
                    <div className="et-h3">{p.title}</div>
                    <div
                      className="et-meta"
                      style={{ fontSize: 14, lineHeight: 1.55, maxWidth: 440 }}
                    >
                      {p.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DashboardMock t={t} />
        </div>
      </div>
    </section>
  );
}

function DashboardMock({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  return (
    <div style={{ position: 'relative' }}>
      <div
        className="et-glow"
        style={{ width: 380, height: 380, background: '#7c5cff', top: -40, right: -40, opacity: 0.35 }}
      />
      <div
        className="et-glow"
        style={{ width: 320, height: 320, background: '#4c6bff', bottom: -40, left: -40, opacity: 0.28 }}
      />

      <div
        className="et-card"
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #11205a 0%, #0a1845 100%)',
          border: '1px solid rgba(91, 141, 255, 0.27)',
          boxShadow: '0 40px 80px -30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(91, 141, 255, 0.13)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: 'var(--et-fg-4)',
            fontFamily: 'var(--et-mono)',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#ff5f56' }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#ffbd2e' }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#27c93f' }} />
          <span style={{ marginLeft: 12, letterSpacing: '0.1em' }}>easyeng.app / dashboard</span>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="et-row" style={{ justifyContent: 'space-between' }}>
            <div className="et-col et-gap-2">
              <div className="et-meta" style={{ fontSize: 12 }}>
                {t('why.mock.welcomeBack')}
              </div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>Aisha Patel</div>
            </div>
            <div className="et-row et-gap-2">
              <span className="et-chip green dot">Online</span>
              <Avatar initials="AP" size={36} />
            </div>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #7c5cff 0%, #4c6bff 100%)',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              className="et-row"
              style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div className="et-col et-gap-2">
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--et-mono)',
                  }}
                >
                  {t('why.mock.currentLevel')}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em' }}>
                  B2 · Upper-Inter
                </div>
              </div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  background: 'conic-gradient(#fff 252deg, rgba(255,255,255,0.20) 252deg)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: '#5b73e8',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  70%
                </div>
              </div>
            </div>
            <div
              className="et-row"
              style={{
                justifyContent: 'space-between',
                marginTop: 14,
                fontSize: 12,
                opacity: 0.85,
              }}
            >
              <span>4,820 XP</span>
              <span>5,800 {t('why.mock.toNext')}</span>
            </div>
            <div
              style={{
                height: 6,
                marginTop: 6,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.16)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '70%',
                  height: '100%',
                  background: '#fff',
                  borderRadius: 999,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: t('why.mock.streak'), value: '32', unit: t('why.mock.days'), color: '#fbbf24' },
              { label: t('why.mock.hours'), value: '127', unit: t('why.mock.thisMonth'), color: '#34d399' },
              { label: t('why.mock.accuracy'), value: '91', unit: '%', color: '#7c5cff' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: '#0a1538',
                  border: '1px solid rgba(91, 141, 255, 0.13)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--et-fg-4)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--et-mono)',
                  }}
                >
                  {s.label}
                </div>
                <div
                  className="et-row et-gap-2"
                  style={{ alignItems: 'baseline', marginTop: 4 }}
                >
                  <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: 'var(--et-fg-3)' }}>{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="et-col et-gap-2">
            <div className="et-row" style={{ justifyContent: 'space-between' }}>
              <div
                className="et-meta"
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--et-fg-2)' }}
              >
                {t('why.mock.todayLessons')}
              </div>
              <div className="et-tiny">{t('why.mock.scheduled')}</div>
            </div>
            {[
              { time: '09:00', title: 'Speaking · Job interviews', with: 'Daniel Cho', done: true },
              { time: '13:30', title: 'Listening · BBC podcast unit 4', with: 'Self-study', done: false },
              { time: '18:00', title: '1:1 · Pronunciation drill', with: 'Maya Reyes', done: false },
            ].map((l, i) => (
              <div
                key={i}
                className="et-row et-gap-3"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: '#0a1538',
                  border: '1px solid rgba(91, 141, 255, 0.13)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: l.done ? 'rgba(52, 211, 153, 0.13)' : 'rgba(124, 92, 255, 0.13)',
                    color: l.done ? '#34d399' : '#a48bff',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--et-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {l.time}
                </div>
                <div className="et-col" style={{ flex: 1, gap: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--et-fg)' }}>
                    {l.title}
                  </div>
                  <div className="et-tiny">{l.with}</div>
                </div>
                {l.done && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: -16,
          left: -20,
          padding: '10px 14px',
          borderRadius: 12,
          background: 'linear-gradient(180deg, #11205a 0%, #0a1845 100%)',
          border: '1px solid rgba(91, 141, 255, 0.40)',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.38)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1a1102"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
          </svg>
        </div>
        <div className="et-col" style={{ gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t('why.mock.certified')}</div>
          <div className="et-tiny">{t('why.mock.verified')}</div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Instructors
// -----------------------------------------------------------------------------

function Instructors({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  const teachers = [
    { name: 'Maya Reyes',    initials: 'MR', role: 'Conversation · A2–C1', students: 24820, courses: 12, rating: 4.9, country: '🇵🇭 Manila',     accent: '#7c5cff' },
    { name: 'Daniel Cho',    initials: 'DC', role: 'Business English',     students: 18430, courses: 9,  rating: 4.8, country: '🇰🇷 Seoul',      accent: '#4c6bff' },
    { name: 'Priya Nair',    initials: 'PN', role: 'IELTS · TOEFL',        students: 31200, courses: 7,  rating: 4.9, country: '🇮🇳 Bangalore',  accent: '#ec4899' },
    { name: 'Sam Okafor',    initials: 'SO', role: 'Pronunciation coach',  students: 9210,  courses: 5,  rating: 4.7, country: '🇬🇧 London',     accent: '#ff7a59' },
  ];

  return (
    <section
      className="et-section"
      id="instructors"
      style={{ paddingTop: 32, paddingBottom: 80 }}
    >
      <div className="et-container">
        <div
          className="et-row et-gap-4"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 40,
            flexWrap: 'wrap',
          }}
        >
          <div className="et-col et-gap-3">
            <span className="et-eyebrow">{t('instructors.eyebrow')}</span>
            <h2 className="et-h2" style={{ maxWidth: 580 }}>
              {t('instructors.heading')}
            </h2>
          </div>
          <a href="#" className="et-btn ghost" aria-label={t('instructors.browseAll')}>
            {t('instructors.browseAll')}
          </a>
        </div>

        <div
          className="et-grid-4"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}
        >
          {teachers.map((teacher) => (
            <div
              key={teacher.name}
              className="et-card hoverable"
              style={{
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 14,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -40,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 200,
                  height: 120,
                  background: `radial-gradient(ellipse at center top, ${teacher.accent}55, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'relative', marginTop: 8 }}>
                <Avatar
                  initials={teacher.initials}
                  size={84}
                  gradient={`linear-gradient(135deg, ${teacher.accent}, #4c6bff)`}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: 'var(--et-green)',
                    border: '3px solid var(--et-bg-2)',
                  }}
                  title={t('instructors.onlineNow')}
                />
              </div>

              <div className="et-col et-gap-2" style={{ alignItems: 'center' }}>
                <div className="et-h3">{teacher.name}</div>
                <div className="et-meta">{teacher.role}</div>
                <div className="et-tiny">{teacher.country}</div>
              </div>

              <Stars value={teacher.rating} big />

              <div style={{ width: '100%', height: 1, background: 'var(--et-line)' }} />

              <div className="et-row" style={{ width: '100%', justifyContent: 'space-around' }}>
                <div className="et-col et-gap-2" style={{ alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>
                    {(teacher.students / 1000).toFixed(1)}k
                  </span>
                  <span className="et-tiny">{t('instructors.students')}</span>
                </div>
                <div style={{ width: 1, background: 'var(--et-line)' }} />
                <div className="et-col et-gap-2" style={{ alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{teacher.courses}</span>
                  <span className="et-tiny">{t('instructors.coursesLabel')}</span>
                </div>
              </div>

              <button
                className="et-btn secondary sm"
                style={{ width: '100%' }}
                aria-label={`${t('instructors.viewProfile')} ${teacher.name}`}
                type="button"
              >
                {t('instructors.viewProfile')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Testimonials
// -----------------------------------------------------------------------------

function Testimonials({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  const stories: { key: 't1' | 't2' | 't3'; accent: string }[] = [
    { key: 't1', accent: '#7c5cff' },
    { key: 't2', accent: '#4c6bff' },
    { key: 't3', accent: '#ec4899' },
  ];

  return (
    <section className="et-section" id="testimonials" style={{ paddingTop: 32 }}>
      <div className="et-container">
        <div
          className="et-col et-gap-3"
          style={{ alignItems: 'center', textAlign: 'center', marginBottom: 48 }}
        >
          <span className="et-eyebrow">{t('testimonials.eyebrow')}</span>
          <h2 className="et-h2" style={{ maxWidth: 640 }}>
            {t('testimonials.heading')}
          </h2>
          <p className="et-body" style={{ maxWidth: 520 }}>
            {t('testimonials.subhead')}
          </p>
        </div>

        <div
          className="et-grid-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
        >
          {stories.map((s) => (
            <article
              key={s.key}
              className="et-card"
              style={{
                padding: 26,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -10,
                  fontSize: 140,
                  fontWeight: 700,
                  color: `${s.accent}14`,
                  lineHeight: 1,
                  fontFamily: 'Georgia, serif',
                  pointerEvents: 'none',
                }}
                aria-hidden
              >
                &ldquo;
              </div>

              <span
                className="et-chip"
                style={{
                  background: `${s.accent}1f`,
                  color: s.accent,
                  border: `1px solid ${s.accent}55`,
                  alignSelf: 'flex-start',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {t(`testimonials.items.${s.key}.tag`)}
              </span>

              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--et-fg)',
                  margin: 0,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                &ldquo;{t(`testimonials.items.${s.key}.quote`)}&rdquo;
              </p>

              <div
                className="et-row et-gap-3"
                style={{
                  marginTop: 'auto',
                  paddingTop: 16,
                  borderTop: '1px solid rgba(91, 141, 255, 0.13)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Avatar
                  initials={t(`testimonials.items.${s.key}.name`).split(' ').map((n: string) => n[0]).join('')}
                  size={44}
                  gradient={`linear-gradient(135deg, ${s.accent}, #4c6bff)`}
                />
                <div className="et-col" style={{ gap: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t(`testimonials.items.${s.key}.name`)}</div>
                  <div className="et-tiny" style={{ color: s.accent }}>
                    {t(`testimonials.items.${s.key}.role`)}
                  </div>
                  <div className="et-tiny">{t(`testimonials.items.${s.key}.country`)}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Pricing
// -----------------------------------------------------------------------------

function Pricing({ locale, t }: { locale: string; t: ReturnType<typeof useTranslations<'landing'>> }) {
  const [period, setPeriod] = React.useState<'month' | 'year'>('year');

  type TierKey = 'free' | 'pro' | 'team';
  const tiers: { key: TierKey; monthly: number; yearly: number; highlighted: boolean; perSeat: boolean; salesContact: boolean }[] = [
    { key: 'free', monthly: 0, yearly: 0, highlighted: false, perSeat: false, salesContact: false },
    { key: 'pro', monthly: 29, yearly: 24, highlighted: true, perSeat: false, salesContact: false },
    { key: 'team', monthly: 19, yearly: 16, highlighted: false, perSeat: true, salesContact: true },
  ];

  return (
    <section
      className="et-section"
      id="pricing"
      style={{ paddingTop: 40, paddingBottom: 80 }}
    >
      <div className="et-container">
        <div
          className="et-col et-gap-4"
          style={{ alignItems: 'center', textAlign: 'center', marginBottom: 40 }}
        >
          <span className="et-eyebrow">{t('pricing.eyebrow')}</span>
          <h2 className="et-h2" style={{ maxWidth: 640 }}>
            {t('pricing.heading')}
          </h2>
          <p className="et-body" style={{ maxWidth: 520 }}>
            {t('pricing.subhead')}
          </p>
          <div style={{ marginTop: 8 }}>
            <PricingToggle
              value={period}
              onChange={setPeriod}
              monthlyLabel={t('pricing.monthly')}
              yearlyLabel={t('pricing.yearly')}
              saveLabel={t('pricing.savePercent')}
            />
          </div>
        </div>

        <div
          className="et-grid-3"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
        >
          {tiers.map((tier) => {
            const price = period === 'year' ? tier.yearly : tier.monthly;
            const isFree = price === 0;
            const perSeatStr = tier.perSeat ? t('pricing.perSeatSuffix') : '';
            const billed = isFree
              ? t('pricing.noCard')
              : period === 'year'
              ? t('pricing.billedYearly', { amount: tier.yearly * 12, perSeat: perSeatStr })
              : t('pricing.billedMonthly', { perSeat: perSeatStr });

            const features = t.raw(`pricing.tiers.${tier.key}.features`) as string[];

            const cardStyle: React.CSSProperties = {
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              position: 'relative',
              ...(tier.highlighted
                ? {
                    background: 'linear-gradient(180deg, #1d2762 0%, #111d49 100%)',
                    border: '1px solid rgba(124, 92, 255, 0.50)',
                    boxShadow:
                      '0 30px 60px -30px rgba(124, 92, 255, 0.50), 0 0 0 1px rgba(124, 92, 255, 0.25)',
                  }
                : {}),
            };
            return (
              <div key={tier.key} className="et-card" style={cardStyle}>
                {tier.highlighted && (
                  <span
                    className="et-chip"
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: 24,
                      background: 'linear-gradient(135deg, #7c5cff, #4c6bff)',
                      color: '#fff',
                      border: 0,
                      boxShadow: '0 8px 20px -6px rgba(124, 92, 255, 0.68)',
                    }}
                  >
                    {t('pricing.mostPopular')}
                  </span>
                )}

                <div className="et-col et-gap-2">
                  <div className="et-h3" style={{ fontSize: 17 }}>
                    {t(`pricing.tiers.${tier.key}.name`)}
                  </div>
                  <div className="et-meta">{t(`pricing.tiers.${tier.key}.blurb`)}</div>
                </div>

                <div className="et-row et-gap-2" style={{ alignItems: 'baseline' }}>
                  <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em' }}>
                    {isFree ? '$0' : `$${price}`}
                  </span>
                  <span className="et-meta">
                    {isFree ? '' : tier.perSeat ? t('pricing.perSeatPerMo') : t('pricing.perMonth')}
                  </span>
                </div>
                <div className="et-tiny" style={{ marginTop: -10 }}>
                  {billed}
                </div>

                {tier.salesContact ? (
                  <a
                    href="mailto:sales@easyeng.app"
                    className={`et-btn ${tier.highlighted ? 'primary' : 'secondary'} lg`}
                    aria-label={`${t(`pricing.tiers.${tier.key}.cta`)}`}
                  >
                    {t(`pricing.tiers.${tier.key}.cta`)}
                  </a>
                ) : (
                  <Link
                    href={`/${locale}/auth/signup`}
                    className={`et-btn ${tier.highlighted ? 'primary' : 'secondary'} lg`}
                    aria-label={`${t(`pricing.tiers.${tier.key}.cta`)}`}
                  >
                    {t(`pricing.tiers.${tier.key}.cta`)}
                  </Link>
                )}

                <div
                  style={{ height: 1, background: 'var(--et-line)', margin: '4px 0' }}
                />

                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {features.map((f) => (
                    <li
                      key={f}
                      className="et-row et-gap-3"
                      style={{
                        fontSize: 14,
                        color: 'var(--et-fg-2)',
                        alignItems: 'flex-start',
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={tier.highlighted ? '#a48bff' : '#34d399'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flex: 'none', marginTop: 2 }}
                      >
                        <path d="M5 12l4.5 4.5L19 7.5" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Final CTA
// -----------------------------------------------------------------------------

function FinalCTA({ locale, t }: { locale: string; t: ReturnType<typeof useTranslations<'landing'>> }) {
  return (
    <section className="et-section" style={{ paddingTop: 0, paddingBottom: 64 }}>
      <div className="et-container">
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '64px 56px',
            borderRadius: 'var(--et-r-xl)',
            background:
              'radial-gradient(circle at 20% 30%, rgba(124, 92, 255, 0.33), transparent 50%), radial-gradient(circle at 80% 70%, rgba(76, 107, 255, 0.33), transparent 50%), linear-gradient(180deg, #1d2762 0%, #11205a 100%)',
            border: '1px solid rgba(124, 92, 255, 0.33)',
            textAlign: 'center',
            boxShadow: '0 40px 80px -30px rgba(124, 92, 255, 0.25)',
          }}
        >
          <div className="et-gridlines" style={{ opacity: 0.5 }} />

          <div style={{ position: 'relative' }}>
            <h2 className="et-h2" style={{ maxWidth: 680, margin: '0 auto', fontSize: 44 }}>
              {t('cta.heading')}{' '}
              <span className="et-grad-text">{t('cta.headingAccent')}</span>
            </h2>
            <p
              className="et-body"
              style={{ maxWidth: 520, margin: '16px auto 0', fontSize: 16 }}
            >
              {t('cta.subhead')}
            </p>
            <div
              className="et-row et-gap-3"
              style={{ justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}
            >
              <Link
                href={`/${locale}/auth/signup`}
                className="et-btn white lg"
                aria-label={t('cta.startFree')}
              >
                {t('cta.startFree')}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a
                href="mailto:sales@easyeng.app"
                className="et-btn outline lg"
                aria-label={t('cta.talkSales')}
              >
                {t('cta.talkSales')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Footer
// -----------------------------------------------------------------------------

function AppBadge({ kind, t }: { kind: 'ios' | 'android'; t: ReturnType<typeof useTranslations<'landing'>> }) {
  const isIOS = kind === 'ios';
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href="#"
      aria-label={isIOS ? t('footer.downloadIOS') : t('footer.downloadAndroid')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: hover ? '#15235e' : '#0a1538',
        border: `1px solid ${hover ? 'rgba(91, 141, 255, 0.40)' : 'rgba(91, 141, 255, 0.20)'}`,
        width: 168,
        textDecoration: 'none',
        color: 'var(--et-fg)',
        transition: 'background .15s, border-color .15s',
      }}
    >
      {isIOS ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.9.8 3.1.8 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1-.1-2.7-1-2.7-4.1zM14.3 5.6c.6-.8 1.1-1.9 1-3-.9.1-2 .6-2.6 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2-.5 2.6-1.3z" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3.6 2.8C3.2 3 3 3.5 3 4.2v15.6c0 .7.2 1.2.6 1.4l9-9-9-9.4z" fill="#34d399" />
          <path d="M12.6 11l-9 9c.3.2.7.2 1.1 0l10.6-6-2.7-3z" fill="#fbbf24" />
          <path d="M3.6 2.8l9 9.2 2.7-3-10.6-6c-.4-.3-.8-.3-1.1-.2z" fill="#4c6bff" />
          <path d="M15.3 14l3-1.7c1-.5 1-1.5 0-2L15.3 9l-2.7 2.5L15.3 14z" fill="#ec4899" />
        </svg>
      )}
      <div className="et-col" style={{ gap: 0 }}>
        <span
          style={{
            fontSize: 9,
            color: 'var(--et-fg-3)',
            lineHeight: 1.2,
            letterSpacing: '0.04em',
          }}
        >
          {isIOS ? t('footer.iosPreLabel') : t('footer.androidPreLabel')}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
          {isIOS ? t('footer.iosLabel') : t('footer.androidLabel')}
        </span>
      </div>
    </a>
  );
}

function Footer({ t }: { t: ReturnType<typeof useTranslations<'landing'>> }) {
  const colKeys: Array<'categories' | 'company' | 'support'> = ['categories', 'company', 'support'];

  return (
    <footer
      style={{
        position: 'relative',
        borderTop: '1px solid rgba(91, 141, 255, 0.13)',
        background: 'linear-gradient(180deg, #060f33 0%, #050a26 100%)',
        paddingTop: 64,
        paddingBottom: 32,
      }}
    >
      <div className="et-container">
        <div
          className="et-footer-grid"
          style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 40 }}
        >
          <div className="et-col et-gap-4">
            <div className="et-brand">
              <span className="et-mark">e</span>
              <span>easyeng</span>
            </div>
            <p className="et-meta" style={{ maxWidth: 280, lineHeight: 1.55 }}>
              {t('footer.tagline')}
            </p>

            <div className="et-col et-gap-2" style={{ marginTop: 6 }}>
              <AppBadge kind="ios" t={t} />
              <AppBadge kind="android" t={t} />
            </div>
          </div>

          {colKeys.map((colKey) => {
            const links = t.raw(`footer.cols.${colKey}.links`) as string[];
            return (
              <div key={colKey} className="et-col et-gap-3">
                <div className="et-eyebrow">{t(`footer.cols.${colKey}.title`)}</div>
                <div className="et-col" style={{ gap: 10, marginTop: 4 }}>
                  {links.map((link) => (
                    <a
                      key={link}
                      href="#"
                      style={{
                        fontSize: 14,
                        color: 'var(--et-fg-2)',
                        textDecoration: 'none',
                      }}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: '1px solid rgba(91, 141, 255, 0.13)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <span className="et-tiny">{t('footer.copyright')}</span>
          <div className="et-row et-gap-4">
            {['Twitter', 'LinkedIn', 'Instagram', 'YouTube'].map((s) => (
              <a
                key={s}
                href="#"
                className="et-tiny"
                style={{ textDecoration: 'none', color: 'var(--et-fg-3)' }}
              >
                {s}
              </a>
            ))}
          </div>
          <span className="et-tiny">{t('footer.locale')}</span>
        </div>
      </div>
    </footer>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function HomePage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';
  const t = useTranslations('landing');

  return (
    <div className="edtech bright" style={{ minHeight: '100vh' }}>
      <TopNav locale={locale} t={t} />
      <main id="main-content">
        <Hero locale={locale} t={t} />
        <FreeFeaturesSection locale={locale} t={t} />
        <Categories t={t} />
        <Courses t={t} />
        <WhyEasyEng t={t} />
        <Instructors t={t} />
        <Testimonials t={t} />
        <Pricing locale={locale} t={t} />
        <FinalCTA locale={locale} t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}
