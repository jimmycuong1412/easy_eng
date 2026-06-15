'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { XCircle, RefreshCw, ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';

interface FailureDetails {
  booking: {
    id: string;
    final_price: number;
    class: {
      title: string;
      start_time: string;
      teacher: {
        full_name: string;
      };
    };
  };
  payment?: {
    payment_provider_id: string;
    payment_method: string;
    metadata: {
      failure_reason?: string;
    };
  };
}

export default function PaymentFailedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';
  const isVi = locale === 'vi';
  const bookingId = searchParams.get('booking_id');
  const reason = searchParams.get('reason');

  const [details, setDetails] = useState<FailureDetails | null>(null);
  const [_loading, setLoading] = useState(true);

  const supabase = createClient();

  const T = {
    failedTitle: isVi ? 'Thanh toán thất bại' : 'Payment Failed',
    failedSub: isVi ? 'Chúng tôi không thể xử lý thanh toán của bạn.' : "We couldn't process your payment",
    defaultReason: isVi ? 'Không thể xử lý thanh toán. Vui lòng thử lại.' : 'The payment could not be processed. Please try again.',
    whatWentWrong: isVi ? 'Điều gì đã xảy ra?' : 'What went wrong?',
    bookingDetails: isVi ? 'Chi tiết lịch học' : 'Booking Details',
    class: isVi ? 'Lớp học' : 'Class',
    teacher: isVi ? 'Giáo viên' : 'Teacher',
    scheduled: isVi ? 'Lịch học' : 'Scheduled',
    amount: isVi ? 'Số tiền' : 'Amount',
    commonReasons: isVi ? 'Nguyên nhân thường gặp' : 'Common Reasons for Payment Failure',
    reasons: isVi
      ? [
          { label: 'Không đủ số dư:', desc: 'Hãy đảm bảo tài khoản của bạn có đủ số dư.' },
          { label: 'Thẻ bị từ chối:', desc: 'Ngân hàng phát hành thẻ có thể đã từ chối giao dịch.' },
          { label: 'Thông tin sai:', desc: 'Kiểm tra lại số thẻ, CVV và ngày hết hạn.' },
          { label: 'Hạn chế của ngân hàng:', desc: 'Một số ngân hàng chặn thanh toán quốc tế trực tuyến.' },
          { label: 'Sự cố mạng:', desc: 'Kết nối bị gián đoạn trong quá trình thanh toán.' },
        ]
      : [
          { label: 'Insufficient funds:', desc: 'Make sure you have enough balance in your account.' },
          { label: 'Card declined:', desc: 'Your card issuer may have declined the transaction.' },
          { label: 'Incorrect details:', desc: 'Double-check your card number, CVV, and expiry date.' },
          { label: 'Bank restrictions:', desc: 'Some banks block online international payments by default.' },
          { label: 'Network issues:', desc: 'Connection problems during payment processing.' },
        ],
    whatNext: isVi ? 'Bước tiếp theo?' : 'What to do next?',
    nextSteps: isVi
      ? [
          'Kiểm tra lại thông tin thanh toán và số dư tài khoản.',
          'Thử phương thức thanh toán khác hoặc thẻ khác.',
          'Liên hệ ngân hàng nếu vấn đề vẫn tiếp tục.',
          'Liên hệ đội hỗ trợ nếu cần giúp đỡ: support@easyeng.com',
        ]
      : [
          'Check your payment details and account balance.',
          'Try a different payment method or card.',
          'Contact your bank if the problem persists.',
          'Contact our support team if you need assistance: support@easyeng.com',
        ],
    tryAgain: isVi ? 'Thử lại' : 'Try Again',
    backDashboard: isVi ? 'Về trang chủ' : 'Back to Dashboard',
    needHelp: isVi ? 'Cần hỗ trợ?' : 'Need help?',
    contactSupport: isVi ? 'Liên hệ đội hỗ trợ' : 'Contact our support team',
  };

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    loadFailureDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const loadFailureDetails = async () => {
    try {
      const { data: booking, error: bookingError } = await (supabase as any)
        .from('bookings')
        .select(
          `
          id,
          final_price,
          class:classes (
            title,
            start_time,
            teacher:profiles!classes_teacher_id_profiles_fkey (
              full_name
            )
          )
        `
        )
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      const { data: payment } = await (supabase as any)
        .from('payments')
        .select('payment_provider_id, payment_method, metadata')
        .eq('booking_id', bookingId)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setDetails({
        booking: booking as any,
        payment: payment as any,
      });
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load details:', err);
      setLoading(false);
    }
  };

  const getFailureReason = (): string => {
    if (reason) return decodeURIComponent(reason);
    if (details?.payment?.metadata?.failure_reason) return details.payment.metadata.failure_reason;
    return T.defaultReason;
  };

  const handleRetryPayment = () => {
    if (bookingId) {
      router.push(`/${locale}/student/bookings/payment?booking_id=${bookingId}`);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      {/* Failure Icon */}
      <div className="mb-8 flex justify-center">
        <div className="rounded-full bg-red-100 p-6 dark:bg-red-900/20">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
      </div>

      {/* Failure Message */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {T.failedTitle}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {T.failedSub}
        </p>
      </div>

      {/* Error Details */}
      <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <h2 className="mb-2 font-semibold text-red-900 dark:text-red-100">
          {T.whatWentWrong}
        </h2>
        <p className="text-red-800 dark:text-red-200">{getFailureReason()}</p>
      </div>

      {/* Booking Details (if available) */}
      {details && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {T.bookingDetails}
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{T.class}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {details.booking.class.title}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{T.teacher}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {(details.booking.class.teacher as any).full_name || 'Teacher'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{T.scheduled}</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {new Date((details.booking.class as any).start_time).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
              </p>
            </div>
            <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
              <div className="flex justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">{T.amount}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ${details.booking.final_price.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Common Reasons */}
      <div className="mb-6 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            {T.commonReasons}
          </h3>
        </div>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          {T.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span>•</span>
              <span><strong>{r.label}</strong> {r.desc}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What to do next */}
      <div className="mb-6 rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
          {T.whatNext}
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {T.nextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span>{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {bookingId && (
          <button
            onClick={handleRetryPayment}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
          >
            <RefreshCw className="h-5 w-5" />
            {T.tryAgain}
          </button>
        )}
        <Link
          href={`/${locale}/dashboard`}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-900 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
          {T.backDashboard}
        </Link>
      </div>

      {/* Support Contact */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          {T.needHelp}{' '}
          <Link
            href={`/${locale}/support`}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {T.contactSupport}
          </Link>
        </p>
      </div>
    </div>
  );
}
