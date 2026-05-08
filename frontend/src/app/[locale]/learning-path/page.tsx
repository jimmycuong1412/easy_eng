'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EdTopBar } from '@/components/editorial/TopBar';
import {
  ArrowRIcon, DownloadIcon, UsersIcon, CheckIcon,
  BookIcon, MicIcon, FlagIcon, DocIcon,
} from '@/components/editorial/Icons';

const UNITS = [
  { n: 'I',    title: 'Foundations',         desc: 'Sounds, simple sentences, ordering things in time.',              state: 'done',    lessons: 12, weeks: 'Weeks 1–3' },
  { n: 'II',   title: 'Everyday talk',        desc: 'Asking, answering, repeating yourself politely.',                 state: 'done',    lessons: 10, weeks: 'Weeks 4–6' },
  { n: 'III',  title: 'Telling small stories',desc: 'Past tenses, time markers, getting to the point.',               state: 'done',    lessons: 14, weeks: 'Weeks 7–9' },
  { n: 'IV',   title: 'Opinions, softly',     desc: 'Hedging, agreeing, disagreeing without offence.',                state: 'current', lessons: 11, weeks: 'Weeks 10–12', pct: 66 },
  { n: 'V',    title: 'Talking about work',   desc: "Describing what you do, what you'd rather do.",                  state: 'next',    lessons: 13, weeks: 'Weeks 13–15' },
  { n: 'VI',   title: 'If, when, unless',     desc: 'Conditionals, hypotheticals, plans that may not happen.',        state: 'locked',  lessons: 12, weeks: 'Weeks 16–18' },
  { n: 'VII',  title: 'Reading the room',     desc: 'Tone, register, picking up what\'s not said.',                   state: 'locked',  lessons: 10, weeks: 'Weeks 19–21' },
  { n: 'VIII', title: 'Beyond the textbook',  desc: 'Idioms, slang, things you\'d never say at the bank.',            state: 'locked',  lessons: 9,  weeks: 'Weeks 22–24' },
] as const;

type UnitState = 'done' | 'current' | 'next' | 'locked';

export default function LearningPathPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';

  return (
    <div className="ed-frame">
      <EdTopBar role="student" initials="AL" locale={locale} />

      <main className="ed-content" id="main-content">
        <p className="ed-eyebrow">Your course · B2 Upper-Intermediate</p>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
          <h1 className="ed-display" style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', margin: 0 }}>
            The shape of <em style={{ fontStyle: 'italic', color: 'var(--ed-coral-ink)' }}>your</em> English.
          </h1>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 24 }}>
            <button className="ed-btn"><DownloadIcon /> Syllabus</button>
            <button className="ed-btn"><UsersIcon /> Switch tutor</button>
          </div>
        </div>

        {/* Course meta strip */}
        <div
          className="ed-card"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 28, padding: 0 }}
        >
          {([
            ['Started', 'Feb 12'],
            ['On track for', 'Aug 04'],
            ['Tutor', 'Maria Rojas'],
            ['Sessions used', '23 of 48'],
          ] as [string, string][]).map(([k, v], i) => (
            <div
              key={i}
              style={{
                padding: '20px 22px',
                borderRight: i < 3 ? '1px solid var(--ed-rule)' : 'none',
              }}
            >
              <p className="ed-eyebrow">{k}</p>
              <p className="ed-serif" style={{ fontSize: 22, marginTop: 8, color: 'var(--ed-ink-2)' }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Units */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '36px 0 14px' }}>
          <h2 className="ed-h2">Eight units, twenty-four weeks</h2>
          <span className="ed-tiny">3 of 8 complete · Unit IV in progress</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {UNITS.map((u, i) => (
            <UnitRow key={i} u={u} last={i === UNITS.length - 1} locale={locale} />
          ))}
        </div>

        <div style={{ height: 60 }} />
      </main>
    </div>
  );
}

/* ---- Unit row ---- */

