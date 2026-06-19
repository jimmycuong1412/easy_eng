import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Booking cancellation with time-based gem refunds.
 *
 * GET  /api/bookings/cancel?bookingId=…  → refund preview
 * POST /api/bookings/cancel { bookingId, reason } → cancel + refund
 *
 * Refund percentage comes from the default cancellation_policies row
 * (rules: [{hours_before, refund_percentage}, …], highest match wins).
 * DB triggers already handle enrollment decrement, reopening a 'full'
 * class, and user notifications when status flips to 'cancelled'.
 */

interface PolicyRule { hours_before: number; refund_percentage: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadBookingForUser(admin: any, bookingId: string, userId: string) {
  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, user_id, class_id, status, gems_used, classes(id, title, start_time)')
    .eq('id', bookingId)
    .single();
  if (error || !booking) return { error: 'Booking not found', status: 404 as const };
  if (booking.user_id !== userId) return { error: 'Not your booking', status: 403 as const };
  if (booking.status !== 'confirmed') return { error: `Booking is ${booking.status}, only confirmed bookings can be cancelled`, status: 409 as const };
  const startTime = new Date(booking.classes?.start_time);
  if (Number.isNaN(startTime.getTime())) return { error: 'Class has no start time', status: 500 as const };
  if (startTime <= new Date()) return { error: 'Cannot cancel: class has already started', status: 409 as const };
  return { booking, startTime };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRefundPercentage(admin: any, startTime: Date): Promise<number> {
  const { data: policy } = await admin
    .from('cancellation_policies')
    .select('rules')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();
  const rules: PolicyRule[] = Array.isArray(policy?.rules) ? policy.rules : [
    { hours_before: 24, refund_percentage: 100 },
    { hours_before: 12, refund_percentage: 50 },
    { hours_before: 0, refund_percentage: 0 },
  ];
  const hoursBefore = (startTime.getTime() - Date.now()) / 3_600_000;
  for (const rule of [...rules].sort((a, b) => b.hours_before - a.hours_before)) {
    if (hoursBefore >= rule.hours_before) return rule.refund_percentage;
  }
  return 0;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bookingId = req.nextUrl.searchParams.get('bookingId');
  if (!bookingId) return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const res = await loadBookingForUser(admin, bookingId, user.id);
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: res.status });

  const refundPercentage = await getRefundPercentage(admin, res.startTime);
  const gemsRefunded = Math.floor((res.booking.gems_used ?? 0) * refundPercentage / 100);
  return NextResponse.json({
    refundPercentage,
    gemsRefunded,
    gemsUsed: res.booking.gems_used ?? 0,
    classTitle: res.booking.classes?.title ?? '',
    startTime: res.booking.classes?.start_time,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { bookingId?: string; reason?: string };
  if (!body.bookingId) return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const res = await loadBookingForUser(admin, body.bookingId, user.id);
  if ('error' in res) return NextResponse.json({ error: res.error }, { status: res.status });

  const refundPercentage = await getRefundPercentage(admin, res.startTime);
  const gemsRefunded = Math.floor((res.booking.gems_used ?? 0) * refundPercentage / 100);

  // 1. Cancel the booking — triggers handle enrollment, class reopen, notifications
  const { error: updateError } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: body.reason ?? null,
    })
    .eq('id', body.bookingId)
    .eq('status', 'confirmed'); // guard against double-cancel races
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 2. Refund gems (positive amounts must use an earn-type; gem_purchase_refund is the refund type)
  if (gemsRefunded > 0) {
    const { error: gemsError } = await admin.from('gem_transactions').insert({
      user_id: user.id,
      amount: gemsRefunded,
      transaction_type: 'gem_purchase_refund',
      description: `Hoàn ${refundPercentage}% gems — hủy lớp "${res.booking.classes?.title ?? '1-on-1 English Session'}"`,
      class_id: res.booking.class_id,
      booking_id: res.booking.id,
    });
    if (gemsError) {
      // booking already cancelled; surface the refund failure loudly
      return NextResponse.json(
        { error: `Booking cancelled but gem refund failed: ${gemsError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, refundPercentage, gemsRefunded });
}
