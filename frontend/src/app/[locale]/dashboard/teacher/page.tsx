'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Star,
  Plus,
  ChevronRight,
  Video,
  BookOpen,
  Bell,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getTeacherSchedule } from '@/lib/queries';
import { ActiveClassBanner } from '@/components/common/ActiveClassBanner';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type ClassItem = {
  id: string;
  studentName: string;
  studentAvatar: string | undefined;
  time: string;
  duration: number;
  topic: string;
  status: string;
};

type ReviewItem = {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  date: string;
};

export default function TeacherDashboardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const t = useTranslations('teacherDashboard');
  const [todayClasses, setTodayClasses] = React.useState<ClassItem[]>([]);
  const [recentReviews, setRecentReviews] = React.useState<ReviewItem[]>([]);
  const [weeklyStats, setWeeklyStats] = React.useState({
    classesCompleted: 0,
    classesTarget: 35,
    hoursTeaching: 0,
    newStudents: 0,
    repeatRate: 0,
  });
  const [stats, setStats] = React.useState({ earnings: '0', students: 0, avgRating: 0, totalReviews: 0 });


  React.useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    Promise.all([
      // Today's sessions
      getTeacherSchedule(user.id).catch(() => ({ availability: [], sessions: [] })),
      // Recent reviews
      supabase
        .from('reviews')
        .select('*, profiles!reviews_student_id_fkey(full_name, avatar_url)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)
        .then(({ data }) => data || []),
      // Teacher profile stats
      supabase
        .from('profiles')
        .select('average_rating, total_reviews')
        .eq('id', user.id)
        .single()
        .then(({ data }) => data),
      // Weekly completed classes count
      supabase
        .from('class_sessions')
        .select('id, duration_minutes')
        .eq('teacher_id', user.id)
        .eq('status', 'ended')
        .gte('actual_start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .then(({ data }) => data || []),
    ]).then(([schedule, reviews, profileStats, weeklySessions]) => {
      // Map today's sessions
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const todaySessions = (schedule.sessions || [])
        .filter((s: Record<string, unknown>) => (s.scheduled_start_time as string)?.startsWith(todayStr))
        .map((s: Record<string, unknown>) => {
          const cls = s.classes as Record<string, unknown> | undefined;
          const startTime = new Date(s.scheduled_start_time as string);
          const sessionStatus = s.status === 'in_progress' ? 'in-progress' : 'upcoming';
          return {
            id: s.id as string,
            studentName: (cls?.title as string) || 'Class',
            studentAvatar: undefined,
            time: startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            duration: (cls?.duration_minutes as number) || 25,
            topic: (cls?.title as string) || 'English Class',
            status: sessionStatus,
          };
        });
      setTodayClasses(todaySessions);

      // Map reviews — store raw diff hours, format with t() in render
      const mappedReviews = (reviews || []).map((r: Record<string, unknown>) => {
        const student = r.profiles as Record<string, unknown> | undefined;
        const createdAt = new Date(r.created_at as string);
        const diffHours = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
        return {
          id: r.id as string,
          studentName: (student?.full_name as string) || 'Student',
          rating: (r.rating as number) || 5,
          comment: (r.comment as string) || '',
          date: String(diffHours), // raw hours, formatted in render
        };
      });
      setRecentReviews(mappedReviews);

      // Stats
      const totalHours = weeklySessions.reduce((sum: number, s: Record<string, unknown>) =>
        sum + ((s.duration_minutes as number) || 0), 0) / 60;
      setWeeklyStats({
        classesCompleted: weeklySessions.length,
        classesTarget: 35,
        hoursTeaching: Math.round(totalHours * 10) / 10,
        newStudents: 0,
        repeatRate: 0,
      });

      setStats({
        earnings: '0',
        students: 0,
        avgRating: (profileStats?.average_rating as number) || 0,
        totalReviews: (profileStats?.total_reviews as number) || 0,
      });
    });
  }, [user?.id]);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? t('goodMorning')
      : currentHour < 18
        ? t('goodAfternoon')
        : t('goodEvening');

  const formatReviewDate = (rawHours: string) => {
    const diffHours = parseInt(rawHours, 10);
    if (diffHours < 1) return t('minutesAgo', { n: Math.max(1, diffHours * 60) });
    if (diffHours < 24) return t('hoursAgo', { n: diffHours });
    return t('daysAgo', { n: Math.floor(diffHours / 24) });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {greeting}, {profile?.full_name?.split(' ').pop() || 'Teacher'}! 👋
          </h1>
          <p className="text-slate-400 mt-1">
            {todayClasses.length === 0
              ? t('noClassesToday')
              : t(todayClasses.length === 1 ? 'classesToday' : 'classesTodayPlural', { n: todayClasses.length })}
          </p>
        </motion.div>
        <motion.div variants={itemVariants} className="flex gap-3">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Bell className="w-4 h-4 mr-2" />
            {t('notifications')}
            <Badge className="ml-2 bg-red-500 text-white text-xs">3</Badge>
          </Button>
          <Button className="bg-[#3B82F6] hover:bg-[#3B82F6]/90" onClick={() => router.push('/teacher/schedule')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('createClass')}
          </Button>
        </motion.div>
      </div>

      {/* Active class reconnect banner */}
      <motion.div variants={itemVariants}>
        <ActiveClassBanner userId={user?.id} role="teacher" />
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-[#3B82F6]/20 to-[#3B82F6]/5 border-[#3B82F6]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{t('todayClasses')}</p>
                  <p className="text-2xl font-bold text-white mt-1">{todayClasses.length}</p>
                </div>
                <div className="p-3 bg-[#3B82F6]/20 rounded-xl">
                  <Calendar className="w-6 h-6 text-[#3B82F6]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{t('weeklyEarnings')}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.earnings}</p>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{t('students')}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.students}</p>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{t('avgRating')}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.avgRating || '—'}</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Star className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-white/5 border-white/10 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#3B82F6]" />
                {t('todaySchedule')}
              </CardTitle>
              <Link href="/dashboard/schedule">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  {t('viewAll')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayClasses.length === 0 && (
                <p className="text-slate-400 text-sm py-4 text-center">{t('noSchedule')}</p>
              )}
              {todayClasses.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    classItem.status === 'in-progress'
                      ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/40'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-bold text-white">{classItem.time}</p>
                    <p className="text-xs text-slate-400">{t('durationMin', { n: classItem.duration })}</p>
                  </div>

                  <div className="h-12 w-px bg-white/10" />

                  <Avatar className="h-12 w-12">
                    <AvatarImage src={classItem.studentAvatar} />
                    <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                      {classItem.studentName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{classItem.studentName}</p>
                    <p className="text-sm text-slate-400 truncate">{classItem.topic}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {classItem.status === 'in-progress' ? (
                      <Button className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
                        <Video className="w-4 h-4 mr-2" />
                        {t('joinClass')}
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                          <BookOpen className="w-4 h-4" />
                        </Button>
                        <Badge variant="outline" className="border-slate-500 text-slate-400">
                          {t('upcoming')}
                        </Badge>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Progress */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                {t('weeklyProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Classes Progress */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">{t('classesTaught')}</span>
                  <span className="text-sm text-white">
                    {weeklyStats.classesCompleted}/{weeklyStats.classesTarget}
                  </span>
                </div>
                <Progress
                  value={(weeklyStats.classesCompleted / weeklyStats.classesTarget) * 100}
                  className="h-2 bg-white/10"
                />
              </div>

              {/* Hours Teaching */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#3B82F6]/20 rounded-lg">
                    <Clock className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <span className="text-slate-400">{t('teachingHours')}</span>
                </div>
                <span className="text-xl font-bold text-white">{weeklyStats.hoursTeaching}h</span>
              </div>

              {/* Repeat Rate */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-slate-400">{t('repeatRate')}</span>
                </div>
                <span className="text-xl font-bold text-emerald-400">{weeklyStats.repeatRate}%</span>
              </div>

              {/* New Students */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-slate-400">{t('newStudents')}</span>
                </div>
                <span className="text-xl font-bold text-amber-400">+{weeklyStats.newStudents}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Reviews */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              {t('recentReviews')}
            </CardTitle>
            <Link href="/dashboard/reviews">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                {t('viewAll')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReviews.length === 0 && (
              <p className="text-slate-400 text-sm py-4 text-center">{t('noReviews')}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">{formatReviewDate(review.date)}</span>
                  </div>
                  <p className="text-white font-medium mb-1">{review.studentName}</p>
                  <p className="text-sm text-slate-400 line-clamp-2">{review.comment}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
