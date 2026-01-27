'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Calendar,
  Star,
  Cookie,
  BookOpen,
  Video,
  Award,
  Target,
  BarChart3,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Mock analytics data
const mockOverviewStats = {
  totalStudents: 1250,
  studentsChange: 12.5,
  totalClasses: 3840,
  classesChange: 8.3,
  totalHours: 1600,
  hoursChange: 15.2,
  avgRating: 4.8,
  ratingChange: 0.2,
};

const mockRevenueData = {
  thisMonth: 285000000,
  lastMonth: 248000000,
  growth: 14.9,
};

const mockTopTeachers = [
  { name: 'Nguyễn Minh Anh', classes: 142, rating: 4.95, earnings: 28500000 },
  { name: 'Trần Văn Nam', classes: 128, rating: 4.88, earnings: 25600000 },
  { name: 'Lê Thị Hoa', classes: 115, rating: 4.92, earnings: 23000000 },
  { name: 'Phạm Quốc Huy', classes: 98, rating: 4.85, earnings: 19600000 },
  { name: 'Nguyễn Thu Hà', classes: 87, rating: 4.80, earnings: 17400000 },
];

const mockPopularCourses = [
  { name: 'IELTS Speaking', students: 320, completion: 78 },
  { name: 'Business English', students: 285, completion: 82 },
  { name: 'Grammar Fundamentals', students: 248, completion: 85 },
  { name: 'Conversational English', students: 215, completion: 72 },
  { name: 'TOEIC Preparation', students: 180, completion: 68 },
];

const mockUserActivity = {
  daily: [
    { day: 'T2', active: 450, classes: 120 },
    { day: 'T3', active: 520, classes: 145 },
    { day: 'T4', active: 480, classes: 130 },
    { day: 'T5', active: 610, classes: 168 },
    { day: 'T6', active: 550, classes: 152 },
    { day: 'T7', active: 680, classes: 185 },
    { day: 'CN', active: 420, classes: 98 },
  ],
  peakHours: ['09:00', '14:00', '19:00', '20:00'],
};

const mockCookieStats = {
  totalIssued: 125000,
  totalRedeemed: 89500,
  redemptionRate: 71.6,
  avgPerUser: 42,
};

const mockRetention = {
  week1: 92,
  week2: 78,
  week4: 65,
  month3: 48,
};

