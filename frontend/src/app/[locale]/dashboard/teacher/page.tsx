'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Star,
  Plus,
  ChevronRight,
  Video,
  BookOpen,
  Bell,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

// Animation variants
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

// Mock data - will be replaced with real data from Supabase
const todayClasses = [
  {
    id: '1',
    studentName: 'Nguyễn Văn An',
    studentAvatar: '/avatars/student1.png',
    time: '09:00',
    duration: 25,
    topic: 'Business English - Meetings',
    status: 'upcoming',
  },
  {
    id: '2',
    studentName: 'Trần Thị Bình',
    studentAvatar: '/avatars/student2.png',
    time: '10:30',
    duration: 25,
    topic: 'IELTS Speaking Part 2',
    status: 'in-progress',
  },
  {
    id: '3',
    studentName: 'Lê Hoàng Cường',
    studentAvatar: '/avatars/student3.png',
    time: '14:00',
    duration: 25,
    topic: 'Conversation Practice',
    status: 'upcoming',
  },
  {
    id: '4',
    studentName: 'Phạm Minh Đức',
    studentAvatar: '/avatars/student4.png',
    time: '15:30',
    duration: 25,
    topic: 'Grammar Review',
    status: 'upcoming',
  },
];

const recentReviews = [
  {
    id: '1',
    studentName: 'Hoàng Thị Lan',
    rating: 5,
    comment: 'Cô giáo rất nhiệt tình và dễ hiểu. Cảm ơn cô!',
    date: '2 giờ trước',
  },
  {
    id: '2',
    studentName: 'Võ Minh Quân',
    rating: 5,
    comment: 'Bài học rất hữu ích, tôi đã cải thiện được nhiều.',
    date: '5 giờ trước',
  },
  {
    id: '3',
    studentName: 'Đặng Thu Hà',
    rating: 4,
    comment: 'Giờ học thú vị, sẽ tiếp tục học với thầy.',
    date: '1 ngày trước',
  },
];

const weeklyStats = {
  classesCompleted: 28,
  classesTarget: 35,
  hoursTeaching: 11.7,
  newStudents: 5,
  repeatRate: 78,
};

export default function TeacherDashboardPage() {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'Chào buổi sáng'
      : currentHour < 18
        ? 'Chào buổi chiều'
        : 'Chào buổi tối';

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
            {greeting}, Teacher! 👋
          </h1>
          <p className="text-slate-400 mt-1">
            Bạn có {todayClasses.length} lớp học hôm nay
          </p>
        </motion.div>
        <motion.div variants={itemVariants} className="flex gap-3">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Bell className="w-4 h-4 mr-2" />
            Thông báo
            <Badge className="ml-2 bg-red-500 text-white text-xs">3</Badge>
          </Button>
          <Button className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
            <Plus className="w-4 h-4 mr-2" />
            Tạo lớp học
          </Button>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-[#3B82F6]/20 to-[#3B82F6]/5 border-[#3B82F6]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Lớp hôm nay</p>
                  <p className="text-2xl font-bold text-white mt-1">{todayClasses.length}</p>
                </div>
                <div className="p-3 bg-[#3B82F6]/20 rounded-xl">
                  <Calendar className="w-6 h-6 text-[#3B82F6]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Thu nhập tuần</p>
                  <p className="text-2xl font-bold text-white mt-1">2.8M</p>
                  <p className="text-xs text-emerald-400">+12% vs tuần trước</p>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Học viên</p>
                  <p className="text-2xl font-bold text-white mt-1">42</p>
                  <p className="text-xs text-amber-400">+5 tuần này</p>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Đánh giá TB</p>
                  <p className="text-2xl font-bold text-white mt-1">4.9</p>
                  <p className="text-xs text-purple-400">128 đánh giá</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Star className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-white/5 border-white/10 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#3B82F6]" />
                Lịch dạy hôm nay
              </CardTitle>
              <Link href="/dashboard/schedule">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  Xem tất cả
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayClasses.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    classItem.status === 'in-progress'
                      ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/40'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-bold text-white">{classItem.time}</p>
                    <p className="text-xs text-slate-400">{classItem.duration} phút</p>
                  </div>

                  <div className="h-12 w-px bg-white/10" />

                  <Avatar className="h-12 w-12">
                    <AvatarImage src={classItem.studentAvatar} />
                    <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                      {classItem.studentName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{classItem.studentName}</p>
                    <p className="text-sm text-slate-400 truncate">{classItem.topic}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {classItem.status === 'in-progress' ? (
                      <Button className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
                        <Video className="w-4 h-4 mr-2" />
                        Vào lớp
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                          <BookOpen className="w-4 h-4" />
                        </Button>
                        <Badge variant="outline" className="border-slate-500 text-slate-400">
                          Sắp tới
                        </Badge>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Progress */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 border-white/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Tiến độ tuần
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Classes Progress */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">Số lớp đã dạy</span>
                  <span className="text-sm text-white">
                    {weeklyStats.classesCompleted}/{weeklyStats.classesTarget}
                  </span>
                </div>
                <Progress
                  value={(weeklyStats.classesCompleted / weeklyStats.classesTarget) * 100}
                  className="h-2 bg-white/10"
                />
              </div>

              {/* Hours Teaching */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#3B82F6]/20 rounded-lg">
                    <Clock className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <span className="text-slate-400">Giờ dạy</span>
                </div>
                <span className="text-xl font-bold text-white">{weeklyStats.hoursTeaching}h</span>
              </div>

              {/* Repeat Rate */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-slate-400">Tỷ lệ học lại</span>
                </div>
                <span className="text-xl font-bold text-emerald-400">{weeklyStats.repeatRate}%</span>
              </div>

              {/* New Students */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-slate-400">Học viên mới</span>
                </div>
                <span className="text-xl font-bold text-amber-400">+{weeklyStats.newStudents}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Reviews */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Đánh giá gần đây
            </CardTitle>
            <Link href="/dashboard/reviews">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Xem tất cả
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">{review.date}</span>
                  </div>
                  <p className="text-white font-medium mb-1">{review.studentName}</p>
                  <p className="text-sm text-slate-400 line-clamp-2">{review.comment}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
