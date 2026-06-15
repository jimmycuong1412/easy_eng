'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';

import { formatNumber } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useGemsBalance } from '@/hooks/useGemsBalance';
import { createClient } from '@/lib/supabase/client';
import { getDashboardData, getTeachers, getStudentProgress } from '@/lib/queries';
import { ActiveClassBanner } from '@/components/common/ActiveClassBanner';
import StreakWidget from '@/components/dashboard/StreakWidget';
import WeeklyGoalWidget from '@/components/dashboard/WeeklyGoalWidget';
import DailyLessonCard from '@/components/dashboard/DailyLessonCard';
import PushReminderToggle from '@/components/dashboard/PushReminderToggle';
import FreeTrialBanner from '@/components/dashboard/FreeTrialBanner';
import {
  ArrowRIcon,
  CalIcon,
  BookIcon,
  FlameIcon,
  CheckIcon,
  StarIcon,
  PinIcon,
  PlusIcon,
  ClockIcon,
  ChartIcon,
} from '@/components/editorial/Icons';

interface UpcomingClass {
  id: string;
  teacherName: string;
  teacherAvatar: string | undefined;
  subject: string;
  scheduledAt: Date;
  duration: number;
}

interface RecommendedTeacher {
  id: string;
  name: string;
  avatar: string | undefined;
  specialization: string;
  rating: number;
  hourlyRate: number;
  isOnline: boolean;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { balance: gemBalance } = useGemsBalance();
  const t = useTranslations('dashboard');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';

  // Redirect admin and teacher to their respective dashboards
  React.useEffect(() => {
    if (!profile) return;
    if (profile.role === 'admin') router.replace(`/${locale}/dashboard/admin`);
    else if (profile.role === 'teacher') router.replace(`/${locale}/dashboard`);
  }, [profile, router, locale]);

  const [upcomingClasses, setUpcomingClasses] = React.useState<UpcomingClass[]>([]);
  const [recommendedTeachers, setRecommendedTeachers] = React.useState<RecommendedTeacher[]>([]);
  const [totalXp, setTotalXp] = React.useState(0);
  const [streakDays, setStreakDays] = React.useState(0);
  const [completedClasses, setCompletedClasses] = React.useState(0);
  const [studentLevel, setStudentLevel] = React.useState(1);

