'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  BookOpen,
  Cookie,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  getPlatformStats,
  getRevenueStats,
  getCookieStats,
  getBookingStats,
  getTopTeachers,
  getRecentActivities,
} from './actions';
import type {
  PlatformStats,
  RevenueStats,
  CookieStats,
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

const defaultCookieStats: CookieStats = {
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
  const [cookieStats, setCookieStats] = useState<CookieStats>(defaultCookieStats);
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
        const [platform, revenue, cookies, bookings, teachers, activities] =
          await Promise.all([
            getPlatformStats(),
            getRevenueStats(),
            getCookieStats(),
            getBookingStats(),
            getTopTeachers(),
            getRecentActivities(),
          ]);

        setPlatformStats(platform);
        setRevenueStats(revenue);
        setCookieStats(cookies);
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
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Admin Dashboard 🎯
          </h1>
          <p className="text-slate-400 mt-1">
            Tổng quan hệ thống - Cập nhật lúc {currentTime || '--:--:--'}
          </p>
        </motion.div>
        <motion.div variants={itemVariants} className="flex gap-3">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
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
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {platformStats.usersGrowth}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(platformStats.totalUsers)}
              </p>
              <p className="text-sm text-slate-400">Tổng người dùng</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {revenueStats.revenueGrowth}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatVND(revenueStats.totalRevenue)}đ
              </p>
              <p className="text-sm text-slate-400">Tổng doanh thu</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Cookie className="w-5 h-5 text-amber-400" />
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-0">
                  <Activity className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(cookieStats.totalCirculating)}
              </p>
              <p className="text-sm text-slate-400">Cookies lưu hành</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                  {bookingStats.completionRate}%
                </Badge>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(bookingStats.totalBookings)}
              </p>
              <p className="text-sm text-slate-400">Tổng lớp học</p>
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
                <p className="text-lg font-bold text-white">{formatNumber(platformStats.totalStudents)}</p>
                <p className="text-xs text-slate-400">Học viên</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{platformStats.totalTeachers}</p>
                <p className="text-xs text-slate-400">Giáo viên</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{formatVND(revenueStats.monthlyRevenue)}đ</p>
                <p className="text-xs text-slate-400">Doanh thu tháng</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{formatVND(revenueStats.averageBookingValue)}đ</p>
                <p className="text-xs text-slate-400">Giá trị TB/booking</p>
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
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#3B82F6]" />
                Hoạt động gần đây
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Xem tất cả
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">جاري التحميل...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-400">{error}</div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-8 text-slate-400">لا توجد أنشطة بعد</div>
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
                        <p className="text-sm text-white truncate">{activity.message}</p>
                        <p className="text-xs text-slate-500">{activity.time}</p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cookie Analytics */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Cookie className="w-5 h-5 text-amber-400" />
                Cookie Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Phát hành tháng này</span>
                  <span className="text-emerald-400">+{formatNumber(cookieStats.issuedThisMonth)}</span>
                </div>
                <Progress value={65} className="h-2 bg-white/10" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Đã sử dụng</span>
                  <span className="text-amber-400">-{formatNumber(cookieStats.redeemedThisMonth)}</span>
                </div>
                <Progress value={45} className="h-2 bg-white/10" />
              </div>

              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">TB cookies/booking</span>
                  <span className="text-xl font-bold text-white">{cookieStats.averageRedemption}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <p className="text-sm text-amber-400 text-center">
                  🍪 Net flow: +{formatNumber(cookieStats.issuedThisMonth - cookieStats.redeemedThisMonth)}
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
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-400" />
              Top Giáo viên tháng này
            </CardTitle>
            <Link href="/dashboard/analytics/teachers">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">#</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Giáo viên</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Doanh thu</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Lớp học</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Đánh giá</th>
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
                          ${index === 2 ? 'bg-amber-700 text-white' : ''}
                          ${index > 2 ? 'bg-white/10 text-slate-400' : ''}
                        `}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-medium">{teacher.name}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        {formatVND(teacher.revenue)}đ
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{teacher.bookings}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge className="bg-amber-500/20 text-amber-400 border-0">
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
