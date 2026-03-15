'use client';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { formatNumber } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useGemsBalance } from '@/hooks/useGemsBalance';
import { GemImage } from '@/components/common/GemImage';
import { createClient } from '@/lib/supabase/client';
import { getDashboardData, getTeachers, getStudentProgress } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XPProgressBar } from '@/components/features/XPProgressBar';
import { PixelAvatar } from '@/components/features/PixelAvatar';
import { ActiveClassBanner } from '@/components/common/ActiveClassBanner';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function StudentDashboardPage() {
  const { user, profile } = useAuth();
  const { balance: gemBalance } = useGemsBalance();
  const t = useTranslations('dashboard');
  const router = useRouter();

  // Redirect admin and teacher to their respective dashboards
  React.useEffect(() => {
    if (!profile) return;
    if (profile.role === 'admin') router.replace('/dashboard/admin');
    else if (profile.role === 'teacher') router.replace('/dashboard/teacher');
  }, [profile, router]);

  const [upcomingClasses, setUpcomingClasses] = React.useState<Array<{
    id: string;
    teacherName: string;
    teacherAvatar: string | undefined;
    subject: string;
    scheduledAt: Date;
    duration: number;
  }>>([]);
  const [recommendedTeachers, setRecommendedTeachers] = React.useState<Array<{
    id: string;
    name: string;
    avatar: string | undefined;
    specialization: string;
    rating: number;
    hourlyRate: number;
    isOnline: boolean;
  }>>([]);
  const [totalXp, setTotalXp] = React.useState(0);
  const [streakDays, setStreakDays] = React.useState(0);
  const [completedClasses, setCompletedClasses] = React.useState(0);
  const [studentCareer, setStudentCareer] = React.useState<{
    current_level: number;
    character_name: string | null;
    career_paths: { name: string } | null;
  } | null>(null);

  React.useEffect(() => {
    if (!user?.id) return;

    // Fetch dashboard data, teachers, student progress, and streak in parallel
    Promise.all([
      getDashboardData(user.id).catch(() => ({ upcomingClasses: [], recentActivity: [], gemsBalance: 0 })),
      getTeachers({ limit: 3 }).catch(() => []),
      getStudentProgress(user.id).catch(() => null),
      (createClient() as any).from('attendance_streaks').select('current_streak').eq('student_id', user.id).maybeSingle().then((r: any) => r.data, () => null),
    ]).then(([dashboard, teachers, progress, streak]) => {
      // Map upcoming classes from bookings
      const mapped = (dashboard.upcomingClasses || [])
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

      // Map teachers
      const mappedTeachers = (teachers || []).slice(0, 3).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        name: (t.full_name as string) || 'Teacher',
        avatar: (t.avatar_url as string) || undefined,
        specialization: (t.bio as string)?.split('.')[0] || 'English',
        rating: (t.average_rating as number) || 0,
        hourlyRate: 200000,
        isOnline: true,
      }));
      setRecommendedTeachers(mappedTeachers);

      // Set progress data
      if (progress) {
        setTotalXp(Number(progress.total_xp_earned) || 0);
        setStudentCareer({
          current_level: (progress.current_level as number) || 1,
          character_name: progress.character_name as string | null,
          career_paths: progress.career_paths as { name: string } | null,
        });
      }

      // Set streak data
      if (streak) {
        setStreakDays(streak.current_streak || 0);
      }

      // Count completed classes from recent bookings
      const completed = (dashboard.upcomingClasses || []).filter(
        (b: Record<string, unknown>) => b.status === 'completed'
      ).length;
      setCompletedClasses(completed);
    });
  }, [user?.id]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return t('today');
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('tomorrow');
    }
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
    });
  };

  // Don't block render on auth loading — middleware already guarantees authentication.
  // Individual widgets show their own loading states as data loads.

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome section */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          {t('welcome', { name: profile?.full_name?.split(' ').pop() || 'you' })} 👋
        </h1>
        <p className="text-text-secondary mt-1">
          {t('welcomeSubtitle')}
        </p>
      </motion.div>

      {/* Active class reconnect banner */}
      <motion.div variants={itemVariants}>
        <ActiveClassBanner userId={user?.id} role="student" />
      </motion.div>

      {/* Stats cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={<GemImage size={28} />}
          label="Gems"
          value={formatNumber(gemBalance)}
          color="gem"
        />
        <StatCard
          icon="🔥"
          label="Streak"
          value={t('streak', { days: streakDays })}
          color="warning"
        />
        <StatCard
          icon="📚"
          label={t('classes')}
          value={completedClasses.toString()}
          color="primary"
        />
        <StatCard
          icon="⭐"
          label="XP"
          value={formatNumber(totalXp)}
          color="gold"
        />
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming classes */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{t('upcomingClasses')}</CardTitle>
                <Link href="/student/bookings">
                  <Button variant="ghost" size="sm">
                    {t('viewAll')} →
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingClasses.length > 0 ? (
                  upcomingClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-bg-elevated border border-border-default hover:border-border-focus transition-colors"
                    >
                      <PixelAvatar
                        src={cls.teacherAvatar}
                        fallbackEmoji="👨‍🏫"
                        size="md"
                        showLevel={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {cls.subject}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {t('with')} {cls.teacherName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-accent-primary">
                          {formatTime(cls.scheduledAt)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatDate(cls.scheduledAt)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        {t('details')}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-text-muted mb-4">
                      {t('noClassesBooked')}
                    </p>
                    <Link href="/dashboard/teachers">
                      <Button>{t('findTeachersNow')}</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recommended teachers */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{t('recommendedTeachers')}</CardTitle>
                <Link href="/dashboard/teachers">
                  <Button variant="ghost" size="sm">
                    {t('viewAll')} →
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recommendedTeachers.map((teacher) => (
                    <Link
                      key={teacher.id}
                      href={`/dashboard/teachers/${teacher.id}`}
                    >
                      <div className="p-4 rounded-xl bg-bg-elevated border border-border-default hover:border-border-focus hover:shadow-card-hover transition-all cursor-pointer">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative">
                            <PixelAvatar
                              src={teacher.avatar}
                              fallbackEmoji="👨‍🏫"
                              size="lg"
                              showLevel={false}
                            />
                            {teacher.isOnline && (
                              <span className="absolute bottom-0 right-0 w-4 h-4 bg-success rounded-full border-2 border-bg-elevated" />
                            )}
                          </div>
                          <p className="font-medium text-text-primary mt-3">
                            {teacher.name}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {teacher.specialization}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-accent-gold">⭐</span>
                            <span className="text-sm font-medium">
                              {teacher.rating}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-accent-primary mt-2">
                            {formatNumber(teacher.hourlyRate)}đ/25min
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          {/* Character progress */}
          <motion.div variants={itemVariants}>
            <Card variant="glow">
              <CardHeader>
                <CardTitle className="text-lg">{t('yourAvatar')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <PixelAvatar
                    fallbackEmoji="🧑‍💼"
                    level={studentCareer?.current_level || 1}
                    name={studentCareer?.character_name || 'Student'}
                    careerPath={studentCareer?.career_paths?.name || 'Business'}
                    size="xl"
                  />
                </div>
                <XPProgressBar totalXp={totalXp} size="md" />
                <Link href="/student/progress" className="block">
                  <Button variant="secondary" className="w-full">
                    {t('viewAvatarDetails')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Gem balance */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GemImage size={20} alt="Gem" /> {t('yourGems')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-accent-gem">
                    {gemBalance}
                  </p>
                  <p className="text-sm text-text-muted">
                    {t('discount', { amount: `${formatNumber(gemBalance * 1000)}đ` })}
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <span>{t('completeClass')}</span>
                    <span className="text-success">+5 <GemImage size={14} className="inline-block align-middle" /></span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>{t('referFriend')}</span>
                    <span className="text-success">+50 <GemImage size={14} className="inline-block align-middle" /></span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>{t('firstBooking')}</span>
                    <span className="text-success">+20 <GemImage size={14} className="inline-block align-middle" /></span>
                  </div>
                </div>
                <Link href="/student/rewards">
                  <Button variant="secondary" className="w-full">
                    {t('useGems')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily streak */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>🔥</span> {t('learningStreak')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-1">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        i < streakDays
                          ? 'bg-accent-gold/20 text-accent-gold'
                          : 'bg-bg-elevated text-text-muted'
                      }`}
                    >
                      {i < streakDays ? '🔥' : i + 1}
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-text-secondary mt-3">
                  {t('consecutiveDays', { days: streakDays })}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string | React.ReactNode;
  label: string;
  value: string;
  color: 'gem' | 'warning' | 'primary' | 'gold';
}) {
  const colorClasses = {
    gem: 'text-accent-gem',
    warning: 'text-warning',
    primary: 'text-accent-primary',
    gold: 'text-accent-gold',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-text-muted">{label}</p>
          <p className={`text-xl font-bold ${colorClasses[color]}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
