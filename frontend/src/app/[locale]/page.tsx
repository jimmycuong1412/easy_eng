'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import { LanguageSwitcher } from '@/components/common';
import {
  ArrowRIcon,
  BookIcon,
  MicIcon,
  CheckIcon,
  FlameIcon,
  FlagIcon,
  PinIcon,
} from '@/components/editorial/Icons';

export default function HomePage() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  return (
    <div className="ed-frame">
      {/* Editorial Top Bar — public */}
      <header className="ed-topbar" style={{ gridTemplateColumns: '220px 1fr auto' }}>
        <Link href={`/${locale}`} className="ed-brand">
          <span className="ed-brand-mark">e</span>
          <span>easyeng</span>
        </Link>

        <nav className="ed-topnav" aria-label="Public navigation">
          <a href="#why">Why EasyEng</a>
          <a href="#how">How it works</a>
          <a href="#tutors">Tutors</a>
          <a href="#stories">Stories</a>
        </nav>

        <div className="ed-topright" style={{ gap: 14 }}>
          <LanguageSwitcher />
          <Link href={`/${locale}/auth/login`} className="ed-btn ed-btn-ghost">
            Log in
          </Link>
          <Link href={`/${locale}/auth/signup`} className="ed-btn ed-btn-primary">
            Start free <ArrowRIcon />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="ed-content" id="main-content">
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 1fr',
            gap: 48,
            alignItems: 'center',
            paddingTop: 32,
          }}
        >
          <div>
            <p className="ed-eyebrow">A new way to learn English · Volume 12</p>
            <h1
              className="ed-display"
              style={{
                fontSize: 'clamp(48px, 6.5vw, 88px)',
                marginTop: 14,
                marginBottom: 0,
              }}
            >
              The shape of <em style={{ color: 'var(--ed-coral-ink)', fontStyle: 'italic' }}>your</em> English,
              <br />
              redrawn each week.
            </h1>
            <p
              className="ed-body"
              style={{
                marginTop: 22,
                fontSize: 17,
                lineHeight: 1.6,
                maxWidth: 540,
              }}
            >
              {t('tagline') || 'Learn English more fun with Gem rewards, Career Avatars and live video classes'}
              {'. '}
              Tutors who notice. Lessons that build. Progress you can read like a journal.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap' }}>
              <Link href={`/${locale}/auth/signup`} className="ed-btn ed-btn-primary ed-btn-lg">
                {t('startFree') || 'Start for free'} <ArrowRIcon />
              </Link>
              <Link href={`/${locale}/auth/login`} className="ed-btn ed-btn-lg">
                {t('login') || 'Log in'}
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 22, marginTop: 28, flexWrap: 'wrap' }}>
              <span className="ed-tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckIcon /> No card required
              </span>
              <span className="ed-tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckIcon /> Cancel anytime
              </span>
              <span className="ed-tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckIcon /> Live tutors, not bots
              </span>
            </div>
          </div>

          {/* Hero ink panel — featured story */}
          <aside className="ed-ink-panel" style={{ padding: 32 }}>
            <p
              className="ed-label"
              style={{
                fontFamily: 'var(--ed-mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#B5BEDF',
              }}
            >
              Featured · Reading room
            </p>
            <p
              className="ed-serif"
              style={{
                fontSize: 30,
                marginTop: 14,
                color: '#F4EFE2',
                lineHeight: 1.1,
                letterSpacing: '-0.018em',
              }}
            >
              &ldquo;Last week I was searching for words. This week the words come to me.&rdquo;
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="ed-avatar-md"
                style={{
                  background: 'linear-gradient(135deg, #2A3F7A, #5C6A92)',
                  color: '#F4EFE2',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                NA
              </div>
              <div>
                <p
                  style={{
                    color: '#F4EFE2',
                    fontFamily: 'var(--ed-sans)',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Nguyen An, 24
                </p>
                <p style={{ color: '#B5BEDF', fontFamily: 'var(--ed-sans)', fontSize: 12 }}>
                  Software engineer · Hanoi · 12 weeks in
                </p>
              </div>
            </div>
          </aside>
        </section>

        <hr className="ed-divider" style={{ marginTop: 56 }} />

        {/* Why EasyEng — three-up feature row */}
        <section id="why" style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
            <h2 className="ed-h1" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Why we made it.
            </h2>
            <p className="ed-eyebrow">No. 01 · Principles</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 22,
            }}
          >
            <FeatureColumn
              eyebrow="Practice, not theory"
              title="Speak from day one."
              body="Live 1-on-1 sessions with native and fluent tutors. We narrow the gap between knowing a word and using it."
              icon={<MicIcon />}
            />
            <FeatureColumn
              eyebrow="Progress you can see"
              title="A book, written about you."
              body="Every lesson adds a page: vocabulary, recurring mistakes, breakthroughs. Read it back any week."
              icon={<BookIcon />}
            />
            <FeatureColumn
              eyebrow="Gem rewards"
              title="Earn discounts as you learn."
              body="Complete classes, build streaks, refer friends — collect gems and trade them for booking discounts."
              icon={<FlameIcon />}
            />
          </div>
        </section>

        <hr className="ed-divider" style={{ marginTop: 60 }} />

        {/* How it works — three steps */}
        <section id="how" style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
            <h2 className="ed-h1" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              How it works.
            </h2>
            <p className="ed-eyebrow">No. 02 · Method</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 22,
            }}
          >
            <StepCard
              num="I"
              title="Tell us your goal"
              body="A 3-minute placement. You speak; we listen. Then we suggest a path."
            />
            <StepCard
              num="II"
              title="Pick a tutor"
              body="Filter by accent, focus, time. See who's online now and book a 25- or 50-minute session."
            />
            <StepCard
              num="III"
              title="Show up, week after week"
              body="Your tutor takes notes. Your progress journal updates. Your gems pile up. Repeat."
            />
          </div>
        </section>

        <hr className="ed-divider" style={{ marginTop: 60 }} />

        {/* Tutors strip */}
        <section id="tutors" style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
            <h2 className="ed-h1" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Tutors who notice.
            </h2>
            <Link href={`/${locale}/book`} className="ed-linkpair">
              See all tutors <ArrowRIcon />
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 18,
            }}
          >
            <TutorCard name="Maria Rojas" loc="Buenos Aires" focus="Conversational, B1–C1" rate="$24/h" initials="MR" />
            <TutorCard name="Daniel Brooks" loc="Manchester" focus="IELTS, business" rate="$28/h" initials="DB" />
            <TutorCard name="Aiko Tanaka" loc="Kyoto" focus="Pronunciation, A2–B2" rate="$22/h" initials="AT" />
            <TutorCard name="Samuel Owusu" loc="Accra" focus="Test prep, fluency" rate="$20/h" initials="SO" />
          </div>
        </section>

        <hr className="ed-divider" style={{ marginTop: 60 }} />

        {/* Numbers — ink panel */}
        <section style={{ marginTop: 48 }}>
          <div className="ed-ink-panel" style={{ padding: '40px 36px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
              <p
                className="ed-label"
                style={{
                  fontFamily: 'var(--ed-mono)',
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#B5BEDF',
                }}
              >
                This year, in numbers
              </p>
              <p className="ed-eyebrow" style={{ color: '#B5BEDF' }}>No. 03 · Receipts</p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 28,
              }}
            >
              <BigNumber label="Sessions taught" num="148,200" />
              <BigNumber label="Tutors on roster" num="3,400" />
              <BigNumber label="Avg. tutor rating" num="4.92" suffix="/5" />
              <BigNumber label="Countries" num="86" />
            </div>
          </div>
        </section>

        {/* Stories / testimonial */}
        <section id="stories" style={{ marginTop: 60 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
            <h2 className="ed-h1" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Quiet, ordinary breakthroughs.
            </h2>
            <p className="ed-eyebrow">No. 04 · Stories</p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 22,
            }}
          >
            <StoryCard
              quote="I stopped translating in my head somewhere around week six."
              name="Linh, 28"
              meta="Da Nang · IELTS path"
              initials="L"
            />
            <StoryCard
              quote="My tutor remembered the word I forgot last Tuesday. That's why I keep coming back."
              name="Hiro, 31"
              meta="Osaka · Business path"
              initials="H"
            />
            <StoryCard
              quote="The progress journal is the part I didn't expect to love."
              name="Sofia, 22"
              meta="Bogotá · Conversational"
              initials="S"
            />
          </div>
        </section>

        {/* CTA strip */}
        <section style={{ marginTop: 72 }}>
          <div
            className="ed-card"
            style={{
              padding: '40px 36px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 28,
              alignItems: 'center',
            }}
          >
            <div>
              <p className="ed-eyebrow">Begin reading</p>
              <p
                className="ed-serif"
                style={{
                  fontSize: 'clamp(28px, 3.4vw, 40px)',
                  marginTop: 10,
                  color: 'var(--ed-ink-2)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.022em',
                }}
              >
                Your first lesson is on us.
              </p>
              <p className="ed-body" style={{ marginTop: 10, maxWidth: 520 }}>
                One free 25-minute session with a tutor of your choosing. No card. No catch. Just a conversation.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <Link href={`/${locale}/auth/signup`} className="ed-btn ed-btn-primary ed-btn-lg">
                Claim your session <ArrowRIcon />
              </Link>
            </div>
          </div>
        </section>

        <hr className="ed-divider" style={{ marginTop: 64 }} />

        {/* Footer */}
        <footer
          style={{
            paddingTop: 32,
            paddingBottom: 48,
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
            gap: 36,
          }}
        >
          <div>
            <Link href={`/${locale}`} className="ed-brand" style={{ marginBottom: 14 }}>
              <span className="ed-brand-mark">e</span>
              <span>easyeng</span>
            </Link>
            <p className="ed-tiny" style={{ marginTop: 14, maxWidth: 320 }}>
              {tCommon('copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
          <FooterCol
            title="Learn"
            links={[
              { label: 'Tutors', href: `/${locale}/book` },
              { label: 'Pricing', href: '#' },
              { label: 'Method', href: '#how' },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: 'About', href: '#' },
              { label: 'Careers', href: '#' },
              { label: 'Press', href: '#' },
            ]}
          />
          <FooterCol
            title="Help"
            links={[
              { label: 'Contact', href: '#' },
              { label: 'Privacy', href: `/${locale}/privacy` },
              { label: 'Terms', href: `/${locale}/terms` },
            ]}
          />
        </footer>
      </main>
    </div>
  );
}

