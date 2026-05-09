'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Video,
  Star,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { GemImage } from '@/components/common/GemImage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { getUserBookings } from '@/lib/queries';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface BookingItem {
  id: string;
  classId: string;
  topic: string;
  teacherName: string;
  teacherAvatar: string | undefined;
  scheduledAt: string;
  duration: number;
  status: string;
  originalPrice: number;
  gemsUsed: number;
  finalPrice: number;
  canJoin?: boolean;
  rating?: number;
  gemsEarned?: number;
  refundAmount?: number;
  gemsRefunded?: number;
}

interface BookingsData {
  upcoming: BookingItem[];
  past: BookingItem[];
  cancelled: BookingItem[];
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0">Đã xác nhận</Badge>;
    case 'attended':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Đã tham gia</Badge>;
    case 'no_show':
      return <Badge className="bg-red-500/20 text-red-400 border-0">Vắng mặt</Badge>;
    case 'cancelled':
      return <Badge className="bg-slate-500/20 text-slate-400 border-0">Đã hủy</Badge>;
    default:
      return null;
  }
}

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingsData>({ upcoming: [], past: [], cancelled: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        const data = await getUserBookings(user.id);
        const allBookings = (data || []) as Record<string, unknown>[];

        const mapBooking = (b: Record<string, unknown>): BookingItem => {
          const cls = b.classes as Record<string, unknown> | null;
          const teacher = cls?.profiles as Record<string, unknown> | null;
          const startTime = (cls?.start_time as string) || '';
          const now = new Date();
          const classTime = new Date(startTime);
          const diffMs = classTime.getTime() - now.getTime();
          const canJoin = diffMs > 0 && diffMs < 5 * 60 * 1000; // within 5 min

          return {
            id: b.id as string,
            classId: b.class_id as string,
            topic: (cls?.title as string) || 'Untitled',
            teacherName: (teacher?.full_name as string) || 'Teacher',
            teacherAvatar: (teacher?.avatar_url as string) || undefined,
            scheduledAt: startTime,
            duration: (cls?.duration_minutes as number) || 25,
            status: b.status as string,
            originalPrice: (b.original_price as number) || 0,
            gemsUsed: (b.gems_used as number) || 0,
            finalPrice: (b.final_price as number) || 0,
            canJoin,
            rating: undefined,
            gemsEarned: 0,
            refundAmount: 0,
            gemsRefunded: 0,
          };
        };

        const upcoming = allBookings
          .filter((b) => ['confirmed', 'pending'].includes(b.status as string))
          .map(mapBooking);
        const past = allBookings
          .filter((b) => ['completed', 'attended'].includes(b.status as string))
          .map(mapBooking);
        const cancelled = allBookings
          .filter((b) => (b.status as string) === 'cancelled')
          .map(mapBooking);

        setBookings({ upcoming, past, cancelled });
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Lớp học của tôi 📚</h1>
          <p className="text-slate-400">Quản lý các lớp học đã đặt</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-white">{bookings.upcoming.length}</p>
              <p className="text-sm text-slate-400">Sắp tới</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">
                {bookings.past.filter((b) => b.status === 'attended').length}
              </p>
              <p className="text-sm text-slate-400">Đã hoàn thành</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">
                <span className="inline-flex items-center gap-1">{bookings.past.reduce((sum, b) => sum + (b.gemsEarned || 0), 0)} <GemImage size={24} /></span>
              </p>
              <p className="text-sm text-slate-400">Gems kiếm được</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">
                <span className="inline-flex items-center gap-1">{[...bookings.upcoming, ...bookings.past].reduce((sum, b) => sum + b.gemsUsed, 0)} <GemImage size={24} /></span>
              </p>
              <p className="text-sm text-slate-400">Gems đã dùng</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-[#3B82F6]">
              Sắp tới ({bookings.upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-[#3B82F6]">
              Đã hoàn thành ({bookings.past.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="data-[state=active]:bg-[#3B82F6]">
              Đã hủy ({bookings.cancelled.length})
            </TabsTrigger>
          </TabsList>

          {/* Upcoming Bookings */}
          <TabsContent value="upcoming">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {bookings.upcoming.length > 0 ? (
                bookings.upcoming.map((booking) => (
                  <motion.div key={booking.id} variants={itemVariants}>
                    <Card className="bg-white/5 border-white/10 hover:border-[#3B82F6]/50 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {/* Teacher & Class Info */}
                          <div className="flex items-center gap-4 flex-1">
                            <Avatar className="h-14 w-14 border-2 border-[#3B82F6]/30">
                              <AvatarImage src={booking.teacherAvatar} />
                              <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                                {booking.teacherName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white truncate mb-1">
                                {booking.topic}
                              </h3>
                              <p className="text-sm text-slate-400 mb-2">
                                với {booking.teacherName}
                              </p>
                              <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formatDate(booking.scheduledAt)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{formatTime(booking.scheduledAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Price & Status */}
                          <div className="flex items-center gap-4 md:gap-6">
                            <div className="text-right">
                              <p className="text-lg font-bold text-white">
                                {formatVND(booking.finalPrice)}
                              </p>
                              {booking.gemsUsed > 0 && (
                                <p className="text-xs text-amber-400">
                                  -{booking.gemsUsed} <GemImage size={14} className="inline-block align-middle" /> đã dùng
                                </p>
                              )}
                            </div>

                            {getStatusBadge(booking.status)}

                            <Button
                              className={`min-w-[100px] ${
                                booking.canJoin
                                  ? 'bg-emerald-500 hover:bg-emerald-500/90'
                                  : 'bg-[#3B82F6] hover:bg-[#3B82F6]/90'
                              }`}
                              asChild
                            >
                              <Link href={`/class/${booking.classId}/live`}>
                                <Video className="w-4 h-4 mr-2" />
                                {booking.canJoin ? 'Vào lớp' : 'Chi tiết'}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Chưa có lớp học nào sắp tới
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Khám phá và đặt lớp học phù hợp với bạn ngay!
                  </p>
                  <Button asChild className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
                    <Link href="/classes">
                      Tìm lớp học
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Past Bookings */}
          <TabsContent value="past">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {bookings.past.map((booking) => (
                <motion.div key={booking.id} variants={itemVariants}>
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar className="h-14 w-14 border-2 border-slate-500/30">
                            <AvatarImage src={booking.teacherAvatar} />
                            <AvatarFallback className="bg-slate-500/20 text-slate-400">
                              {booking.teacherName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate mb-1">
                              {booking.topic}
                            </h3>
                            <p className="text-sm text-slate-400 mb-2">
                              với {booking.teacherName}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                              <span>{formatDate(booking.scheduledAt)}</span>
                              <span>{formatTime(booking.scheduledAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 md:gap-6">
                          <div className="text-right">
                            <p className="text-lg font-bold text-white">
                              {formatVND(booking.finalPrice)}
                            </p>
                            {booking.gemsEarned && (
                              <p className="text-xs text-amber-400">
                                +{booking.gemsEarned} <GemImage size={14} className="inline-block align-middle" /> kiếm được
                              </p>
                            )}
                          </div>

                          {getStatusBadge(booking.status)}

                          {booking.rating ? (
                            <div className="flex items-center gap-1 min-w-[80px] justify-end">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < (booking.rating ?? 0)
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-slate-600'
                                  }`}
                                />
                              ))}
                            </div>
                          ) : booking.status === 'attended' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            >
                              Đánh giá
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>

          {/* Cancelled Bookings */}
          <TabsContent value="cancelled">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {bookings.cancelled.map((booking) => (
                <motion.div key={booking.id} variants={itemVariants}>
                  <Card className="bg-white/5 border-white/10 opacity-75">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar className="h-14 w-14 border-2 border-slate-600/30 grayscale">
                            <AvatarImage src={booking.teacherAvatar} />
                            <AvatarFallback className="bg-slate-600/20 text-slate-500">
                              {booking.teacherName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-400 truncate mb-1 line-through">
                              {booking.topic}
                            </h3>
                            <p className="text-sm text-slate-500 mb-2">
                              với {booking.teacherName}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                              <span>{formatDate(booking.scheduledAt)}</span>
                              <span>{formatTime(booking.scheduledAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 md:gap-6">
                          {(booking.refundAmount ?? 0) > 0 && (
                            <div className="text-right">
                              <p className="text-sm text-emerald-400">
                                Hoàn tiền: {formatVND(booking.refundAmount ?? 0)}
                              </p>
                              {(booking.gemsRefunded ?? 0) > 0 && (
                                <p className="text-xs text-amber-400">
                                  +{booking.gemsRefunded ?? 0} <GemImage size={14} className="inline-block align-middle" /> hoàn lại
                                </p>
                              )}
                            </div>
                          )}

                          {getStatusBadge(booking.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
