'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Star,
  Globe,
  Award,
  BookOpen,
  MessageSquare,
  Video,
  Share2,
  Heart,
  Cookie,
  Sparkles,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// Mock class data - will be replaced with Supabase fetch
const mockClassData = {
  id: '1',
  topic: 'Business English: Meeting Skills',
  description: `Trong lớp học này, bạn sẽ học cách:

• Sử dụng các cụm từ chuyên nghiệp trong cuộc họp
• Cách mở đầu và kết thúc cuộc họp hiệu quả
• Kỹ năng trình bày ý kiến và phản biện lịch sự
• Vocabulary: 30+ từ vựng Business English
• Role-play thực hành với tình huống thực tế

Phù hợp với người đi làm, sinh viên chuẩn bị đi thực tập, hoặc ai muốn nâng cao kỹ năng giao tiếp trong môi trường công sở.`,
  teacherName: 'Nguyễn Minh Anh',
  teacherAvatar: '/avatars/teacher1.png',
  teacherBio: 'Giáo viên IELTS 8.0, 5 năm kinh nghiệm giảng dạy. Từng làm việc tại các công ty đa quốc gia.',
  teacherRating: 4.9,
  teacherReviews: 128,
  teacherClasses: 342,
  teacherStudents: 1250,
  scheduledAt: '2026-01-23T09:00:00+07:00',
  duration: 25,
  capacity: 8,
  enrolledCount: 5,
  priceUsd: 8,
  priceVnd: 200000,
  level: 'Intermediate',
  category: 'Business',
  language: 'Vietnamese & English',
  requirements: ['Trình độ tiếng Anh cơ bản (A2+)', 'Microphone và camera', 'Môi trường yên tĩnh'],
  whatYouLearn: [
    'Vocabulary cho Business meetings',
    'Cách mở đầu cuộc họp chuyên nghiệp',
    'Phrases để express opinions',
    'Kỹ năng active listening',
  ],
  reviews: [
    {
      id: '1',
      studentName: 'Trần Văn Bình',
      rating: 5,
      comment: 'Lớp học rất hữu ích, cô giáo nhiệt tình và dễ hiểu.',
      date: '2026-01-15',
    },
    {
      id: '2',
      studentName: 'Lê Thị Mai',
      rating: 5,
      comment: 'Vocabulary thực tế, có thể áp dụng ngay trong công việc.',
      date: '2026-01-10',
    },
  ],
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isLiked, setIsLiked] = React.useState(false);
  const classData = mockClassData; // Will fetch by params.classId

  const spotsLeft = classData.capacity - classData.enrolledCount;
  const isFull = spotsLeft <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại danh sách lớp học
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Class Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0">
                      {classData.category}
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                      {classData.level}
                    </Badge>
                    <Badge variant="outline" className="border-white/20 text-slate-300">
                      <Globe className="w-3 h-3 mr-1" />
                      {classData.language}
                    </Badge>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    {classData.topic}
                  </h1>

                  <div className="flex flex-wrap items-center gap-6 text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span>{formatDate(classData.scheduledAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span>{formatTime(classData.scheduledAt)} ({classData.duration} phút)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span className={spotsLeft <= 2 ? 'text-amber-400' : ''}>
                        {spotsLeft} chỗ trống
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#3B82F6]" />
                    Mô tả lớp học
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                    {classData.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* What You'll Learn */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Bạn sẽ học được gì
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classData.whatYouLearn.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="p-1 bg-emerald-500/20 rounded-full mt-0.5">
                          <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Requirements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Yêu cầu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {classData.requirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-3 text-slate-300">
                        <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Teacher Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Giáo viên</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-[#3B82F6]/30">
                      <AvatarImage src={classData.teacherAvatar} />
                      <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-xl">
                        {classData.teacherName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link href={`/teachers/${classData.id}`} className="hover:underline">
                        <h3 className="text-lg font-semibold text-white">{classData.teacherName}</h3>
                      </Link>
                      <div className="flex items-center gap-4 text-sm text-slate-400 mt-1 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span>{classData.teacherRating}</span>
                          <span>({classData.teacherReviews} đánh giá)</span>
                        </div>
                        <span>•</span>
                        <span>{classData.teacherClasses} lớp học</span>
                        <span>•</span>
                        <span>{classData.teacherStudents} học viên</span>
                      </div>
                      <p className="text-slate-300">{classData.teacherBio}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#3B82F6]" />
                    Đánh giá từ học viên
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                    Xem tất cả
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {classData.reviews.map((review) => (
                    <div key={review.id} className="p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] font-medium">
                            {review.studentName.charAt(0)}
                          </div>
                          <span className="text-white font-medium">{review.studentName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-300">{review.comment}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(review.date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Booking Card */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-6"
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  {/* Price */}
                  <div className="text-center mb-6">
                    <p className="text-3xl font-bold text-white">{formatVND(classData.priceVnd)}</p>
                    <p className="text-sm text-slate-400">~${classData.priceUsd} USD</p>
                  </div>

                  {/* Cookie Discount Hint */}
                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 mb-6">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                      <Cookie className="w-5 h-5" />
                      <span className="font-medium">Giảm giá với Cookies!</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      Sử dụng Cookies để được giảm đến 50% giá lớp học.
                    </p>
                  </div>

                  {/* Spots Left */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-400">Chỗ trống</span>
                      <span className="text-white">{classData.enrolledCount}/{classData.capacity}</span>
                    </div>
                    <Progress 
                      value={(classData.enrolledCount / classData.capacity) * 100} 
                      className="h-2 bg-white/10"
                    />
                    {spotsLeft <= 2 && spotsLeft > 0 && (
                      <p className="text-xs text-amber-400 mt-2">⚡ Chỉ còn {spotsLeft} chỗ!</p>
                    )}
                  </div>

                  {/* Book Button */}
                  <Button
                    className="w-full h-12 text-lg bg-[#3B82F6] hover:bg-[#3B82F6]/90 mb-3"
                    disabled={isFull}
                    onClick={() => router.push(`/booking/${classData.id}`)}
                  >
                    {isFull ? (
                      'Hết chỗ'
                    ) : (
                      <>
                        <Video className="w-5 h-5 mr-2" />
                        Đặt lớp ngay
                      </>
                    )}
                  </Button>

                  {/* Secondary Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                      onClick={() => setIsLiked(!isLiked)}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      {isLiked ? 'Đã lưu' : 'Lưu'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Chia sẻ
                    </Button>
                  </div>

                  <Separator className="my-6 bg-white/10" />

                  {/* Class Info Summary */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ngày học</span>
                      <span className="text-white">{formatDate(classData.scheduledAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Giờ học</span>
                      <span className="text-white">{formatTime(classData.scheduledAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Thời lượng</span>
                      <span className="text-white">{classData.duration} phút</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hình thức</span>
                      <span className="text-white">Video call trực tuyến</span>
                    </div>
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
