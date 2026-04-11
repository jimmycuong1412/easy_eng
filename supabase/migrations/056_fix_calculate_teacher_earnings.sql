-- Migration 056: Fix calculate_teacher_earnings — bookings uses user_id not student_id
-- The bookings table column is user_id; aliased as student_id for the teacher_earnings INSERT

CREATE OR REPLACE FUNCTION calculate_teacher_earnings(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_earnings_id UUID;
  v_teacher_share DECIMAL(10, 2);
  v_platform_fee DECIMAL(10, 2);
BEGIN
  SELECT
    b.id,
    b.user_id AS student_id,
    b.class_id,
    b.final_price,
    c.teacher_id,
    c.price as class_price,
    COALESCE(b.gems_used, 0) * 0.5 as gems_discount
  INTO v_booking
  FROM bookings b
  JOIN classes c ON c.id = b.class_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  v_teacher_share := ROUND(v_booking.final_price * 0.70, 2);
  v_platform_fee := v_booking.final_price - v_teacher_share;

  INSERT INTO teacher_earnings (
    teacher_id,
    booking_id,
    class_id,
    student_id,
    class_price,
    gems_discount,
    final_price,
    teacher_share,
    platform_fee,
    status
  ) VALUES (
    v_booking.teacher_id,
    p_booking_id,
    v_booking.class_id,
    v_booking.student_id,
    v_booking.class_price,
    v_booking.gems_discount,
    v_booking.final_price,
    v_teacher_share,
    v_platform_fee,
    'pending'
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    final_price = EXCLUDED.final_price,
    teacher_share = EXCLUDED.teacher_share,
    platform_fee = EXCLUDED.platform_fee,
    updated_at = NOW()
  RETURNING id INTO v_earnings_id;

  RETURN v_earnings_id;
END;
$$;
