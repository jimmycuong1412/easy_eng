export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { EdTopBar } from '@/components/editorial/TopBar';
import {
  PlusIcon, ArrowRIcon, DocIcon, MicIcon, SparkIcon, CheckIcon,
} from '@/components/editorial/Icons';

export const metadata: Metadata = {
  title: 'Today | EasyEng Teacher',
  description: "Your teaching schedule and students",
};

export default async function TeacherDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <ProtectedRoute requiredRoles={['teacher', 'admin']}>
      <div className="ed-frame">
        <EdTopBar role="teacher" initials="MR" locale={locale} />

        <main className="ed-content" id="main-content">
          {/* Editorial header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <p className="ed-eyebrow">Thursday, May 8 · Buenos Aires</p>
              <h1
                className="ed-display"
                style={{ fontSize: 'clamp(36px, 4.5vw, 60px)', marginTop: 10, marginBottom: 0 }}
              >
                Three lessons.{' '}
                <span style={{ color: 'var(--ed-coral-ink)' }}>One needs prep.</span>
              </h1>
              <p className="ed-body" style={{ marginTop: 12, maxWidth: 600 }}>
                You're teaching Alex, Sofia, and a new student named Hiro.
                Hiro is a first session — we set aside 10 minutes for you to read his intake.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 24 }}>
              <button className="ed-btn" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlusIcon /> Block time
              </button>
              <Link
                href={`/${locale}/class`}
                className="ed-btn ed-btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                Open today&apos;s classroom <ArrowRIcon />
              </Link>
            </div>
          </div>

          <hr className="ed-divider" style={{ marginTop: 28 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginTop: 28 }}>
            {/* Left: schedule + waiting */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 className="ed-h2">Today&apos;s schedule</h2>
                <span className="ed-linkpair">Open week <ArrowRIcon style={{ width: 12, height: 12 }} /></span>
              </div>

              <div className="ed-card" style={{ padding: '8px 0' }}>
                <SessionRow
                  time="14:00" len="50 min"
                  student="Alex Lim" level="B2"
                  topic="Conditionals in real conversation"
                  state="next"
                  prep={['3 warm-up prompts', "Yesterday's writing"]}
                  locale={locale}
                />
                <hr className="ed-divider" />
                <SessionRow
                  time="16:00" len="50 min"
                  student="Sofia Vrenna" level="C1"
                  topic="Job interviews — telling stories with data"
                  state="confirmed"
                  prep={['Mock interview deck']}
                  locale={locale}
                />
                <hr className="ed-divider" />
                <SessionRow
                  time="18:30" len="25 min"
                  student="Hiro Tanaka" level="A2 · new"
                  topic="First session · placement & goals"
                  state="needs-prep"
                  prep={['Read intake form (4 min)', 'Pick warm-up']}
                  locale={locale}
                />
              </div>

              {/* Waiting on you */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '28px 0 14px' }}>
                <h2 className="ed-h2">Waiting on you</h2>
                <span className="ed-tiny">3 items</span>
              </div>

              <div className="ed-card" style={{ padding: 0 }}>
                <WaitingItem kind="Essay"      who="Alex Lim"     detail="City life · 412 words · 2 days waiting" overdue />
                <WaitingItem kind="Voice memo" who="Sofia Vrenna" detail="2:14 about her grandmother's recipe" />
                <WaitingItem kind="Quiz"       who="Hiro Tanaka"  detail="Placement · 12/20 correct" />
              </div>
            </div>

            {/* Right: earnings + students + resource */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Earnings ink panel */}
              <div className="ed-ink-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B5BEDF' }}>This month</p>
                  <span className="ed-mono" style={{ fontSize: 11, color: '#B5BEDF' }}>Payout May 31</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 14 }}>
                  <span className="ed-serif" style={{ fontSize: 60, color: '#F4EFE2', lineHeight: 0.95, letterSpacing: '-0.03em' }}>$1,840</span>
                  <span className="ed-mono" style={{ fontSize: 12, color: '#A3D7B2' }}>↑ $310 vs April</span>
                </div>
                <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.12)', margin: '22px 0 16px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B5BEDF' }}>Hours taught</p>
                    <p className="ed-serif" style={{ fontSize: 24, color: '#F4EFE2', marginTop: 6 }}>62 <span style={{ fontSize: 14, color: '#B5BEDF' }}>/ 80 capacity</span></p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B5BEDF' }}>Avg. rating</p>
                    <p className="ed-serif" style={{ fontSize: 24, color: '#F4EFE2', marginTop: 6 }}>4.96 <span style={{ fontSize: 14, color: '#B5BEDF' }}>· 28 reviews</span></p>
                  </div>
                </div>
              </div>

              {/* Students who need a nudge */}
              <div className="ed-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p className="ed-serif" style={{ fontSize: 20, color: 'var(--ed-ink-2)' }}>Students who could use a nudge</p>
                  <span className="ed-tiny">last 14 days</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                  <RiskRow name="Marco P."  status="Hasn't booked since Apr 24" risk="cold" />
                  <RiskRow name="Eva K."    status="Cancelled twice this week"   risk="warning" />
                  <RiskRow name="Jin S."    status="Steady — well done."         risk="ok" />
                </div>
              </div>

              {/* Resource of the week */}
              <div
                className="ed-card"
                style={{ padding: 20, background: 'var(--ed-coral-2)', border: '1px solid var(--ed-coral)' }}
              >
                <p className="ed-eyebrow" style={{ color: 'var(--ed-coral-ink)' }}>From the team · Resource of the week</p>
                <p className="ed-serif" style={{ fontSize: 20, color: 'var(--ed-ink-2)', marginTop: 8, lineHeight: 1.25 }}>
                  Five ways to handle the silent learner — without filling the silence yourself.
                </p>
                <button
                  className="ed-btn ed-btn-sm"
                  style={{ marginTop: 14, background: 'transparent', borderColor: 'var(--ed-coral-ink)', color: 'var(--ed-coral-ink)' }}
                >
                  Read · 6 min →
                </button>
              </div>
            </div>
          </div>

          <div style={{ height: 60 }} />
        </main>
      </div>
    </ProtectedRoute>
  );
}

