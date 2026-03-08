'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Trophy,
  Star,
  Search,
  Zap,
  CheckCircle,
  Play,
  Loader2,
} from 'lucide-react';

import { GemImage } from '@/components/common/GemImage';
import { formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getQuizzes } from '@/lib/queries';
import { useTranslations } from 'next-intl';

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

interface RecommendedQuiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  questions: number;
  timeLimit: number;
  xpReward: number;
  gemsReward: number;
  completedCount: number;
  avgScore: number;
  isNew?: boolean;
}

interface CategoryQuiz {
  id: string;
  title: string;
  difficulty: string;
  questions: number;
  completed: boolean;
  score?: number;
}

interface CompletedQuiz {
  id: string;
  title: string;
  category: string;
  score: number;
  completedAt: string;
  xpEarned: number;
}

interface QuizzesData {
  recommended: RecommendedQuiz[];
  byCategory: Record<string, CategoryQuiz[]>;
  completed: CompletedQuiz[];
}

interface QuizStats {
  totalCompleted: number;
  totalQuizzes: number;
  averageScore: number;
  totalXPEarned: number;
  currentStreak: number;
}

function DifficultyBadge({ difficulty, t }: { difficulty: string; t: (k: string) => string }) {
  switch (difficulty) {
    case 'easy':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-0">{t('difficulty.easy')}</Badge>;
    case 'medium':
      return <Badge className="bg-amber-500/20 text-amber-400 border-0">{t('difficulty.medium')}</Badge>;
    case 'hard':
      return <Badge className="bg-red-500/20 text-red-400 border-0">{t('difficulty.hard')}</Badge>;
    default:
      return null;
  }
}

