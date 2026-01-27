'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Video,
  Cookie,
  ArrowRight,
  Home,
  CalendarPlus,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Mock booking data - in real app, fetch from server based on booking ID
const mockBookingData = {
  id: 'booking-123',
  classId: '1',
  topic: 'Business English: Meeting Skills',
  teacherName: 'Nguyễn Minh Anh',
  scheduledAt: '2026-01-23T09:00:00+07:00',
  duration: 25,
  originalPrice: 200000,
  cookiesUsed: 75,
  discountAmount: 75000,
  finalPrice: 125000,
  paymentMethod: 'VNPay',
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

export default function BookingConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSuccess = searchParams.get('success') === 'true';
  const bookingData = mockBookingData;

  // Generate calendar URL
  const generateCalendarUrl = () => {
    const startDate = new Date(bookingData.scheduledAt);
    const endDate = new Date(startDate.getTime() + bookingData.duration * 60 * 1000);
    
    const formatCalendarDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = encodeURIComponent(bookingData.topic);
    const details = encodeURIComponent(`Lớp học online với ${bookingData.teacherName}`);
    const start = formatCalendarDate(startDate);
    const end = formatCalendarDate(endDate);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${start}/${end}`;
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex justify-center mb-6"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                </div>
              </motion.div>

              {/* Success Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-8"
              >
                <h1 className="text-2xl font-bold text-white mb-2">
                  Đặt lớp thành công! 🎉
                </h1>
                <p className="text-slate-400">
                  Cảm ơn bạn đã đặt lớp. Hẹn gặp bạn trong buổi học!
                </p>
              </motion.div>

              {/* Booking Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4 mb-6"
              >
                <div className="p-4 bg-white/5 rounded-xl">
                  <h3 className="font-semibold text-white mb-3">{bookingData.topic}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(bookingData.scheduledAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(bookingData.scheduledAt)} ({bookingData.duration} phút)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Video className="w-4 h-4" />
                      <span>Giáo viên: {bookingData.teacherName}</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Giá gốc</span>
                    <span className="text-white">{formatVND(bookingData.originalPrice)}</span>
                  </div>
                  {bookingData.cookiesUsed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-amber-400 flex items-center gap-1">
                        <Cookie className="w-4 h-4" />
                        Giảm giá ({bookingData.cookiesUsed} Cookies)
                      </span>
                      <span className="text-amber-400">-{formatVND(bookingData.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="font-medium text-white">Đã thanh toán</span>
                    <span className="font-bold text-emerald-400">{formatVND(bookingData.finalPrice)}</span>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <Button
                  asChild
                  className="w-full h-12 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                >
                  <Link href="/student/bookings">
                    <Video className="w-5 h-5 mr-2" />
                    Xem lớp học của tôi
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                    onClick={() => window.open(generateCalendarUrl(), '_blank')}
                  >
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Thêm vào lịch
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                    asChild
                  >
                    <Link href="/dashboard">
                      <Home className="w-4 h-4 mr-2" />
                      Về trang chủ
                    </Link>
                  </Button>
                </div>
              </motion.div>

              {/* Cookie Earned Notification */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🍪</div>
                  <div>
                    <p className="text-amber-400 font-medium">+5 Cookies!</p>
                    <p className="text-xs text-slate-400">
                      Bạn sẽ nhận 5 Cookies sau khi hoàn thành lớp học
                    </p>
                  </div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Failed state
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-400" />
              </div>
            </motion.div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Thanh toán thất bại
            </h1>
            <p className="text-slate-400 mb-6">
              Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
            </p>

            <div className="space-y-3">
              <Button
                className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                onClick={() => router.back()}
              >
                Thử lại
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/classes">
                  Quay lại tìm lớp học
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