  React.useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      getDashboardData(user.id).catch(() => ({ upcomingClasses: [], recentActivity: [], gemsBalance: 0 })),
      getTeachers({ limit: 4 }).catch(() => []),
      getStudentProgress(user.id).catch(() => null),
      (createClient() as any)
        .from('attendance_streaks')
        .select('current_streak')
        .eq('student_id', user.id)
        .maybeSingle()
        .then((r: any) => r.data, () => null),
    ]).then(([dashboard, teachers, progress, streak]: [any, any, any, any]) => {
      const mapped: UpcomingClass[] = (dashboard.upcomingClasses || [])
        .filter((b: Record<string, unknown>) => b.classes)
        .map((b: Record<string, unknown>) => {
          const cls = b.classes as Record<string, unknown>;
          return {
            id: b.id as string,
            teacherName: 'Teacher',
            teacherAvatar: undefined,
            subject: (cls.title as string) || 'Class',
            scheduledAt: new Date(cls.start_time as string),
            duration: (cls.duration_minutes as number) || 25,
          };
        });
      setUpcomingClasses(mapped);

      const mappedTeachers: RecommendedTeacher[] = (teachers || []).slice(0, 4).map((tt: Record<string, unknown>) => ({
        id: tt.id as string,
        name: (tt.full_name as string) || 'Teacher',
        avatar: (tt.avatar_url as string) || undefined,
        specialization: ((tt.bio as string) || '').split('.')[0] || 'English',
        rating: (tt.average_rating as number) || 0,
        hourlyRate: 200000,
        isOnline: true,
      }));
      setRecommendedTeachers(mappedTeachers);

      if (progress) {
        setTotalXp(Number((progress as any).total_xp_earned) || 0);
        setStudentLevel(((progress as any).current_level as number) || 1);
      }

      if (streak) {
        setStreakDays((streak as any).current_streak || 0);
      }

      const completed = (dashboard.upcomingClasses || []).filter(
        (b: Record<string, unknown>) => b.status === 'completed'
      ).length;
      setCompletedClasses(completed);
    });
  }, [user?.id]);

  const firstName = profile?.full_name?.split(' ').pop() || 'friend';
  const initials = (profile?.full_name || 'YO')
    .split(' ')
    .map((p) => p[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const formatDayLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return t('today');
    if (date.toDateString() === tomorrow.toDateString()) return t('tomorrow');
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const nextClass = upcomingClasses[0];

  // Date string for eyebrow
  const now = new Date();
  const datelineEyebrow = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <main id="main-content">
        {/* Active class reconnect banner — kept above the fold */}
        <div style={{ marginBottom: 18 }}>
          <ActiveClassBanner userId={user?.id} role="student" />
        </div>

        {/* Free trial — conversion nudge (only for new users) */}
        <div style={{ marginBottom: 18 }}>
          <FreeTrialBanner />
        </div>

        {/* Daily streak + weekly goal */}
        <div style={{ marginBottom: 18 }}>
          <StreakWidget />
        </div>
        <div style={{ marginBottom: 18 }}>
          <WeeklyGoalWidget />
        </div>

        {/* Quick links: vocab, quiz, report */}
        {profile?.role === 'student' && (
          <div style={{ marginBottom: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={`/${locale}/student/vocabulary`} className="rounded-lg px-3 py-2 text-[12px] font-medium flex items-center gap-1.5" style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)', border: '1px solid var(--et-line)' }}>
              ⭐ Từ vựng của tôi
            </a>
            <a href={`/${locale}/student/onboarding/quiz`} className="rounded-lg px-3 py-2 text-[12px] font-medium flex items-center gap-1.5" style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)', border: '1px solid var(--et-line)' }}>
              🎯 Kiểm tra trình độ
            </a>
            <a href={`/${locale}/student/report`} className="rounded-lg px-3 py-2 text-[12px] font-medium flex items-center gap-1.5" style={{ background: 'var(--et-bg-2)', color: 'var(--et-fg-2)', border: '1px solid var(--et-line)' }}>
              📊 Báo cáo tiến bộ
            </a>
          </div>
        )}

        {/* Bài học hôm nay — daily lesson */}
        <div style={{ marginBottom: 18 }}>
          <DailyLessonCard />
        </div>

        {/* Editorial header */}
        <section
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p className="ed-eyebrow">{datelineEyebrow.toUpperCase()} · WEEK {weekOfYear(now)}</p>
            <h1
              className="ed-display"
              style={{ fontSize: 'clamp(40px, 5vw, 64px)', marginTop: 10, marginBottom: 0 }}
            >
              {t('welcome', { name: firstName })}.
            </h1>
            <p className="ed-body" style={{ marginTop: 12, maxWidth: 580 }}>
              {t('welcomeSubtitle')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
            <PushReminderToggle />
            <Link href={`/${locale}/student/bookings`} className="ed-btn">
              <CalIcon /> {t('viewAll')}
            </Link>
            <Link href={`/${locale}/learning-path`} className="ed-btn ed-btn-primary">
              {t('findTeachersNow') || 'Resume'} <ArrowRIcon />
            </Link>
          </div>
        </section>

        <hr className="ed-divider" style={{ marginTop: 28 }} />

        {/* Today panel */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: 24,
            marginTop: 28,
          }}
        >
          {/* Next lesson — hero card */}
          <div
            className="ed-ink-panel"
            style={{
              padding: 28,
              background: 'linear-gradient(135deg, #1d2762 0%, #11205a 50%, #0d1640 100%)',
              boxShadow: '0 20px 60px -20px rgba(124, 92, 255, 0.35), 0 0 0 1px rgba(91,141,255,0.20), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Ambient glow */}
            <div
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(124,92,255,0.25) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <p
                    className="ed-label"
                    style={{
                      fontFamily: 'var(--ed-mono)',
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#B5BEDF',
                      margin: 0,
                    }}
                  >
                    {nextClass ? t('upcomingClasses') : 'Today'}
                  </p>
                  {nextClass && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: 10,
                        fontFamily: 'var(--et-mono)',
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        background: 'rgba(255, 122, 89, 0.20)',
                        color: '#ff7a59',
                        border: '1px solid rgba(255, 122, 89, 0.35)',
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff7a59', display: 'inline-block', boxShadow: '0 0 6px #ff7a59' }} />
                      Soon
                    </span>
                  )}
                </div>
                <p
                  className="ed-serif"
                  style={{
                    fontSize: 'clamp(26px, 3.4vw, 40px)',
                    marginTop: 14,
                    color: '#F4EFE2',
                    lineHeight: 1.08,
                    letterSpacing: '-0.018em',
                  }}
                >
                  {nextClass ? nextClass.subject : t('noClassesBooked')}
                </p>
                {nextClass ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      marginTop: 18,
                      color: '#C9D1ED',
                      fontSize: 14,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {t('with')} {nextClass.teacherName}
                    </span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ClockIcon /> {nextClass.duration} min
                    </span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>
                      {formatDayLabel(nextClass.scheduledAt)} · {formatTime(nextClass.scheduledAt)}
                    </span>
                  </div>
                ) : (
                  <p style={{ marginTop: 14, color: '#C9D1ED', fontSize: 14, maxWidth: 420 }}>
                    Nothing scheduled. Pick a tutor and book a 25- or 50-minute session — your week starts there.
                  </p>
                )}
              </div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  flexShrink: 0,
                  background: 'rgba(255,255,255,.08)',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid rgba(255,255,255,.12)',
                }}
              >
                <span className="ed-serif" style={{ fontSize: 28, color: '#F4EFE2' }}>
                  {studentLevel}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                flexWrap: 'wrap',
              }}
            >
              {nextClass ? (
                <>
                  <Link
                    href={`/${locale}/student/bookings`}
                    className="ed-btn ed-btn-coral"
                    style={{ borderColor: 'transparent' }}
                  >
                    {t('details')} <ArrowRIcon />
                  </Link>
                  <Link
                    href={`/${locale}/learning-path`}
                    className="ed-btn"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      borderColor: 'rgba(255,255,255,0.15)',
                      color: '#F4EFE2',
                    }}
                  >
                    <BookIcon /> Open lesson plan
                  </Link>
                </>
              ) : (
                <Link href={`/${locale}/book`} className="ed-btn ed-btn-coral" style={{ borderColor: 'transparent' }}>
                  Find a tutor <ArrowRIcon />
                </Link>
              )}
            </div>
          </div>

          {/* Right column — Avatar / level card */}
          <aside
            className="ed-card"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <p className="ed-eyebrow">A NOTE FROM YOUR TUTOR</p>
            <p
              className="ed-serif"
              style={{
                fontSize: 20,
                color: 'var(--ed-ink-2)',
                lineHeight: 1.4,
                letterSpacing: '-0.012em',
                fontStyle: 'italic',
              }}
            >
              &ldquo;Keep going — try varying sentence length so your point lands harder. Look at paragraph two.&rdquo;
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                paddingTop: 14,
                borderTop: '1px solid var(--ed-rule)',
              }}
            >
              <div className="ed-avatar-md">MR</div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontFamily: 'var(--ed-sans)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--ed-ink-2)',
                  }}
                >
                  Maria Rojas
                </p>
                <p className="ed-tiny">Read 14 min ago</p>
              </div>
              <Link href={`/${locale}/student/progress`} className="ed-btn ed-btn-sm">
                Reply
              </Link>
            </div>
          </aside>
        </section>

        {/* This week, in numbers */}
        <section style={{ marginTop: 36 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <h2 className="ed-h2">This week, in numbers.</h2>
            <Link href={`/${locale}/student/progress`} className="ed-linkpair">
              See all progress <ArrowRIcon />
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            <Kpi label="Gem balance" num={formatNumber(gemBalance)} delta={`Worth ${formatNumber(gemBalance * 1000)}đ`} />
            <Kpi label="Day streak" num={String(streakDays)} delta={streakDays > 0 ? `${streakDays} consecutive` : 'Start today'} icon={<FlameIcon />} accent />
            <Kpi label="Classes done" num={String(completedClasses)} delta="Total this term" icon={<CheckIcon />} />
            <Kpi label="XP earned" num={formatNumber(totalXp)} delta={`Level ${studentLevel}`} icon={<StarIcon />} />
          </div>
        </section>

        <hr className="ed-divider" style={{ marginTop: 36 }} />

        {/* Two-column: Upcoming classes + Streak */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr',
            gap: 24,
            marginTop: 28,
          }}
        >
          {/* Upcoming classes */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <h2 className="ed-h2">{t('upcomingClasses')}</h2>
              <Link href={`/${locale}/student/bookings`} className="ed-linkpair">
                {t('viewAll')} <ArrowRIcon />
              </Link>
            </div>

            <div className="ed-card" style={{ padding: 0, overflow: 'hidden' }}>
              {upcomingClasses.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {upcomingClasses.map((cls, idx) => (
                    <li
                      key={cls.id}
                      style={{
                        padding: '18px 22px',
                        display: 'grid',
                        gridTemplateColumns: '90px 1fr auto',
                        gap: 16,
                        alignItems: 'center',
                        borderBottom: idx < upcomingClasses.length - 1 ? '1px dashed rgba(0,0,0,0.10)' : 'none',
                      }}
                    >
                      <div>
                        <p
                          className="ed-serif"
                          style={{
                            fontSize: 22,
                            color: 'var(--ed-ink-2)',
                            lineHeight: 1,
                          }}
                        >
                          {formatTime(cls.scheduledAt)}
                        </p>
                        <p className="ed-tiny" style={{ marginTop: 4 }}>
                          {cls.duration} MIN
                        </p>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p
                          className="ed-serif"
                          style={{
                            fontSize: 18,
                            color: 'var(--ed-ink-2)',
                            letterSpacing: '-0.01em',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cls.subject}
                        </p>
                        <p className="ed-tiny" style={{ marginTop: 4 }}>
                          {t('with')} {cls.teacherName} · {formatDayLabel(cls.scheduledAt)}
                        </p>
                      </div>
                      <Link href={`/${locale}/student/bookings`} className="ed-btn ed-btn-sm">
                        {t('details')}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ padding: 36, textAlign: 'center' }}>
                  <p
                    className="ed-serif"
                    style={{
                      fontSize: 22,
                      color: 'var(--ed-ink-2)',
                      letterSpacing: '-0.012em',
                    }}
                  >
                    {t('noClassesBooked')}
                  </p>
                  <p className="ed-body" style={{ marginTop: 8, maxWidth: 360, marginInline: 'auto' }}>
                    Pick a tutor; book a session; the page fills itself in.
                  </p>
                  <Link
                    href={`/${locale}/book`}
                    className="ed-btn ed-btn-primary"
                    style={{ marginTop: 16, display: 'inline-flex' }}
                  >
                    <PlusIcon /> {t('findTeachersNow')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Streak panel */}
          <aside
            className="ed-card"
            style={{
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--ed-coral-ink)' }}>
                <FlameIcon />
              </span>
              <h3
                className="ed-serif"
                style={{
                  fontSize: 20,
                  color: 'var(--ed-ink-2)',
                  letterSpacing: '-0.012em',
                }}
              >
                {t('learningStreak')}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const filled = i < streakDays;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      aspectRatio: '1/1.4',
                      borderRadius: 6,
                      background: filled ? 'var(--ed-coral-2)' : 'var(--ed-paper-2)',
                      border: '1px solid var(--ed-rule)',
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: 'var(--ed-mono)',
                      fontSize: 12,
                      color: filled ? 'var(--ed-coral-ink)' : 'var(--ed-ink-mute)',
                    }}
                  >
                    {filled ? '·' : i + 1}
                  </div>
                );
              })}
            </div>
            <p className="ed-body" style={{ fontSize: 13 }}>
              {t('consecutiveDays', { days: streakDays })}
            </p>
            <Link href={`/${locale}/student/progress`} className="ed-btn ed-btn-sm">
              <ChartIcon /> Open journal
            </Link>
          </aside>
        </section>

        <hr className="ed-divider" style={{ marginTop: 36 }} />

        {/* Recommended tutors */}
        <section style={{ marginTop: 28 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <h2 className="ed-h2">{t('recommendedTeachers')}</h2>
            <Link href={`/${locale}/book`} className="ed-linkpair">
              {t('viewAll')} <ArrowRIcon />
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {recommendedTeachers.length > 0 ? (
              recommendedTeachers.map((teacher) => (
                <Link
                  key={teacher.id}
                  href={`/${locale}/dashboard/teachers/${teacher.id}`}
                  style={{ textDecoration: 'none' }}
                >
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
                        position: 'relative',
                      }}
                    >
                      <span style={{ marginRight: 'auto' }}>
                        {teacher.name
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      Portrait
                      {teacher.isOnline && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            fontFamily: 'var(--ed-mono)',
                            fontSize: 10,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            background: 'var(--ed-sky-2)',
                            color: 'var(--ed-sky-ink)',
                            padding: '3px 7px',
                            borderRadius: 999,
                          }}
                        >
                          ● Online
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 8,
                      }}
                    >
                      <p
                        className="ed-serif"
                        style={{
                          fontSize: 18,
                          color: 'var(--ed-ink-2)',
                          letterSpacing: '-0.01em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {teacher.name}
                      </p>
                      <span
                        className="ed-tiny"
                        style={{
                          color: 'var(--ed-ink-mute)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          flexShrink: 0,
                        }}
                      >
                        <StarIcon /> {teacher.rating.toFixed(2)}
                      </span>
                    </div>
                    <p
                      className="ed-tiny"
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <PinIcon /> {teacher.specialization}
                    </p>
                    <p
                      style={{
                        marginTop: 6,
                        fontFamily: 'var(--ed-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--ed-ink-2)',
                      }}
                    >
                      {formatNumber(teacher.hourlyRate)}đ
                      <span
                        style={{ color: 'var(--ed-ink-mute)', fontWeight: 400 }}
                      >
                        {' '}
                        / 25 min
                      </span>
                    </p>
                  </article>
                </Link>
              ))
            ) : (
              <div className="ed-card" style={{ padding: 28, gridColumn: '1 / -1', textAlign: 'center' }}>
                <p className="ed-body">No tutors yet — check back in a moment.</p>
              </div>
            )}
          </div>
        </section>

        <hr className="ed-divider" style={{ marginTop: 40 }} />

        {/* AI Tools promo card */}
        <section style={{ marginTop: 28 }}>
          <div
            className="ed-card"
            style={{
              padding: 24,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 20,
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(244,89,58,0.06) 0%, rgba(99,102,241,0.06) 100%)',
            }}
          >
            <div>
              <p className="ed-eyebrow">✨ Miễn phí · AI Local</p>
              <p
                className="ed-serif"
                style={{
                  fontSize: 22,
                  color: 'var(--ed-ink-2)',
                  letterSpacing: '-0.015em',
                  marginTop: 6,
                }}
              >
                Kiểm tra ngữ pháp & Luyện phát âm ngay trên máy bạn.
              </p>
              <p className="ed-body" style={{ marginTop: 6 }}>
                Không cần kết nối internet · Không lưu dữ liệu · Không giới hạn lần dùng
              </p>
            </div>
            <Link href={`/${locale}/ai-tools`} className="ed-btn ed-btn-primary" style={{ whiteSpace: 'nowrap' }}>
              Thử ngay <ArrowRIcon />
            </Link>
          </div>
        </section>

        <hr className="ed-divider" style={{ marginTop: 28 }} />

        {/* Footer mini-CTA */}
        <section style={{ marginTop: 28, paddingBottom: 40 }}>
          <div
            className="ed-card"
            style={{
              padding: 28,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 24,
              alignItems: 'center',
            }}
          >
            <div>
              <p className="ed-eyebrow">Gems</p>
              <p
                className="ed-serif"
                style={{
                  fontSize: 26,
                  color: 'var(--ed-ink-2)',
                  letterSpacing: '-0.018em',
                  marginTop: 6,
                }}
              >
                {gemBalance} gems · worth {formatNumber(gemBalance * 1000)}đ in booking discount.
              </p>
              <p className="ed-body" style={{ marginTop: 6 }}>
                {t('completeClass')} +5 · {t('referFriend')} +50 · {t('firstBooking')} +20
              </p>
            </div>
            <Link href={`/${locale}/student/rewards`} className="ed-btn ed-btn-primary">
              {t('useGems')} <ArrowRIcon />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ----------------- helpers ----------------- */

function weekOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d.getTime() - start.getTime()) / 86400000;
  return Math.ceil((diff + start.getDay() + 1) / 7);
}

function Kpi({
  label,
  num,
  delta,
  icon,
  accent,
}: {
  label: string;
  num: string;
  delta?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="ed-kpi">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p className="ed-kpi-label">{label}</p>
        {icon && (
          <span
            style={{
              color: accent ? 'var(--ed-coral-ink)' : 'var(--ed-ink-mute)',
              opacity: 0.85,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="ed-kpi-num" style={{ color: accent ? 'var(--ed-coral-ink)' : 'var(--ed-ink-2)' }}>
        {num}
      </p>
      {delta && <p className="ed-kpi-delta">{delta}</p>}
    </div>
  );
}
