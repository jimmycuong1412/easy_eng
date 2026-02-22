'use client';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PixelAvatar } from '@/components/features/PixelAvatar';
import { GemBadge } from '@/components/features/CookieBadge';
import { useGemsBalance } from '@/hooks/useGemsBalance';
import { GemImage } from '@/components/common/GemImage';
import { getTeacherById } from '@/lib/queries';

type TeacherData = {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  specializations: string[];
  languages: string[];
  hourlyRate: number;
  rating: number;
  totalReviews: number;
  totalClasses: number;
  totalStudents: number;
  isOnline: boolean;
  isVerified: boolean;
  responseTime: string;
  memberSince: string;
  education: Array<{ degree: string; school: string; year: string }>;
  certifications: string[];
  availability: Array<{ day: string; slots: string[] }>;
  reviews: Array<{ id: string; studentName: string; rating: number; comment: string; date: string }>;
  ratingBreakdown: Record<number, number>;
};

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;
  const t = useTranslations('teachers');

  const [isLoading, setIsLoading] = React.useState(true);
  const [teacher, setTeacher] = React.useState<TeacherData | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [gemsApplied, setGemsApplied] = React.useState(0);
  const { balance: userGems } = useGemsBalance();

  React.useEffect(() => {
    getTeacherById(teacherId)
      .then((data: Record<string, unknown>) => {
        const reviews = ((data.reviews as Array<Record<string, unknown>>) || []).map((r) => {
          const student = r.profiles as Record<string, unknown> | undefined;
          return {
            id: r.id as string,
            studentName: r.is_anonymous ? 'Ẩn danh' : ((student?.full_name as string) || 'Student'),
            rating: (r.rating as number) || 5,
            comment: (r.comment as string) || '',
            date: new Date(r.created_at as string).toLocaleDateString('vi-VN'),
          };
        });

        const disabledSlots = new Set<string>((data.disabled_slots as string[]) || []);

        const avail = ((data.teacher_availability as Array<Record<string, unknown>>) || [])
          .filter((a) => a.is_active)
          .reduce((acc: Record<string, string[]>, a) => {
            const dayNames = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayOfWeek = (a.day_of_week as number) || 0;
            const dayName = dayNames[dayOfWeek];
            if (!acc[dayName]) acc[dayName] = [];
            const startTime = (a.start_time as string)?.slice(0, 5) || '09:00';
            const endTime = (a.end_time as string)?.slice(0, 5) || '17:00';
            // Generate 25-min class slots with 5-min break (30-min intervals)
            // Skip slots the teacher has disabled
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            let totalMins = startH * 60 + startM;
            const endMins = endH * 60 + endM;
            while (totalMins + 25 <= endMins) {
              const h = Math.floor(totalMins / 60);
              const m = totalMins % 60;
              const slotStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              const key = `${dayOfWeek}:${slotStr}`;
              if (!disabledSlots.has(key)) {
                acc[dayName].push(slotStr);
              }
              totalMins += 30;
            }
            return acc;
          }, {});

        const availability = Object.entries(avail).map(([day, slots]) => ({ day, slots }));
        const createdAt = new Date(data.created_at as string);

        // Calculate rating breakdown from reviews
        const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((r) => { breakdown[r.rating] = (breakdown[r.rating] || 0) + 1; });
        const totalR = reviews.length || 1;
        Object.keys(breakdown).forEach((k) => {
          breakdown[Number(k)] = Math.round((breakdown[Number(k)] / totalR) * 100);
        });

        const classes = (data.classes as Array<Record<string, unknown>>) || [];

        setTeacher({
          id: data.id as string,
          name: (data.full_name as string) || 'Teacher',
          avatar: (data.avatar_url as string) || null,
          bio: (data.bio as string) || '',
          specializations: ['English'],
          languages: ['English', 'Vietnamese'],
          hourlyRate: 200000,
          rating: (data.average_rating as number) || 0,
          totalReviews: (data.total_reviews as number) || 0,
          totalClasses: classes.length,
          totalStudents: classes.reduce((sum, c) => sum + ((c.current_enrollments as number) || 0), 0),
          isOnline: true,
          isVerified: true,
          responseTime: '< 1 hour',
          memberSince: createdAt.getFullYear().toString(),
          education: [],
          certifications: [],
          availability,
          reviews,
          ratingBreakdown: breakdown,
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [teacherId]);

  const mockTeacher = teacher || {
    id: teacherId,
    name: 'Loading...',
    avatar: null,
    bio: '',
    specializations: [],
    languages: [],
    hourlyRate: 0,
    rating: 0,
    totalReviews: 0,
    totalClasses: 0,
    totalStudents: 0,
    isOnline: false,
    isVerified: false,
    responseTime: '',
    memberSince: '',
    education: [],
    certifications: [],
    availability: [],
    reviews: [],
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };

  // Session price in Gems (1 Gem = 1,000 VND). hourlyRate is VND per 25-min session.
  const sessionPriceGems = Math.round(mockTeacher.hourlyRate / 1000);
  const maxGemsForDiscount = Math.min(userGems, Math.floor(sessionPriceGems * 0.5)); // max 50% discount
  const finalPriceGems = sessionPriceGems - gemsApplied;

  const handleBook = () => {
    if (!selectedDate || !selectedTime) {
      return;
    }
    router.push(`/student/bookings/confirm?teacher=${teacherId}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(selectedTime)}&gems=${gemsApplied}`);
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
        ← {t('backToList')}
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
                        ({t('reviews_label', { count: mockTeacher.totalReviews })})
                      </span>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-text-secondary">
                      {t('classes_label', { count: mockTeacher.totalClasses })}
                    </span>
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-text-secondary">
                      {t('students_label', { count: mockTeacher.totalStudents })}
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
                    <span>⏱️ {t('responseTime', { time: mockTeacher.responseTime })}</span>
                    <span>📅 {t('memberSince', { year: mockTeacher.memberSince })}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>{t('about')}</CardTitle>
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
              <CardTitle>{t('educationAndCerts')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-text-primary mb-2">{t('education')}</h4>
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
                <h4 className="font-medium text-text-primary mb-2">{t('certifications')}</h4>
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
              <CardTitle>{t('studentReviews')}</CardTitle>
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
                {t('viewAllReviews')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Booking card */}
          <Card variant="glow" className="sticky top-20">
            <CardHeader>
              <CardTitle>{t('bookClass')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Price */}
              <div className="text-center p-4 rounded-xl bg-bg-elevated">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-3xl font-bold text-accent-gem">
                    {sessionPriceGems}
                  </p>
                  <GemImage size={28} />
                </div>
                <p className="text-text-muted">/ 25 {t('minutes')}</p>
              </div>

              {/* Date selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('selectDate')}
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
                    {t('selectTime')}
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

              {/* Gem discount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-secondary">
                    {t('applyGems')}
                  </label>
                  <GemBadge count={userGems} size="sm" />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max={maxGemsForDiscount}
                    value={gemsApplied}
                    onChange={(e) => setGemsApplied(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-accent-gem w-20 text-right inline-flex items-center gap-1 justify-end">
                    -{gemsApplied} <GemImage size={14} className="inline-block align-middle" />
                  </span>
                </div>
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>0</span>
                  <span>{t('maxDiscount', { pct: 50 })}</span>
                  <span>{maxGemsForDiscount} <GemImage size={10} className="inline-block align-middle" /></span>
                </div>
              </div>

              {/* Final price */}
              <div className="p-4 rounded-xl bg-accent-gem/10 border border-accent-gem/20">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">{t('total')}</span>
                  <div className="text-right">
                    {gemsApplied > 0 && (
                      <p className="text-sm text-text-muted line-through inline-flex items-center gap-1">
                        {sessionPriceGems} <GemImage size={12} className="inline-block align-middle" />
                      </p>
                    )}
                    <p className="text-xl font-bold text-accent-gem inline-flex items-center gap-2">
                      {finalPriceGems} <GemImage size={20} />
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
                  ? t('bookAt', { date: selectedDate, time: selectedTime })
                  : t('selectDateAndTime')}
              </Button>

              {/* Message button */}
              <Button variant="outline" className="w-full">
                💬 {t('messageTeacher')}
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
