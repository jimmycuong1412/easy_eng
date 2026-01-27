'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Trophy,
  Star,
  Target,
  ChevronRight,
  CheckCircle,
  Lock,
  Play,
  Zap,
  Calendar,
  TrendingUp,
  Award,
} from 'lucide-react';

import { formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

// Mock learning path data
const mockLearningPath = {
  id: 'business-pro-path',
  careerAvatar: 'Business Pro',
  title: 'Lộ trình Business Pro',
  description: 'Thành thạo tiếng Anh thương mại trong 6 tháng',
  totalModules: 8,
  completedModules: 2,
  totalLessons: 48,
  completedLessons: 14,
  estimatedDuration: '6 tháng',
  currentLevel: 'Pre-Intermediate',
  targetLevel: 'Upper-Intermediate',
  weeklyGoal: 3,
  weeklyProgress: 2,
  totalXPEarned: 1420,
  modules: [
    {
      id: 'module-1',
      title: 'Foundation: Business Basics',
      description: 'Nền tảng từ vựng và cấu trúc câu trong kinh doanh',
      lessons: 6,
      completedLessons: 6,
      status: 'completed',
      xpReward: 300,
      badge: 'Business Starter',
    },
    {
      id: 'module-2',
      title: 'Email & Written Communication',
      description: 'Kỹ năng viết email và văn bản chuyên nghiệp',
      lessons: 6,
      completedLessons: 6,
      status: 'completed',
      xpReward: 350,
      badge: 'Email Expert',
    },
    {
      id: 'module-3',
      title: 'Meeting Skills',
      description: 'Tham gia và dẫn dắt cuộc họp hiệu quả',
      lessons: 6,
      completedLessons: 2,
      status: 'in_progress',
      xpReward: 400,
      badge: 'Meeting Master',
      currentLesson: {
        id: 'lesson-3-3',
        title: 'Expressing Opinions in Meetings',
        type: 'class',
        duration: 25,
      },
    },
    {
      id: 'module-4',
      title: 'Presentation Skills',
      description: 'Thuyết trình tự tin và chuyên nghiệp',
      lessons: 6,
      completedLessons: 0,
      status: 'locked',
      xpReward: 450,
      badge: 'Presenter Pro',
      unlockRequirement: 'Hoàn thành Module 3',
    },
    {
      id: 'module-5',
      title: 'Negotiation & Persuasion',
      description: 'Kỹ năng đàm phán và thuyết phục',
      lessons: 6,
      completedLessons: 0,
      status: 'locked',
      xpReward: 500,
      badge: 'Negotiator',
      unlockRequirement: 'Hoàn thành Module 4',
    },
    {
      id: 'module-6',
      title: 'Business Phone Calls',
      description: 'Giao tiếp qua điện thoại chuyên nghiệp',
      lessons: 6,
      completedLessons: 0,
      status: 'locked',
      xpReward: 400,
      badge: 'Phone Pro',
      unlockRequirement: 'Hoàn thành Module 5',
    },
    {
      id: 'module-7',
      title: 'Cross-cultural Communication',
      description: 'Giao tiếp hiệu quả trong môi trường đa văn hóa',
      lessons: 6,
      completedLessons: 0,
      status: 'locked',
      xpReward: 450,
      badge: 'Global Communicator',
      unlockRequirement: 'Hoàn thành Module 6',
    },
    {
      id: 'module-8',
      title: 'Leadership Communication',
      description: 'Kỹ năng giao tiếp lãnh đạo',
      lessons: 6,
      completedLessons: 0,
      status: 'locked',
      xpReward: 550,
      badge: 'Business Leader',
      unlockRequirement: 'Hoàn thành Module 7',
    },
  ],
  recommendedClasses: [
    {
      id: 'class-1',
      title: 'Expressing Opinions in Meetings',
      teacher: 'Nguyễn Minh Anh',
      teacherAvatar: '/avatars/teacher1.png',
      duration: 25,
      price: 200000,
      isNextInPath: true,
    },
    {
      id: 'class-2',
      title: 'Leading a Meeting',
      teacher: 'Trần Hải Đăng',
      teacherAvatar: '/avatars/teacher2.png',
      duration: 25,
      price: 250000,
    },
    {
      id: 'class-3',
      title: 'Summarizing & Action Items',
      teacher: 'Lê Thu Hà',
      teacherAvatar: '/avatars/teacher3.png',
      duration: 25,
      price: 200000,
    },
  ],
  achievements: [
    { id: 'a1', name: 'Path Starter', description: 'Bắt đầu lộ trình', unlocked: true, icon: '🎯' },
    { id: 'a2', name: 'Module 1 Complete', description: 'Hoàn thành Module 1', unlocked: true, icon: '📚' },
    { id: 'a3', name: 'Email Expert', description: 'Hoàn thành Module 2', unlocked: true, icon: '✉️' },
    { id: 'a4', name: 'Meeting Master', description: 'Hoàn thành Module 3', unlocked: false, icon: '🗣️' },
    { id: 'a5', name: 'Halfway There', description: 'Hoàn thành 50% lộ trình', unlocked: false, icon: '🏃' },
    { id: 'a6', name: 'Business Pro', description: 'Hoàn thành toàn bộ lộ trình', unlocked: false, icon: '🏆' },
  ],
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export default function LearningPathPage() {
  const overallProgress = (mockLearningPath.completedLessons / mockLearningPath.totalLessons) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 mb-3">
            {mockLearningPath.careerAvatar}
          </Badge>
          <h1 className="text-3xl font-bold text-white mb-2">{mockLearningPath.title}</h1>
          <p className="text-slate-400">{mockLearningPath.description}</p>
        </motion.div>

        {/* Progress Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-[#3B82F6]/20 to-purple-500/20 border-[#3B82F6]/30 mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Circular Progress */}
                <div className="relative w-32 h-32 mx-auto md:mx-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="8"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '0 352' }}
                      animate={{ strokeDasharray: `${(overallProgress / 100) * 352} 352` }}
                      transition={{ duration: 1 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{Math.round(overallProgress)}%</span>
                    <span className="text-xs text-slate-400">Hoàn thành</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center md:text-left">
                    <p className="text-2xl font-bold text-white">
                      {mockLearningPath.completedModules}/{mockLearningPath.totalModules}
                    </p>
                    <p className="text-sm text-slate-400">Modules</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-2xl font-bold text-white">
                      {mockLearningPath.completedLessons}/{mockLearningPath.totalLessons}
                    </p>
                    <p className="text-sm text-slate-400">Bài học</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-2xl font-bold text-amber-400">
                      {formatNumber(mockLearningPath.totalXPEarned)}
                    </p>
                    <p className="text-sm text-slate-400">XP kiếm được</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-2xl font-bold text-emerald-400">
                      {mockLearningPath.weeklyProgress}/{mockLearningPath.weeklyGoal}
                    </p>
                    <p className="text-sm text-slate-400">Mục tiêu tuần</p>
                  </div>
                </div>
              </div>

              {/* Level Progress */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{mockLearningPath.currentLevel}</span>
                  <span className="text-sm text-[#3B82F6]">{mockLearningPath.targetLevel}</span>
                </div>
                <Progress value={overallProgress} className="h-2 bg-white/10" />
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Dự kiến hoàn thành trong {mockLearningPath.estimatedDuration}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content - Modules */}
          <div className="md:col-span-2">
            {/* Continue Learning */}
            {mockLearningPath.modules.find((m) => m.status === 'in_progress')?.currentLesson && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-6"
              >
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="p-5">
                    <p className="text-xs text-emerald-400 font-semibold mb-2">TIẾP TỤC HỌC</p>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {mockLearningPath.modules.find((m) => m.status === 'in_progress')?.currentLesson?.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Module: {mockLearningPath.modules.find((m) => m.status === 'in_progress')?.title}
                    </p>
                    <Button className="bg-emerald-500 hover:bg-emerald-500/90">
                      <Play className="w-4 h-4 mr-2" />
                      Tiếp tục bài học
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Modules List */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#3B82F6]" />
                Các Module
              </h2>

              <div className="space-y-4">
                {mockLearningPath.modules.map((module, index) => (
                  <motion.div key={module.id} variants={itemVariants}>
                    <Card
                      className={`transition-all ${
                        module.status === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : module.status === 'in_progress'
                            ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30'
                            : 'bg-white/5 border-white/10 opacity-60'
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Module Number */}
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                              module.status === 'completed'
                                ? 'bg-emerald-500 text-white'
                                : module.status === 'in_progress'
                                  ? 'bg-[#3B82F6] text-white'
                                  : 'bg-white/10 text-slate-500'
                            }`}
                          >
                            {module.status === 'completed' ? (
                              <CheckCircle className="w-6 h-6" />
                            ) : module.status === 'locked' ? (
                              <Lock className="w-5 h-5" />
                            ) : (
                              index + 1
                            )}
                          </div>

                          {/* Module Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3
                                className={`font-semibold ${
                                  module.status === 'locked' ? 'text-slate-400' : 'text-white'
                                }`}
                              >
                                {module.title}
                              </h3>
                              {module.badge && module.status === 'completed' && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
                                  🏅 {module.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-3">{module.description}</p>

                            {/* Progress */}
                            {module.status !== 'locked' && (
                              <div className="flex items-center gap-3">
                                <Progress
                                  value={(module.completedLessons / module.lessons) * 100}
                                  className="h-2 flex-1 bg-white/10"
                                />
                                <span className="text-sm text-slate-400 whitespace-nowrap">
                                  {module.completedLessons}/{module.lessons} bài
                                </span>
                              </div>
                            )}

                            {module.status === 'locked' && module.unlockRequirement && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                {module.unlockRequirement}
                              </p>
                            )}
                          </div>

                          {/* XP Reward */}
                          <div className="text-right">
                            <Badge
                              className={`${
                                module.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              } border-0`}
                            >
                              {module.status === 'completed' ? '✓' : '+'}{module.xpReward} XP
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recommended Classes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#3B82F6]" />
                    Lớp học đề xuất
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockLearningPath.recommendedClasses.map((cls) => (
                    <Link
                      key={cls.id}
                      href={`/classes/${cls.id}`}
                      className={`block p-3 rounded-lg transition-colors ${
                        cls.isNextInPath
                          ? 'bg-[#3B82F6]/10 border border-[#3B82F6]/30 hover:border-[#3B82F6]/50'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {cls.isNextInPath && (
                        <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0 text-xs mb-2">
                          Tiếp theo trong lộ trình
                        </Badge>
                      )}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={cls.teacherAvatar} />
                          <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                            {cls.teacher.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{cls.title}</p>
                          <p className="text-xs text-slate-500">{cls.teacher}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-slate-500">{cls.duration} phút</span>
                        <span className="text-white font-semibold">{formatVND(cls.price)}</span>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Thành tích lộ trình
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {mockLearningPath.achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`text-center p-3 rounded-lg ${
                          achievement.unlocked
                            ? 'bg-amber-500/10 border border-amber-500/20'
                            : 'bg-white/5 opacity-50'
                        }`}
                      >
                        <div className="text-2xl mb-1">{achievement.icon}</div>
                        <p className="text-xs text-white font-medium truncate">{achievement.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
