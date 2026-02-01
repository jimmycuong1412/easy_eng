'use client';

/**
 * Payment Success Page
 *
 * Displayed after successful payment completion.
 * Shows confirmation details and next steps.
 *
 * Related Tasks: T200 - Create payment success page
 */

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
      scheduled_at: string;
      duration_minutes: number;
      teacher: {
        display_name: string;
        email: string;
      };
    };
  };
  payment: {
    transaction_id: string;
    payment_method: string;
    completed_at: string;
  };
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const sessionId = searchParams.get('session_id'); // For Stripe

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
  }, [bookingId]);

  const loadPaymentDetails = async () => {
    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(
          `
          id,
          final_price,
          class:classes (
            title,
            description,
            scheduled_at,
            duration_minutes,
            teacher:profiles!teacher_id (
              display_name,
              email
            )
          )
        `
        )
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('transaction_id, payment_method, completed_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (paymentError) throw paymentError;

      setDetails({
        booking: booking as any,
        payment: payment as any,
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
            Error
          </h2>
          <p className="text-red-700 dark:text-red-300">{error || 'Payment not found'}</p>
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
          Payment Successful!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Your class booking has been confirmed
        </p>
      </div>

      {/* Booking Details Card */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Booking Details
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
                {new Date(booking.class.scheduled_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(booking.class.scheduled_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                ({booking.class.duration_minutes} minutes)
              </p>
            </div>
          </div>

          {/* Teacher */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {booking.class.teacher.display_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your Instructor</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {booking.class.teacher.email}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Teacher Contact</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Payment Info */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Transaction ID</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {payment.transaction_id}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
              <span className="uppercase text-gray-900 dark:text-white">
                {payment.payment_method}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ${booking.final_price.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Payment Date</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(payment.completed_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="mb-6 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
        <h3 className="mb-3 font-semibold text-blue-900 dark:text-blue-100">Next Steps</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>
              A confirmation email has been sent to your registered email address
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>
              You will receive a reminder email 24 hours before your class
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>
              Join the class 5 minutes early to test your connection
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>
              Contact your teacher if you have any questions
            </span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/student/dashboard"
          className="flex-1 rounded-lg bg-blue-500 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-600"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/student/bookings"
          className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-900 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:border-gray-500 dark:hover:bg-gray-700"
        >
          View All Bookings
        </Link>
      </div>
    </div>
  );
}
