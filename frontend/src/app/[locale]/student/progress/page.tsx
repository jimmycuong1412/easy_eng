'use client';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// XP Level configuration
const XP_PER_LEVEL = 1000;
const XP_MULTIPLIER = 1.2; // Each level requires 20% more XP

function calculateLevel(totalXP: number): { level: number; currentXP: number; xpForNextLevel: number } {
  let level = 1;
  let xpRemaining = totalXP;
  let xpRequired = XP_PER_LEVEL;

  while (xpRemaining >= xpRequired) {
    xpRemaining -= xpRequired;
    level++;
    xpRequired = Math.floor(XP_PER_LEVEL * Math.pow(XP_MULTIPLIER, level - 1));
  }

  return {
    level,
    currentXP: xpRemaining,
    xpForNextLevel: xpRequired,
  };
}

// XP earning activities
const xpActivities = [
  { activity: 'Hoàn thành lớp học', xp: 100, icon: BookOpen },
  { activity: 'Đánh giá giáo viên', xp: 10, icon: Star },
  { activity: 'Streak hàng ngày', xp: 25, icon: Flame },
  { activity: 'Hoàn thành bài quiz', xp: 50, icon: Target },
  { activity: 'Đạt điểm cao quiz (>80%)', xp: 75, icon: Award },
  { activity: 'Giới thiệu bạn bè', xp: 200, icon: Gift },
];

// Level badges/titles
const levelTitles = [
  { minLevel: 1, title: 'Người mới', color: 'slate' },
  { minLevel: 5, title: 'Học sinh', color: 'green' },
  { minLevel: 10, title: 'Học viên', color: 'blue' },
  { minLevel: 20, title: 'Tinh thông', color: 'purple' },
  { minLevel: 35, title: 'Chuyên gia', color: 'amber' },
  { minLevel: 50, title: 'Bậc thầy', color: 'rose' },
  { minLevel: 75, title: 'Huyền thoại', color: 'cyan' },
  { minLevel: 100, title: 'Đại sư', color: 'gold' },
];

function getLevelTitle(level: number): { title: string; color: string } {
  let result = levelTitles[0];
  for (const t of levelTitles) {
    if (level >= t.minLevel) result = t;
  }
  return result;
}

// Mock user data
const mockUserProgress = {
  totalXP: 4750,
  weeklyXP: 850,
  monthlyXP: 3200,
  currentStreak: 7,
  longestStreak: 14,
  classesCompleted: 23,
  quizzesCompleted: 45,
  averageQuizScore: 82,
  careerAvatar: 'Business Pro',
  careerAvatarProgress: 35,
  recentXPHistory: [
    { date: '2026-01-22', activity: 'Hoàn thành lớp học', xp: 100, time: '10:30' },
    { date: '2026-01-22', activity: 'Streak hàng ngày', xp: 25, time: '10:31' },
    { date: '2026-01-22', activity: 'Đánh giá giáo viên', xp: 10, time: '10:35' },
    { date: '2026-01-21', activity: 'Hoàn thành bài quiz', xp: 50, time: '15:20' },
    { date: '2026-01-21', activity: 'Đạt điểm cao quiz (>80%)', xp: 75, time: '15:21' },
    { date: '2026-01-21', activity: 'Hoàn thành lớp học', xp: 100, time: '14:00' },
    { date: '2026-01-20', activity: 'Hoàn thành lớp học', xp: 100, time: '09:30' },
    { date: '2026-01-20', activity: 'Streak hàng ngày', xp: 25, time: '09:31' },
  ],
  achievements: [
    { id: 'first_class', name: 'Lớp đầu tiên', description: 'Hoàn thành lớp học đầu tiên', unlocked: true, xpReward: 50 },
    { id: 'streak_7', name: 'Kiên trì 7 ngày', description: 'Đạt streak 7 ngày', unlocked: true, xpReward: 100 },
    { id: 'quiz_master', name: 'Quiz Master', description: 'Hoàn thành 10 bài quiz', unlocked: true, xpReward: 150 },
    { id: 'classes_10', name: '10 lớp học', description: 'Hoàn thành 10 lớp học', unlocked: true, xpReward: 200 },
    { id: 'classes_25', name: '25 lớp học', description: 'Hoàn thành 25 lớp học', unlocked: false, xpReward: 300 },
    { id: 'streak_30', name: 'Kiên trì 30 ngày', description: 'Đạt streak 30 ngày', unlocked: false, xpReward: 500 },
  ],
  weeklyLeaderboard: [
    { rank: 1, name: 'Trần Minh', avatar: '', xp: 1250, isCurrentUser: false },
    { rank: 2, name: 'Nguyễn Hà', avatar: '', xp: 1100, isCurrentUser: false },
    { rank: 3, name: 'Lê Hoàng', avatar: '', xp: 980, isCurrentUser: false },
    { rank: 4, name: 'Bạn', avatar: '', xp: 850, isCurrentUser: true },
    { rank: 5, name: 'Võ Lan', avatar: '', xp: 720, isCurrentUser: false },
  ],
};

export default function XPProgressPage() {
  const levelInfo = calculateLevel(mockUserProgress.totalXP);
  const levelTitle = getLevelTitle(levelInfo.level);
  const progressPercent = (levelInfo.currentXP / levelInfo.xpForNextLevel) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-4xl mx-auto px-4 py-8">
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
              <Badge className={`bg-${levelTitle.color}-500/20 text-${levelTitle.color}-400 border-0 px-3`}>
                {levelTitle.title}
              </Badge>
            </div>
          </motion.div>

          <h1 className="text-2xl font-bold text-white mt-6 mb-2">
            {formatNumber(mockUserProgress.totalXP)} XP
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
              Còn {levelInfo.xpForNextLevel - levelInfo.currentXP} XP nữa để lên level
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
              <p className="text-xl font-bold text-white">{mockUserProgress.weeklyXP}</p>
              <p className="text-xs text-slate-400">XP tuần này</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{mockUserProgress.currentStreak}</p>
              <p className="text-xs text-slate-400">Streak hiện tại</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 text-[#3B82F6] mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{mockUserProgress.classesCompleted}</p>
              <p className="text-xs text-slate-400">Lớp hoàn thành</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{mockUserProgress.averageQuizScore}%</p>
              <p className="text-xs text-slate-400">Điểm quiz TB</p>
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
                  Cách kiếm XP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {xpActivities.map((activity) => (
                  <div
                    key={activity.activity}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                      <activity.icon className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{activity.activity}</p>
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
                  Lịch sử XP gần đây
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[350px] overflow-y-auto">
                {mockUserProgress.recentXPHistory.map((item, index) => (
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
                Thành tích
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {mockUserProgress.achievements.map((achievement) => (
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
                  Bảng xếp hạng tuần
                </div>
                <Button variant="ghost" size="sm" className="text-[#3B82F6]">
                  Xem tất cả
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockUserProgress.weeklyLeaderboard.map((user) => (
                <div
                  key={user.rank}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    user.isCurrentUser
                      ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/30'
                      : 'bg-white/5'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      user.rank === 1
                        ? 'bg-amber-500 text-white'
                        : user.rank === 2
                          ? 'bg-slate-400 text-white'
                          : user.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {user.rank}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        user.isCurrentUser ? 'text-[#3B82F6]' : 'text-white'
                      }`}
                    >
                      {user.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{formatNumber(user.xp)} XP</p>
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
