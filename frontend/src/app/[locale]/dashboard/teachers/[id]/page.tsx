'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PixelAvatar } from '@/components/features/PixelAvatar';
import { CookieBadge } from '@/components/features/CookieBadge';

// Mock teacher data (would come from API)
const mockTeacher = {
  id: '1',
  name: 'Sarah Johnson',
  avatar: null,
  bio: 'Native English speaker with 5+ years of teaching experience. I specialize in Business English and interview preparation. My teaching style is conversational and practical - I believe the best way to learn is by speaking! I have helped hundreds of students achieve their goals, from passing job interviews at multinational companies to giving presentations with confidence.',
  specializations: ['Business English', 'Conversation', 'IELTS', 'Interview Prep'],
  languages: ['English (Native)', 'Vietnamese (Basic)'],
  hourlyRate: 180000,
  rating: 4.9,
  totalReviews: 128,
  totalClasses: 450,
  totalStudents: 89,
  isOnline: true,
  isVerified: true,
  responseTime: '< 1 hour',
  memberSince: '2022',
  education: [
    { degree: 'MA TESOL', school: 'University of Cambridge', year: '2018' },
    { degree: 'BA English Literature', school: 'Oxford University', year: '2016' },
  ],
  certifications: ['CELTA', 'IELTS Examiner', 'Business English Certificate'],
  availability: [
    { day: 'Thứ 2', slots: ['08:00', '09:00', '10:00', '14:00', '15:00', '19:00', '20:00'] },
    { day: 'Thứ 3', slots: ['09:00', '10:00', '11:00', '15:00', '16:00', '20:00', '21:00'] },
    { day: 'Thứ 4', slots: ['08:00', '09:00', '14:00', '15:00', '19:00', '20:00'] },
    { day: 'Thứ 5', slots: ['10:00', '11:00', '15:00', '16:00', '20:00', '21:00'] },
    { day: 'Thứ 6', slots: ['09:00', '10:00', '14:00', '15:00', '19:00'] },
    { day: 'Thứ 7', slots: ['10:00', '11:00', '14:00', '15:00'] },
  ],
  reviews: [
    {
      id: '1',
      studentName: 'Minh Anh',
      rating: 5,
      comment: 'Cô Sarah dạy rất hay! Sau 3 tháng học, tôi đã tự tin phỏng vấn bằng tiếng Anh.',
      date: '2024-01-15',
    },
    {
      id: '2',
      studentName: 'Hoàng Nam',
      rating: 5,
      comment: 'Giáo viên rất kiên nhẫn và vui vẻ. Bài học luôn thú vị.',
      date: '2024-01-10',
    },
    {
      id: '3',
      studentName: 'Thu Hà',
      rating: 4,
      comment: 'Cô giảng dễ hiểu, có nhiều tài liệu bổ ích. Highly recommended!',
      date: '2024-01-05',
    },
  ],
  ratingBreakdown: {
    5: 85,
    4: 10,
    3: 3,
    2: 1,
    1: 1,
  },
};

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;

  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [cookiesApplied, setCookiesApplied] = React.useState(0);

  const userCookies = 150; // Mock user cookie balance
  const maxCookiesForDiscount = Math.min(userCookies, Math.floor(mockTeacher.hourlyRate / 1000));
  const discount = cookiesApplied * 1000;
  const finalPrice = mockTeacher.hourlyRate - discount;

  const handleBook = () => {
    if (!selectedDate || !selectedTime) {
      alert('Vui lòng chọn ngày và giờ học');
      return;
    }
    // TODO: Navigate to booking confirmation page
    router.push(`/dashboard/book/${teacherId}?date=${selectedDate}&time=${selectedTime}&cookies=${cookiesApplied}`);
  };

  if (isLoading) {
    return <TeacherDetailSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Back button */}
      <Link
        href="/dashboard/teachers"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        ← Quay lại danh sách
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Teacher header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <PixelAvatar
                      src={mockTeacher.avatar}
                      fallbackEmoji="👨‍🏫"
                      size="xl"
                      showLevel={false}
                    />
                    {mockTeacher.isOnline && (
                      <span className="absolute bottom-2 right-2 w-5 h-5 bg-success rounded-full border-2 border-bg-surface" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-text-primary">
                      {mockTeacher.name}
                    </h1>
                    {mockTeacher.isVerified && (
                      <Badge variant="success">✓ Verified</Badge>
                    )}
                    {mockTeacher.isOnline && (
                      <Badge variant="outline" className="text-success border-success">
                        Online
                      </Badge>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <span className="text-accent-gold text-xl">⭐</span>
                      <span className="text-xl font-bold">{mockTeacher.rating}</span>
                      <span className="text-text-muted">
                        ({mockTeacher.totalReviews} đánh giá)
                      </span>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-text-secondary">
                      {mockTeacher.totalClasses} lớp học
                    </span>
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-text-secondary">
                      {mockTeacher.totalStudents} học sinh
                    </span>
                  </div>

                  {/* Specializations */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mockTeacher.specializations.map((spec) => (
                      <Badge key={spec} variant="secondary">
                        {spec}
                      </Badge>
                    ))}
                  </div>

                  {/* Quick stats */}
                  <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                    <span>🗣️ {mockTeacher.languages.join(', ')}</span>
                    <span>⏱️ Phản hồi: {mockTeacher.responseTime}</span>
                    <span>📅 Thành viên từ {mockTeacher.memberSince}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>Giới thiệu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary whitespace-pre-line">
                {mockTeacher.bio}
              </p>
            </CardContent>
          </Card>

          {/* Education & Certifications */}
          <Card>
            <CardHeader>
              <CardTitle>Học vấn & Chứng chỉ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-text-primary mb-2">Học vấn</h4>
                <ul className="space-y-2">
                  {mockTeacher.education.map((edu, i) => (
                    <li key={i} className="flex items-start gap-2 text-text-secondary">
                      <span>🎓</span>
                      <span>
                        {edu.degree} - {edu.school} ({edu.year})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-text-primary mb-2">Chứng chỉ</h4>
                <div className="flex flex-wrap gap-2">
                  {mockTeacher.certifications.map((cert) => (
                    <Badge key={cert} variant="outline">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Đánh giá từ học sinh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rating breakdown */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="text-sm w-8">{stars}⭐</span>
                    <Progress
                      value={mockTeacher.ratingBreakdown[stars as keyof typeof mockTeacher.ratingBreakdown]}
                      className="flex-1"
                    />
                    <span className="text-sm text-text-muted w-12">
                      {mockTeacher.ratingBreakdown[stars as keyof typeof mockTeacher.ratingBreakdown]}%
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Review list */}
              <div className="space-y-4">
                {mockTeacher.reviews.map((review) => (
                  <div key={review.id} className="p-4 rounded-xl bg-bg-elevated">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {review.studentName}
                        </span>
                        <div className="flex">
                          {[...Array(review.rating)].map((_, i) => (
                            <span key={i} className="text-accent-gold text-sm">
                              ⭐
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-text-muted">{review.date}</span>
                    </div>
                    <p className="text-text-secondary">{review.comment}</p>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full">
                Xem tất cả đánh giá
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Booking card */}
          <Card variant="glow" className="sticky top-20">
            <CardHeader>
              <CardTitle>Đặt lịch học</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price */}
              <div className="text-center p-4 rounded-xl bg-bg-elevated">
                <p className="text-3xl font-bold text-accent-primary">
                  {formatNumber(mockTeacher.hourlyRate)}đ
                </p>
                <p className="text-text-muted">/ 25 phút</p>
              </div>

              {/* Date selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Chọn ngày
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {mockTeacher.availability.slice(0, 6).map((day) => (
                    <button
                      key={day.day}
                      onClick={() => {
                        setSelectedDate(day.day);
                        setSelectedTime(null);
                      }}
                      className={`p-2 rounded-lg text-sm font-medium transition-all ${
                        selectedDate === day.day
                          ? 'bg-accent-primary text-white'
                          : 'bg-bg-elevated text-text-secondary hover:bg-bg-surface'
                      }`}
                    >
                      {day.day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time selection */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Chọn giờ
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {mockTeacher.availability
                      .find((d) => d.day === selectedDate)
                      ?.slots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 rounded-lg text-sm font-medium transition-all ${
                            selectedTime === time
                              ? 'bg-accent-primary text-white'
                              : 'bg-bg-elevated text-text-secondary hover:bg-bg-surface'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Cookie discount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-secondary">
                    Áp dụng Cookies
                  </label>
                  <CookieBadge count={userCookies} size="sm" />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max={maxCookiesForDiscount}
                    value={cookiesApplied}
                    onChange={(e) => setCookiesApplied(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-accent-cookie w-16 text-right">
                    {cookiesApplied} 🍪
                  </span>
                </div>
                {cookiesApplied > 0 && (
                  <p className="text-sm text-success mt-1">
                    Giảm {formatNumber(discount)}đ
                  </p>
                )}
              </div>

              {/* Final price */}
              <div className="p-4 rounded-xl bg-accent-primary/10 border border-accent-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Tổng cộng</span>
                  <div className="text-right">
                    {discount > 0 && (
                      <p className="text-sm text-text-muted line-through">
                        {formatNumber(mockTeacher.hourlyRate)}đ
                      </p>
                    )}
                    <p className="text-xl font-bold text-accent-primary">
                      {formatNumber(finalPrice)}đ
                    </p>
                  </div>
                </div>
              </div>

              {/* Book button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleBook}
                disabled={!selectedDate || !selectedTime}
              >
                {selectedDate && selectedTime
                  ? `Đặt lịch ${selectedDate} ${selectedTime}`
                  : 'Chọn ngày và giờ'}
              </Button>

              {/* Message button */}
              <Button variant="outline" className="w-full">
                💬 Nhắn tin cho giáo viên
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

function TeacherDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
        <div>
          <Skeleton className="h-96" />
        </div>
      </div>
    </div>
  );
}