export default function AnalyticsDashboardPage() {
  const [timeRange, setTimeRange] = React.useState('month');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Phân tích & Thống kê</h1>
            <p className="text-slate-400">Tổng quan hoạt động nền tảng</p>
          </div>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
              <Calendar className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 ngày qua</SelectItem>
              <SelectItem value="month">30 ngày qua</SelectItem>
              <SelectItem value="quarter">Quý này</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Tổng học viên</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatNumber(mockOverviewStats.totalStudents)}
                  </p>
                </div>
                <div className="p-2 bg-[#3B82F6]/10 rounded-lg">
                  <Users className="w-5 h-5 text-[#3B82F6]" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  +{mockOverviewStats.studentsChange}%
                </span>
                <span className="text-slate-500 ml-1">so với tháng trước</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Lớp học đã tổ chức</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatNumber(mockOverviewStats.totalClasses)}
                  </p>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Video className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  +{mockOverviewStats.classesChange}%
                </span>
                <span className="text-slate-500 ml-1">so với tháng trước</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Tổng giờ học</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatNumber(mockOverviewStats.totalHours)}
                  </p>
                </div>
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  +{mockOverviewStats.hoursChange}%
                </span>
                <span className="text-slate-500 ml-1">so với tháng trước</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Đánh giá trung bình</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {mockOverviewStats.avgRating}
                    <Star className="w-5 h-5 text-amber-400 inline ml-1" />
                  </p>
                </div>
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Star className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-sm">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  +{mockOverviewStats.ratingChange}
                </span>
                <span className="text-slate-500 ml-1">so với tháng trước</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-[#3B82F6]/20 to-purple-500/20 border-[#3B82F6]/30">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-slate-300 text-sm mb-1">Doanh thu tháng này</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(mockRevenueData.thisMonth)}
                  </p>
                  <div className="flex items-center mt-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{mockRevenueData.growth}%
                    </Badge>
                    <span className="text-slate-400 text-sm ml-2">
                      vs tháng trước ({formatCurrency(mockRevenueData.lastMonth)})
                    </span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(mockRevenueData.thisMonth / 30)}
                    </p>
                    <p className="text-slate-400 text-sm">Trung bình/ngày</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(mockRevenueData.thisMonth / mockOverviewStats.totalClasses)}
                    </p>
                    <p className="text-slate-400 text-sm">Trung bình/lớp</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Top Teachers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Top giáo viên
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockTopTeachers.map((teacher, index) => (
                    <div
                      key={teacher.name}
                      className="flex items-center gap-4 p-3 bg-white/5 rounded-lg"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? 'bg-amber-500 text-white'
                            : index === 1
                            ? 'bg-slate-400 text-white'
                            : index === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{teacher.name}</p>
                        <p className="text-sm text-slate-400">
                          {teacher.classes} lớp • {teacher.rating} ⭐
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {formatCurrency(teacher.earnings)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Popular Courses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#3B82F6]" />
                  Khóa học phổ biến
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPopularCourses.map((course, index) => (
                    <div key={course.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{course.name}</span>
                        <span className="text-slate-400 text-sm">
                          {course.students} học viên
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={course.completion} className="flex-1 h-2" />
                        <span className="text-sm text-slate-400 w-12">
                          {course.completion}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Cookie Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Cookie className="w-5 h-5 text-amber-400" />
                  Thống kê Cookies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Đã phát hành</span>
                  <span className="text-white font-semibold">
                    {formatNumber(mockCookieStats.totalIssued)} 🍪
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Đã sử dụng</span>
                  <span className="text-white font-semibold">
                    {formatNumber(mockCookieStats.totalRedeemed)} 🍪
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tỷ lệ sử dụng</span>
                  <span className="text-emerald-400 font-semibold">
                    {mockCookieStats.redemptionRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">TB mỗi học viên</span>
                  <span className="text-white font-semibold">
                    {mockCookieStats.avgPerUser} 🍪
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* User Retention */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  Tỷ lệ giữ chân
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400 text-sm">Tuần 1</span>
                    <span className="text-white">{mockRetention.week1}%</span>
                  </div>
                  <Progress value={mockRetention.week1} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400 text-sm">Tuần 2</span>
                    <span className="text-white">{mockRetention.week2}%</span>
                  </div>
                  <Progress value={mockRetention.week2} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400 text-sm">Tuần 4</span>
                    <span className="text-white">{mockRetention.week4}%</span>
                  </div>
                  <Progress value={mockRetention.week4} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400 text-sm">Tháng 3</span>
                    <span className="text-white">{mockRetention.month3}%</span>
                  </div>
                  <Progress value={mockRetention.month3} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Peak Hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  Giờ cao điểm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockUserActivity.peakHours.map((hour, index) => (
                    <div
                      key={hour}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`border-0 ${
                            index === 0
                              ? 'bg-amber-500 text-white'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          #{index + 1}
                        </Badge>
                        <span className="text-white font-medium">{hour}</span>
                      </div>
                      <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0">
                        Peak
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Dựa trên dữ liệu 30 ngày qua
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Weekly Activity Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#3B82F6]" />
                Hoạt động theo ngày
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-4 h-48">
                {mockUserActivity.daily.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col gap-1">
                      <div
                        className="w-full bg-[#3B82F6] rounded-t"
                        style={{ height: `${(day.active / 700) * 120}px` }}
                      />
                      <div
                        className="w-full bg-emerald-500 rounded-b"
                        style={{ height: `${(day.classes / 200) * 40}px` }}
                      />
                    </div>
                    <span className="text-slate-400 text-sm">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#3B82F6] rounded" />
                  <span className="text-sm text-slate-400">Người dùng hoạt động</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded" />
                  <span className="text-sm text-slate-400">Lớp học</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
