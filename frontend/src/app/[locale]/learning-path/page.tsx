'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Trophy,
  CheckCircle,
  Lock,
  Play,
  Calendar,
} from 'lucide-react';

import { formatNumber } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { getStudentCareer, getClasses } from '@/lib/queries';
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

// Static learning path module templates
// These represent the curriculum structure for the Business English path.
const LEARNING_MODULES = [
  { id: 'module-1', title: 'Foundation: Business Basics', description: 'Core vocabulary and sentence structure for business', lessons: 6, xpReward: 300, badge: 'Business Starter' },
  { id: 'module-2', title: 'Email & Written Communication', description: 'Professional email and document writing skills', lessons: 6, xpReward: 350, badge: 'Email Expert' },
  { id: 'module-3', title: 'Meeting Skills', description: 'Participate in and lead meetings effectively', lessons: 6, xpReward: 400, badge: 'Meeting Master' },
  { id: 'module-4', title: 'Presentation Skills', description: 'Confident and professional presentations', lessons: 6, xpReward: 450, badge: 'Presenter Pro' },
  { id: 'module-5', title: 'Negotiation & Persuasion', description: 'Negotiation and persuasion skills', lessons: 6, xpReward: 500, badge: 'Negotiator' },
  { id: 'module-6', title: 'Business Phone Calls', description: 'Professional telephone communication', lessons: 6, xpReward: 400, badge: 'Phone Pro' },
  { id: 'module-7', title: 'Cross-cultural Communication', description: 'Effective communication in multicultural environments', lessons: 6, xpReward: 450, badge: 'Global Communicator' },
  { id: 'module-8', title: 'Leadership Communication', description: 'Leadership communication skills', lessons: 6, xpReward: 550, badge: 'Business Leader' },
];

const ACHIEVEMENTS = [
  { id: 'a1', name: 'Path Starter', icon: '🎯', requiredLevel: 1 },
  { id: 'a2', name: 'Module 1 Complete', icon: '📚', requiredLevel: 3 },
  { id: 'a3', name: 'Email Expert', icon: '✉️', requiredLevel: 5 },
  { id: 'a4', name: 'Meeting Master', icon: '🗣️', requiredLevel: 8 },
  { id: 'a5', name: 'Halfway There', icon: '🏃', requiredLevel: 12 },
  { id: 'a6', name: 'Business Pro', icon: '🏆', requiredLevel: 20 },
];

