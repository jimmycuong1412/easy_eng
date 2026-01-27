'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Trophy,
  Star,
  Zap,
  BookOpen,
  RefreshCw,
  Home,
  ArrowLeft,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  cookiesReward: number;
  questions: QuizQuestion[];
}

// Mock quiz data
const mockQuiz: QuizData = {
  id: 'quiz-1',
  title: 'Business English: Email Writing',
  description: 'Test your knowledge of professional email writing',
  category: 'Business English',
  totalQuestions: 10,
  timeLimit: 600, // 10 minutes
  passingScore: 70,
  xpReward: 50,
  cookiesReward: 5,
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'What is the most appropriate greeting for a formal business email?',
      options: ['Hey there!', 'Dear Mr./Ms. [Last Name],', 'Hi buddy,', 'Yo,'],
      correctAnswer: 1,
      explanation: '"Dear Mr./Ms. [Last Name]," is the standard formal greeting in business correspondence.',
      difficulty: 'easy',
      points: 10,
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'Which phrase is best for closing a formal email?',
      options: ['See ya!', 'Best regards,', 'Later!', 'Cheers mate,'],
      correctAnswer: 1,
      explanation: '"Best regards," is a professional and appropriate closing for business emails.',
      difficulty: 'easy',
      points: 10,
    },
    {
      id: 'q3',
      type: 'fill_blank',
      question: 'Complete the sentence: "I am writing to _____ about the upcoming meeting."',
      options: ['inquire', 'ask you stuff', 'know', 'question'],
      correctAnswer: 0,
      explanation: '"Inquire" is the formal verb used when asking for information in business emails.',
      difficulty: 'medium',
      points: 15,
    },
    {
      id: 'q4',
      type: 'true_false',
      question: 'Using all capital letters in an email is considered shouting and is unprofessional.',
      options: ['True', 'False'],
      correctAnswer: 0,
      explanation: 'Correct! ALL CAPS is considered shouting in written communication and should be avoided.',
      difficulty: 'easy',
      points: 10,
    },
    {
      id: 'q5',
      type: 'multiple_choice',
      question: 'What does "CC" stand for in email?',
      options: ['Copy Complete', 'Carbon Copy', 'Confidential Copy', 'Central Communication'],
      correctAnswer: 1,
      explanation: 'CC stands for "Carbon Copy," originating from the practice of using carbon paper to make copies.',
      difficulty: 'medium',
      points: 15,
    },
    {
      id: 'q6',
      type: 'multiple_choice',
      question: 'Which phrase is appropriate for apologizing in a business email?',
      options: ['My bad!', 'I sincerely apologize for any inconvenience caused.', 'Sorry, not sorry.', 'Oops!'],
      correctAnswer: 1,
      explanation: '"I sincerely apologize for any inconvenience caused" is a formal and appropriate apology.',
      difficulty: 'easy',
      points: 10,
    },
    {
      id: 'q7',
      type: 'fill_blank',
      question: 'Complete: "Please find _____ the requested documents."',
      options: ['attached', 'stuck', 'glued', 'inside'],
      correctAnswer: 0,
      explanation: '"Please find attached" is the standard phrase for referencing email attachments.',
      difficulty: 'easy',
      points: 10,
    },
    {
      id: 'q8',
      type: 'true_false',
      question: 'It is acceptable to use emojis in formal business emails.',
      options: ['True', 'False'],
      correctAnswer: 1,
      explanation: 'Emojis are generally not appropriate in formal business communication.',
      difficulty: 'easy',
      points: 10,
    },
    {
      id: 'q9',
      type: 'multiple_choice',
      question: 'What does "FYI" stand for?',
      options: ['For Your Interest', 'For Your Information', 'Find Your Information', 'First Year Initiative'],
      correctAnswer: 1,
      explanation: 'FYI stands for "For Your Information," commonly used when sharing information.',
      difficulty: 'easy',
      points: 10,
    },
    {
      id: 'q10',
      type: 'multiple_choice',
      question: 'Which is the most professional way to request a meeting?',
      options: [
        'Let me know when you are free.',
        'I would appreciate the opportunity to discuss this matter at your earliest convenience.',
        'Can we talk?',
        'Meet me tomorrow.',
      ],
      correctAnswer: 1,
      explanation: 'This phrase is formal, polite, and shows respect for the recipient\'s time.',
      difficulty: 'hard',
      points: 20,
    },
  ],
};

type QuizState = 'intro' | 'quiz' | 'result';

export default function QuizPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();
  const [quizState, setQuizState] = React.useState<QuizState>('intro');
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [answers, setAnswers] = React.useState<(number | null)[]>([]);
  const [timeRemaining, setTimeRemaining] = React.useState(mockQuiz.timeLimit);
  const [showExplanation, setShowExplanation] = React.useState(false);

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
    setAnswers(new Array(mockQuiz.questions.length).fill(null));
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

    if (currentQuestion < mockQuiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setQuizState('result');
    }
  };

  const calculateResults = () => {
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    mockQuiz.questions.forEach((question, index) => {
      totalPoints += question.points;
      if (answers[index] === question.correctAnswer) {
        correctCount++;
        earnedPoints += question.points;
      }
    });

    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    const passed = percentage >= mockQuiz.passingScore;

    return { correctCount, totalPoints, earnedPoints, percentage, passed };
  };

  const question = mockQuiz.questions[currentQuestion];
  const isCorrect = selectedAnswer === question?.correctAnswer;

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
                {mockQuiz.category}
              </Badge>

              <h1 className="text-2xl font-bold text-white mb-2">{mockQuiz.title}</h1>
              <p className="text-slate-400 mb-6">{mockQuiz.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm">Số câu hỏi</span>
                  </div>
                  <p className="text-xl font-bold text-white">{mockQuiz.totalQuestions}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Thời gian</span>
                  </div>
                  <p className="text-xl font-bold text-white">{formatTime(mockQuiz.timeLimit)}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-400 mb-2">Phần thưởng khi đạt ≥{mockQuiz.passingScore}%</p>
                <div className="flex items-center justify-center gap-4">
                  <Badge className="bg-amber-500/20 text-amber-400 border-0">
                    <Zap className="w-4 h-4 mr-1" />
                    +{mockQuiz.xpReward} XP
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                    +{mockQuiz.cookiesReward} 🍪
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
                    {results.correctCount}/{mockQuiz.totalQuestions} câu đúng
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
                      +{mockQuiz.xpReward} XP
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                      +{mockQuiz.cookiesReward} 🍪
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
                    setTimeRemaining(mockQuiz.timeLimit);
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
              Câu hỏi {currentQuestion + 1}/{mockQuiz.totalQuestions}
            </p>
            <Progress
              value={((currentQuestion + 1) / mockQuiz.totalQuestions) * 100}
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
        <AnimatePresence mode="wait">
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
        </AnimatePresence>

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
              {currentQuestion < mockQuiz.questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
