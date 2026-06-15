export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import Link from 'next/link';
import { UpcomingClassesWidget } from '@/components/dashboard/UpcomingClassesWidget';
import { GemBalanceWidget } from '@/components/dashboard/GemBalanceWidget';
import { EdTopBar } from '@/components/editorial/TopBar';
import {
  CalIcon, ArrowRIcon, ArrowUIcon, DocIcon, MicIcon, PlusIcon,
  CheckIcon, PinIcon,
} from '@/components/editorial/Icons';

export const metadata: Metadata = {
  title: 'Hôm nay | EasyEng',
  description: 'Trang học tiếng Anh của bạn',
};

const T = {
  vi: {
    eyebrow: 'Thứ Năm, 8 tháng 5 · Tuần 12 / 24',
    greeting: 'Chào buổi sáng, Alex.',
    greetingBody: 'Bạn có một bài học hôm nay và ba bài tập đang chờ. Gia sư của bạn đã để lại nhận xét về bài viết hôm qua.',
    schedule: 'Lịch học',
    resume: 'Tiếp tục luyện tập',
    nextLesson: 'Bài học tiếp theo · còn 47 phút',
    lessonTitle: 'Câu điều kiện trong hội thoại thực tế',
    withTeacher: 'với Maria Rojas',
    level: 'B2 Trên Trung Cấp',
    beforeClass: 'Trước giờ học',
    readWarmup: 'Đọc bài khởi động',
    listen3min: 'Nghe 3 phút',
    joinClassroom: 'Vào lớp học',
    tutorNote: 'Nhận xét từ gia sư của bạn',
    tutorNoteText: '"Bài luận của bạn về cuộc sống đô thị rất sâu sắc — hãy thử thay đổi độ dài câu để luận điểm về giao thông nổi bật hơn. Xem lại đoạn hai."',
    readAgo: 'Đọc 14 phút trước',
    reply: 'Trả lời',
    openEssay: 'Mở bài luận',
    kpiTitle: 'Tuần này, con số biết nói',
    seeProgress: 'Xem toàn bộ tiến trình',
    kpis: [
      { num: '4.2', unit: 'giờ', label: 'Thời gian học', delta: '+38p so với tuần trước', trend: 'up' as const },
      { num: '217', label: 'Từ mới đã gặp', delta: '32 từ cần ôn lại' },
      { num: '91', unit: '%', label: 'Độ chính xác bài tập', delta: '+4 điểm', trend: 'up' as const },
      { num: '9', label: 'Ngày liên tiếp', delta: 'Kỷ lục mới!', accent: 'coral' as const },
    ],
    continueTitle: 'Tiếp tục từ chỗ bạn dừng',
    allLessons: 'Tất cả bài học',
    continues: [
      { cat: 'Đọc · Chủ đề 6', title: 'Khu phố bạn lớn lên', meta: '3 / 5 phần · còn 12 phút', pct: 62 },
      { cat: 'Nói · Luyện tập', title: 'Gọi món, hỏi lại, hỏi lịch sự', meta: 'Bắt đầu từ Thứ Ba · 8 câu hỏi', pct: 28, accent: 'coral' as const },
      { cat: 'Ngữ pháp · Chủ đề 9', title: 'Câu điều kiện bạn sẽ thực sự dùng', meta: 'Bắt buộc trước buổi học hôm nay', pct: 80, accent: 'sky' as const, pinned: true },
    ],
    continueBtn: 'Tiếp tục',
    yourWeek: 'Tuần của bạn',
    dayLabels: ['T2','T3','T4','T5','T6','T7','CN'],
    upcoming: [
      { time: 'T5 14:00', title: 'Câu điều kiện trong hội thoại', who: 'Maria R.', live: true },
      { time: 'T6 09:30', title: 'Workshop nói · Nhóm', who: 'Daniel K.' },
      { time: 'CN 18:00', title: 'Ôn bài viết', who: 'Maria R.' },
    ],
    bookSession: 'Đặt thêm buổi học',
    vocabTitle: 'Từ cần nhớ',
    vocabSub: '32 từ · 7 từ đến hạn ôn hôm nay',
    vocabReview: 'Ôn tập',
    vocabHear: 'Nghe phát âm',
    due: 'ôn ngay',
    pinned: 'ghim',
    liveChip: 'sắp bắt đầu',
    withPrefix: 'với',
  },
  en: {
    eyebrow: 'Thursday, May 8 · Week 12 of 24',
    greeting: 'Good morning, Alex.',
    greetingBody: 'You have one lesson today and three exercises waiting. Your tutor left a note on yesterday\'s writing.',
    schedule: 'Schedule',
    resume: 'Resume practice',
    nextLesson: 'Next lesson · in 47 minutes',
    lessonTitle: 'Conditionals in real conversation',
    withTeacher: 'with Maria Rojas',
    level: 'B2 Upper-Intermediate',
    beforeClass: 'Before class',
    readWarmup: 'Read warmup',
    listen3min: 'Listen 3 min',
    joinClassroom: 'Join classroom',
    tutorNote: 'A note from your tutor',
    tutorNoteText: '"Your essay on city life was thoughtful — try varying sentence length so your point about traffic lands harder. Look at paragraph two."',
    readAgo: 'Read 14 min ago',
    reply: 'Reply',
    openEssay: 'Open essay',
    kpiTitle: 'This week, in numbers',
    seeProgress: 'See all progress',
    kpis: [
      { num: '4.2', unit: 'hrs', label: 'Time studied', delta: '+38m vs last week', trend: 'up' as const },
      { num: '217', label: 'New words seen', delta: '32 still to review' },
      { num: '91', unit: '%', label: 'Accuracy in drills', delta: '+4 pts', trend: 'up' as const },
      { num: '9', label: 'Day streak', delta: 'Best yet', accent: 'coral' as const },
    ],
    continueTitle: 'Pick up where you left off',
    allLessons: 'All lessons',
    continues: [
      { cat: 'Reading · Unit 6', title: 'The neighbourhood you grow up in', meta: '3 of 5 sections · 12 min left', pct: 62 },
      { cat: 'Speaking · Practice', title: 'Ordering food, asking again, asking nicely', meta: 'Started Tuesday · 8 prompts', pct: 28, accent: 'coral' as const },
      { cat: 'Grammar · Unit 9', title: "Conditionals you'll actually use", meta: "Required before today's class", pct: 80, accent: 'sky' as const, pinned: true },
    ],
    continueBtn: 'Continue',
    yourWeek: 'Your week',
    dayLabels: ['M','T','W','T','F','S','S'],
    upcoming: [
      { time: 'THU 14:00', title: 'Conditionals in conversation', who: 'Maria R.', live: true },
      { time: 'FRI 09:30', title: 'Speaking workshop · Group', who: 'Daniel K.' },
      { time: 'SUN 18:00', title: 'Writing review', who: 'Maria R.' },
    ],
    bookSession: 'Book another session',
    vocabTitle: 'Words to remember',
    vocabSub: '32 words · 7 due today',
    vocabReview: 'Review',
    vocabHear: 'Hear it',
    due: 'due',
    pinned: 'pinned',
    liveChip: 'live soon',
    withPrefix: 'with',
  },
} as const;

