'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { EdTopBar } from '@/components/editorial/TopBar';
import { ClassCatalog } from '@/components/booking/ClassCatalog';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { ClassData } from '@/components/booking/ClassCard';
import {
  ArrowRIcon, FilterIcon, PinIcon, GlobeIcon, StarIcon, CheckIcon,
} from '@/components/editorial/Icons';

export default function BookClassesPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const isVi = locale === 'vi';

  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [step] = useState(2);

  const handleSelectClass = (classData: ClassData) => {
    setSelectedClass(classData);
    setBookingSuccess(false);
  };

  const handleCancelBooking = () => setSelectedClass(null);

  const handleBookingSuccess = () => {
    setBookingSuccess(true);
    setTimeout(() => {
      setSelectedClass(null);
      setBookingSuccess(false);
    }, 3000);
  };

  const ui = {
    confirmed: isVi ? 'Đã xác nhận lịch học.' : 'Booking confirmed.',
    confirmedSub: isVi ? 'Chúng tôi sẽ gửi chi tiết qua email của bạn.' : "We'll send details to your email.",
    backToTutors: isVi ? '← Quay lại danh sách' : '← Back to tutors',
    stepOf: isVi ? `Đặt lịch · Bước ${step} / 3` : `Book a session · Step ${step} of 3`,
    headline: isVi ? 'Chọn người bạn muốn học cùng.' : "Pick someone you'd like to talk with.",
    subHeadline: isVi
      ? 'Chúng tôi đã lọc ra những gia sư phù hợp với trình độ và mục tiêu của bạn.'
      : "We've narrowed it to tutors who match your level and the things you said you'd like to work on.",
    filters: isVi ? 'Bộ lọc' : 'Filters',
    focus: isVi ? 'Kỹ năng' : 'Focus',
    focusItems: isVi
      ? ['Nói', 'Viết', 'Ngữ pháp', 'Phát âm', 'Luyện thi']
      : ['Speaking', 'Writing', 'Grammar', 'Pronunciation', 'Test prep'],
    speaks: isVi ? 'Ngôn ngữ gia sư' : 'Speaks',
    speaksItems: ['English', 'Spanish', 'Portuguese', 'Mandarin', 'Arabic'],
    timeOfDay: isVi ? 'Thời gian trong ngày' : 'Time of day',
    timeItems: isVi
      ? ['Sáng sớm', 'Buổi sáng', 'Buổi trưa', 'Buổi tối', 'Khuya']
      : ['Early', 'Morning', 'Midday', 'Evening', 'Late'],
    lessonLength: isVi ? 'Độ dài buổi học' : 'Lesson length',
    matchCount: isVi ? '12 gia sư phù hợp · sắp xếp theo độ phù hợp' : '12 tutors match · sorted by best fit',
    bestFit: isVi ? 'Phù hợp nhất ↓' : 'Best fit ↓',
    more: isVi ? 'Thêm' : 'More',
    allClasses: isVi ? 'Tất cả các lớp học' : 'All available classes',
    backFocus: isVi ? '← Quay lại kỹ năng' : '← Back to focus',
    continueWith: isVi ? 'Tiếp tục với Maria' : 'Continue with Maria',
    moreTimes: isVi ? 'Xem thêm →' : 'More times →',
    yourTutor: isVi ? 'Gia sư của bạn' : 'Your tutor',
    today: isVi ? 'Hôm nay' : 'Today',
    tomorrow: isVi ? 'Ngày mai' : 'Tomorrow',
    friday: isVi ? 'Thứ Sáu' : 'Friday',
    saturday: isVi ? 'Thứ Bảy' : 'Sat',
  };

  return (
    <div className="ed-frame">
      <EdTopBar role="student" initials="AL" locale={locale} />

      <main className="ed-content" id="main-content">
        {/* Success banner */}
        {bookingSuccess && (
          <div
            style={{
              marginBottom: 24, padding: '14px 20px', borderRadius: 12,
              background: 'var(--ed-paper-2)', border: '1px solid var(--ed-rule-strong)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <CheckIcon style={{ width: 18, height: 18, stroke: 'oklch(0.5 0.13 150)' }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--ed-ink-2)', fontSize: 15 }}>{ui.confirmed}</p>
              <p className="ed-body" style={{ marginTop: 2 }}>{ui.confirmedSub}</p>
            </div>
          </div>
        )}

        {selectedClass ? (
          <div>
            <button
              onClick={handleCancelBooking}
              className="ed-btn ed-btn-ghost"
              style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {ui.backToTutors}
            </button>
            <BookingFlow
              selectedClass={selectedClass}
              onCancel={handleCancelBooking}
              onSuccess={handleBookingSuccess}
            />
          </div>
        ) : (
          <>
            {/* Wizard header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <p className="ed-eyebrow">{ui.stepOf}</p>
                <h1
                  className="ed-display"
                  style={{ fontSize: 'clamp(32px, 4vw, 52px)', marginTop: 8, marginBottom: 0 }}
                >
                  {ui.headline}
                </h1>
                <p className="ed-body" style={{ marginTop: 10, maxWidth: 560 }}>
                  {ui.subHeadline}
                </p>
              </div>
              <BookingStepper step={step} isVi={isVi} />
            </div>

            <hr className="ed-divider" style={{ marginTop: 28 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, marginTop: 28 }}>
              {/* Filters */}
              <aside>
                <p className="ed-eyebrow">{ui.filters}</p>

                <FilterBlock title={ui.focus}>
                  {ui.focusItems.map((t, i) => (
                    <CheckRow key={i} label={t} checked={i === 0 || i === 2} />
                  ))}
                </FilterBlock>

                <FilterBlock title={ui.speaks}>
                  {ui.speaksItems.map((t, i) => (
                    <CheckRow key={i} label={t} checked={i === 0 || i === 1} />
                  ))}
                </FilterBlock>

                <FilterBlock title={ui.timeOfDay}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {ui.timeItems.map((t, i) => (
                      <span
                        key={i}
                        className={`ed-chip ${i === 3 ? 'ed-chip-ink' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </FilterBlock>

                <FilterBlock title={ui.lessonLength}>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {['25 min', '50 min', '90 min'].map((t, i) => (
                      <span
                        key={i}
                        className={`ed-chip ${i === 1 ? 'ed-chip-ink' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </FilterBlock>
              </aside>

              {/* Tutor list */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span className="ed-tiny">{ui.matchCount}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ed-btn ed-btn-sm">{ui.bestFit}</button>
                    <button className="ed-btn ed-btn-sm ed-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FilterIcon style={{ width: 13, height: 13 }} /> {ui.more}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <TutorCard
                    selected
                    name="Maria Rojas" loc="Buenos Aires" speaks="EN, ES, PT"
                    tag={ui.yourTutor}
                    bio="Calm, patient, and very good with people who freeze up. Specialises in conversational fluency and writing for work."
                    rate="$24/h" rating="4.96" sessions="2,310"
                    slots={[`${ui.today} 2pm`, `${ui.today} 6pm`, `${ui.tomorrow} 9am`]}
                    focus={isVi ? ['Nói', 'Viết', 'Kinh doanh'] : ['Speaking', 'Writing', 'Business']}
                    moreTimes={ui.moreTimes}
                    onSelect={() => {}}
                  />
                  <TutorCard
                    name="Daniel Khoury" loc="Beirut" speaks="EN, AR, FR"
                    bio="Former journalist. Loves working on argument structure, clarity, and finding your voice in writing."
                    rate="$28/h" rating="4.91" sessions="1,840"
                    slots={[`${ui.today} 8pm`, `${ui.friday} 7am`, `${ui.friday} 10am`]}
                    focus={isVi ? ['Viết', 'Ngữ pháp'] : ['Writing', 'Grammar']}
                    moreTimes={ui.moreTimes}
                    onSelect={() => {}}
                  />
                  <TutorCard
                    name="Yuki Tanaka" loc="Kyoto" speaks="EN, JA"
                    bio="Direct and structured. Best for learners who want to drill and want feedback that doesn't sugar-coat."
                    rate="$22/h" rating="4.88" sessions="3,021"
                    slots={[`${ui.friday} 6am`, `${ui.friday} 8am`, `${ui.saturday} 11am`]}
                    focus={isVi ? ['Phát âm', 'Luyện tập'] : ['Pronunciation', 'Drills']}
                    moreTimes={ui.moreTimes}
                    onSelect={() => {}}
                  />
                </div>

                {/* Also render the real class catalog below the editorial tutors */}
                <div style={{ marginTop: 32 }}>
                  <p className="ed-eyebrow" style={{ marginBottom: 14 }}>{ui.allClasses}</p>
                  <ClassCatalog onSelectClass={handleSelectClass} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button className="ed-btn ed-btn-ghost">{ui.backFocus}</button>
                  <button className="ed-btn ed-btn-primary ed-btn-lg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {ui.continueWith} <ArrowRIcon />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ height: 60 }} />
      </main>
    </div>
  );
}

/* ---- Stepper ---- */
function BookingStepper({ step, isVi }: { step: number; isVi: boolean }) {
  const steps = isVi ? ['Kỹ năng', 'Gia sư', 'Thời gian'] : ['Focus', 'Tutor', 'Time'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 24 }}>
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < step, cur = idx === step;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 24, height: 24, borderRadius: 999, display: 'grid', placeItems: 'center',
                  background: done ? 'var(--ed-ink)' : cur ? 'var(--ed-coral-2)' : 'var(--ed-paper-2)',
                  color: done ? '#F4EFE2' : cur ? 'var(--ed-coral-ink)' : 'var(--ed-ink-mute)',
                  fontFamily: 'var(--ed-mono)', fontSize: 11,
                  border: '1px solid var(--ed-rule)',
                  flexShrink: 0,
                }}
              >
                {done ? '✓' : idx}
              </span>
              <span
                className="ed-mono"
                style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: cur ? 'var(--ed-ink-2)' : 'var(--ed-ink-mute)' }}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 24, height: 1, background: 'var(--ed-rule-strong)' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ---- Filter block ---- */
function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <p className="ed-serif" style={{ fontSize: 18, color: 'var(--ed-ink-2)', marginBottom: 8, letterSpacing: '-0.01em' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

/* ---- Checkbox row ---- */
function CheckRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '3px 0' }}>
      <span
        style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          background: checked ? 'var(--ed-ink)' : 'var(--ed-card)',
          border: `1px solid ${checked ? 'var(--ed-ink)' : 'var(--ed-rule-strong)'}`,
          display: 'grid', placeItems: 'center', color: '#F4EFE2',
        }}
      >
        {checked && <CheckIcon style={{ width: 10, height: 10, strokeWidth: 2.5 }} />}
      </span>
      <span style={{ fontSize: 14, color: 'var(--ed-ink-2)' }}>{label}</span>
    </label>
  );
}

