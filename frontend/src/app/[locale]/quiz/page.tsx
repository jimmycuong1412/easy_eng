'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Trophy,
  Star,
  Filter,
  Search,
  ChevronRight,
  Zap,
  CheckCircle,
  Lock,
  Play,
} from 'lucide-react';

import { formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

// Mock quizzes data
const mockQuizzes = {
  recommended: [
    {
      id: 'quiz-1',
      title: 'Business Email Writing',
      description: 'Master professional email communication',
      category: 'Business English',
      difficulty: 'medium',
      questions: 10,
      timeLimit: 10,
      xpReward: 50,
      cookiesReward: 5,
      completedCount: 1250,
      avgScore: 78,
      isNew: true,
    },
    {
      id: 'quiz-2',
      title: 'Meeting Vocabulary',
      description: 'Essential words for business meetings',
      category: 'Business English',
      difficulty: 'easy',
      questions: 15,
      timeLimit: 12,
      xpReward: 60,
      cookiesReward: 6,
      completedCount: 980,
      avgScore: 82,
    },
    {
      id: 'quiz-3',
      title: 'IELTS Speaking Part 1',
      description: 'Practice common Part 1 topics',
      category: 'IELTS',
      difficulty: 'medium',
      questions: 12,
      timeLimit: 15,
      xpReward: 70,
      cookiesReward: 7,
      completedCount: 2100,
      avgScore: 75,
    },
  ],
  byCategory: {
    'Business English': [
      { id: 'quiz-1', title: 'Business Email Writing', difficulty: 'medium', questions: 10, completed: false },
      { id: 'quiz-2', title: 'Meeting Vocabulary', difficulty: 'easy', questions: 15, completed: true, score: 85 },
      { id: 'quiz-4', title: 'Negotiation Skills', difficulty: 'hard', questions: 20, completed: false },
      { id: 'quiz-5', title: 'Presentation Language', difficulty: 'medium', questions: 12, completed: true, score: 72 },
    ],
    'IELTS': [
      { id: 'quiz-3', title: 'Speaking Part 1', difficulty: 'medium', questions: 12, completed: false },
      { id: 'quiz-6', title: 'Speaking Part 2', difficulty: 'hard', questions: 10, completed: false },
      { id: 'quiz-7', title: 'Listening Section 1', difficulty: 'easy', questions: 10, completed: true, score: 90 },
      { id: 'quiz-8', title: 'Reading Passage Types', difficulty: 'medium', questions: 15, completed: false },
    ],
    'Grammar': [
      { id: 'quiz-9', title: 'Conditionals', difficulty: 'medium', questions: 15, completed: true, score: 80 },
      { id: 'quiz-10', title: 'Tenses Review', difficulty: 'easy', questions: 20, completed: true, score: 95 },
      { id: 'quiz-11', title: 'Passive Voice', difficulty: 'medium', questions: 12, completed: false },
      { id: 'quiz-12', title: 'Reported Speech', difficulty: 'hard', questions: 15, completed: false },
    ],
    'Vocabulary': [
      { id: 'quiz-13', title: 'Academic Words', difficulty: 'hard', questions: 25, completed: false },
      { id: 'quiz-14', title: 'Phrasal Verbs', difficulty: 'medium', questions: 20, completed: false },
      { id: 'quiz-15', title: 'Idioms & Expressions', difficulty: 'hard', questions: 15, completed: false },
    ],
  },
  completed: [
    { id: 'quiz-2', title: 'Meeting Vocabulary', category: 'Business English', score: 85, completedAt: '2026-01-20', xpEarned: 60 },
    { id: 'quiz-5', title: 'Presentation Language', category: 'Business English', score: 72, completedAt: '2026-01-18', xpEarned: 50 },
    { id: 'quiz-7', title: 'Listening Section 1', category: 'IELTS', score: 90, completedAt: '2026-01-15', xpEarned: 70 },
    { id: 'quiz-9', title: 'Conditionals', category: 'Grammar', score: 80, completedAt: '2026-01-12', xpEarned: 55 },
    { id: 'quiz-10', title: 'Tenses Review', category: 'Grammar', score: 95, completedAt: '2026-01-10', xpEarned: 65 },
  ],
};

// Stats
const stats = {
  totalCompleted: 5,
  totalQuizzes: 15,
  averageScore: 84,
  totalXPEarned: 300,
  currentStreak: 3,
};

function getDifficultyBadge(difficulty: string) {
  switch (difficulty) {
    case 'easy':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Dễ</Badge>;
    case 'medium':
      return <Badge className="bg-amber-500/20 text-amber-400 border-0">Trung bình</Badge>;
    case 'hard':
      return <Badge className="bg-red-500/20 text-red-400 border-0">Khó</Badge>;
    default:
      return null;
  }
}

export default function QuizListPage() {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Bài kiểm tra 📝</h1>
          <p className="text-slate-400">Ôn tập kiến thức và kiếm XP với các bài quiz</p>
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
              <p className="text-xs text-slate-400">Hoàn thành</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{stats.averageScore}%</p>
              <p className="text-xs text-slate-400">Điểm TB</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Zap className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-emerald-400">{stats.totalXPEarned}</p>
              <p className="text-xs text-slate-400">XP kiếm được</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Star className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-white">{stats.currentStreak}</p>
              <p className="text-xs text-slate-400">Ngày streak</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#3B82F6]/20 to-purple-500/20 border-[#3B82F6]/30 md:col-span-1 col-span-2">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">Tiến độ</p>
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
              placeholder="Tìm kiếm bài quiz..."
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
              Đề xuất
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-[#3B82F6]">
              Theo chủ đề
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-[#3B82F6]">
              Đã làm
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
              {mockQuizzes.recommended.map((quiz) => (
                <motion.div key={quiz.id} variants={itemVariants}>
                  <Card className="bg-white/5 border-white/10 hover:border-[#3B82F6]/50 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-white">{quiz.title}</h3>
                            {quiz.isNew && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                                Mới
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mb-3">{quiz.description}</p>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Badge variant="outline" className="border-slate-600 text-slate-400">
                              {quiz.category}
                            </Badge>
                            {getDifficultyBadge(quiz.difficulty)}
                            <span className="text-slate-500 flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {quiz.questions} câu
                            </span>
                            <span className="text-slate-500 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {quiz.timeLimit} phút
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-center hidden md:block">
                            <p className="text-lg font-bold text-white">{quiz.avgScore}%</p>
                            <p className="text-xs text-slate-500">Điểm TB</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-amber-500/20 text-amber-400 border-0">
                                +{quiz.xpReward} XP
                              </Badge>
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                                +{quiz.cookiesReward} 🍪
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              {formatNumber(quiz.completedCount)} lượt làm
                            </p>
                          </div>
                          <Button asChild className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
                            <Link href={`/quiz/${quiz.id}`}>
                              <Play className="w-4 h-4 mr-2" />
                              Làm bài
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
              {Object.entries(mockQuizzes.byCategory).map(([category, quizzes]) => (
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
                              getDifficultyBadge(quiz.difficulty)
                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">{quiz.questions} câu hỏi</span>
                            {quiz.completed && quiz.score && (
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
              {mockQuizzes.completed.map((quiz) => (
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
                        <p className="text-xs text-slate-500">Điểm</p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-0">
                        +{quiz.xpEarned} XP
                      </Badge>
                      <Button variant="outline" size="sm" asChild className="border-white/20 text-white">
                        <Link href={`/quiz/${quiz.id}`}>Làm lại</Link>
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
