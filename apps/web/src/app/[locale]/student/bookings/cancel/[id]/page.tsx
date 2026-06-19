'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CancellationModal from '@/components/booking/CancellationModal';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface RefundPreview {
  refundPercentage: number;
  gemsRefunded: number;
  gemsUsed: number;
  classTitle: string;
  startTime: string;
}

export default function CancelBookingPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const locale = (params.locale as string) ?? 'vi';

  const [preview, setPreview] = useState<RefundPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState<{ gemsRefunded: number } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const load = async () => {
      try {
        const res = await fetch(`/api/bookings/cancel?bookingId=${bookingId}`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load booking');
        setPreview(data as RefundPreview);
        setLoading(false);
      } catch (err) {
        if (attempts < 2) { attempts += 1; setTimeout(load, 1500); return; }
        setError(err instanceof Error ? err.message : 'Failed to load booking');
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const handleCancel = async (reason: string) => {
    const res = await fetch('/api/bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, reason }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Cancellation failed');
      setShowModal(false);
      return;
    }
    setCancelled({ gemsRefunded: data.gemsRefunded ?? 0 });
    setTimeout(() => router.push(`/${locale}/student/bookings`), 2500);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-2xl font-bold text-white">Đã hủy lớp học</h2>
          <p className="mt-2 text-slate-400">
            {cancelled.gemsRefunded > 0
              ? `${cancelled.gemsRefunded} 💎 đã được hoàn vào tài khoản của bạn`
              : 'Không có gems được hoàn theo chính sách hủy lớp'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-white">Không thể hủy lớp học</h2>
          <p className="mt-2 text-slate-400">{error ?? 'Booking not found'}</p>
          <button
            onClick={() => router.push(`/${locale}/student/bookings`)}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Quay lại lịch học
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary py-12">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="text-2xl font-bold text-white mb-2">Hủy lớp học</h1>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-6 space-y-2">
          <p className="text-white font-medium">{preview.classTitle}</p>
          <p className="text-sm text-slate-400">
            {new Date(preview.startTime).toLocaleString('vi-VN', {
              weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
          <p className="text-sm text-slate-400">
            Hoàn lại: <span className="text-amber-400 font-semibold">{preview.refundPercentage}%</span>
            {' '}({preview.gemsRefunded} / {preview.gemsUsed} 💎)
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full rounded-lg bg-red-600 px-6 py-3 text-white font-medium hover:bg-red-700"
        >
          Hủy lớp học này
        </button>

        {showModal && (
          <CancellationModal
            booking={{
              id: bookingId,
              class_title: preview.classTitle,
              scheduled_at: preview.startTime,
              gems_used: preview.gemsUsed,
              final_price: 0,
            }}
            refundPercentage={preview.refundPercentage}
            gemsRefund={preview.gemsRefunded}
            cashRefund={0}
            onConfirm={handleCancel}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </div>
  );
}