/* ---- Session row ---- */
type SessionState = 'next' | 'confirmed' | 'needs-prep';

function SessionRow({
  time, len, student, level, topic, state, prep, locale,
}: {
  time: string; len: string; student: string; level: string; topic: string;
  state: SessionState; prep: string[]; locale: string;
}) {
  const stateChip: Record<SessionState, React.ReactNode> = {
    'next':       <span className="ed-chip ed-chip-coral" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span className="ed-chip-dot" />next up · 47 min</span>,
    'confirmed':  <span className="ed-chip" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><CheckIcon style={{ width: 9, height: 9 }} />confirmed</span>,
    'needs-prep': <span className="ed-chip" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, background: 'var(--ed-coral-2)', color: 'var(--ed-coral-ink)', border: 'none' }}><span className="ed-chip-dot" />needs prep</span>,
  };

  const initials = student.split(' ').map(s => s[0]).slice(0, 2).join('');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 20, padding: '18px 22px', alignItems: 'center' }}>
      <div>
        <p className="ed-serif" style={{ fontSize: 26, color: 'var(--ed-ink-2)', lineHeight: 1, letterSpacing: '-0.02em' }}>{time}</p>
        <p className="ed-mono" style={{ fontSize: 11, color: 'var(--ed-ink-mute)', marginTop: 4, letterSpacing: '.08em' }}>{len.toUpperCase()}</p>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="ed-avatar-md">{initials}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <p className="ed-h3" style={{ fontSize: 16 }}>{student}</p>
              <span className="ed-mono" style={{ fontSize: 11, color: 'var(--ed-ink-mute)', letterSpacing: '.06em' }}>{level}</span>
            </div>
            <p className="ed-serif" style={{ fontSize: 17, color: 'var(--ed-ink-2)', letterSpacing: '-0.01em', marginTop: 2 }}>{topic}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginLeft: 52, flexWrap: 'wrap' }}>
          {stateChip[state]}
          {prep.map((p, i) => <span key={i} className="ed-chip" style={{ fontSize: 10 }}>{p}</span>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button className="ed-btn ed-btn-sm">Notes</button>
        <Link href={`/${locale}/class`} className="ed-btn ed-btn-sm ed-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Open <ArrowRIcon style={{ width: 11, height: 11 }} />
        </Link>
      </div>
    </div>
  );
}

/* ---- Waiting item ---- */
function WaitingItem({ kind, who, detail, overdue }: { kind: 'Essay' | 'Voice memo' | 'Quiz'; who: string; detail: string; overdue?: boolean; }) {
  const IconMap = { Essay: DocIcon, 'Voice memo': MicIcon, Quiz: SparkIcon };
  const Icon = IconMap[kind];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', padding: '16px 22px', gap: 16, alignItems: 'center', borderBottom: '1px solid var(--ed-rule)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: overdue ? 'var(--ed-coral-2)' : 'var(--ed-paper-2)', color: overdue ? 'var(--ed-coral-ink)' : 'var(--ed-ink-soft)', display: 'grid', placeItems: 'center' }}>
        <Icon style={{ width: 16, height: 16 }} />
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ed-eyebrow">{kind} · from {who}</span>
          {overdue && <span className="ed-chip ed-chip-coral" style={{ padding: '1px 7px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span className="ed-chip-dot" /> 2d</span>}
        </div>
        <p style={{ fontSize: 14, color: 'var(--ed-ink-2)', marginTop: 4 }}>{detail}</p>
      </div>
      <button className="ed-btn ed-btn-sm" style={{ flexShrink: 0 }}>Review →</button>
    </div>
  );
}

/* ---- Risk row ---- */
type Risk = 'ok' | 'warning' | 'cold';

function RiskRow({ name, status, risk }: { name: string; status: string; risk: Risk }) {
  const dotColor: Record<Risk, string> = { ok: 'oklch(0.6 0.13 150)', warning: 'var(--ed-coral)', cold: 'var(--ed-ink-mute)' };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor[risk], flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 14, color: 'var(--ed-ink-2)' }}>{name}</p>
          <p className="ed-tiny">{status}</p>
        </div>
      </div>
      <button className="ed-btn ed-btn-sm ed-btn-ghost" style={{ padding: '4px 10px' }}>Message →</button>
    </div>
  );
}