/* ---- Tutor card ---- */
function TutorCard({
  selected, name, loc, speaks, tag, bio, rate, rating, sessions, slots, focus, moreTimes, onSelect,
}: {
  selected?: boolean; name: string; loc: string; speaks: string; tag?: string;
  bio: string; rate: string; rating: string; sessions: string;
  slots: string[]; focus: string[]; moreTimes: string; onSelect: () => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${selected ? 'var(--ed-ink)' : 'var(--ed-rule)'}`,
        borderRadius: 14,
        background: 'var(--ed-card)',
        boxShadow: selected ? '0 0 0 4px rgba(11,42,107,0.08)' : 'none',
        padding: 22,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 22,
      }}
    >
      <div className="ed-image-slot" style={{ width: 88, height: 112, borderRadius: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 9 }}>portrait</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <p className="ed-serif" style={{ fontSize: 24, color: 'var(--ed-ink-2)', letterSpacing: '-0.02em' }}>{name}</p>
          {tag && <span className="ed-chip ed-chip-sky">{tag}</span>}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
          <span className="ed-tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <PinIcon style={{ width: 10, height: 10 }} /> {loc}
          </span>
          <span className="ed-tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <GlobeIcon style={{ width: 10, height: 10 }} /> {speaks}
          </span>
          <span className="ed-tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StarIcon style={{ width: 10, height: 10 }} /> {rating} · {sessions}
          </span>
        </div>
        <p className="ed-body" style={{ marginTop: 10, maxWidth: 500, fontStyle: 'italic', color: 'var(--ed-ink-soft)' }}>"{bio}"</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {focus.map((f, i) => <span key={i} className="ed-chip">{f}</span>)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
        <p className="ed-serif" style={{ fontSize: 22, color: 'var(--ed-ink-2)' }}>{rate}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
          {slots.map((s, i) => (
            <button
              key={i}
              className="ed-btn ed-btn-sm"
              style={{
                justifyContent: 'space-between',
                background: selected && i === 0 ? 'var(--ed-ink)' : 'var(--ed-paper-2)',
                color: selected && i === 0 ? '#F4EFE2' : 'var(--ed-ink-2)',
                borderColor: selected && i === 0 ? 'var(--ed-ink)' : 'var(--ed-rule-strong)',
                display: 'flex', alignItems: 'center',
              }}
              onClick={onSelect}
            >
              {s} <ArrowRIcon style={{ width: 11, height: 11 }} />
            </button>
          ))}
          <button className="ed-btn ed-btn-sm ed-btn-ghost" style={{ justifyContent: 'center' }}>
            {moreTimes}
          </button>
        </div>
      </div>
    </div>
  );
}