const VOCAB_VI = [
  { w: 'to commute',     pos: 'động từ',  ex: 'Tôi mất một giờ để đi làm.', due: true },
  { w: 'plausible',      pos: 'tính từ',  ex: 'Đó là một lý giải hợp lý.', due: true },
  { w: 'to come across', pos: 'cụm động từ', ex: 'Tôi tình cờ tìm thấy một lá thư cũ.', due: false },
  { w: 'reluctance',     pos: 'danh từ',  ex: 'Cô ấy đồng ý, với chút do dự.', due: false },
];
const VOCAB_EN = [
  { w: 'to commute',     pos: 'verb',    ex: 'It takes me an hour to commute to work.', due: true },
  { w: 'plausible',      pos: 'adj.',    ex: "That's a plausible explanation.", due: true },
  { w: 'to come across', pos: 'phrasal', ex: 'I came across an old letter.', due: false },
  { w: 'reluctance',     pos: 'noun',    ex: 'She agreed, with some reluctance.', due: false },
];

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isVi = locale === 'vi';
  const t = isVi ? T.vi : T.en;
  const vocab = isVi ? VOCAB_VI : VOCAB_EN;

  return (
    <div className="ed-frame">
      <EdTopBar role="student" initials="AL" locale={locale} />

      <main className="ed-content" id="main-content">
        {/* Editorial header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p className="ed-eyebrow">{t.eyebrow}</p>
            <h1
              className="ed-display"
              style={{ fontSize: 'clamp(40px, 5vw, 64px)', marginTop: 10, marginBottom: 0 }}
            >
              {t.greeting}
            </h1>
            <p className="ed-body" style={{ marginTop: 12, maxWidth: 560 }}>
              {t.greetingBody}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 24 }}>
            <Link href={`/${locale}/student/bookings`} className="ed-btn">
              <CalIcon /> {t.schedule}
            </Link>
            <Link href={`/${locale}/learning-path`} className="ed-btn ed-btn-primary">
              {t.resume} <ArrowRIcon />
            </Link>
          </div>
        </div>

        <hr className="ed-divider" style={{ marginTop: 28 }} />

        {/* Today panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 28 }}>
          {/* Next lesson — ink panel */}
          <div className="ed-ink-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="ed-label" style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B5BEDF' }}>
                  {t.nextLesson}
                </p>
                <p className="ed-serif" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', marginTop: 14, color: '#F4EFE2', lineHeight: 1.05 }}>
                  {t.lessonTitle}
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 18, color: '#C9D1ED', fontSize: 14, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 14, display: 'inline-block', opacity: 0.7 }}>👤</span>
                    {t.withTeacher}
                  </span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>50 {isVi ? 'phút' : 'min'}</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{t.level}</span>
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
                  {t.beforeClass}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { icon: <DocIcon style={{ width: 12, height: 12, stroke: '#EEE7D5' }} />, label: t.readWarmup },
                    { icon: <MicIcon style={{ width: 12, height: 12, stroke: '#EEE7D5' }} />, label: t.listen3min },
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
                {t.joinClassroom} <ArrowRIcon />
              </Link>
            </div>
          </div>

          {/* Tutor's note */}
          <div className="ed-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <p className="ed-eyebrow">{t.tutorNote}</p>
            <blockquote
              className="ed-serif"
              style={{ fontSize: 20, lineHeight: 1.38, marginTop: 14, color: 'var(--ed-ink-2)', fontWeight: 400, letterSpacing: '-0.01em' }}
            >
              {t.tutorNoteText}
            </blockquote>
            <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="ed-avatar-md">MR</div>
              <div>
                <p className="ed-h3">Maria Rojas</p>
                <p className="ed-tiny">{t.readAgo}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="ed-btn ed-btn-sm">{t.reply}</button>
              <button className="ed-btn ed-btn-sm ed-btn-ghost">{t.openEssay}</button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '28px 0 14px' }}>
          <h2 className="ed-h2">{t.kpiTitle}</h2>
          <Link href={`/${locale}/student/progress`} className="ed-linkpair">
            {t.seeProgress} <ArrowRIcon style={{ width: 13, height: 13 }} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {t.kpis.map((kpi, i) => (
            <KpiTile key={i} {...kpi} />
          ))}
        </div>

        {/* Continue learning + week calendar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 28 }}>
          {/* Continue learning */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="ed-h2">{t.continueTitle}</h2>
              <Link href={`/${locale}/learning-path`} className="ed-linkpair">
                {t.allLessons} <ArrowRIcon style={{ width: 13, height: 13 }} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {t.continues.map((c, i) => (
                <ContinueRow
                  key={i}
                  cat={c.cat}
                  title={c.title}
                  meta={c.meta}
                  pct={c.pct}
                  accent={'accent' in c ? c.accent : undefined}
                  pinned={'pinned' in c ? c.pinned : undefined}
                  locale={locale}
                  btnLabel={t.continueBtn}
                  pinnedLabel={t.pinned}
                />
              ))}
            </div>
          </div>

          {/* Week calendar + upcoming */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="ed-h2">{t.yourWeek}</h2>
              <span className="ed-linkpair">{isVi ? 'Tháng 5' : 'May'} <ArrowRIcon style={{ width: 13, height: 13 }} /></span>
            </div>
            <div className="ed-card" style={{ padding: 20 }}>
              <div className="ed-cal">
                {t.dayLabels.map((d, i) => (
                  <div
                    key={i}
                    style={{ height: 22, display: 'grid', placeItems: 'center', fontFamily: 'var(--ed-mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ed-ink-mute)' }}
                  >
                    {d}
                  </div>
                ))}
              </div>
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
                {t.upcoming.map((u, i) => (
                  <UpcomingRow key={i} time={u.time} title={u.title} who={u.who} live={'live' in u ? u.live : undefined} withPrefix={t.withPrefix} liveChip={t.liveChip} />
                ))}
              </div>

              <Link
                href={`/${locale}/book`}
                className="ed-btn"
                style={{ width: '100%', marginTop: 16, display: 'flex', justifyContent: 'center' }}
              >
                <PlusIcon /> {t.bookSession}
              </Link>
            </div>
          </div>
        </div>

        {/* Vocabulary */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '28px 0 14px' }}>
          <h2 className="ed-h2">{t.vocabTitle}</h2>
          <span className="ed-tiny">{t.vocabSub}</span>
        </div>

        <div className="ed-card" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {vocab.map((v, i) => (
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
                      <span className="ed-chip-dot" />{t.due}
                    </span>
                  )}
                </div>
                <p className="ed-serif" style={{ fontSize: 24, lineHeight: 1.1, color: 'var(--ed-ink-2)', margin: 0 }}>{v.w}</p>
                <p className="ed-body" style={{ fontSize: 13, margin: 0 }}>{v.ex}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button className="ed-btn ed-btn-sm">{t.vocabReview}</button>
                  <button className="ed-btn ed-btn-sm ed-btn-ghost">{t.vocabHear}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real data widgets */}
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
        <span className="ed-kpi-num" style={accent === 'coral' ? { color: 'var(--ed-coral-ink)' } : {}}>
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
  cat, title, meta, pct, accent, pinned, locale, btnLabel, pinnedLabel,
}: {
  cat: string; title: string; meta: string; pct: number;
  accent?: 'coral' | 'sky'; pinned?: boolean; locale: string;
  btnLabel: string; pinnedLabel: string;
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
              <PinIcon style={{ width: 10, height: 10 }} /> {pinnedLabel}
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
        {btnLabel} <ArrowRIcon style={{ width: 13, height: 13 }} />
      </Link>
    </div>
  );
}

function UpcomingRow({
  time, title, who, live, withPrefix, liveChip,
}: {
  time: string; title: string; who: string; live?: boolean;
  withPrefix: string; liveChip: string;
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
              <span className="ed-chip-dot" />{liveChip}
            </span>
          )}
        </div>
        <p className="ed-tiny">{withPrefix} {who}</p>
      </div>
    </div>
  );
}
