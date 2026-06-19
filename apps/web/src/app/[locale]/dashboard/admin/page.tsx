'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  BookOpen,
  Gem,
  Activity,
  ArrowUpRight,
  BarChart3,
  PieChart,
  UserPlus,
  Calendar,
  ChevronRight,
  Settings,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

import { formatNumber } from '@/lib/utils';
import { GemImage } from '@/components/common/GemImage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  getPlatformStats,
  getRevenueStats,
  getGemStats,
  getBookingStats,
  getTopTeachers,
  getRecentActivities,
} from './actions';
import type {
  PlatformStats,
  RevenueStats,
  GemStats,
  BookingStats,
  TopTeacher,
  RecentActivity,
} from './actions';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Default values for loading state
const defaultPlatformStats: PlatformStats = {
  totalUsers: 0,
  usersGrowth: 0,
  totalTeachers: 0,
  teachersGrowth: 0,
  totalStudents: 0,
  studentsGrowth: 0,
  totalParents: 0,
  parentsGrowth: 0,
};

const defaultRevenueStats: RevenueStats = {
  totalRevenue: 0,
  revenueGrowth: 0,
  monthlyRevenue: 0,
  pendingPayouts: 0,
  averageBookingValue: 0,
};

const defaultGemStats: GemStats = {
  totalCirculating: 0,
  issuedThisMonth: 0,
  redeemedThisMonth: 0,
  averageRedemption: 0,
};

const defaultBookingStats: BookingStats = {
  totalBookings: 0,
  completedThisMonth: 0,
  completionRate: 0,
  averageRating: 0,
};

// Format currency to VND
function formatVND(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toLocaleString('vi-VN');
}

