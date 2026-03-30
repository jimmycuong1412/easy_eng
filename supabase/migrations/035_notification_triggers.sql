-- ============================================================================
-- Migration 035: Notification Triggers
-- Creates DB-level triggers that automatically insert notifications on key events
-- ============================================================================

-- ============================================================================
-- T004: Helper — insert notification for a single user
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id     UUID,
  p_type        TEXT,
  p_title       TEXT,
  p_message     TEXT,
  p_action_url  TEXT    DEFAULT NULL,
  p_related_id  UUID    DEFAULT NULL,
  p_related_type TEXT   DEFAULT NULL,
  p_priority    TEXT    DEFAULT 'normal',
  p_metadata    JSONB   DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message,
    action_url, related_id, related_type,
    priority, metadata
  ) VALUES (
    p_user_id, p_type, p_title, p_message,
    p_action_url, p_related_id, p_related_type,
    p_priority, p_metadata
  );
END;
$$;

-- ============================================================================
-- T005: Helper — notify all admin users
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_all_admins(
  p_type         TEXT,
  p_title        TEXT,
  p_message      TEXT,
  p_action_url   TEXT  DEFAULT NULL,
  p_related_id   UUID  DEFAULT NULL,
  p_related_type TEXT  DEFAULT NULL,
  p_priority     TEXT  DEFAULT 'normal'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  FOR v_admin_id IN
    SELECT id FROM profiles WHERE role = 'admin' AND is_active = TRUE
  LOOP
    PERFORM notify_user(
      v_admin_id, p_type, p_title, p_message,
      p_action_url, p_related_id, p_related_type, p_priority, '{}'::jsonb
    );
  END LOOP;
END;
$$;

-- ============================================================================
-- T006: Trigger — booking created → notify student (booking_confirmed)
--                                  + teacher (new_booking)
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_booking_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_class_title TEXT;
  v_student_name TEXT;
BEGIN
  -- Get teacher_id and class title from the classes table
  SELECT teacher_id, title
    INTO v_teacher_id, v_class_title
    FROM classes
   WHERE id = NEW.class_id;

  -- Get student name
  SELECT full_name INTO v_student_name
    FROM profiles
   WHERE id = NEW.user_id;

  -- Notify student: booking confirmed
  PERFORM notify_user(
    NEW.user_id,
    'booking_confirmed',
    'Booking Confirmed',
    'Your class "' || COALESCE(v_class_title, 'English Session') || '" has been booked successfully.',
    '/bookings',
    NEW.id,
    'booking',
    'high'
  );

  -- Notify teacher: new booking
  IF v_teacher_id IS NOT NULL THEN
    PERFORM notify_user(
      v_teacher_id,
      'new_booking',
      'New Booking',
      COALESCE(v_student_name, 'A student') || ' booked your class "' || COALESCE(v_class_title, 'English Session') || '".',
      '/teacher/schedule',
      NEW.id,
      'booking',
      'normal'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- T007: Trigger — booking cancelled → notify both parties
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_booking_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_class_title TEXT;
  v_student_name TEXT;
  v_teacher_name TEXT;
BEGIN
  SELECT teacher_id, title
    INTO v_teacher_id, v_class_title
    FROM classes
   WHERE id = NEW.class_id;

  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.user_id;
  SELECT full_name INTO v_teacher_name FROM profiles WHERE id = v_teacher_id;

  -- Notify student
  PERFORM notify_user(
    NEW.user_id,
    'booking_cancelled',
    'Booking Cancelled',
    'Your booking for "' || COALESCE(v_class_title, 'English Session') || '" has been cancelled.',
    '/bookings',
    NEW.id,
    'booking',
    'high'
  );

  -- Notify teacher
  IF v_teacher_id IS NOT NULL THEN
    PERFORM notify_user(
      v_teacher_id,
      'booking_cancelled',
      'Booking Cancelled',
      COALESCE(v_student_name, 'A student') || ' cancelled their booking for "' || COALESCE(v_class_title, 'English Session') || '".',
      '/teacher/schedule',
      NEW.id,
      'booking',
      'normal'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- T008: Trigger — gem transaction with positive amount → notify student
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_gems_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM notify_user(
    NEW.user_id,
    'gems_earned',
    'Gems Earned! 💎',
    'You earned ' || NEW.amount || ' gems. ' || COALESCE(NEW.description, ''),
    '/gems',
    NEW.id,
    'gem_transaction',
    'normal'
  );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- T009: Trigger — new profile (user registered) → notify all admins
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_new_user_notify_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM notify_all_admins(
    'system_announcement',
    'New User Registered',
    COALESCE(NEW.full_name, NEW.email, 'A new user') || ' just joined EasyEng.',
    '/admin/users',
    NEW.id,
    'profile',
    'normal'
  );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- T010: Trigger — payout request → notify all admins (high priority)
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_payout_request_notify_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_name TEXT;
BEGIN
  SELECT full_name INTO v_teacher_name FROM profiles WHERE id = NEW.teacher_id;

  PERFORM notify_all_admins(
    'payment_received',
    'Payout Request',
    COALESCE(v_teacher_name, 'A teacher') || ' requested a payout of ' || NEW.amount || ' ' || COALESCE(NEW.currency, 'USD') || '.',
    '/admin/payouts',
    NEW.id,
    'payout_request',
    'high'
  );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- T011: Wire triggers to tables
-- ============================================================================

-- Booking created
DROP TRIGGER IF EXISTS after_booking_insert ON bookings;
CREATE TRIGGER after_booking_insert
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trg_booking_notifications();

-- Booking cancelled
DROP TRIGGER IF EXISTS after_booking_cancelled ON bookings;
CREATE TRIGGER after_booking_cancelled
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status <> 'cancelled')
  EXECUTE FUNCTION trg_booking_cancelled();

-- Gems earned
DROP TRIGGER IF EXISTS after_gem_transaction ON gem_transactions;
CREATE TRIGGER after_gem_transaction
  AFTER INSERT ON gem_transactions
  FOR EACH ROW
  WHEN (NEW.amount > 0)
  EXECUTE FUNCTION trg_gems_earned();

-- New user registered
DROP TRIGGER IF EXISTS after_profile_insert ON profiles;
CREATE TRIGGER after_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trg_new_user_notify_admins();

-- Payout request
DROP TRIGGER IF EXISTS after_payout_request ON payout_requests;
CREATE TRIGGER after_payout_request
  AFTER INSERT ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_payout_request_notify_admins();
