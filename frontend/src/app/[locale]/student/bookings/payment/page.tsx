'use client';

/**
 * Payment Page
 *
 * Handles payment processing for class bookings.
 * Shows payment method selector and processes payment through selected gateway.
 *
 * Related Tasks: T199 [P] Create payment page
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PaymentMethodSelector, {
  PaymentMethod,
} from '@/components/booking/PaymentMethodSelector';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface BookingDetails {
  id: string;
  class_id: string;
  final_price: number;
  gems_used: number;
  discount_amount: number;
  class: {
    title: string;
    description: string;
    scheduled_at: string;
    teacher: {
      full_name: string;
    };
  };
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }

    loadBookingDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const loadBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          class_id,
          final_price,
          gems_used,
          gems_discount_amount,
          class:classes (
            title,
            description,
            start_time,
            teacher:profiles!classes_teacher_id_profiles_fkey (
              full_name
            )
          )
        `
        )
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      setBooking(data as any);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking details');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod || !booking) return;

    setProcessing(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call backend API to initiate payment
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          student_id: user.id,
          amount: booking.final_price,
          currency: 'USD',
          payment_method: selectedMethod,
          description: `Payment for ${booking.class.title}`,
          customer_email: user.email,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Payment initiation failed');
      }

      // Redirect to payment gateway
      if (result.payment_url) {
        window.location.href = result.payment_url;
      } else if (result.session_id && selectedMethod === 'stripe') {
        // For Stripe, redirect to checkout
        window.location.href = result.payment_url || '';
      } else {
        throw new Error('No payment URL received');
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-lg bg-red-50 p-6 dark:bg-red-900/20">
          <h2 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
            Error
          </h2>
          <p className="text-red-700 dark:text-red-300">{error || 'Booking not found'}</p>
          <Link
            href="/student/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/student/bookings/${booking.id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Booking Details
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Complete Payment
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Choose your preferred payment method to confirm your booking
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onMethodChange={setSelectedMethod}
              amount={booking.final_price}
              currency="USD"
            />

            {/* Submit Button */}
            <button
              onClick={handlePayment}
              disabled={!selectedMethod || processing}
              className="mt-6 w-full rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </span>
              ) : (
                `Pay $${booking.final_price.toFixed(2)}`
              )}
            </button>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Order Summary
            </h2>

            <div className="space-y-4">
              {/* Class Details */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {booking.class.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  with {(booking.class.teacher as any)?.full_name || 'Teacher'}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                  {new Date((booking.class as any).start_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Original Price</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${(booking.final_price + (booking as any).gems_discount_amount).toFixed(2)}
                  </span>
                </div>

                {booking.gems_used > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Gems Discount ({booking.gems_used} gems)
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      -${(booking as any).gems_discount_amount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700" />

                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    Total
                  </span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    ${booking.final_price.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