function UnitRow({
  u,
  last,
  locale,
}: {
  u: typeof UNITS[number];
  last: boolean;
  locale: string;
}) {
  const stateLabel: Record<UnitState, string> = {
    done: 'Complete',
    current: 'In progress',
    next: 'Up next',
    locked: 'Not yet',
  };

  const numStyle: React.CSSProperties = {
    width: 56, height: 56, borderRadius: 999,
    background:
      u.state === 'current' ? 'var(--ed-ink)' :
      u.state === 'done'    ? 'var(--ed-paper-2)' : 'transparent',
    border: u.state === 'locked'
      ? '1px dashed var(--ed-rule-strong)'
      : '1px solid var(--ed-rule-strong)',
    color: u.state === 'current' ? '#F4EFE2' : 'var(--ed-ink-2)',
    display: 'grid', placeItems: 'center',
    fontFamily: 'var(--ed-serif)',
    fontSize: 24, letterSpacing: '-0.02em',
    flexShrink: 0,
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, paddingBottom: u.state === 'current' ? 28 : 16 }}>
      {/* Number column with connector line */}
      <div style={{ width: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
        <div style={numStyle}>{u.n}</div>
        {!last && (
          <div style={{ width: 1, flex: 1, background: 'var(--ed-rule-strong)', marginTop: 8, minHeight: 40 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ paddingTop: 14, paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="ed-eyebrow">{stateLabel[u.state as UnitState]} · {u.weeks}</span>
          {u.state === 'done' && <CheckIcon style={{ width: 13, height: 13, stroke: 'var(--ed-ink-soft)' }} />}
        </div>

        <p
          className="ed-serif"
          style={{
            fontSize: u.state === 'current' ? 36 : 28,
            marginTop: 6,
            color: u.state === 'locked' ? 'var(--ed-ink-mute)' : 'var(--ed-ink-2)',
            letterSpacing: '-0.02em',
            fontWeight: u.state === 'current' ? 400 : 350,
          }}
        >
          {u.title}
        </p>
        <p className="ed-body" style={{ marginTop: 6, maxWidth: 640 }}>{u.desc}</p>

        {/* Current unit — expanded card */}
        {'pct' in u && u.state === 'current' && (
          <div className="ed-card" style={{ maxWidth: 760, marginTop: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="ed-eyebrow">Currently · 7 of 11 lessons</p>
              <p className="ed-tiny">{u.pct}%</p>
            </div>
            <div className="ed-bar ed-bar-coral" style={{ marginTop: 8 }}>
              <i className="ed-bar-fill" style={{ width: `${u.pct}%` }} />
            </div>
            <hr className="ed-thin-divider" style={{ margin: '16px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <LessonCard kind="reading"  title="Disagreeing in meetings"     mins={18} done />
              <LessonCard kind="speaking" title="Hedging your bets"           mins={22} live />
              <LessonCard kind="grammar"  title="Modals: might, could, may"   mins={14} />
            </div>
          </div>
        )}

        {u.state === 'next' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="ed-btn ed-btn-sm">Preview unit</button>
            <button className="ed-btn ed-btn-sm ed-btn-ghost">{u.lessons} lessons <ArrowRIcon style={{ width: 11, height: 11 }} /></button>
          </div>
        )}

        {u.state === 'done' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <span className="ed-chip" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckIcon style={{ width: 10, height: 10 }} /> {u.lessons} lessons
            </span>
            <span className="ed-chip" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              ★ Mastery 92%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Lesson card (inside current unit) ---- */

type LessonKind = 'reading' | 'speaking' | 'grammar' | 'writing';

const KIND_META: Record<LessonKind, { label: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  reading:  { label: 'Reading',  Icon: BookIcon },
  speaking: { label: 'Speaking', Icon: MicIcon },
  grammar:  { label: 'Grammar',  Icon: FlagIcon },
  writing:  { label: 'Writing',  Icon: DocIcon },
};

function LessonCard({
  kind, title, mins, done, live,
}: {
  kind: LessonKind; title: string; mins: number; done?: boolean; live?: boolean;
}) {
  const { label, Icon } = KIND_META[kind];
  return (
    <div
      style={{
        padding: 14,
        border: '1px solid var(--ed-rule)',
        borderRadius: 10,
        background: live ? 'var(--ed-coral-2)' : 'var(--ed-paper)',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ed-ink-soft)' }}>
        <Icon style={{ width: 13, height: 13 }} />
        <span className="ed-eyebrow">{label} · {mins}m</span>
      </div>
      <p className="ed-serif" style={{ fontSize: 15, marginTop: 8, color: 'var(--ed-ink-2)', lineHeight: 1.25 }}>{title}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {done && (
          <span className="ed-chip" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 8px' }}>
            <CheckIcon style={{ width: 9, height: 9 }} /> done
          </span>
        )}
        {live && (
          <span className="ed-chip ed-chip-coral" style={{ fontSize: 10, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="ed-chip-dot" /> live class
          </span>
        )}
        {!done && !live && (
          <button className="ed-btn ed-btn-sm ed-btn-ghost" style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            Open <ArrowRIcon style={{ width: 10, height: 10 }} />
          </button>
        )}
      </div>
    </div>
  );
}
