'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Plus,
  BookOpen,
  Clock,
  Users,
  Trash2,
  Edit,
  Loader2,
  FileQuestion,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  time_limit_minutes: number | null;
  xp_reward: number | null;
  created_at: string;
  quiz_questions: { count: number }[];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function TeacherQuizListPage() {
  const t = useTranslations('teacherQuiz');
  const supabase = createClient();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Quiz | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, description, category, difficulty, time_limit_minutes, xp_reward, created_at, quiz_questions(count)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (!error) setQuizzes((data as Quiz[]) ?? []);
      setLoading(false);
    };

    fetchQuizzes();
  }, [supabase]);

  const handleDelete = async (quiz: Quiz) => {
    setDeletingId(quiz.id);
    const { error } = await (supabase as any).from('quizzes').delete().eq('id', quiz.id);
    if (!error) setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
    setDeletingId(null);
    setConfirmDelete(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

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
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
            <p className="text-slate-400">{t('subtitle', { count: quizzes.length })}</p>
          </div>
          <Button asChild className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
            <Link href="/teacher/quiz/create">
              <Plus className="w-4 h-4 mr-2" />
              {t('createBtn')}
            </Link>
          </Button>
        </motion.div>

        {/* Quiz list */}
        {quizzes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <FileQuestion className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">{t('empty.title')}</h3>
            <p className="text-slate-400 mb-6">{t('empty.desc')}</p>
            <Button asChild className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
              <Link href="/teacher/quiz/create">
                <Plus className="w-4 h-4 mr-2" />
                {t('createBtn')}
              </Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {quizzes.map((quiz, i) => {
              const questionCount = quiz.quiz_questions?.[0]?.count ?? 0;
              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="bg-white/5 border-white/10 hover:border-[#3B82F6]/40 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-white">{quiz.title}</h3>
                            {quiz.difficulty && (
                              <Badge className={`border text-xs ${DIFFICULTY_COLORS[quiz.difficulty] ?? 'bg-white/10 text-slate-400'}`}>
                                {quiz.difficulty}
                              </Badge>
                            )}
                            {quiz.category && (
                              <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                {quiz.category}
                              </Badge>
                            )}
                          </div>
                          {quiz.description && (
                            <p className="text-sm text-slate-400 mb-3 line-clamp-1">{quiz.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {t('questions', { count: questionCount })}
                            </span>
                            {quiz.time_limit_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {quiz.time_limit_minutes} {t('minutes')}
                              </span>
                            )}
                            {quiz.xp_reward && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                +{quiz.xp_reward} XP
                              </span>
                            )}
                            <span className="text-slate-600">{formatDate(quiz.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-white"
                          >
                            <Link href={`/teacher/quiz/edit/${quiz.id}`}>
                              <Edit className="w-4 h-4 mr-1" />
                              {t('editBtn')}
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => setConfirmDelete(quiz)}
                            disabled={deletingId === quiz.id}
                          >
                            {deletingId === quiz.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-[#0A1628] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {t('deleteDialog.desc', { title: confirmDelete?.title ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white">
              {t('deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
