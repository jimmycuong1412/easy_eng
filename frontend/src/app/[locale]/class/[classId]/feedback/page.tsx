'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Star,
  MessageSquare,
  CheckCircle,
  ChevronRight,
  Zap,
  Cookie,
  Trophy,
  Heart,
  ThumbsUp,
  Frown,
  Meh,
  Smile,
  Laugh,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Mock class data
const mockClassData = {
  id: 'class-1',
  topic: 'Business English: Meeting Skills',
  teacher: {
    id: 'teacher-1',
    name: 'Nguyễn Minh Anh',
    avatar: '/avatars/teacher1.png',
    rating: 4.9,
  },
  duration: 25,
  completedAt: new Date().toISOString(),
  xpReward: 100,
  cookiesReward: 5,
};

// Feedback options
const satisfactionOptions = [
  { value: 1, icon: Frown, label: 'Không hài lòng', color: 'text-red-400' },
  { value: 2, icon: Meh, label: 'Bình thường', color: 'text-amber-400' },
  { value: 3, icon: Smile, label: 'Hài lòng', color: 'text-emerald-400' },
  { value: 4, icon: Laugh, label: 'Rất hài lòng', color: 'text-[#3B82F6]' },
];

const feedbackTags = [
  'Giảng dạy rõ ràng',
  'Kiên nhẫn',
  'Tương tác tốt',
  'Nhiều kiến thức mới',
  'Phát âm chuẩn',
  'Đúng giờ',
  'Thân thiện',
  'Chuyên nghiệp',
];

export default function ClassFeedbackPage({ params }: { params: { classId: string } }) {
  const router = useRouter();
  const [step, setStep] = React.useState<'rating' | 'feedback' | 'complete'>('rating');
  const [teacherRating, setTeacherRating] = React.useState(0);
  const [hoveredRating, setHoveredRating] = React.useState(0);
  const [satisfaction, setSatisfaction] = React.useState(0);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [feedbackText, setFeedbackText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setStep('complete');
  };

  // Complete screen
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white/5 border-white/10 text-center">
            <CardContent className="pt-8 pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-6"
              >
                <Trophy className="w-12 h-12 text-white" />
              </motion.div>

              <h1 className="text-2xl font-bold text-white mb-2">Lớp học hoàn thành! 🎉</h1>
              <p className="text-slate-400 mb-6">
                Cảm ơn bạn đã học cùng {mockClassData.teacher.name}
              </p>

              {/* Rewards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-amber-500/20 to-emerald-500/20 rounded-lg p-4 mb-6"
              >
                <p className="text-sm text-slate-300 mb-3">🎁 Phần thưởng nhận được</p>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-400">+{mockClassData.xpReward}</p>
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3" />
                      XP
                    </p>
                  </div>
                  <div className="w-px h-12 bg-white/10" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-400">+{mockClassData.cookiesReward}</p>
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                      <Cookie className="w-3 h-3" />
                      Cookies
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Summary */}
              <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-white mb-3">Tóm tắt đánh giá</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Đánh giá giáo viên:</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < teacherRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mức độ hài lòng:</span>
                    <span className="text-white">
                      {satisfactionOptions.find((s) => s.value === satisfaction)?.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  onClick={() => router.push('/student/bookings')}
                >
                  Lịch sử lớp học
                </Button>
                <Button
                  className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                  onClick={() => router.push('/classes')}
                >
                  Đặt lớp tiếp
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] py-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Đánh giá lớp học</h1>
          <p className="text-slate-400">{mockClassData.topic}</p>
        </motion.div>

        {/* Rating Step */}
        {step === 'rating' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardContent className="p-6">
                {/* Teacher Rating */}
                <div className="text-center mb-8">
                  <Avatar className="h-20 w-20 mx-auto mb-4 border-2 border-[#3B82F6]/30">
                    <AvatarImage src={mockClassData.teacher.avatar} />
                    <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-2xl">
                      {mockClassData.teacher.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-white mb-1">{mockClassData.teacher.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">Đánh giá giáo viên của bạn</p>

                  {/* Star Rating */}
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        onClick={() => setTeacherRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-10 h-10 transition-colors ${
                            star <= (hoveredRating || teacherRating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {teacherRating > 0 && (
                    <p className="text-sm text-amber-400 mt-2">
                      {teacherRating === 5
                        ? 'Tuyệt vời!'
                        : teacherRating === 4
                          ? 'Rất tốt!'
                          : teacherRating === 3
                            ? 'Tốt'
                            : teacherRating === 2
                              ? 'Cần cải thiện'
                              : 'Không hài lòng'}
                    </p>
                  )}
                </div>

                {/* Satisfaction */}
                <div className="mb-6">
                  <Label className="text-white mb-3 block text-center">
                    Mức độ hài lòng với lớp học
                  </Label>
                  <div className="flex items-center justify-center gap-4">
                    {satisfactionOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSatisfaction(option.value)}
                        className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                          satisfaction === option.value
                            ? 'bg-[#3B82F6]/20 ring-2 ring-[#3B82F6]'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <option.icon
                          className={`w-8 h-8 mb-1 ${
                            satisfaction === option.value ? option.color : 'text-slate-400'
                          }`}
                        />
                        <span className="text-xs text-slate-400">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90"
              onClick={() => setStep('feedback')}
              disabled={teacherRating === 0 || satisfaction === 0}
            >
              Tiếp tục
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Feedback Step */}
        {step === 'feedback' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardContent className="p-6">
                {/* Quick Tags */}
                <div className="mb-6">
                  <Label className="text-white mb-3 block">
                    Điểm nổi bật của giáo viên (chọn nhiều)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {feedbackTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-[#3B82F6] text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Written Feedback */}
                <div>
                  <Label htmlFor="feedback" className="text-white mb-3 block">
                    Nhận xét thêm (tùy chọn)
                  </Label>
                  <Textarea
                    id="feedback"
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                onClick={() => setStep('rating')}
              >
                Quay lại
              </Button>
              <Button
                className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