interface RecommendedClass {
  id: string;
  title: string;
  teacher: string;
  teacherAvatar: string | null;
  duration: number;
  price: number;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export default function LearningPathPage() {
  const { user } = useAuth();
  const t = useTranslations('learningPath');
  const [careerData, setCareerData] = React.useState<Record<string, unknown> | null>(null);
  const [recommendedClasses, setRecommendedClasses] = React.useState<RecommendedClass[]>([]);

  React.useEffect(() => {
    if (!user?.id) return;
    getStudentCareer(user.id)
      .then((data) => setCareerData(data))
      .catch(() => {});

    // Fetch upcoming classes as recommendations
    getClasses({ status: 'scheduled', limit: 3 })
      .then((data) => {
        if (data) {
          setRecommendedClasses(
            data.map((cls: Record<string, unknown>) => {
              const teacher = cls.profiles as Record<string, unknown> | null;
              return {
                id: cls.id as string,
                title: cls.title as string,
                teacher: (teacher?.full_name as string) || 'Unknown',
                teacherAvatar: (teacher?.avatar_url as string) || null,
                duration: cls.duration_minutes as number,
                price: cls.price as number,
              };
            })
          );
        }
      })
      .catch(() => {});
  }, [user?.id]);

  // Extract real data from career
  const career = careerData?.career_paths as Record<string, unknown> | undefined;
  const careerName = (career?.name as string) || 'Business Pro';
  const totalXPEarned = (careerData?.total_xp_earned as number) || 0;
  const currentLevel = (careerData?.current_level as number) || 1;

  // Derive module progress from student level
  const totalLessons = LEARNING_MODULES.reduce((sum, m) => sum + m.lessons, 0);
  const completedLessons = Math.min(Math.floor((currentLevel / 20) * totalLessons), totalLessons);
  const completedModules = LEARNING_MODULES.filter((_, i) => {
    const lessonsBeforeModule = LEARNING_MODULES.slice(0, i).reduce((s, m) => s + m.lessons, 0);
    return completedLessons >= lessonsBeforeModule + LEARNING_MODULES[i].lessons;
  }).length;

  // Add status to modules based on progress
  const modules = LEARNING_MODULES.map((module, index) => {
    const lessonsBeforeModule = LEARNING_MODULES.slice(0, index).reduce((s, m) => s + m.lessons, 0);
    const moduleLessonsCompleted = Math.max(0, Math.min(module.lessons, completedLessons - lessonsBeforeModule));
    const status =
      moduleLessonsCompleted >= module.lessons
        ? 'completed'
        : moduleLessonsCompleted > 0
          ? 'in_progress'
          : index === 0 || completedLessons >= lessonsBeforeModule
            ? 'in_progress'
            : 'locked';
    return {
      ...module,
      completedLessons: moduleLessonsCompleted,
      status,
      unlockRequirement: status === 'locked' ? t('completedModule', { n: index }) : undefined,
    };
  });

  const achievements = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: currentLevel >= a.requiredLevel,
  }));

  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 mb-3">
          {careerName}
        </Badge>
        <h1 className="text-3xl font-bold text-white mb-2">{t('pathTitle', { career: careerName })}</h1>
        <p className="text-slate-400">{t('estimatedCompletion')}</p>
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
                  <span className="text-xs text-slate-400">{t('completed')}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center md:text-left">
                  <p className="text-2xl font-bold text-white">
                    {completedModules}/{LEARNING_MODULES.length}
                  </p>
                  <p className="text-sm text-slate-400">{t('modules')}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-2xl font-bold text-white">
                    {completedLessons}/{totalLessons}
                  </p>
                  <p className="text-sm text-slate-400">{t('lessons')}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-2xl font-bold text-amber-400">
                    {formatNumber(totalXPEarned)}
                  </p>
                  <p className="text-sm text-slate-400">{t('xpEarned')}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-2xl font-bold text-emerald-400">
                    {Math.min(currentLevel, 3)}/3
                  </p>
                  <p className="text-sm text-slate-400">{t('weeklyGoal')}</p>
                </div>
              </div>
            </div>

            {/* Level Progress */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">{t('level', { n: currentLevel })}</span>
                <span className="text-sm text-[#3B82F6]">{t('level', { n: 20 })}</span>
              </div>
              <Progress value={overallProgress} className="h-2 bg-white/10" />
              <p className="text-xs text-slate-500 mt-2 text-center">{t('estimatedCompletion')}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content - Modules */}
        <div className="md:col-span-2">
          {/* Continue Learning */}
          {modules.find((m) => m.status === 'in_progress') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="p-5">
                  <p className="text-xs text-emerald-400 font-semibold mb-2">{t('continueLearnLabel')}</p>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {modules.find((m) => m.status === 'in_progress')?.title}
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {modules.find((m) => m.status === 'in_progress')?.description}
                  </p>
                  <Button className="bg-emerald-500 hover:bg-emerald-500/90">
                    <Play className="w-4 h-4 mr-2" />
                    {t('continueLearning')}
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
              {t('moduleTitle')}
            </h2>

            <div className="space-y-4">
              {modules.map((module, index) => (
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
                                {t('lessonsProgress', { done: module.completedLessons, total: module.lessons })}
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
                  {t('recommendedClasses')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendedClasses.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('noRecommended')}</p>
                ) : (
                  recommendedClasses.map((cls, i) => (
                    <Link
                      key={cls.id}
                      href={`/classes/${cls.id}`}
                      className={`block p-3 rounded-lg transition-colors ${
                        i === 0
                          ? 'bg-[#3B82F6]/10 border border-[#3B82F6]/30 hover:border-[#3B82F6]/50'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {i === 0 && (
                        <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0 text-xs mb-2">
                          {t('topRecommended')}
                        </Badge>
                      )}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={cls.teacherAvatar || undefined} />
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
                        <span className="text-slate-500">{t('minutesUnit', { n: cls.duration })}</span>
                        <span className="text-white font-semibold">{formatVND(cls.price)}</span>
                      </div>
                    </Link>
                  ))
                )}
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
                  {t('achievements')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {achievements.map((achievement) => (
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
  );
}
