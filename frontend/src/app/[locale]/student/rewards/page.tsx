'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy,
  Star,
  Calendar,
  BookOpen,
  MessageSquare,
  Users,
  Target,
  Flame,
  Gift,
  Cookie,
  ChevronRight,
  CheckCircle,
  Lock,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Activity rewards configuration
const activityRewards = {
  // One-time rewards
  oneTime: [
    {
      id: 'first_booking',
      title: 'Lớp học đầu tiên',
      description: 'Đặt và hoàn thành lớp học đầu tiên',
      cookies: 20,
      icon: BookOpen,
      completed: true,
      completedAt: '2026-01-15T10:00:00+07:00',
    },
    {
      id: 'complete_profile',
      title: 'Hoàn thiện hồ sơ',
      description: 'Điền đầy đủ thông tin cá nhân',
      cookies: 10,
      icon: Users,
      completed: true,
      completedAt: '2026-01-10T09:00:00+07:00',
    },
    {
      id: 'first_review',
      title: 'Đánh giá đầu tiên',
      description: 'Đánh giá giáo viên sau lớp học',
      cookies: 5,
      icon: Star,
      completed: true,
      completedAt: '2026-01-15T11:00:00+07:00',
    },
    {
      id: 'career_avatar',
      title: 'Chọn Career Avatar',
      description: 'Thiết lập mục tiêu nghề nghiệp',
      cookies: 15,
      icon: Target,
      completed: false,
    },
  ],
  // Recurring rewards
  recurring: [
    {
      id: 'class_completion',
      title: 'Hoàn thành lớp học',
      description: 'Nhận cookies sau mỗi lớp học',
      cookies: 5,
      icon: CheckCircle,
      frequency: 'Mỗi lớp',
      totalEarned: 25,
      timesCompleted: 5,
    },
    {
      id: 'daily_streak',
      title: 'Streak hàng ngày',
      description: 'Học liên tục nhiều ngày',
      cookies: 2,
      icon: Flame,
      frequency: 'Mỗi ngày',
      totalEarned: 14,
      timesCompleted: 7,
      currentStreak: 3,
    },
    {
      id: 'weekly_goal',
      title: 'Mục tiêu tuần',
      description: 'Hoàn thành 3 lớp trong tuần',
      cookies: 15,
      icon: Trophy,
      frequency: 'Mỗi tuần',
      totalEarned: 30,
      timesCompleted: 2,
    },
  ],
  // Achievement milestones
  milestones: [
    {
      id: 'classes_10',
      title: '10 lớp học',
      description: 'Hoàn thành 10 lớp học',
      cookies: 50,
      progress: 50,
      target: 10,
      current: 5,
      completed: false,
    },
    {
      id: 'classes_25',
      title: '25 lớp học',
      description: 'Hoàn thành 25 lớp học',
      cookies: 100,
      progress: 20,
      target: 25,
      current: 5,
      completed: false,
    },
    {
      id: 'streak_7',
      title: '7 ngày streak',
      description: 'Học liên tục 7 ngày',
      cookies: 30,
      progress: 43,
      target: 7,
      current: 3,
      completed: false,
    },
    {
      id: 'streak_30',
      title: '30 ngày streak',
      description: 'Học liên tục 30 ngày',
      cookies: 150,
      progress: 10,
      target: 30,
      current: 3,
      completed: false,
    },
    {
      id: 'reviews_10',
      title: '10 đánh giá',
      description: 'Đánh giá 10 giáo viên',
      cookies: 25,
      progress: 50,
      target: 10,
      current: 5,
      completed: false,
    },
  ],
};

// Stats
const stats = {
  totalCookiesEarned: 124,
  currentStreak: 3,
  longestStreak: 7,
  classesCompleted: 5,
  weeklyProgress: 2,
  weeklyGoal: 3,
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
  });
}

export default function RewardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 mb-4">
            <Cookie className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Phần thưởng hoạt động 🍪</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Hoàn thành các hoạt động để nhận Cookies và sử dụng chúng để giảm giá lớp học!
          </p>
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
              <Cookie className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-400">{stats.totalCookiesEarned}</p>
              <p className="text-xs text-slate-400">Tổng Cookies</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.currentStreak}</p>
              <p className="text-xs text-slate-400">Streak hiện tại</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 text-[#3B82F6] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{stats.classesCompleted}</p>
              <p className="text-xs text-slate-400">Lớp hoàn thành</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {stats.weeklyProgress}/{stats.weeklyGoal}
              </p>
              <p className="text-xs text-slate-400">Mục tiêu tuần</p>
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
                    <h3 className="font-semibold text-white">Mục tiêu tuần này</h3>
                    <p className="text-sm text-slate-400">Hoàn thành 3 lớp để nhận 15 🍪</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">
                    {stats.weeklyProgress}/{stats.weeklyGoal}
                  </p>
                  <p className="text-xs text-slate-400">lớp học</p>
                </div>
              </div>
              <Progress 
                value={(stats.weeklyProgress / stats.weeklyGoal) * 100} 
                className="h-3 bg-white/10"
              />
              <p className="text-xs text-slate-400 mt-2 text-center">
                Còn {stats.weeklyGoal - stats.weeklyProgress} lớp nữa để hoàn thành mục tiêu
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
            Thưởng một lần
          </h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 gap-4"
          >
            {activityRewards.oneTime.map((reward) => (
              <motion.div key={reward.id} variants={itemVariants}>
                <Card
                  className={`${
                    reward.completed
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        reward.completed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      {reward.completed ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <reward.icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold ${
                          reward.completed ? 'text-emerald-400' : 'text-white'
                        }`}
                      >
                        {reward.title}
                      </h3>
                      <p className="text-sm text-slate-400 truncate">{reward.description}</p>
                      {reward.completed && reward.completedAt && (
                        <p className="text-xs text-slate-500">
                          Hoàn thành {formatDate(reward.completedAt)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge
                        className={`${
                          reward.completed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        } border-0`}
                      >
                        {reward.completed ? '✓' : '+'}{reward.cookies} 🍪
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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
            Thưởng định kỳ
          </h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {activityRewards.recurring.map((reward) => (
              <motion.div key={reward.id} variants={itemVariants}>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                      <reward.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{reward.title}</h3>
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                          {reward.frequency}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">{reward.description}</p>
                      {reward.currentStreak !== undefined && (
                        <p className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          Streak hiện tại: {reward.currentStreak} ngày
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge className="bg-amber-500/20 text-amber-400 border-0 mb-1">
                        +{reward.cookies} 🍪
                      </Badge>
                      <p className="text-xs text-slate-400">
                        Đã nhận: <span className="text-white">{reward.totalEarned} 🍪</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        ({reward.timesCompleted} lần)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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
            Thành tích
          </h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid md:grid-cols-2 gap-4"
          >
            {activityRewards.milestones.map((milestone) => (
              <motion.div key={milestone.id} variants={itemVariants}>
                <Card
                  className={`${
                    milestone.completed
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">{milestone.title}</h3>
                      <Badge className="bg-amber-500/20 text-amber-400 border-0">
                        +{milestone.cookies} 🍪
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{milestone.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Tiến độ</span>
                        <span className="text-white">
                          {milestone.current}/{milestone.target}
                        </span>
                      </div>
                      <Progress 
                        value={milestone.progress} 
                        className="h-2 bg-white/10"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