export default function AdminDashboardPage() {
  const [platformStats, setPlatformStats] = useState<PlatformStats>(defaultPlatformStats);
  const [revenueStats, setRevenueStats] = useState<RevenueStats>(defaultRevenueStats);
  const [gemStats, setGemStats] = useState<GemStats>(defaultGemStats);
  const [bookingStats, setBookingStats] = useState<BookingStats>(defaultBookingStats);
  const [topTeachers, setTopTeachers] = useState<TopTeacher[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Set current time on client-side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString('vi-VN'));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [platform, revenue, gems, bookings, teachers, activities] =
          await Promise.all([
            getPlatformStats(),
            getRevenueStats(),
            getGemStats(),
            getBookingStats(),
            getTopTeachers(),
            getRecentActivities(),
          ]);

        setPlatformStats(platform);
        setRevenueStats(revenue);
        setGemStats(gems);
        setBookingStats(bookings);
        setTopTeachers(teachers);
        setRecentActivities(activities);
      } catch (err) {
        console.error('Error loading admin dashboard data:', err);
        setError('Lỗi khi tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Map activity types to icons and colors
  const getActivityIcon = (type: string) => {
    const iconMap: { [key: string]: typeof UserPlus } = {
      user_signup: UserPlus,
      booking: Calendar,
      payment: DollarSign,
      teacher_verified: CheckCircle,
      report: AlertTriangle,
    };
    return iconMap[type] || Activity;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
            Admin Dashboard 🎯
          </h1>
          <p className="text-text-muted mt-1">
            Tổng quan hệ thống - Cập nhật lúc {currentTime || '--:--:--'}
          </p>
        </motion.div>
        <motion.div variants={itemVariants} className="flex gap-3">
          <Button variant="outline" className="border-border-default text-text-primary hover:bg-bg-elevated">
            <BarChart3 className="w-4 h-4 mr-2" />
            Xuất báo cáo
          </Button>
          <Link href="/dashboard/settings/platform">
            <Button className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
              <Settings className="w-4 h-4 mr-2" />
              Cài đặt
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-[#3B82F6]/20 to-[#3B82F6]/5 border-[#3B82F6]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-[#3B82F6]/20 rounded-lg">
                  <Users className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-700 border-0">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {platformStats.usersGrowth}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {formatNumber(platformStats.totalUsers)}
              </p>
              <p className="text-sm text-text-muted">Tổng người dùng</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-700" />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-700 border-0">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {revenueStats.revenueGrowth}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {formatVND(revenueStats.totalRevenue)}đ
              </p>
              <p className="text-sm text-text-muted">Tổng doanh thu</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Gem className="w-5 h-5 text-amber-700" />
                </div>
                <Badge className="bg-amber-500/20 text-amber-700 border-0">
                  <Activity className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {formatNumber(gemStats.totalCirculating)}
              </p>
              <p className="text-sm text-text-muted">Gems lưu hành</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-700" />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-700 border-0">
                  {bookingStats.completionRate}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {formatNumber(bookingStats.totalBookings)}
              </p>
              <p className="text-sm text-text-muted">Tổng lớp học</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-[#3B82F6]/10 rounded-lg">
                <Users className="w-4 h-4 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{formatNumber(platformStats.totalStudents)}</p>
                <p className="text-xs text-text-muted">Học viên</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Users className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{platformStats.totalTeachers}</p>
                <p className="text-xs text-text-muted">Giáo viên</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <DollarSign className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{formatVND(revenueStats.monthlyRevenue)}đ</p>
                <p className="text-xs text-text-muted">Doanh thu tháng</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-purple-700" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{formatVND(revenueStats.averageBookingValue)}đ</p>
                <p className="text-xs text-text-muted">Giá trị TB/booking</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-white/5 border-white/10 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-text-primary flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#3B82F6]" />
                Hoạt động gần đây
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-text-muted hover:text-text-primary">
                Xem tất cả
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-text-muted">Đang tải...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-400">{error}</div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-8 text-text-muted">Chưa có hoạt động nào</div>
              ) : (
                recentActivities.map((activity, index) => {
                  const IconComponent = getActivityIcon(activity.type);
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${activity.color.replace('text-', 'bg-').replace('400', '500/20')}`}>
                        <IconComponent className={`w-4 h-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{activity.message}</p>
                        <p className="text-xs text-slate-500">{activity.time}</p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Gem Analytics */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10 h-full">
            <CardHeader>
              <CardTitle className="text-text-primary flex items-center gap-2">
                <Gem className="w-5 h-5 text-amber-700" />
                Gem Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Phát hành tháng này</span>
                  <span className="text-emerald-700">+{formatNumber(gemStats.issuedThisMonth)}</span>
                </div>
                <Progress value={65} className="h-2 bg-white/10" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Đã sử dụng</span>
                  <span className="text-amber-700">-{formatNumber(gemStats.redeemedThisMonth)}</span>
                </div>
                <Progress value={45} className="h-2 bg-white/10" />
              </div>

              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">TB gems/booking</span>
                  <span className="text-xl font-bold text-text-primary">{gemStats.averageRedemption}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <p className="text-sm text-amber-700 text-center">
                  <GemImage size={14} className="inline-block align-middle mr-1" /> Net flow: +{formatNumber(gemStats.issuedThisMonth - gemStats.redeemedThisMonth)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Teachers */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-text-primary flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-700" />
              Top Giáo viên tháng này
            </CardTitle>
            <Link href="/dashboard/analytics/teachers">
              <Button variant="ghost" size="sm" className="text-text-muted hover:text-text-primary">
                Xem chi tiết
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">#</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Giáo viên</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Doanh thu</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Lớp học</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {topTeachers.map((teacher, index) => (
                    <tr
                      key={teacher.name}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className={`
                          inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold
                          ${index === 0 ? 'bg-amber-500 text-black' : ''}
                          ${index === 1 ? 'bg-slate-400 text-black' : ''}
                          ${index === 2 ? 'bg-amber-700 text-text-primary' : ''}
                          ${index > 2 ? 'bg-white/10 text-text-muted' : ''}
                        `}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-primary font-medium">{teacher.name}</td>
                      <td className="py-3 px-4 text-right text-emerald-700">
                        {formatVND(teacher.revenue)}đ
                      </td>
                      <td className="py-3 px-4 text-right text-text-secondary">{teacher.bookings}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge className="bg-amber-500/20 text-amber-700 border-0">
                          ⭐ {teacher.rating}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
