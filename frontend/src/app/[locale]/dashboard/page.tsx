'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { formatNumber } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CookieBadge } from '@/components/features/CookieBadge';
import { XPProgressBar } from '@/components/features/XPProgressBar';
import { PixelAvatar } from '@/components/features/PixelAvatar';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Mock data - includes real teacher from database
const mockUpcomingClasses = [
  {
    id: '1',
    teacherName: 'Teacher', // Real teacher from Supabase (ID: 7a46e4e2-782c-471a-ba1b-cea449e75028)
    teacherAvatar: undefined, // Will use fallback with initials
    subject: 'IELTS Speaking Practice', // From real booking data
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    duration: 60, // 1 hour session
  },
  {
    id: '2',
    teacherName: 'Teacher',
    teacherAvatar: undefined,
    subject: 'Business English Conversation',
    scheduledAt: new Date(Date.now() + 26 * 60 * 60 * 1000), // Tomorrow
    duration: 60,
  },
];

const mockRecommendedTeachers = [
  {
    id: '7a46e4e2-782c-471a-ba1b-cea449e75028', // Real teacher ID from Supabase
    name: 'Teacher',
    avatar: undefined, // Will use fallback with initials
    specialization: 'IELTS', // From teacher_profiles.specialties
    rating: 4.85, // From teacher_profiles.avg_rating
    hourlyRate: 200000, // From teacher_profiles.hourly_rate
    isOnline: true,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    avatar: undefined,
    specialization: 'Business English',
    rating: 4.9,
    hourlyRate: 180000,
    isOnline: true,
  },
  {
    id: '3',
    name: 'Emily Davis',
    avatar: undefined,
    specialization: 'Conversation',
    rating: 5.0,
    hourlyRate: 120000,
    isOnline: false,
  },
];

export default function StudentDashboardPage() {
  const { profile, isLoading } = useAuth();

  // Mock data
  const cookieBalance = 150;
  const totalXp = 1250;
  const streakDays = 7;
  const completedClasses = 12;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Ngày mai';
    }
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
    });
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome section */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          Xin chào, {profile?.full_name?.split(' ').pop() || 'bạn'}! 👋
        </h1>
        <p className="text-text-secondary mt-1">
          Tiếp tục hành trình học tiếng Anh của bạn
        </p>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon="🍪"
          label="Cookies"
          value={formatNumber(cookieBalance)}
          color="cookie"
        />
        <StatCard
          icon="🔥"
          label="Streak"
          value={`${streakDays} ngày`}
          color="warning"
        />
        <StatCard
          icon="📚"
          label="Lớp học"
          value={completedClasses.toString()}
          color="primary"
        />
        <StatCard
          icon="⭐"
          label="XP"
          value={formatNumber(totalXp)}
          color="gold"
        />
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming classes */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Lớp học sắp tới</CardTitle>
                <Link href="/student/bookings">
                  <Button variant="ghost" size="sm">
                    Xem tất cả →
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockUpcomingClasses.length > 0 ? (
                  mockUpcomingClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-bg-elevated border border-border-default hover:border-border-focus transition-colors"
                    >
                      <PixelAvatar
                        src={cls.teacherAvatar}
                        fallbackEmoji="👨‍🏫"
                        size="md"
                        showLevel={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {cls.subject}
                        </p>
                        <p className="text-sm text-text-secondary">
                          với {cls.teacherName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-accent-primary">
                          {formatTime(cls.scheduledAt)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatDate(cls.scheduledAt)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Chi tiết
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-text-muted mb-4">
                      Bạn chưa có lớp học nào được đặt
                    </p>
                    <Link href="/dashboard/teachers">
                      <Button>Tìm giáo viên ngay</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recommended teachers */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Giáo viên đề xuất</CardTitle>
                <Link href="/dashboard/teachers">
                  <Button variant="ghost" size="sm">
                    Xem tất cả →
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mockRecommendedTeachers.map((teacher) => (
                    <Link
                      key={teacher.id}
                      href={`/dashboard/teachers/${teacher.id}`}
                    >
                      <div className="p-4 rounded-xl bg-bg-elevated border border-border-default hover:border-border-focus hover:shadow-card-hover transition-all cursor-pointer">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative">
                            <PixelAvatar
                              src={teacher.avatar}
                              fallbackEmoji="👨‍🏫"
                              size="lg"
                              showLevel={false}
                            />
                            {teacher.isOnline && (
                              <span className="absolute bottom-0 right-0 w-4 h-4 bg-success rounded-full border-2 border-bg-elevated" />
                            )}
                          </div>
                          <p className="font-medium text-text-primary mt-3">
                            {teacher.name}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {teacher.specialization}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-accent-gold">⭐</span>
                            <span className="text-sm font-medium">
                              {teacher.rating}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-accent-primary mt-2">
                            {formatNumber(teacher.hourlyRate)}đ/25min
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          {/* Character progress */}
          <motion.div variants={itemVariants}>
            <Card variant="glow">
              <CardHeader>
                <CardTitle className="text-lg">Avatar của bạn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <PixelAvatar
                    fallbackEmoji="🧑‍💼"
                    level={3}
                    name="Business Pro"
                    careerPath="Business"
                    size="xl"
                  />
                </div>
                <XPProgressBar totalXp={totalXp} size="md" />
                <Link href="/student/progress" className="block">
                  <Button variant="secondary" className="w-full">
                    Xem chi tiết Avatar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cookie balance */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>🍪</span> Cookies của bạn
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-accent-cookie">
                    {cookieBalance}
                  </p>
                  <p className="text-sm text-text-muted">
                    = {formatNumber(cookieBalance * 1000)}đ giảm giá
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <span>Hoàn thành lớp học</span>
                    <span className="text-success">+5 🍪</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Giới thiệu bạn bè</span>
                    <span className="text-success">+50 🍪</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Đặt lớp đầu tiên</span>
                    <span className="text-success">+20 🍪</span>
                  </div>
                </div>
                <Link href="/student/rewards">
                  <Button variant="cookie" className="w-full">
                    Sử dụng Cookies
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily streak */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>🔥</span> Chuỗi học tập
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-1">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        i < streakDays
                          ? 'bg-accent-gold/20 text-accent-gold'
                          : 'bg-bg-elevated text-text-muted'
                      }`}
                    >
                      {i < streakDays ? '🔥' : i + 1}
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-text-secondary mt-3">
                  {streakDays} ngày liên tiếp!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: 'cookie' | 'warning' | 'primary' | 'gold';
}) {
  const colorClasses = {
    cookie: 'text-accent-cookie',
    warning: 'text-warning',
    primary: 'text-accent-primary',
    gold: 'text-accent-gold',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-text-muted">{label}</p>
          <p className={`text-xl font-bold ${colorClasses[color]}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-80" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  );
}
