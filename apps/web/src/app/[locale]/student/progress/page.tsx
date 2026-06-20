'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Star,
  Flame,
  Target,
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  Zap,
  ChevronRight,
  Lock,
  Gift,
} from 'lucide-react';

import { formatNumber } from '@/lib/utils';
import { useAuth } from '@easyeng/core';
import { getStudentProgress, getLeaderboard } from '@easyeng/core';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslations } from 'next-intl';

// XP Level configuration
const XP_PER_LEVEL = 1000;
const XP_MULTIPLIER = 1.2;

function calculateLevel(totalXP: number): { level: number; currentXP: number; xpForNextLevel: number } {
  let level = 1;
  let xpRemaining = totalXP;
  let xpRequired = XP_PER_LEVEL;

  while (xpRemaining >= xpRequired) {
    xpRemaining -= xpRequired;
    level++;
    xpRequired = Math.floor(XP_PER_LEVEL * Math.pow(XP_MULTIPLIER, level - 1));
  }

  return { level, currentXP: xpRemaining, xpForNextLevel: xpRequired };
}

const levelConfigs = [
  { minLevel: 1, key: 'newbie', color: 'slate' },
  { minLevel: 5, key: 'student', color: 'green' },
  { minLevel: 10, key: 'learner', color: 'blue' },
  { minLevel: 20, key: 'proficient', color: 'purple' },
  { minLevel: 35, key: 'expert', color: 'amber' },
  { minLevel: 50, key: 'master', color: 'rose' },
  { minLevel: 75, key: 'legend', color: 'cyan' },
  { minLevel: 100, key: 'grandmaster', color: 'gold' },
];

function getLevelConfig(level: number): { key: string; color: string } {
  let result = levelConfigs[0];
  for (const c of levelConfigs) {
    if (level >= c.minLevel) result = c;
  }
  return result;
}

type UserProgress = {
  totalXP: number;
  weeklyXP: number;
  currentStreak: number;
  classesCompleted: number;
  averageQuizScore: number;
  recentXPHistory: Array<{ date: string; activity: string; xp: number; time: string }>;
  achievements: Array<{ id: string; name: string; description: string; unlocked: boolean; xpReward: number }>;
  weeklyLeaderboard: Array<{ rank: number; name: string; avatar: string; xp: number; isCurrentUser: boolean }>;
};

