import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withCsrfRouteProtection } from '@/lib/csrf.server';
import { randomUUID } from 'crypto';

async function handlePost(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  // Verify authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { classId, gemsToUse = 0, idempotencyKey = randomUUID() } = body;

  if (!classId) {
    return NextResponse.json({ error: 'classId is required' }, { status: 400 });
  }

  try {
    // Check idempotency
    const { data: existing } = await supabase
      .from('bookings')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    // Get class details
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (classData.current_enrollments >= classData.max_students) {
      return NextResponse.json({ error: 'Class is full' }, { status: 409 });
    }

    const originalPrice = classData.price;
    const gemsDiscountAmount = Math.round((gemsToUse / 100) * 100) / 100;
    const finalPrice = originalPrice - gemsDiscountAmount;

    if (gemsDiscountAmount > originalPrice * 0.5) {
      return NextResponse.json({ error: 'Gems discount cannot exceed 50% of class price' }, { status: 400 });
    }
    if (finalPrice < 5.0 && finalPrice !== 0) {
      return NextResponse.json({ error: 'Final price must be at least $5' }, { status: 400 });
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        class_id: classId,
        original_price: originalPrice,
        gems_used: gemsToUse,
        gems_discount_amount: gemsDiscountAmount,
        final_price: finalPrice,
        payment_status: 'pending',
        status: 'pending',
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // Deduct gems if used
    if (gemsToUse > 0) {
      const { error: gemsError } = await supabase.from('gem_transactions').insert({
        user_id: user.id,
        amount: -gemsToUse,
        transaction_type: 'booking_discount',
        description: `Discount for class: ${classData.title}`,
        class_id: classId,
        booking_id: booking.id,
      });

      if (gemsError) {
        // Rollback booking
        await supabase.from('bookings').delete().eq('id', booking.id);
        return NextResponse.json({ error: 'Failed to deduct gems' }, { status: 500 });
      }
    }

    // Confirm booking
    const { data: confirmed, error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: finalPrice === 0 ? 'completed' : 'processing',
        status: 'confirmed',
        paid_at: new Date().toISOString(),
      })
      .eq('id', booking.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: confirmed }, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Booking failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withCsrfRouteProtection(handlePost);
