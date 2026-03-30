'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Plus,
  FileText,
  HelpCircle,
  Save,
  Eye,
  Trash2,
  GripVertical,
  ChevronLeft,
  CheckCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points: number;
}

const questionTypes = [
  { value: 'multiple-choice', label: 'Trắc nghiệm', icon: CheckCircle },
  { value: 'true-false', label: 'Đúng/Sai', icon: HelpCircle },
  { value: 'fill-blank', label: 'Điền từ', icon: FileText },
];

const categories = [
  'Grammar',
  'Vocabulary',
  'Reading',
  'Listening',
  'Speaking',
  'IELTS',
  'TOEIC',
  'Business English',
];

const difficultyLevels = [
  { value: 'beginner', label: 'Cơ bản', color: 'bg-emerald-500' },
  { value: 'intermediate', label: 'Trung cấp', color: 'bg-amber-500' },
  { value: 'advanced', label: 'Nâng cao', color: 'bg-red-500' },
];

export default function QuizCreatorPage() {
  const [quizTitle, setQuizTitle] = React.useState('');
  const [quizDescription, setQuizDescription] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [difficulty, setDifficulty] = React.useState('intermediate');
  const [timeLimit, setTimeLimit] = React.useState('10');
  const [passingScore, setPassingScore] = React.useState('70');
  const [xpReward, setXpReward] = React.useState('50');
  const [gemReward, setGemReward] = React.useState('5');
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [showAddQuestion, setShowAddQuestion] = React.useState(false);
  const [_editingQuestion, _setEditingQuestion] = React.useState<Question | null>(null);
  const [_showPreview, setShowPreview] = React.useState(false);

  // New question form state
  const [newQuestion, setNewQuestion] = React.useState<Partial<Question>>({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    points: 10,
  });

  const handleAddQuestion = () => {
    const question: Question = {
      id: `q-${Date.now()}`,
      type: newQuestion.type as Question['type'],
      question: newQuestion.question || '',
      options: newQuestion.options,
      correctAnswer: newQuestion.correctAnswer || 0,
      explanation: newQuestion.explanation,
      points: newQuestion.points || 10,
    };

    setQuestions([...questions, question]);
    setNewQuestion({
      type: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 10,
    });
    setShowAddQuestion(false);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="py-6">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Link href="/teacher/dashboard">
              <Button variant="ghost" className="text-slate-400 hover:text-white">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Quay lại
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Tạo Quiz mới</h1>
              <p className="text-slate-400">Tạo bài kiểm tra cho học viên</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => setShowPreview(true)}
              disabled={questions.length === 0}
            >
              <Eye className="w-4 h-4 mr-2" />
              Xem trước
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-500/90"
              disabled={!quizTitle || questions.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Lưu Quiz
            </Button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quiz Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Basic Info */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Thông tin cơ bản</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Tiêu đề Quiz *</Label>
                  <Input
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="VD: Grammar Review: Past Tenses"
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Mô tả</Label>
                  <Textarea
                    value={quizDescription}
                    onChange={(e) => setQuizDescription(e.target.value)}
                    placeholder="Mô tả ngắn về quiz..."
                    className="mt-1 bg-white/5 border-white/10 text-white resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Danh mục</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat.toLowerCase()}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-300">Độ khó</Label>
                  <RadioGroup
                    value={difficulty}
                    onValueChange={setDifficulty}
                    className="mt-2 flex gap-3"
                  >
                    {difficultyLevels.map((level) => (
                      <div key={level.value} className="flex items-center">
                        <RadioGroupItem
                          value={level.value}
                          id={level.value}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={level.value}
                          className={`px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                            difficulty === level.value
                              ? `${level.color} text-white border-transparent`
                              : 'bg-white/5 border-white/10 text-slate-300'
                          }`}
                        >
                          {level.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Quiz Settings */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Cài đặt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">Thời gian (phút)</Label>
                  <Input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-white"
                    min="1"
                    max="60"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Điểm đạt (%)</Label>
                  <Input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-white"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="pt-2 border-t border-white/10">
                  <Label className="text-slate-300">Phần thưởng khi đạt</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label className="text-xs text-slate-500">XP</Label>
                      <Input
                        type="number"
                        value={xpReward}
                        onChange={(e) => setXpReward(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Gems</Label>
                      <Input
                        type="number"
                        value={gemReward}
                        onChange={(e) => setGemReward(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-[#3B82F6]/10 border-[#3B82F6]/30">
              <CardContent className="p-4">
                <h4 className="font-semibold text-white mb-3">Tổng quan</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số câu hỏi</span>
                    <span className="text-white font-medium">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tổng điểm</span>
                    <span className="text-white font-medium">{totalPoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thời gian</span>
                    <span className="text-white font-medium">{timeLimit} phút</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Questions List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">
                  Danh sách câu hỏi ({questions.length})
                </CardTitle>
                <Button
                  onClick={() => setShowAddQuestion(true)}
                  className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm câu hỏi
                </Button>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="text-center py-12">
                    <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 mb-2">Chưa có câu hỏi nào</p>
                    <p className="text-sm text-slate-500">
                      Bấm "Thêm câu hỏi" để bắt đầu tạo quiz
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-[#3B82F6]/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-slate-500 cursor-grab" />
                            <Badge className="bg-slate-700 text-slate-300 border-0">
                              {index + 1}
                            </Badge>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                className={`border-0 ${
                                  question.type === 'multiple-choice'
                                    ? 'bg-[#3B82F6]/20 text-[#3B82F6]'
                                    : question.type === 'true-false'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {question.type === 'multiple-choice'
                                  ? 'Trắc nghiệm'
                                  : question.type === 'true-false'
                                  ? 'Đúng/Sai'
                                  : 'Điền từ'}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {question.points} điểm
                              </span>
                            </div>
                            <p className="text-white">{question.question}</p>
                            {question.options && (
                              <div className="mt-2 text-sm text-slate-400">
                                {question.options.map((opt, i) => (
                                  <span key={i} className="mr-3">
                                    {String.fromCharCode(65 + i)}. {opt}
                                    {i === question.correctAnswer && (
                                      <CheckCircle className="w-3 h-3 text-emerald-400 inline ml-1" />
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Add Question Dialog */}
        <Dialog open={showAddQuestion} onOpenChange={setShowAddQuestion}>
          <DialogContent className="bg-[#0A1628] border-white/10 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Thêm câu hỏi mới</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Question Type */}
              <div>
                <Label className="text-slate-300">Loại câu hỏi</Label>
                <div className="flex gap-3 mt-2">
                  {questionTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() =>
                        setNewQuestion({ ...newQuestion, type: type.value as any })
                      }
                      className={`flex-1 p-3 rounded-lg border transition-all ${
                        newQuestion.type === type.value
                          ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#3B82F6]'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'
                      }`}
                    >
                      <type.icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Text */}
              <div>
                <Label className="text-slate-300">Câu hỏi *</Label>
                <Textarea
                  value={newQuestion.question}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, question: e.target.value })
                  }
                  placeholder="Nhập nội dung câu hỏi..."
                  className="mt-1 bg-white/5 border-white/10 text-white resize-none"
                  rows={3}
                />
              </div>

              {/* Options for Multiple Choice */}
              {newQuestion.type === 'multiple-choice' && (
                <div>
                  <Label className="text-slate-300">Các đáp án</Label>
                  <div className="space-y-2 mt-2">
                    {newQuestion.options?.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setNewQuestion({ ...newQuestion, correctAnswer: index })
                          }
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                            newQuestion.correctAnswer === index
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </button>
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(newQuestion.options || [])];
                            newOptions[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, options: newOptions });
                          }}
                          placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                          className="flex-1 bg-white/5 border-white/10 text-white"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Click vào chữ cái để chọn đáp án đúng
                  </p>
                </div>
              )}

              {/* True/False Options */}
              {newQuestion.type === 'true-false' && (
                <div>
                  <Label className="text-slate-300">Đáp án đúng</Label>
                  <RadioGroup
                    value={newQuestion.correctAnswer?.toString()}
                    onValueChange={(v) =>
                      setNewQuestion({ ...newQuestion, correctAnswer: v })
                    }
                    className="mt-2 flex gap-4"
                  >
                    <div className="flex items-center">
                      <RadioGroupItem value="true" id="true" className="peer sr-only" />
                      <Label
                        htmlFor="true"
                        className={`px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                          newQuestion.correctAnswer === 'true'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        Đúng (True)
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="false" id="false" className="peer sr-only" />
                      <Label
                        htmlFor="false"
                        className={`px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                          newQuestion.correctAnswer === 'false'
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        Sai (False)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Fill Blank Answer */}
              {newQuestion.type === 'fill-blank' && (
                <div>
                  <Label className="text-slate-300">Đáp án đúng</Label>
                  <Input
                    value={newQuestion.correctAnswer?.toString() || ''}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })
                    }
                    placeholder="Nhập đáp án đúng..."
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Đánh dấu chỗ trống trong câu hỏi bằng ___
                  </p>
                </div>
              )}

              {/* Explanation */}
              <div>
                <Label className="text-slate-300">Giải thích (tùy chọn)</Label>
                <Textarea
                  value={newQuestion.explanation}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, explanation: e.target.value })
                  }
                  placeholder="Giải thích đáp án đúng..."
                  className="mt-1 bg-white/5 border-white/10 text-white resize-none"
                  rows={2}
                />
              </div>

              {/* Points */}
              <div>
                <Label className="text-slate-300">Điểm</Label>
                <Input
                  type="number"
                  value={newQuestion.points}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) })
                  }
                  className="mt-1 bg-white/5 border-white/10 text-white w-24"
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="border-white/20 text-white"
                onClick={() => setShowAddQuestion(false)}
              >
                Hủy
              </Button>
              <Button
                className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                onClick={handleAddQuestion}
                disabled={!newQuestion.question}
              >
                <Plus className="w-4 h-4 mr-2" />
                Thêm câu hỏi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
