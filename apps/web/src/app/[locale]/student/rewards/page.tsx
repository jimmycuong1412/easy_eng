'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Star,
  Calendar,
  BookOpen,
  Users,
  Target,
  Flame,
  Gift,
  Gem,
  CheckCircle,
  Loader2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GemImage } from '@/components/common/GemImage';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@easyeng/core';
import { useTranslations, useLocale } from 'next-intl';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Static reward structure (no mock data — real counts come from DB)
const ONE_TIME_IDS = ['first_booking', 'complete_profile', 'first_review', 'career_avatar'];
const ONE_TIME_ICONS: Record<string, React.ElementType> = {
  first_booking: BookOpen,
  complete_profile: Users,
  first_review: Star,
  career_avatar: Target,
};

const RECURRING_IDS = ['class_completion', 'daily_streak', 'weekly_goal'];
const RECURRING_ICONS: Record<string, React.ElementType> = {
  class_completion: CheckCircle,
  daily_streak: Flame,
  weekly_goal: Trophy,
};
const RECURRING_GEMS: Record<string, number> = {
  class_completion: 5,
  daily_streak: 2,
  weekly_goal: 15,
};
const RECURRING_FREQ_KEY: Record<string, string> = {
  class_completion: 'perClass',
  daily_streak: 'perDay',
  weekly_goal: 'perWeek',
};

const MILESTONES = [
  { id: 'classes_10', target: 10, gems: 50 },
  { id: 'classes_25', target: 25, gems: 100 },
  { id: 'streak_7', target: 7, gems: 30 },
  { id: 'streak_30', target: 30, gems: 150 },
  { id: 'reviews_10', target: 10, gems: 25 },
];