export default function QuizListPage() {
  const t = useTranslations('quizList');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [quizzes, setQuizzes] = useState<QuizzesData>({ recommended: [], byCategory: {}, completed: [] });
  const [stats, setStats] = useState<QuizStats>({ totalCompleted: 0, totalQuizzes: 0, averageScore: 0, totalXPEarned: 0, currentStreak: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const data = await getQuizzes() as Record<string, unknown>[] | null;
        const allQuizzes = data || [];

        // Map to recommended format
        const recommended: RecommendedQuiz[] = allQuizzes.slice(0, 6).map((q) => {
          const questionCount = q.quiz_questions as { count: number }[] | null;
          const numQuestions = questionCount?.[0]?.count || 0;
          return {
            id: q.id as string,
            title: (q.title as string) || 'Untitled Quiz',
            description: (q.description as string) || '',
            category: (q.category as string) || 'General',
            difficulty: (q.difficulty as string) || 'medium',
            questions: numQuestions,
            timeLimit: (q.time_limit_minutes as number) || 10,
            xpReward: (q.xp_reward as number) || 50,
            gemsReward: (q.gems_reward as number) || 5,
            completedCount: 0,
            avgScore: 0,
            isNew: false,
          };
        });

        // Group by category
        const byCategory: Record<string, CategoryQuiz[]> = {};
        allQuizzes.forEach((q) => {
          const category = (q.category as string) || 'General';
          if (!byCategory[category]) byCategory[category] = [];
          const questionCount = q.quiz_questions as { count: number }[] | null;
          byCategory[category].push({
            id: q.id as string,
            title: (q.title as string) || 'Untitled',
            difficulty: (q.difficulty as string) || 'medium',
            questions: questionCount?.[0]?.count || 0,
            completed: false,
          });
        });

        setQuizzes({ recommended, byCategory, completed: [] });
        setStats({
          totalCompleted: 0,
          totalQuizzes: allQuizzes.length,
          averageScore: 0,
          totalXPEarned: 0,
          currentStreak: 0,
        });
      } catch (err) {
        console.error('Error fetching quizzes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-slate-400">{t('subtitle')}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <BookOpen className="w-5 h-5 text-[#3B82F6] mx-auto mb-2" />
              <p className="text-xl font-bold text-white">
                {stats.totalCompleted}/{stats.totalQuizzes}
              </p>
              <p className="text-xs text-slate-400">{t('stats.completed')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{stats.averageScore}%</p>
              <p className="text-xs text-slate-400">{t('stats.avgScore')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Zap className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-emerald-400">{stats.totalXPEarned}</p>
              <p className="text-xs text-slate-400">{t('stats.xpEarned')}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Star className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{stats.currentStreak}</p>
              <p className="text-xs text-slate-400">{t('stats.streak')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#3B82F6]/20 to-purple-500/20 border-[#3B82F6]/30 md:col-span-1 col-span-2">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">{t('stats.progress')}</p>
              <Progress value={(stats.totalCompleted / stats.totalQuizzes) * 100} className="h-2 bg-white/10 mb-2" />
              <p className="text-sm text-white">{Math.round((stats.totalCompleted / stats.totalQuizzes) * 100)}%</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
            />
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="recommended" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="recommended" className="data-[state=active]:bg-[#3B82F6]">
              {t('tabs.recommended')}
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-[#3B82F6]">
              {t('tabs.categories')}
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-[#3B82F6]">
              {t('tabs.completed')}
            </TabsTrigger>
          </TabsList>

          {/* Recommended Tab */}
          <TabsContent value="recommended">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {quizzes.recommended.map((quiz) => (
                <motion.div key={quiz.id} variants={itemVariants}>
                  <Card className="bg-white/5 border-white/10 hover:border-[#3B82F6]/50 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-white">{quiz.title}</h3>
                            {quiz.isNew && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                                {t('new')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mb-3">{quiz.description}</p>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Badge variant="outline" className="border-slate-600 text-slate-400">
                              {quiz.category}
                            </Badge>
                            {<DifficultyBadge difficulty={quiz.difficulty} t={t} />}
                            <span className="text-slate-500 flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {t('questions', { count: quiz.questions })}
                            </span>
                            <span className="text-slate-500 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {quiz.timeLimit} {t('minutes')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-center hidden md:block">
                            <p className="text-lg font-bold text-white">{quiz.avgScore}%</p>
                            <p className="text-xs text-slate-500">{t('avgScore')}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-amber-500/20 text-amber-400 border-0">
                                +{quiz.xpReward} XP
                              </Badge>
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                                +{quiz.gemsReward} <GemImage size={14} className="inline-block align-middle" />
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              {formatNumber(quiz.completedCount)} {t('attempts')}
                            </p>
                          </div>
                          <Button asChild className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
                            <Link href={`/quiz/${quiz.id}`}>
                              <Play className="w-4 h-4 mr-2" />
                              {t('startBtn')}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {Object.entries(quizzes.byCategory).map(([category, quizzes]) => (
                <motion.div key={category} variants={itemVariants}>
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <span>{category}</span>
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          {quizzes.filter((q) => q.completed).length}/{quizzes.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-3">
                      {quizzes.map((quiz) => (
                        <Link
                          key={quiz.id}
                          href={`/quiz/${quiz.id}`}
                          className={`p-4 rounded-lg transition-colors ${
                            quiz.completed
                              ? 'bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40'
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-white">{quiz.title}</h4>
                            {quiz.completed ? (
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <DifficultyBadge difficulty={quiz.difficulty} t={t} />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">{t('questions', { count: quiz.questions })}</span>
                            {quiz.completed && 'score' in quiz && quiz.score && (
                              <span className="text-emerald-400 font-semibold">{quiz.score}%</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {quizzes.completed.map((quiz) => (
                <motion.div key={quiz.id} variants={itemVariants}>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">{quiz.title}</h4>
                        <p className="text-sm text-slate-500">
                          {quiz.category} • {quiz.completedAt}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-white">{quiz.score}%</p>
                        <p className="text-xs text-slate-500">{t('score')}</p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-0">
                        +{quiz.xpEarned} XP
                      </Badge>
                      <Button variant="outline" size="sm" asChild className="border-white/20 text-white">
                        <Link href={`/quiz/${quiz.id}`}>{t('retryBtn')}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
