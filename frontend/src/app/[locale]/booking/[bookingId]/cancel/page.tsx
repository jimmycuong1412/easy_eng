'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  Calendar,
  ArrowLeft,
  Cookie,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Mock booking data
const mockBooking = {
  id: '1',
  classId: '1',
  topic: 'Business English: Meeting Skills',
  teacherName: 'Nguyễn Minh Anh',
  teacherAvatar: '/avatars/teacher1.png',
  scheduledAt: '2026-01-25T09:00:00+07:00', // Future date for testing
  duration: 25,
  originalPrice: 200000,
  cookiesUsed: 75,
  discountAmount: 75000,
  finalPrice: 125000,
  paymentMethod: 'VNPay',
};

// Cancellation policy
const cancellationPolicy = [
  {
    timeframe: 'Hủy trước 24 giờ',
    refundPercent: 100,
    cookiesRefund: 100,
    description: 'Hoàn tiền 100% và hoàn lại toàn bộ Cookies đã sử dụng',
    color: 'emerald',
  },
  {
    timeframe: 'Hủy trước 2-24 giờ',
    refundPercent: 50,
    cookiesRefund: 100,
    description: 'Hoàn tiền 50%, hoàn lại toàn bộ Cookies đã sử dụng',
    color: 'amber',
  },
  {
    timeframe: 'Hủy trước ít hơn 2 giờ',
    refundPercent: 0,
    cookiesRefund: 0,
    description: 'Không hoàn tiền, không hoàn Cookies',
    color: 'red',
  },
];

