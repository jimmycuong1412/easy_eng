import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const GEMS_PER_SESSION = 200;

async function handlePost(req: NextRequest): Promise<NextResponse> {
  // Verify authenticated user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { teacherId?: string; date?: string; time?: string };
  const { teacherId, date, time } = body;

  if (!teacherId || !date || !time) {
    return NextResponse.json({ error: 'teacherId, date, and time are required' }, { status: 400 });
  }

  // Build start/end timestamps (Vietnam timezone UTC+7)
  const startTime = new Date(`${date}T${time}:00+07:00`);
  const endTime   = new Date(startTime.getTime() + 25 * 60 * 1000);

  // Use admin client (bypasses RLS) cast to any for flexible table access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // 1. Create a 1-on-1 class record
  const { data: cls, error: classError } = await admin
    .from('classes')
    .insert({
      teacher_id: teacherId,
      title: '1-on-1 English Session',
      level: 'intermediate',
      price: 5,
      currency: 'USD',
      schedule_type: 'one_time',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: 25,
      max_students: 1,
      status: 'scheduled',
    })
    .select('id')
    .single();

  if (classError || !cls) {
    return NextResponse.json({ error: classError?.message ?? 'Class creation failed' }, { status: 500 });
  }

  // 2. Create the booking
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      user_id: user.id,
      class_id: cls.id,
      original_price: 0,
      gems_used: GEMS_PER_SESSION,
      gems_discount_amount: 0,
      final_price: 0,
      payment_method: 'gems',
      payment_status: 'completed',
      status: 'confirmed',
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (bookingError || !booking) {
    await admin.from('classes').delete().eq('id', cls.id);
    return NextResponse.json({ error: bookingError?.message ?? 'Booking creation failed' }, { status: 500 });
  }

  // 3. Deduct gems via transaction record
  const { error: gemsError } = await admin
    .from('gem_transactions')
    .insert({
      user_id: user.id,
      amount: -GEMS_PER_SESSION,
      transaction_type: 'booking_payment',
      description: '1-on-1 English Session',
      class_id: cls.id,
      booking_id: booking.id,
    });

  if (gemsError) {
    await admin.from('bookings').delete().eq('id', booking.id);
    await admin.from('classes').delete().eq('id', cls.id);
    return NextResponse.json({ error: 'Failed to deduct gems' }, { status: 500 });
  }

  return NextResponse.json({ success: true, bookingId: booking.id }, { status: 201 });
}

export const POST = handlePost;
