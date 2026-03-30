'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { env } from '@/lib/env';
import CancellationModal from '@/components/booking/CancellationModal';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function CancelBookingPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [refundInfo, setRefundInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadBooking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('bookings')
        .select('*, class:classes(*)')
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);

      // Calculate refund
      const bookingData = data as any;
      const { data: refundPercentage } = await (supabase as any).rpc('get_refund_percentage', {
        p_class_scheduled_at: bookingData.class?.scheduled_at,
      });

      const { data: amounts } = await (supabase as any).rpc('calculate_refund_amounts', {
        p_booking_id: bookingId,
        p_refund_percentage: refundPercentage,
      });

      setRefundInfo({ percentage: refundPercentage, ...amounts[0] });
      setLoading(false);
    } catch (error) {
      console.error('Error loading booking:', error);
      setLoading(false);
    }
  };

  const handleCancel = async (reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-cancellation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: bookingId,
          cancelled_by: user.id,
          cancelled_by_role: 'student',
          reason,
        }),
      });

      setCancelled(true);
      setTimeout(() => router.push('/student/bookings'), 2000);
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Booking Cancelled</h2>
          <p className="mt-2 text-gray-600">Your refund will be processed shortly</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <button
          onClick={() => setShowModal(true)}
          className="w-full rounded-lg bg-red-600 px-6 py-3 text-white font-medium hover:bg-red-700"
        >
          Cancel This Booking
        </button>

        {showModal && booking && refundInfo && (
          <CancellationModal
            booking={{
              id: booking.id,
              class_title: booking.class.title,
              scheduled_at: booking.class.scheduled_at,
              gems_used: booking.gems_used,
              final_price: booking.final_price,
            }}
            refundPercentage={refundInfo.percentage}
            gemsRefund={refundInfo.gems_refunded}
            cashRefund={refundInfo.cash_refunded}
            onConfirm={handleCancel}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </div>
  );
}
