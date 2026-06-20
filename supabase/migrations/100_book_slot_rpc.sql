-- book_slot RPC — atomic 1-on-1 session booking callable by web AND mobile.
--
-- Replaces the web-only Next.js /api/bookings/book-slot route (which used the
-- service-role admin client). SECURITY DEFINER lets it create the class/booking
-- and deduct gems regardless of RLS, but it derives the user from auth.uid()
-- (cannot be spoofed by the caller) and verifies the gem balance first.
--
-- Returns: { booking_id uuid, class_id uuid }
-- Raises:  insufficient_gems | duplicate_booking | not_authenticated

create or replace function public.book_slot(
  p_teacher_id uuid,
  p_date text,   -- 'YYYY-MM-DD'
  p_time text    -- 'HH:MM' (Vietnam local, UTC+7)
)
returns table (booking_id uuid, class_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_gems_per_session constant integer := 200;
  v_start timestamptz;
  v_end timestamptz;
  v_idempotency text;
  v_balance integer;
  v_class_id uuid;
  v_booking_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  -- Build start/end from VN local time (UTC+7); session is 25 minutes.
  v_start := (p_date || 'T' || p_time || ':00+07:00')::timestamptz;
  v_end := v_start + interval '25 minutes';

  v_idempotency := v_user_id::text || '-' || p_teacher_id::text || '-' || v_start::text;

  -- Duplicate guard.
  if exists (select 1 from bookings where idempotency_key = v_idempotency) then
    raise exception 'duplicate_booking' using errcode = 'P0001';
  end if;

  -- Balance check (sum of gem_transactions). Reuse the same source the balance
  -- views/RPC use so this stays consistent.
  select coalesce(sum(amount), 0) into v_balance
  from gem_transactions where user_id = v_user_id;

  if v_balance < v_gems_per_session then
    raise exception 'insufficient_gems' using errcode = 'P0001';
  end if;

  -- 1. Create the 1-on-1 class.
  insert into classes (
    teacher_id, title, level, price, currency, schedule_type,
    start_time, end_time, duration_minutes, max_students, status
  ) values (
    p_teacher_id, '1-on-1 English Session', 'intermediate', 5, 'USD', 'one_time',
    v_start, v_end, 25, 1, 'scheduled'
  ) returning id into v_class_id;

  -- 2. Create the booking.
  insert into bookings (
    user_id, class_id, original_price, gems_used, gems_discount_amount,
    final_price, payment_method, payment_status, status, paid_at, idempotency_key
  ) values (
    v_user_id, v_class_id, 0, v_gems_per_session, 0,
    0, 'gems', 'completed', 'confirmed', now(), v_idempotency
  ) returning id into v_booking_id;

  -- 3. Deduct gems.
  insert into gem_transactions (
    user_id, amount, transaction_type, description, class_id, booking_id
  ) values (
    v_user_id, -v_gems_per_session, 'booking_payment', '1-on-1 English Session',
    v_class_id, v_booking_id
  );

  booking_id := v_booking_id;
  class_id := v_class_id;
  return next;
end;
$$;

revoke all on function public.book_slot(uuid, text, text) from public;
grant execute on function public.book_slot(uuid, text, text) to authenticated;
