'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Trophy,
  Zap,
  BookOpen,
  RefreshCw,
  Home,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

import { GemImage } from '@/components/common/GemImage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getQuizById } from '@/lib/queries';

// Quiz types
interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'true_false' | 'audio';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  category: string;
  totalQuestions: number;
  timeLimit: number; // in seconds
  passingScore: number;
  xpReward: number;
  gemsReward: number;
  questions: QuizQuestion[];
}

type QuizState = 'loading' | 'intro' | 'quiz' | 'result';

export default function QuizPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [quizState, setQuizState] = React.useState<QuizState>('loading');
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [answers, setAnswers] = React.useState<(number | null)[]>([]);
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [showExplanation, setShowExplanation] = React.useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const data = await getQuizById(params.quizId) as Record<string, unknown> | null;
        if (data) {
          const rawQuestions = (data.quiz_questions as Record<string, unknown>[]) || [];
          const questions: QuizQuestion[] = rawQuestions.map((q, idx) => ({
            id: (q.id as string) || `q${idx}`,
            type: ((q.question_type as string) || 'multiple_choice') as QuizQuestion['type'],
            question: (q.question_text as string) || '',
            options: (q.options as string[]) || [],
            correctAnswer: parseInt(q.correct_answer as string, 10) ?? 0,
            explanation: (q.explanation as string) || '',
            difficulty: ((q.difficulty as string) || 'medium') as QuizQuestion['difficulty'],
            points: (q.points as number) || 10,
          }));

          const quizData: QuizData = {
            id: data.id as string,
            title: (data.title as string) || 'Quiz',
            description: (data.description as string) || '',
            category: (data.category as string) || 'General',
            totalQuestions: questions.length,
            timeLimit: ((data.time_limit_minutes as number) || 10) * 60,
            passingScore: (data.passing_score as number) || 70,
            xpReward: (data.xp_reward as number) || 50,
            gemsReward: (data.gems_reward as number) || 5,
            questions,
          };

          setQuiz(quizData);
          setTimeRemaining(quizData.timeLimit);
          setQuizState('intro');
        }
      } catch (err) {
        console.error('Error fetching quiz:', err);
        setQuizState('intro');
      }
    };

    fetchQuiz();
  }, [params.quizId]);

  // Timer
  React.useEffect(() => {
    if (quizState !== 'quiz' || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setQuizState('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartQuiz = () => {
    setQuizState('quiz');
    setAnswers(new Array(quiz!.questions.length).fill(null));
  };

  const handleSelectAnswer = (answerIndex: number) => {
    if (showExplanation) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    setShowExplanation(false);
    setSelectedAnswer(null);

    if (currentQuestion < quiz!.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setQuizState('result');
    }
  };

  const calculateResults = () => {
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    quiz!.questions.forEach((question, index) => {
      totalPoints += question.points;
      if (answers[index] === question.correctAnswer) {
        correctCount++;
        earnedPoints += question.points;
      }
    });

    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    const passed = percentage >= quiz!.passingScore;

    return { correctCount, totalPoints, earnedPoints, percentage, passed };
  };

  const question = quiz?.questions[currentQuestion];
  const isCorrect = selectedAnswer === question?.correctAnswer;

  // Loading Screen
  if (quizState === 'loading' || !quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  // Intro Screen
  if (quizState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3B82F6] to-purple-500 flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-white" />
              </div>

              <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0 mb-4">
                {quiz!.category}
              </Badge>

              <h1 className="text-2xl font-bold text-white mb-2">{quiz!.title}</h1>
              <p className="text-slate-400 mb-6">{quiz!.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm">Số câu hỏi</span>
                  </div>
                  <p className="text-xl font-bold text-white">{quiz!.totalQuestions}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Thời gian</span>
                  </div>
                  <p className="text-xl font-bold text-white">{formatTime(quiz!.timeLimit)}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-400 mb-2">Phần thưởng khi đạt ≥{quiz!.passingScore}%</p>
                <div className="flex items-center justify-center gap-4">
                  <Badge className="bg-amber-500/20 text-amber-400 border-0">
                    <Zap className="w-4 h-4 mr-1" />
                    +{quiz!.xpReward} XP
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                    +{quiz!.gemsReward} <GemImage size={14} className="inline-block align-middle" />
                  </Badge>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Quay lại
                </Button>
                <Button
                  className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                  onClick={handleStartQuiz}
                >
                  Bắt đầu
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Result Screen
  if (quizState === 'result') {
    const results = calculateResults();

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  results.passed
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                    : 'bg-gradient-to-br from-red-500 to-rose-600'
                }`}
              >
                {results.passed ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <XCircle className="w-12 h-12 text-white" />
                )}
              </motion.div>

              <h1 className="text-2xl font-bold text-white mb-2">
                {results.passed ? 'Xuất sắc! 🎉' : 'Cần cố gắng thêm! 💪'}
              </h1>
              <p className="text-slate-400 mb-6">
                {results.passed
                  ? 'Bạn đã hoàn thành bài quiz thành công!'
                  : 'Hãy ôn tập và thử lại nhé!'}
              </p>

              {/* Score Circle */}
              <div className="relative w-40 h-40 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="12"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke={results.passed ? '#10B981' : '#EF4444'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 440' }}
                    animate={{ strokeDasharray: `${(results.percentage / 100) * 440} 440` }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white">{results.percentage}%</span>
                  <span className="text-sm text-slate-400">
                    {results.correctCount}/{quiz!.totalQuestions} câu đúng
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Điểm đạt được</p>
                  <p className="text-xl font-bold text-white">
                    {results.earnedPoints}/{results.totalPoints}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Thời gian còn lại</p>
                  <p className="text-xl font-bold text-white">{formatTime(timeRemaining)}</p>
                </div>
              </div>

              {/* Rewards */}
              {results.passed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-r from-emerald-500/20 to-amber-500/20 rounded-lg p-4 mb-6"
                >
                  <p className="text-sm text-slate-300 mb-2">🎁 Phần thưởng nhận được</p>
                  <div className="flex items-center justify-center gap-4">
                    <Badge className="bg-amber-500/20 text-amber-400 border-0">
                      <Zap className="w-4 h-4 mr-1" />
                      +{quiz!.xpReward} XP
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                      +{quiz!.gemsReward} <GemImage size={14} className="inline-block align-middle" />
                    </Badge>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  onClick={() => router.push('/student/progress')}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Trang chủ
                </Button>
                <Button
                  className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                  onClick={() => {
                    setQuizState('intro');
                    setCurrentQuestion(0);
                    setSelectedAnswer(null);
                    setAnswers([]);
                    setTimeRemaining(quiz!.timeLimit);
                    setShowExplanation(false);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Làm lại
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Quiz Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-slate-400">
              Câu hỏi {currentQuestion + 1}/{quiz!.totalQuestions}
            </p>
            <Progress
              value={((currentQuestion + 1) / quiz!.totalQuestions) * 100}
              className="w-32 h-2 mt-2 bg-white/10"
            />
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              timeRemaining < 60 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Question Card */}
        {question && <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardContent className="p-6">
                {/* Difficulty & Points */}
                <div className="flex items-center justify-between mb-4">
                  <Badge
                    className={`border-0 ${
                      question.difficulty === 'easy'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : question.difficulty === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {question.difficulty === 'easy'
                      ? 'Dễ'
                      : question.difficulty === 'medium'
                        ? 'Trung bình'
                        : 'Khó'}
                  </Badge>
                  <Badge variant="outline" className="border-slate-600 text-slate-400">
                    +{question.points} điểm
                  </Badge>
                </div>

                {/* Question */}
                <h2 className="text-xl font-semibold text-white mb-6">{question.question}</h2>

                {/* Options */}
                <div className="space-y-3">
                  {question.options?.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectAnswer(index)}
                      disabled={showExplanation}
                      className={`w-full p-4 rounded-lg text-left transition-all ${
                        showExplanation
                          ? index === question.correctAnswer
                            ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                            : index === selectedAnswer
                              ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                              : 'bg-white/5 border-2 border-transparent text-slate-400'
                          : selectedAnswer === index
                            ? 'bg-[#3B82F6]/20 border-2 border-[#3B82F6] text-white'
                            : 'bg-white/5 border-2 border-transparent text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            showExplanation
                              ? index === question.correctAnswer
                                ? 'bg-emerald-500 text-white'
                                : index === selectedAnswer
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white/10 text-slate-400'
                              : selectedAnswer === index
                                ? 'bg-[#3B82F6] text-white'
                                : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span>{option}</span>
                        {showExplanation && index === question.correctAnswer && (
                          <CheckCircle className="w-5 h-5 ml-auto text-emerald-400" />
                        )}
                        {showExplanation &&
                          index === selectedAnswer &&
                          index !== question.correctAnswer && (
                            <XCircle className="w-5 h-5 ml-auto text-red-400" />
                          )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Explanation */}
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 p-4 rounded-lg ${
                      isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'
                    }`}
                  >
                    <p
                      className={`font-semibold mb-2 ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`}
                    >
                      {isCorrect ? '✅ Chính xác!' : '💡 Giải thích:'}
                    </p>
                    <p className="text-slate-300 text-sm">{question.explanation}</p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>}

        {/* Actions */}
        <div className="flex gap-3">
          {!showExplanation ? (
            <Button
              className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90"
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
            >
              Kiểm tra đáp án
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90"
              onClick={handleNextQuestion}
            >
              {currentQuestion < quiz!.questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
