export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import Link from 'next/link';
import { UpcomingClassesWidget } from '@/components/dashboard/UpcomingClassesWidget';
import { GemBalanceWidget } from '@/components/dashboard/GemBalanceWidget';
import { EdTopBar } from '@/components/editorial/TopBar';
import {
  CalIcon, ArrowRIcon, ArrowUIcon, DocIcon, MicIcon, PlusIcon,
  CheckIcon, PinIcon, FlameIcon, BookIcon, FlagIcon,
} from '@/components/editorial/Icons';

export const metadata: Metadata = {
  title: 'Today | EasyEng',
  description: 'Your English learning dashboard',
};

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="ed-frame">
      <EdTopBar role="student" initials="AL" locale={locale} />

      <main className="ed-content" id="main-content">
        {/* Editorial header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p className="ed-eyebrow">Thursday, May 8 · Week 12 of 24</p>
            <h1
              className="ed-display"
              style={{ fontSize: 'clamp(40px, 5vw, 64px)', marginTop: 10, marginBottom: 0 }}
            >
              Good morning, Alex.
            </h1>
            <p className="ed-body" style={{ marginTop: 12, maxWidth: 560 }}>
              You have one lesson today and three exercises waiting.
              Your tutor left a note on yesterday's writing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 24 }}>
            <Link href={`/${locale}/student/bookings`} className="ed-btn">
              <CalIcon /> Schedule
            </Link>
            <Link href={`/${locale}/learning-path`} className="ed-btn ed-btn-primary">
              Resume practice <ArrowRIcon />
            </Link>
          </div>
        </div>

        <hr className="ed-divider" style={{ marginTop: 28 }} />

        {/* Today panel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: 24,
            marginTop: 28,
          }}
        >
          {/* Next lesson — ink panel */}
          <div className="ed-ink-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="ed-label" style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B5BEDF' }}>
                  Next lesson · in 47 minutes
                </p>
                <p
                  className="ed-serif"
                  style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', marginTop: 14, color: '#F4EFE2', lineHeight: 1.05 }}
                >
                  Conditionals in real conversation
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 18, color: '#C9D1ED', fontSize: 14, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, display: 'inline-block', opacity: 0.7 }}>👤</span>
                    with Maria Rojas
                  </span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>50 min</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>B2 Upper-Intermediate</span>
                </div>
              </div>
              <div
                style={{
                  width: 64, height: 64, borderRadius: 14, flexShrink: 0, marginLeft: 20,
                  background: 'rgba(255,255,255,.08)',
                  display: 'grid', placeItems: 'center',
                  border: '1px solid rgba(255,255,255,.12)',
                }}
              >
                <span className="ed-serif" style={{ fontSize: 28, color: '#F4EFE2' }}>12</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B5BEDF' }}>
                  Before class
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { icon: <DocIcon style={{ width: 12, height: 12, stroke: '#EEE7D5' }} />, label: 'Read warmup' },
                    { icon: <MicIcon style={{ width: 12, height: 12, stroke: '#EEE7D5' }} />, label: 'Listen 3 min' },
                    { label: '+1' },
                  ].map(({ icon, label }, i) => (
                    <span
                      key={i}
                      className="ed-chip"
                      style={{ background: 'rgba(255,255,255,.10)', color: '#EEE7D5', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {icon}
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                href={`/${locale}/class`}
                className="ed-btn ed-btn-coral ed-btn-lg"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                Join classroom <ArrowRIcon />
              </Link>
            </div>
          </div>

          {/* Tutor's note */}
          <div className="ed-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <p className="ed-eyebrow">A note from your tutor</p>
            <blockquote
              className="ed-serif"
              style={{ fontSize: 20, lineHeight: 1.38, marginTop: 14, color: 'var(--ed-ink-2)', fontWeight: 400, letterSpacing: '-0.01em' }}
            >
              "Your essay on city life was thoughtful — try varying sentence length so your point about traffic lands harder. Look at paragraph two."
            </blockquote>
            <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="ed-avatar-md">MR</div>
              <div>
                <p className="ed-h3">Maria Rojas</p>
                <p className="ed-tiny">Read 14 min ago</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="ed-btn ed-btn-sm">Reply</button>
              <button className="ed-btn ed-btn-sm ed-btn-ghost">Open essay</button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '28px 0 14px' }}>
          <h2 className="ed-h2">This week, in numbers</h2>
          <Link href={`/${locale}/student/progress`} className="ed-linkpair">
            See all progress <ArrowRIcon style={{ width: 13, height: 13 }} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <KpiTile num="4.2" unit="hrs" label="Time studied" delta="+38m vs last week" trend="up" />
          <KpiTile num="217" label="New words seen" delta="32 still to review" />
          <KpiTile num="91" unit="%" label="Accuracy in drills" delta="+4 pts" trend="up" />
          <KpiTile num="9" label="Day streak" delta="Best yet" accent="coral" />
        </div>

        {/* Continue learning + week calendar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 28 }}>
          {/* Continue learning */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="ed-h2">Pick up where you left off</h2>
              <Link href={`/${locale}/learning-path`} className="ed-linkpair">
                All lessons <ArrowRIcon style={{ width: 13, height: 13 }} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ContinueRow
                cat="Reading · Unit 6"
                title="The neighbourhood you grow up in"
                meta="3 of 5 sections · 12 min left"
                pct={62}
                locale={locale}
              />
              <ContinueRow
                cat="Speaking · Practice"
                title="Ordering food, asking again, asking nicely"
                meta="Started Tuesday · 8 prompts"
                pct={28}
                accent="coral"
                locale={locale}
              />
              <ContinueRow
                cat="Grammar · Unit 9"
                title="Conditionals you'll actually use"
                meta="Required before today's class"
                pct={80}
                accent="sky"
                pinned
                locale={locale}
              />
            </div>
          </div>

          {/* Week calendar + upcoming */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="ed-h2">Your week</h2>
              <span className="ed-linkpair">May <ArrowRIcon style={{ width: 13, height: 13 }} /></span>
            </div>
            <div className="ed-card" style={{ padding: 20 }}>
              {/* Day headers */}
              <div className="ed-cal">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div
                    key={i}
                    style={{ height: 22, display: 'grid', placeItems: 'center', fontFamily: 'var(--ed-mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ed-ink-mute)' }}
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Days */}
              <div className="ed-cal" style={{ marginTop: 4 }}>
                {([
                  {n:5,k:'has'},{n:6,k:'has'},{n:7,k:'has'},
                  {n:8,k:'today'},{n:9,k:'has'},{n:10,k:'muted'},{n:11,k:'muted'},
                  {n:12,k:'has'},{n:13,k:''},{n:14,k:'has'},{n:15,k:''},
                  {n:16,k:'has'},{n:17,k:'muted'},{n:18,k:'muted'},
                ] as {n:number,k:string}[]).map(({n,k}, i) => (
                  <div
                    key={i}
                    className={`ed-cal-day${k === 'today' ? ' ed-cal-today' : k === 'has' ? ' ed-cal-has' : k === 'muted' ? ' ed-cal-muted' : ''}`}
                  >
                    {n}
                  </div>
                ))}
              </div>

              <hr className="ed-thin-divider" style={{ margin: '16px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <UpcomingRow time="THU 14:00" title="Conditionals in conversation" who="Maria R." live />
                <UpcomingRow time="FRI 09:30" title="Speaking workshop · Group" who="Daniel K." />
                <UpcomingRow time="SUN 18:00" title="Writing review" who="Maria R." />
              </div>

              <Link
                href={`/${locale}/book`}
                className="ed-btn"
                style={{ width: '100%', marginTop: 16, display: 'flex', justifyContent: 'center' }}
              >
                <PlusIcon /> Book another session
              </Link>
            </div>
          </div>
        </div>

        {/* Vocabulary */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '28px 0 14px' }}>
          <h2 className="ed-h2">Words to remember</h2>
          <span className="ed-tiny">32 words · 7 due today</span>
        </div>

        <div className="ed-card" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { w: 'to commute',    pos: 'verb',    ex: 'It takes me an hour to commute to work.',  due: true },
              { w: 'plausible',     pos: 'adj.',    ex: "That's a plausible explanation.",           due: true },
              { w: 'to come across',pos: 'phrasal', ex: 'I came across an old letter.',              due: false },
              { w: 'reluctance',    pos: 'noun',    ex: 'She agreed, with some reluctance.',         due: false },
            ].map((v, i) => (
              <div
                key={i}
                style={{
                  padding: 22,
                  borderRight: i < 3 ? '1px solid var(--ed-rule)' : 'none',
                  display: 'flex', flexDirection: 'column', gap: 8, minHeight: 160,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ed-eyebrow">{v.pos}</span>
                  {v.due && (
                    <span className="ed-chip ed-chip-coral" style={{ fontSize: 10, padding: '2px 8px' }}>
                      <span className="ed-chip-dot" />due
                    </span>
                  )}
                </div>
                <p className="ed-serif" style={{ fontSize: 24, lineHeight: 1.1, color: 'var(--ed-ink-2)', margin: 0 }}>{v.w}</p>
                <p className="ed-body" style={{ fontSize: 13, margin: 0 }}>{v.ex}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button className="ed-btn ed-btn-sm">Review</button>
                  <button className="ed-btn ed-btn-sm ed-btn-ghost">Hear it</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real data widgets (preserved) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 28 }}>
          <UpcomingClassesWidget />
          <GemBalanceWidget />
        </div>

        <div style={{ height: 60 }} />
      </main>
    </div>
  );
}

/* ---- Sub-components ---- */

function KpiTile({
  num, unit, label, delta, trend, accent,
}: {
  num: string; unit?: string; label: string; delta: string; trend?: 'up'; accent?: 'coral';
}) {
  return (
    <div className="ed-kpi">
      <p className="ed-kpi-label">{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          className="ed-kpi-num"
          style={accent === 'coral' ? { color: 'var(--ed-coral-ink)' } : {}}
        >
          {num}
        </span>
        {unit && (
          <span className="ed-serif" style={{ fontSize: 20, color: 'var(--ed-ink-mute)' }}>{unit}</span>
        )}
      </div>
      <p className={`ed-kpi-delta ${trend === 'up' ? 'ed-kpi-delta-up' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        {trend === 'up' && <ArrowUIcon style={{ width: 12, height: 12 }} />}
        {delta}
      </p>
    </div>
  );
}

function ContinueRow({
  cat, title, meta, pct, accent, pinned, locale,
}: {
  cat: string; title: string; meta: string; pct: number;
  accent?: 'coral' | 'sky'; pinned?: boolean; locale: string;
}) {
  return (
    <div className="ed-card" style={{ padding: 18, display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 18 }}>
      <div className="ed-image-slot" style={{ width: 80, height: 80, borderRadius: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 9 }}>cover</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p className="ed-eyebrow">{cat}</p>
          {pinned && (
            <span className="ed-chip" style={{ padding: '2px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <PinIcon style={{ width: 10, height: 10 }} /> pinned
            </span>
          )}
        </div>
        <p className="ed-serif" style={{ fontSize: 20, marginTop: 4, color: 'var(--ed-ink-2)', letterSpacing: '-0.01em' }}>{title}</p>
        <p className="ed-tiny" style={{ marginTop: 4 }}>{meta}</p>
        <div
          className={`ed-bar ${accent === 'coral' ? 'ed-bar-coral' : accent === 'sky' ? 'ed-bar-sky' : ''}`}
          style={{ marginTop: 10, maxWidth: 320 }}
        >
          <i className="ed-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <Link href={`/${locale}/learning-path`} className="ed-btn" style={{ flexShrink: 0 }}>
        Continue <ArrowRIcon style={{ width: 13, height: 13 }} />
      </Link>
    </div>
  );
}

function UpcomingRow({
  time, title, who, live,
}: {
  time: string; title: string; who: string; live?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <p className="ed-mono" style={{ fontSize: 11, color: 'var(--ed-ink-mute)', letterSpacing: '.08em', width: 70, paddingTop: 2, flexShrink: 0 }}>
        {time}
      </p>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: 'var(--ed-ink-2)' }}>{title}</span>
          {live && (
            <span className="ed-chip ed-chip-coral" style={{ padding: '2px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="ed-chip-dot" />live soon
            </span>
          )}
        </div>
        <p className="ed-tiny">with {who}</p>
      </div>
    </div>
  );
}
