-- ============================================================================
-- Migration 036: Notification System Gaps
-- Covers: schema fix (new_booking type), teacher_favorites table,
--         notification_preferences table, notify_user_batched() helper,
--         favorites/slot_opened/cancellation triggers, payment receipt trigger
-- ============================================================================

-- ============================================================================
-- Part 1: Fix notifications type CHECK constraint (add missing types)
-- ============================================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- original types
  'booking_confirmed',
  'booking_cancelled',
  'class_reminder',
  'gems_earned',
  'xp_earned',
  'achievement_unlocked',
  'level_up',
  'class_started',
  'class_ended',
  'payment_received',
  'system_announcement',
  'friend_request',
  'message_received',
  -- added types
  'new_booking',        -- teacher: new booking from a student (was used in trigger but missing from CHECK)
  'slot_opened',        -- student: favorite teacher opened new availability slots
  'teacher_favorited',  -- teacher: a student added them to favorites
  'booking_payment',    -- student: payment receipt after successful payment
  'cancellation_alert'  -- admin: teacher has high cancellation rate in last 24h
));

-- ============================================================================
-- Part 2: teacher_favorites table
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_favorites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (student_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_favorites_student ON teacher_favorites(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_favorites_teacher ON teacher_favorites(teacher_id);

ALTER TABLE teacher_favorites ENABLE ROW LEVEL SECURITY;

-- Students manage their own favorites
CREATE POLICY "Students can manage own favorites"
  ON teacher_favorites
  FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Teachers can see who favorited them (read-only)
CREATE POLICY "Teachers can see their fans"
  ON teacher_favorites
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Service role: full access for triggers
CREATE POLICY "Service role full access to teacher_favorites"
  ON teacher_favorites
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Part 3: notification_preferences table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  settings    JSONB NOT NULL DEFAULT '{
    "booking_confirmed":    {"in_app": true,  "email": true},
    "booking_cancelled":    {"in_app": true,  "email": true},
    "class_reminder":       {"in_app": true,  "email": true},
    "slot_opened":          {"in_app": true,  "email": false},
    "teacher_favorited":    {"in_app": true,  "email": false},
    "gems_earned":          {"in_app": true,  "email": false},
    "payment_received":     {"in_app": true,  "email": true},
    "booking_payment":      {"in_app": true,  "email": true},
    "system_announcement":  {"in_app": true,  "email": false},
    "new_booking":          {"in_app": true,  "email": true}
  }'::jsonb,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users manage their own preferences
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role: full access
CREATE POLICY "Service role full access to notification_preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Part 4: notify_user_batched() — anti-fatigue helper
-- Batches repeated notifications of the same type for the same user
-- within a configurable time window, updating count on existing record.
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_user_batched(
  p_user_id      UUID,
  p_type         TEXT,
  p_title        TEXT,
  p_message      TEXT,
  p_action_url   TEXT    DEFAULT NULL,
  p_related_id   UUID    DEFAULT NULL,
  p_related_type TEXT    DEFAULT NULL,
  p_priority     TEXT    DEFAULT 'normal',
  p_batch_key    TEXT    DEFAULT NULL,
  p_window_mins  INTEGER DEFAULT 15
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id    UUID;
  v_batch_count    INTEGER;
  v_in_app_enabled BOOLEAN;
BEGIN
  -- Check user preference before inserting (default to true if no row exists)
  SELECT COALESCE(
    (settings -> p_type -> 'in_app')::boolean,
    TRUE
  )
    INTO v_in_app_enabled
    FROM notification_preferences
   WHERE user_id = p_user_id;

  -- If preference row not found, COALESCE returns NULL → treat as enabled
  IF v_in_app_enabled = FALSE THEN
    RETURN;
  END IF;

  -- Find an existing unread notification in the batch window
  SELECT id,
         COALESCE((metadata->>'batch_count')::integer, 0)
    INTO v_existing_id, v_batch_count
    FROM notifications
   WHERE user_id    = p_user_id
     AND type       = p_type
     AND read       = FALSE
     AND (p_batch_key IS NULL OR metadata->>'batch_key' = p_batch_key)
     AND created_at > NOW() - (p_window_mins || ' minutes')::interval
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing notification: increment count + refresh message
    UPDATE notifications
       SET message    = p_message || ' (+' || (v_batch_count + 1)::text || ' more)',
           metadata   = metadata || jsonb_build_object('batch_count', v_batch_count + 1),
           updated_at = NOW()
     WHERE id = v_existing_id;
  ELSE
    -- Insert fresh notification
    INSERT INTO notifications (
      user_id, type, title, message,
      action_url, related_id, related_type,
      priority, metadata
    ) VALUES (
      p_user_id, p_type, p_title, p_message,
      p_action_url, p_related_id, p_related_type,
      p_priority,
      jsonb_build_object('batch_count', 0, 'batch_key', COALESCE(p_batch_key, ''))
    );
  END IF;
END;
$$;

-- ============================================================================
-- Part 5: trg_payment_receipt — notify student after completed payment
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_payment_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_amount     TEXT;
BEGIN
  -- Get student_id from the booking referenced by this payment
  SELECT b.student_id
    INTO v_student_id
    FROM bookings b
   WHERE b.id = NEW.booking_id;

  v_amount := COALESCE(NEW.amount::text, '0') || ' ' || COALESCE(NEW.currency, 'USD');

  IF v_student_id IS NOT NULL THEN
    PERFORM notify_user(
      v_student_id,
      'booking_payment',
      'Payment Successful',
      'Your payment of ' || v_amount || ' was processed successfully.',
      '/bookings',
      NEW.id,
      'payment',
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_payment_insert ON payments;
CREATE TRIGGER after_payment_insert
  AFTER INSERT ON payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION trg_payment_receipt();

-- ============================================================================
-- Part 6: trg_cancellation_alert — notify admins on high teacher cancellation rate
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_cancellation_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id   UUID;
  v_teacher_name TEXT;
  v_recent_count INTEGER;
BEGIN
  -- Get the teacher from the class
  SELECT teacher_id INTO v_teacher_id
    FROM classes
   WHERE id = NEW.class_id;

  IF v_teacher_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_teacher_name
    FROM profiles
   WHERE id = v_teacher_id;

  -- Count this teacher's cancellations in the last 24 hours
  SELECT COUNT(*)::integer INTO v_recent_count
    FROM bookings b
    JOIN classes c ON b.class_id = c.id
   WHERE c.teacher_id  = v_teacher_id
     AND b.status      = 'cancelled'
     AND b.updated_at  > NOW() - INTERVAL '24 hours';

  -- Alert at 3, 6, 9... cancellations (every 3rd one)
  IF v_recent_count >= 3 AND v_recent_count % 3 = 0 THEN
    PERFORM notify_all_admins(
      'cancellation_alert',
      'High Cancellation Rate',
      COALESCE(v_teacher_name, 'A teacher') || ' has ' || v_recent_count || ' cancellations in the last 24h.',
      '/admin/bookings',
      v_teacher_id,
      'profile',
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_booking_cancelled_alert ON bookings;
CREATE TRIGGER after_booking_cancelled_alert
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status <> 'cancelled')
  EXECUTE FUNCTION trg_cancellation_alert();

-- ============================================================================
-- Part 7: trg_teacher_favorited — notify teacher when a student favorites them
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_teacher_favorited()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  SELECT full_name INTO v_student_name
    FROM profiles
   WHERE id = NEW.student_id;

  PERFORM notify_user_batched(
    NEW.teacher_id,
    'teacher_favorited',
    'New Fan!',
    COALESCE(v_student_name, 'A student') || ' added you to their favorites.',
    '/teacher/profile',
    NEW.student_id,
    'profile',
    'normal',
    NEW.student_id::text,
    60   -- 60-minute batch window so multiple favorites don't spam
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_favorite_insert ON teacher_favorites;
CREATE TRIGGER after_favorite_insert
  AFTER INSERT ON teacher_favorites
  FOR EACH ROW
  EXECUTE FUNCTION trg_teacher_favorited();

-- ============================================================================
-- Part 8: trg_slot_opened — notify favorited students when teacher opens slots
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_slot_opened()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_name TEXT;
  v_fan          RECORD;
BEGIN
  SELECT full_name INTO v_teacher_name
    FROM profiles
   WHERE id = NEW.teacher_id;

  FOR v_fan IN
    SELECT student_id FROM teacher_favorites WHERE teacher_id = NEW.teacher_id
  LOOP
    PERFORM notify_user_batched(
      v_fan.student_id,
      'slot_opened',
      'New Slot Available',
      COALESCE(v_teacher_name, 'Your favorite teacher') || ' just opened new availability slots.',
      '/teachers/' || NEW.teacher_id::text,
      NEW.teacher_id,
      'teacher',
      'normal',
      NEW.teacher_id::text,   -- batch key = teacher_id (group per-teacher per-window)
      15                      -- 15-minute window
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_availability_insert ON teacher_availability;
CREATE TRIGGER after_availability_insert
  AFTER INSERT ON teacher_availability
  FOR EACH ROW
  EXECUTE FUNCTION trg_slot_opened();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE teacher_favorites IS
  'Tracks which teachers a student has marked as a favorite for slot-opened notifications';

COMMENT ON TABLE notification_preferences IS
  'Per-user notification channel preferences (in_app + email) persisted server-side';

COMMENT ON FUNCTION notify_user_batched IS
  'Inserts a notification or batches it into an existing unread one within the time window; checks user preferences before inserting';

COMMENT ON FUNCTION trg_payment_receipt IS
  'Notifies student after a payment row is inserted with status=completed';

COMMENT ON FUNCTION trg_cancellation_alert IS
  'Notifies all admins when a teacher reaches 3/6/9 cancellations in 24 hours';

COMMENT ON FUNCTION trg_teacher_favorited IS
  'Notifies teacher (batched) when a student adds them to favorites';

COMMENT ON FUNCTION trg_slot_opened IS
  'Notifies all student fans (batched per teacher) when a teacher inserts a new availability slot';