interface RewardStats {
  totalGemsEarned: number;
  currentStreak: number;
  classesCompleted: number;
  weeklyProgress: number;
  weeklyGoal: number;
  // one-time completion flags
  firstBookingDone: boolean;
  profileCompleteDone: boolean;
  firstReviewDone: boolean;
  careerAvatarDone: boolean;
  firstBookingDate: string;
  firstReviewDate: string;
  // recurring totals
  classGemEarned: number;
  streakGemEarned: number;
  weeklyGemEarned: number;
  // milestone progress
  reviewsCount: number;
}

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export default function RewardsPage() {
  const { user } = useAuth();
  const t = useTranslations('rewards');
  const locale = useLocale();
  const [stats, setStats] = React.useState<RewardStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    const load = async () => {
      try {
        const [
          { data: gemData },
          { data: streakData },
          { data: bookings },
          { data: profile },
          { data: gemTransactions },
        ] = await Promise.all([
          supabase.rpc('get_gems_balance', { p_user_id: user.id }),
          supabase.from('attendance_streaks').select('current_streak').eq('student_id', user.id).maybeSingle(),
          supabase.from('bookings').select('id, created_at, status').eq('student_id', user.id).order('created_at'),
          supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
          supabase.from('gem_transactions').select('amount, transaction_type, created_at, reason').eq('user_id', user.id),
        ]);

        const completedBookings = (bookings || []).filter((b) => b.status === 'attended' || b.status === 'completed');
        const classesCompleted = completedBookings.length;
        const firstBookingDone = classesCompleted > 0;
        const firstBookingDate = firstBookingDone ? completedBookings[0]?.created_at || '' : '';

        // Weekly: bookings this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weeklyProgress = completedBookings.filter((b) => new Date(b.created_at) >= weekStart).length;

        const profileCompleteDone = !!(profile?.full_name);

        // Reviews done
        const { count: reviewsCount } = await supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', user.id);

        const firstReviewDone = (reviewsCount || 0) > 0;
        // Get first review date
        let firstReviewDate = '';
        if (firstReviewDone) {
          const { data: firstReview } = await supabase
            .from('reviews')
            .select('created_at')
            .eq('student_id', user.id)
            .order('created_at')
            .limit(1)
            .maybeSingle();
          firstReviewDate = firstReview?.created_at || '';
        }

        // Career avatar
        const { data: careerData } = await supabase
          .from('student_careers')
          .select('id')
          .eq('student_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        const hasCareer = !!careerData;

        // Gem breakdowns from transactions
        const txns = gemTransactions || [];
        const classGemEarned = txns.filter((t) => t.amount > 0 && (t.reason?.toLowerCase().includes('class') || t.transaction_type === 'class_completion')).reduce((s, t) => s + t.amount, 0);
        const streakGemEarned = txns.filter((t) => t.transaction_type === 'streak').reduce((s, t) => s + t.amount, 0);
        const weeklyGemEarned = txns.filter((t) => t.transaction_type === 'weekly_goal').reduce((s, t) => s + t.amount, 0);

        setStats({
          totalGemsEarned: gemData || 0,
          currentStreak: streakData?.current_streak || 0,
          classesCompleted,
          weeklyProgress,
          weeklyGoal: 3,
          firstBookingDone,
          profileCompleteDone,
          firstReviewDone,
          careerAvatarDone: !!hasCareer,
          firstBookingDate,
          firstReviewDate,
          classGemEarned,
          streakGemEarned,
          weeklyGemEarned,
          reviewsCount: reviewsCount || 0,
        });
      } catch (err) {
        console.error('Error loading rewards:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  const oneTimeData: Record<string, { completed: boolean; date: string }> = {
    first_booking: { completed: stats.firstBookingDone, date: stats.firstBookingDate },
    complete_profile: { completed: stats.profileCompleteDone, date: '' },
    first_review: { completed: stats.firstReviewDone, date: stats.firstReviewDate },
    career_avatar: { completed: stats.careerAvatarDone, date: '' },
  };

  const recurringEarned: Record<string, number> = {
    class_completion: stats.classGemEarned,
    daily_streak: stats.streakGemEarned,
    weekly_goal: stats.weeklyGemEarned,
  };

  const milestoneProgress: Record<string, number> = {
    classes_10: stats.classesCompleted,
    classes_25: stats.classesCompleted,
    streak_7: stats.currentStreak,
    streak_30: stats.currentStreak,
    reviews_10: stats.reviewsCount,
  };

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 mb-4">
            <Gem className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {t('title')} <GemImage size={28} className="inline-block align-middle ml-1" />
          </h1>
          <p className="text-slate-400 max-w-md mx-auto">{t('subtitle')}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30">
            <CardContent className="p-4 text-center">
              <Gem className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-400">{stats.totalGemsEarned}</p>
              <p className="text-xs text-slate-400">{t('totalGems')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.currentStreak}</p>
              <p className="text-xs text-slate-400">{t('currentStreak')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 text-[#3B82F6] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.classesCompleted}</p>
              <p className="text-xs text-slate-400">{t('classesCompleted')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {stats.weeklyProgress}/{stats.weeklyGoal}
              </p>
              <p className="text-xs text-slate-400">{t('weeklyGoal')}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Goal Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-[#3B82F6]/20 to-purple-500/20 border-[#3B82F6]/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-[#3B82F6]" />
                  <div>
                    <h3 className="font-semibold text-white">{t('weeklyGoalTitle')}</h3>
                    <p className="text-sm text-slate-400">
                      {t('weeklyGoalDesc')} <GemImage size={14} className="inline-block align-middle" />
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">
                    {stats.weeklyProgress}/{stats.weeklyGoal}
                  </p>
                  <p className="text-xs text-slate-400">{t('classes')}</p>
                </div>
              </div>
              <Progress
                value={(stats.weeklyProgress / stats.weeklyGoal) * 100}
                className="h-3 bg-white/10"
              />
              <p className="text-xs text-slate-400 mt-2 text-center">
                {t('classesLeft', { n: Math.max(0, stats.weeklyGoal - stats.weeklyProgress) })}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* One-time Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-400" />
            {t('oneTimeRewards')}
          </h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 gap-4"
          >
            {ONE_TIME_IDS.map((id) => {
              const Icon = ONE_TIME_ICONS[id];
              const { completed, date } = oneTimeData[id];
              return (
                <motion.div key={id} variants={itemVariants}>
                  <Card className={completed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                        {completed ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold ${completed ? 'text-emerald-400' : 'text-white'}`}>
                          {t(`rewardTitles.${id}`)}
                        </h3>
                        <p className="text-sm text-slate-400 truncate">{t(`rewardDescs.${id}`)}</p>
                        {completed && date && (
                          <p className="text-xs text-slate-500">
                            {t('completedOn', { date: formatDate(date, locale) })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className={`${completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} border-0`}>
                          {completed ? '✓' : '+'}{id === 'first_booking' ? 20 : id === 'complete_profile' ? 10 : id === 'first_review' ? 5 : 15}{' '}
                          <GemImage size={14} className="inline-block align-middle" />
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Recurring Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#3B82F6]" />
            {t('recurringRewards')}
          </h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {RECURRING_IDS.map((id) => {
              const Icon = RECURRING_ICONS[id];
              const earned = recurringEarned[id] || 0;
              const times = id === 'class_completion'
                ? stats.classesCompleted
                : id === 'daily_streak'
                  ? stats.currentStreak
                  : Math.floor(earned / (RECURRING_GEMS[id] || 1));
              return (
                <motion.div key={id} variants={itemVariants}>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{t(`rewardTitles.${id}`)}</h3>
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {t(`frequencies.${RECURRING_FREQ_KEY[id]}`)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">{t(`rewardDescs.${id}`)}</p>
                        {id === 'daily_streak' && (
                          <p className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {t('currentStreakLabel', { n: stats.currentStreak })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className="bg-amber-500/20 text-amber-400 border-0 mb-1">
                          +{RECURRING_GEMS[id]} <GemImage size={14} className="inline-block align-middle" />
                        </Badge>
                        <p className="text-xs text-slate-400">
                          {t('earned', { n: earned })} <GemImage size={14} className="inline-block align-middle" />
                        </p>
                        <p className="text-xs text-slate-500">{t('times', { n: times })}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Achievement Milestones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            {t('milestones')}
          </h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 gap-4"
          >
            {MILESTONES.map((milestone) => {
              const current = milestoneProgress[milestone.id] || 0;
              const pct = Math.min(100, Math.round((current / milestone.target) * 100));
              const completed = current >= milestone.target;
              return (
                <motion.div key={milestone.id} variants={itemVariants}>
                  <Card className={completed ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white">{t(`rewardTitles.${milestone.id}`)}</h3>
                        <Badge className="bg-amber-500/20 text-amber-400 border-0">
                          +{milestone.gems} <GemImage size={14} className="inline-block align-middle" />
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">{t(`rewardDescs.${milestone.id}`)}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">{t('progress')}</span>
                          <span className="text-white">{current}/{milestone.target}</span>
                        </div>
                        <Progress value={pct} className="h-2 bg-white/10" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