const cancellationReasons = [
  { id: 'schedule_conflict', label: 'Bận việc đột xuất' },
  { id: 'health_issue', label: 'Lý do sức khỏe' },
  { id: 'wrong_booking', label: 'Đặt nhầm lớp/thời gian' },
  { id: 'teacher_change', label: 'Muốn đổi giáo viên khác' },
  { id: 'other', label: 'Lý do khác' },
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getHoursUntilClass(scheduledAt: string): number {
  const now = new Date();
  const classTime = new Date(scheduledAt);
  const diffMs = classTime.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

function getRefundDetails(hoursUntil: number, originalPrice: number, cookiesUsed: number) {
  if (hoursUntil >= 24) {
    return {
      refundPercent: 100,
      refundAmount: originalPrice,
      cookiesRefund: cookiesUsed,
      policy: cancellationPolicy[0],
    };
  } else if (hoursUntil >= 2) {
    return {
      refundPercent: 50,
      refundAmount: Math.floor(originalPrice * 0.5),
      cookiesRefund: cookiesUsed,
      policy: cancellationPolicy[1],
    };
  } else {
    return {
      refundPercent: 0,
      refundAmount: 0,
      cookiesRefund: 0,
      policy: cancellationPolicy[2],
    };
  }
}

export default function CancelBookingPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<'review' | 'confirm' | 'success'>('review');
  const [reason, setReason] = React.useState('');
  const [additionalNotes, setAdditionalNotes] = React.useState('');
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const hoursUntilClass = getHoursUntilClass(mockBooking.scheduledAt);
  const refundDetails = getRefundDetails(
    hoursUntilClass,
    mockBooking.finalPrice,
    mockBooking.cookiesUsed
  );

  const handleCancelBooking = async () => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowConfirmDialog(false);
    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white/5 border-white/10 text-center">
            <CardContent className="pt-8 pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white mb-2">Đã hủy thành công</h1>
              <p className="text-slate-400 mb-6">
                Lớp học của bạn đã được hủy và xử lý hoàn tiền.
              </p>

              <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-white mb-3">Chi tiết hoàn tiền</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số tiền hoàn:</span>
                    <span className="text-emerald-400 font-semibold">
                      {formatVND(refundDetails.refundAmount)}
                    </span>
                  </div>
                  {refundDetails.cookiesRefund > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cookies hoàn lại:</span>
                      <span className="text-amber-400 font-semibold">
                        +{refundDetails.cookiesRefund} 🍪
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thời gian xử lý:</span>
                    <span className="text-white">1-3 ngày làm việc</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  onClick={() => router.push('/student/bookings')}
                >
                  Về danh sách
                </Button>
                <Button
                  className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                  onClick={() => router.push('/classes')}
                >
                  Đặt lớp khác
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white mb-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Hủy đặt lớp
          </h1>
        </motion.div>

        {/* Booking Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-[#3B82F6]/30">
                  <AvatarImage src={mockBooking.teacherAvatar} />
                  <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                    {mockBooking.teacherName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{mockBooking.topic}</h3>
                  <p className="text-sm text-slate-400">với {mockBooking.teacherName}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateTime(mockBooking.scheduledAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Time Warning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card
            className={`mb-6 ${
              hoursUntilClass >= 24
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : hoursUntilClass >= 2
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock
                  className={`w-5 h-5 mt-0.5 ${
                    hoursUntilClass >= 24
                      ? 'text-emerald-400'
                      : hoursUntilClass >= 2
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}
                />
                <div>
                  <p
                    className={`font-semibold ${
                      hoursUntilClass >= 24
                        ? 'text-emerald-400'
                        : hoursUntilClass >= 2
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    Còn {Math.floor(hoursUntilClass)} giờ trước lớp học
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {refundDetails.policy.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Refund Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">Chi tiết hoàn tiền</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Số tiền đã thanh toán</span>
                <span className="text-white font-semibold">
                  {formatVND(mockBooking.finalPrice)}
                </span>
              </div>
              {mockBooking.cookiesUsed > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cookies đã sử dụng</span>
                  <span className="text-amber-400">{mockBooking.cookiesUsed} 🍪</span>
                </div>
              )}
              <Separator className="bg-white/10" />
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tỷ lệ hoàn tiền</span>
                <Badge
                  className={`${
                    refundDetails.refundPercent === 100
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : refundDetails.refundPercent === 50
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                  } border-0`}
                >
                  {refundDetails.refundPercent}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Số tiền hoàn lại</span>
                <span className="text-emerald-400 font-bold text-lg">
                  {formatVND(refundDetails.refundAmount)}
                </span>
              </div>
              {refundDetails.cookiesRefund > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cookies hoàn lại</span>
                  <span className="text-amber-400 font-bold">
                    +{refundDetails.cookiesRefund} 🍪
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cancellation Reason */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">Lý do hủy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={reason} onValueChange={setReason}>
                {cancellationReasons.map((r) => (
                  <div key={r.id} className="flex items-center space-x-3">
                    <RadioGroupItem
                      value={r.id}
                      id={r.id}
                      className="border-white/30 text-[#3B82F6]"
                    />
                    <Label htmlFor={r.id} className="text-white cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {reason === 'other' && (
                <Textarea
                  placeholder="Vui lòng mô tả lý do của bạn..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cancellation Policy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-400" />
                Chính sách hủy lớp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cancellationPolicy.map((policy, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      policy.color === 'emerald'
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : policy.color === 'amber'
                          ? 'bg-amber-500/10 border border-amber-500/20'
                          : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-semibold ${
                          policy.color === 'emerald'
                            ? 'text-emerald-400'
                            : policy.color === 'amber'
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }`}
                      >
                        {policy.timeframe}
                      </span>
                      <span className="text-white font-bold">{policy.refundPercent}% hoàn tiền</span>
                    </div>
                    <p className="text-sm text-slate-400">{policy.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex gap-3"
        >
          <Button
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10"
            onClick={() => router.back()}
          >
            Giữ lớp học
          </Button>
          <Button
            className="flex-1 bg-red-500 hover:bg-red-500/90"
            onClick={() => setShowConfirmDialog(true)}
            disabled={!reason}
          >
            Xác nhận hủy
          </Button>
        </motion.div>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="bg-[#1E3A5F] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Xác nhận hủy lớp học?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Bạn sẽ được hoàn lại{' '}
                <span className="text-emerald-400 font-semibold">
                  {formatVND(refundDetails.refundAmount)}
                </span>
                {refundDetails.cookiesRefund > 0 && (
                  <>
                    {' '}
                    và{' '}
                    <span className="text-amber-400 font-semibold">
                      {refundDetails.cookiesRefund} Cookies
                    </span>
                  </>
                )}
                . Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                Quay lại
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-500/90"
                onClick={handleCancelBooking}
                disabled={isProcessing}
              >
                {isProcessing ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
