'use client';

export const dynamic = 'force-dynamic';

/**
 * Payment Success Page
 *
 * Displayed after successful payment completion.
 * Shows confirmation details and next steps.
 *
 * Related Tasks: T200 - Create payment success page
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Calendar, User, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

interface PaymentDetails {
  booking: {
    id: string;
    final_price: number;
    class: {
      title: string;
      description: string;
      start_time: string;
      duration_minutes: number;
      teacher: {
        full_name: string;
        email: string;
      };
    };
  };
  payment: {
    payment_provider_id: string;
    payment_method: string;
    updated_at: string;
  };
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';
  const isVi = locale === 'vi';
  const bookingId = searchParams.get('booking_id');

  const T = {
    error: isVi ? 'Lỗi' : 'Error',
    notFound: isVi ? 'Không tìm thấy thanh toán' : 'Payment not found',
    successTitle: isVi ? 'Thanh toán thành công!' : 'Payment Successful!',
    successSub: isVi ? 'Lịch học của bạn đã được xác nhận.' : 'Your class booking has been confirmed',
    bookingDetails: isVi ? 'Chi tiết lịch học' : 'Booking Details',
    instructor: isVi ? 'Giáo viên của bạn' : 'Your Instructor',
    teacherContact: isVi ? 'Liên hệ giáo viên' : 'Teacher Contact',
    transactionId: isVi ? 'Mã giao dịch' : 'Transaction ID',
    paymentMethod: isVi ? 'Phương thức thanh toán' : 'Payment Method',
    amountPaid: isVi ? 'Số tiền đã thanh toán' : 'Amount Paid',
    paymentDate: isVi ? 'Ngày thanh toán' : 'Payment Date',
    minutes: isVi ? 'phút' : 'minutes',
    nextSteps: isVi ? 'Bước tiếp theo' : 'Next Steps',
    steps: isVi
      ? [
          'Email xác nhận đã được gửi đến địa chỉ email của bạn.',
          'Bạn sẽ nhận được email nhắc nhở 24 giờ trước buổi học.',
          'Vào lớp sớm 5 phút để kiểm tra kết nối.',
          'Liên hệ giáo viên nếu bạn có thắc mắc.',
        ]
      : [
          'A confirmation email has been sent to your registered email address.',
          'You will receive a reminder email 24 hours before your class.',
          'Join the class 5 minutes early to test your connection.',
          'Contact your teacher if you have any questions.',
        ],
    dashboard: isVi ? 'Về trang chủ' : 'Go to Dashboard',
    viewBookings: isVi ? 'Xem tất cả lịch học' : 'View All Bookings',
  };

  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }

    loadPaymentDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const loadPaymentDetails = async () => {
    try {
      const { data: booking, error: bookingError } = await (supabase as any)
        .from('bookings')
        .select(
          `
          id,
          final_price,
          class:classes (
            title,
            description,
            start_time,
            duration_minutes,
            teacher:profiles!classes_teacher_id_profiles_fkey (
              full_name,
              email
            )
          )
        `
        )
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

    const { data: payment, error: paymentError } = await (supabase as any)
        .from('payments')
        .select('payment_provider_id, payment_method, updated_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentError) throw paymentError;

      setDetails({
        booking: booking as any,
        payment: (payment || { payment_provider_id: 'N/A', payment_method: 'N/A', updated_at: new Date().toISOString() }) as any,
      });
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment details');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-lg bg-red-50 p-6 dark:bg-red-900/20">
          <h2 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
            {T.error}
          </h2>
          <p className="text-red-700 dark:text-red-300">{error || T.notFound}</p>
        </div>
      </div>
    );
  }

  const { booking, payment } = details;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      {/* Success Icon */}
      <div className="mb-8 flex justify-center">
        <div className="rounded-full bg-green-100 p-6 dark:bg-green-900/20">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
      </div>

      {/* Success Message */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {T.successTitle}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {T.successSub}
        </p>
      </div>

      {/* Booking Details Card */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          {T.bookingDetails}
        </h2>

        <div className="space-y-4">
          {/* Class Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {booking.class.title}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {booking.class.description}
            </p>
          </div>

          {/* Schedule */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date((booking.class as any).start_time).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date((booking.class as any).start_time).toLocaleTimeString(isVi ? 'vi-VN' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                ({booking.class.duration_minutes} {T.minutes})
              </p>
            </div>
          </div>

          {/* Teacher */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {(booking.class.teacher as any).full_name || 'Teacher'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{T.instructor}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {booking.class.teacher.email}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{T.teacherContact}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Payment Info */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{T.transactionId}</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {(payment as any).payment_provider_id}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{T.paymentMethod}</span>
              <span className="uppercase text-gray-900 dark:text-white">
                {payment.payment_method}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{T.amountPaid}</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ${booking.final_price.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{T.paymentDate}</span>
              <span className="text-gray-900 dark:text-white">
                {new Date((payment as any).updated_at).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="mb-6 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
        <h3 className="mb-3 font-semibold text-blue-900 dark:text-blue-100">{T.nextSteps}</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          {T.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5">✓</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/${locale}/dashboard`}
          className="flex-1 rounded-lg bg-blue-500 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-600"
        >
          {T.dashboard}
        </Link>
        <Link
          href={`/${locale}/student/bookings`}
          className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-900 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500 dark:hover:bg-gray-700"
        >
          {T.viewBookings}
        </Link>
      </div>
    </div>
  );
}