export default function XPProgressPage() {
  const { user } = useAuth();
  const t = useTranslations('progress');
  const [userProgress, setUserProgress] = React.useState<UserProgress>({
    totalXP: 0, weeklyXP: 0, currentStreak: 0, classesCompleted: 0, averageQuizScore: 0,
    recentXPHistory: [], achievements: [], weeklyLeaderboard: [],
  });

  const xpActivities = [
    { key: 'completeClass', xp: 100, icon: BookOpen },
    { key: 'rateTeacher', xp: 10, icon: Star },
    { key: 'dailyStreak', xp: 25, icon: Flame },
    { key: 'completeQuiz', xp: 50, icon: Target },
    { key: 'highScore', xp: 75, icon: Award },
    { key: 'referFriend', xp: 200, icon: Gift },
  ];

  React.useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();

    Promise.all([
      getStudentProgress(user.id).catch(() => null),
      supabase.from('xp_transactions').select('*').eq('student_id', user.id)
        .order('created_at', { ascending: false }).limit(10).then(({ data }) => data || []),
      supabase.from('attendance_streaks').select('*').eq('student_id', user.id)
        .single().then(({ data }) => data),
      getLeaderboard(5).catch(() => []),
    ]).then(([careerRaw, xpHistory, streak, leaderboard]) => {
      const career = careerRaw as any;
      const recentXP = xpHistory.map((x: Record<string, unknown>) => ({
        date: (x.created_at as string)?.slice(0, 10) || '',
        activity: (x.activity_description as string) || (x.activity_type as string) || 'Activity',
        xp: (x.xp_amount as number) || 0,
        time: new Date(x.created_at as string).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      }));

      const weeklyLb = (leaderboard || []).map((entry: Record<string, unknown>, i: number) => {
        const profile = entry.profiles as Record<string, unknown> | undefined;
        return {
          rank: i + 1,
          name: entry.student_id === user.id ? t('you') : ((profile?.full_name as string) || 'Student'),
          avatar: (profile?.avatar_url as string) || '',
          xp: (entry.total_xp_earned as number) || 0,
          isCurrentUser: entry.student_id === user.id,
        };
      });

      setUserProgress({
        totalXP: career?.total_xp_earned || 0,
        weeklyXP: xpHistory.reduce((sum: number, x: Record<string, unknown>) => sum + ((x.xp_amount as number) || 0), 0),
        currentStreak: streak?.current_streak || 0,
        classesCompleted: 0,
        averageQuizScore: 0,
        recentXPHistory: recentXP,
        achievements: [],
        weeklyLeaderboard: weeklyLb,
      });
    });
  }, [user?.id, t]);

  const levelInfo = calculateLevel(userProgress.totalXP);
  const levelConfig = getLevelConfig(levelInfo.level);
  const progressPercent = (levelInfo.currentXP / levelInfo.xpForNextLevel) * 100;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Level */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative inline-block"
          >
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#3B82F6] to-purple-500 flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-white">{levelInfo.level}</span>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <Badge className={`bg-${levelConfig.color}-500/20 text-${levelConfig.color}-400 border-0 px-3`}>
                {t(`levelTitles.${levelConfig.key}`)}
              </Badge>
            </div>
          </motion.div>

          <h1 className="text-2xl font-bold text-white mt-6 mb-2">
            {formatNumber(userProgress.totalXP)} XP
          </h1>

          {/* XP Progress Bar */}
          <div className="max-w-sm mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Level {levelInfo.level}</span>
              <span className="text-slate-400">Level {levelInfo.level + 1}</span>
            </div>
            <div className="relative">
              <Progress value={progressPercent} className="h-4 bg-white/10" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                {levelInfo.currentXP} / {levelInfo.xpForNextLevel} XP
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {t('xpToNext', { xp: levelInfo.xpForNextLevel - levelInfo.currentXP })}
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Zap className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{userProgress.weeklyXP}</p>
              <p className="text-xs text-slate-400">{t('weeklyXP')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{userProgress.currentStreak}</p>
              <p className="text-xs text-slate-400">{t('currentStreak')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 text-[#3B82F6] mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{userProgress.classesCompleted}</p>
              <p className="text-xs text-slate-400">{t('classesCompleted')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{userProgress.averageQuizScore}%</p>
              <p className="text-xs text-slate-400">{t('avgQuizScore')}</p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* XP Activities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 h-full">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  {t('howToEarnXP')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {xpActivities.map((activity) => (
                  <div
                    key={activity.key}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                      <activity.icon className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{t(`activities.${activity.key}`)}</p>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-0">
                      +{activity.xp} XP
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent XP History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="bg-white/5 border-white/10 h-full">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  {t('recentXPHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[350px] overflow-y-auto">
                {userProgress.recentXPHistory.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
                  >
                    <div>
                      <p className="text-sm text-white">{item.activity}</p>
                      <p className="text-xs text-slate-500">
                        {item.date} • {item.time}
                      </p>
                    </div>
                    <span className="text-sm text-emerald-400 font-semibold">+{item.xp} XP</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                {t('achievements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {userProgress.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg text-center ${
                      achievement.unlocked
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : 'bg-white/5 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        achievement.unlocked
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-700/50 text-slate-500'
                      }`}
                    >
                      {achievement.unlocked ? (
                        <Award className="w-6 h-6" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </div>
                    <h4
                      className={`font-semibold text-sm ${
                        achievement.unlocked ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {achievement.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">{achievement.description}</p>
                    <Badge
                      className={`mt-2 ${
                        achievement.unlocked
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-700/50 text-slate-500'
                      } border-0`}
                    >
                      +{achievement.xpReward} XP
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6"
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  {t('weeklyLeaderboard')}
                </div>
                <Button variant="ghost" size="sm" className="text-[#3B82F6]">
                  {t('viewAll')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userProgress.weeklyLeaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    entry.isCurrentUser
                      ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/30'
                      : 'bg-white/5'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      entry.rank === 1
                        ? 'bg-amber-500 text-white'
                        : entry.rank === 2
                          ? 'bg-slate-400 text-white'
                          : entry.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {entry.rank}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={entry.avatar} />
                    <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                      {entry.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className={`font-semibold ${entry.isCurrentUser ? 'text-[#3B82F6]' : 'text-white'}`}>
                      {entry.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{formatNumber(entry.xp)} XP</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