/* ----------------- Sub-components ----------------- */

function FeatureColumn({
  eyebrow,
  title,
  body,
  icon,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <article style={{ paddingTop: 4 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'var(--ed-paper-2)',
          border: '1px solid var(--ed-rule)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ed-ink-2)',
          marginBottom: 18,
        }}
      >
        {icon}
      </div>
      <p className="ed-eyebrow">{eyebrow}</p>
      <h3
        className="ed-serif"
        style={{
          fontSize: 26,
          lineHeight: 1.15,
          marginTop: 8,
          color: 'var(--ed-ink-2)',
          letterSpacing: '-0.018em',
        }}
      >
        {title}
      </h3>
      <p className="ed-body" style={{ marginTop: 10 }}>
        {body}
      </p>
    </article>
  );
}

function StepCard({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <article
      className="ed-card"
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          background: 'var(--ed-paper-2)',
          border: '1px solid var(--ed-rule)',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--ed-serif)',
          fontSize: 18,
          color: 'var(--ed-ink-2)',
          letterSpacing: '0.02em',
        }}
      >
        {num}
      </div>
      <h3
        className="ed-serif"
        style={{
          fontSize: 22,
          lineHeight: 1.2,
          color: 'var(--ed-ink-2)',
          letterSpacing: '-0.015em',
          marginTop: 4,
        }}
      >
        {title}
      </h3>
      <p className="ed-body">{body}</p>
    </article>
  );
}

