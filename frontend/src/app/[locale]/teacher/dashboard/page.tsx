'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Star,
  DollarSign,
  Video,
  MessageSquare,
  Bell,
  ChevronRight,
  BookOpen,
  Award,
  Settings,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

// Mock teacher data
const mockTeacher = {
  name: 'Nguyễn Minh Anh',
  avatar: '/avatars/teacher1.png',
  role: 'Giáo viên Tiếng Anh',
  rating: 4.9,
  totalReviews: 156,
};

const mockStats = {
  todayClasses: 3,
  weekClasses: 12,
  totalStudents: 48,
  monthlyEarnings: 15600000,
  avgRating: 4.9,
  completionRate: 98,
};

const mockUpcomingClasses = [
  {
    id: 'class-1',
    topic: 'IELTS Speaking Part 1',
    student: {
      name: 'Trần Văn Nam',
      avatar: '/avatars/student1.png',
      level: 'Intermediate',
    },
    scheduledAt: '2026-01-23T09:00:00+07:00',
    duration: 25,
    type: '1-on-1',
  },
  {
    id: 'class-2',
    topic: 'Business English: Email Writing',
    student: {
      name: 'Lê Thị Hoa',
      avatar: '/avatars/student2.png',
      level: 'Advanced',
    },
    scheduledAt: '2026-01-23T10:00:00+07:00',
    duration: 25,
    type: '1-on-1',
  },
  {
    id: 'class-3',
    topic: 'Grammar Review: Tenses',
    student: {
      name: 'Nguyễn Hoàng Minh',
      avatar: '/avatars/student3.png',
      level: 'Beginner',
    },
    scheduledAt: '2026-01-23T14:00:00+07:00',
    duration: 25,
    type: '1-on-1',
  },
];

const mockRecentReviews = [
  {
    id: 1,
    student: 'Trần Văn Nam',
    rating: 5,
    comment: 'Giáo viên rất tận tâm, giảng dễ hiểu!',
    date: '2026-01-22',
  },
  {
    id: 2,
    student: 'Lê Thị Hoa',
    rating: 5,
    comment: 'Buổi học rất hiệu quả, cảm ơn cô!',
    date: '2026-01-21',
  },
  {
    id: 3,
    student: 'Nguyễn Hoàng Minh',
    rating: 4,
    comment: 'Bài học thú vị, mong được học tiếp.',
    date: '2026-01-20',
  },
];

const mockQuickActions = [
  { icon: Calendar, label: 'Lịch dạy', href: '/teacher/schedule', color: 'text-[#3B82F6]' },
  { icon: Users, label: 'Học viên', href: '/teacher/students', color: 'text-emerald-400' },
  { icon: BookOpen, label: 'Tài liệu', href: '/teacher/materials', color: 'text-amber-400' },
  { icon: MessageSquare, label: 'Tin nhắn', href: '/teacher/messages', color: 'text-purple-400' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function TeacherDashboardPage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilClass = (dateString: string) => {
    const now = new Date();
    const classTime = new Date(dateString);
    const diffMs = classTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) {
      return `${diffMins} phút nữa`;
    }
    return `${diffHours} giờ nữa`;
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
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-[#3B82F6]/30">
              <AvatarImage src={mockTeacher.avatar} />
              <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-xl">
                {mockTeacher.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Xin chào, {mockTeacher.name}!
              </h1>
              <p className="text-slate-400">{mockTeacher.role}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="border-white/20 text-white">
              <Bell className="w-4 h-4 mr-2" />
              Thông báo
            </Button>
            <Button variant="outline" className="border-white/20 text-white">
              <Settings className="w-4 h-4 mr-2" />
              Cài đặt
            </Button>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {mockQuickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card className="bg-white/5 border-white/10 hover:border-[#3B82F6]/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white/5 ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-white">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-[#3B82F6] mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{mockStats.todayClasses}</p>
              <p className="text-xs text-slate-400">Lớp hôm nay</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Video className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{mockStats.weekClasses}</p>
              <p className="text-xs text-slate-400">Lớp tuần này</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{mockStats.totalStudents}</p>
              <p className="text-xs text-slate-400">Học viên</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">15.6M</p>
              <p className="text-xs text-slate-400">Thu nhập tháng</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{mockStats.avgRating}</p>
              <p className="text-xs text-slate-400">Đánh giá TB</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{mockStats.completionRate}%</p>
              <p className="text-xs text-slate-400">Hoàn thành</p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Classes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Lớp học sắp tới</CardTitle>
                <Link href="/teacher/schedule">
                  <Button variant="ghost" size="sm" className="text-[#3B82F6]">
                    Xem tất cả
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {mockUpcomingClasses.map((classItem) => (
                    <motion.div
                      key={classItem.id}
                      variants={itemVariants}
                      className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-[#3B82F6]/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={classItem.student.avatar} />
                            <AvatarFallback className="bg-emerald-500/20 text-emerald-400">
                              {classItem.student.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-white">{classItem.topic}</h4>
                            <p className="text-sm text-slate-400">{classItem.student.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0 text-xs">
                                {classItem.student.level}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {classItem.duration} phút
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">
                            {formatTime(classItem.scheduledAt)}
                          </p>
                          <p className="text-xs text-emerald-400">
                            {getTimeUntilClass(classItem.scheduledAt)}
                          </p>
                          <Button
                            size="sm"
                            className="mt-2 bg-emerald-500 hover:bg-emerald-500/90"
                          >
                            <Video className="w-3 h-3 mr-1" />
                            Vào lớp
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Đánh giá gần đây</CardTitle>
                <Badge className="bg-amber-500/20 text-amber-400 border-0">
                  <Star className="w-3 h-3 mr-1" />
                  {mockTeacher.rating}
                </Badge>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {mockRecentReviews.map((review) => (
                    <motion.div
                      key={review.id}
                      variants={itemVariants}
                      className="p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white text-sm">
                          {review.student}
                        </span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-300">{review.comment}</p>
                      <p className="text-xs text-slate-500 mt-1">{review.date}</p>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Tổng đánh giá</span>
                    <span className="text-white font-semibold">
                      {mockTeacher.totalReviews} đánh giá
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Performance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Hiệu suất tháng này</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Số lớp đã dạy</span>
                    <span className="text-white font-semibold">42/50 lớp</span>
                  </div>
                  <Progress value={84} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Tỷ lệ hoàn thành</span>
                    <span className="text-white font-semibold">98%</span>
                  </div>
                  <Progress value={98} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Học viên hài lòng</span>
                    <span className="text-white font-semibold">96%</span>
                  </div>
                  <Progress value={96} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