function TutorCard({
  name,
  loc,
  focus,
  rate,
  initials,
}: {
  name: string;
  loc: string;
  focus: string;
  rate: string;
  initials: string;
}) {
  return (
    <article
      className="ed-card"
      style={{
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        className="ed-image-slot"
        style={{
          aspectRatio: '4/5',
          borderRadius: 10,
          marginBottom: 4,
        }}
      >
        <span style={{ marginRight: 'auto' }}>{initials}</span>
        Portrait
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p
          className="ed-serif"
          style={{
            fontSize: 18,
            color: 'var(--ed-ink-2)',
            letterSpacing: '-0.01em',
          }}
        >
          {name}
        </p>
        <span className="ed-tiny" style={{ color: 'var(--ed-ink-mute)' }}>{rate}</span>
      </div>
      <p className="ed-tiny">
        <PinIcon /> {loc}
      </p>
      <p className="ed-tiny">
        <FlagIcon /> {focus}
      </p>
    </article>
  );
}

function BigNumber({ label, num, suffix }: { label: string; num: string; suffix?: string }) {
  return (
    <div>
      <p
        style={{
          fontFamily: 'var(--ed-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#B5BEDF',
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <p
        className="ed-serif"
        style={{
          fontSize: 'clamp(36px, 4vw, 56px)',
          color: '#F4EFE2',
          lineHeight: 1,
          letterSpacing: '-0.025em',
        }}
      >
        {num}
        {suffix && <span style={{ fontSize: '0.5em', color: '#B5BEDF', marginLeft: 4 }}>{suffix}</span>}
      </p>
    </div>
  );
}

function StoryCard({
  quote,
  name,
  meta,
  initials,
}: {
  quote: string;
  name: string;
  meta: string;
  initials: string;
}) {
  return (
    <article className="ed-card" style={{ padding: 24 }}>
      <p
        className="ed-serif"
        style={{
          fontSize: 20,
          lineHeight: 1.4,
          color: 'var(--ed-ink-2)',
          letterSpacing: '-0.012em',
          fontStyle: 'italic',
        }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
        <div className="ed-avatar-sm">{initials}</div>
        <div>
          <p
            style={{
              fontFamily: 'var(--ed-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ed-ink-2)',
            }}
          >
            {name}
          </p>
          <p className="ed-tiny">{meta}</p>
        </div>
      </div>
    </article>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p
        style={{
          fontFamily: 'var(--ed-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ed-ink-mute)',
          marginBottom: 12,
        }}
      >
        {title}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              style={{
                fontFamily: 'var(--ed-sans)',
                fontSize: 14,
                color: 'var(--ed-ink-soft)',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
