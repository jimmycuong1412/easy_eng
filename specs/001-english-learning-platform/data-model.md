# Data Model: Multi-Role Notification System

**Feature**: Notification System gaps — favorites, batching, preferences, admin broadcast
**Note**: `notifications` table and core triggers already exist. This doc covers only new/changed entities.

---

## New Table: `teacher_favorites`

Tracks which teachers a student has marked as a favorite.

```sql
CREATE TABLE teacher_favorites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (student_id, teacher_id)   -- one favorite record per pair
);

-- Indexes
CREATE INDEX idx_teacher_favorites_student ON teacher_favorites(student_id);
CREATE INDEX idx_teacher_favorites_teacher ON teacher_favorites(teacher_id);

-- RLS
ALTER TABLE teacher_favorites ENABLE ROW LEVEL SECURITY;

-- Students manage their own favorites
CREATE POLICY "Students can manage own favorites"
  ON teacher_favorites
  FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Teachers see who favorited them (read-only)
CREATE POLICY "Teachers can see their fans"
  ON teacher_favorites
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Service role: full access for triggers
CREATE POLICY "Service role full access"
  ON teacher_favorites
  FOR ALL
  USING (auth.role() = 'service_role');
```

### State transitions

| Action | Effect |
|--------|--------|
| Student clicks "Favorite" | INSERT into `teacher_favorites` → trigger fires `teacher_favorited` notification to teacher |
| Student clicks "Unfavorite" | DELETE from `teacher_favorites` — no notification |

---

## New Table: `notification_preferences`

Persists per-user notification settings server-side (replaces localStorage).

```sql
CREATE TABLE notification_preferences (
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
    "system_announcement":  {"in_app": true,  "email": false},
    "new_booking":          {"in_app": true,  "email": true}
  }'::jsonb,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Access pattern

```typescript
// Read
const { data } = await supabase
  .from('notification_preferences')
  .select('settings')
  .eq('user_id', userId)
  .single();

// Write (upsert)
await supabase
  .from('notification_preferences')
  .upsert({ user_id: userId, settings: updatedSettings, updated_at: new Date().toISOString() });
```

---

## Modified: `notifications` type CHECK constraint

New migration adds missing types to the CHECK constraint:

```sql
-- Migration 036_notification_gaps.sql
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- existing
  'booking_confirmed', 'booking_cancelled', 'class_reminder',
  'gems_earned', 'xp_earned', 'achievement_unlocked', 'level_up',
  'class_started', 'class_ended', 'payment_received',
  'system_announcement', 'friend_request', 'message_received',
  -- added
  'new_booking',        -- teacher: new booking from student
  'slot_opened',        -- student: favorite teacher opened slots
  'teacher_favorited',  -- teacher: student added them to favorites
  'booking_payment',    -- student: payment receipt/invoice
  'cancellation_alert'  -- admin: high-frequency cancellation warning
));
```

---

## New DB Functions

### `notify_user_batched()` — Anti-fatigue helper

Batches repeated notifications of the same type for the same user within a 15-minute window.

```sql
CREATE OR REPLACE FUNCTION notify_user_batched(
  p_user_id      UUID,
  p_type         TEXT,
  p_title        TEXT,
  p_message      TEXT,
  p_action_url   TEXT  DEFAULT NULL,
  p_related_id   UUID  DEFAULT NULL,
  p_related_type TEXT  DEFAULT NULL,
  p_priority     TEXT  DEFAULT 'normal',
  p_batch_key    TEXT  DEFAULT NULL,   -- e.g. teacher_id for slot_opened grouping
  p_window_mins  INT   DEFAULT 15
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_existing_id UUID;
  v_count       INT;
  v_pref        JSONB;
BEGIN
  -- Check user preference (skip if disabled)
  SELECT COALESCE(settings -> p_type -> 'in_app', 'true'::jsonb)
    INTO v_pref
    FROM notification_preferences
   WHERE user_id = p_user_id;
  IF v_pref = 'false'::jsonb THEN RETURN; END IF;

  -- Find existing unread notification in window
  SELECT id, (metadata->>'batch_count')::int
    INTO v_existing_id, v_count
    FROM notifications
   WHERE user_id    = p_user_id
     AND type       = p_type
     AND read       = FALSE
     AND (p_batch_key IS NULL OR metadata->>'batch_key' = p_batch_key)
     AND created_at > NOW() - (p_window_mins || ' minutes')::interval
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing: increment count, refresh message
    UPDATE notifications
       SET message    = p_message || ' (+' || (v_count + 1) || ' more)',
           metadata   = metadata || jsonb_build_object('batch_count', v_count + 1),
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
      p_action_url, p_related_id, p_related_type, p_priority,
      jsonb_build_object('batch_count', 0, 'batch_key', p_batch_key)
    );
  END IF;
END;
$$;
```

---

## New DB Triggers

### `trg_teacher_favorited` — on `teacher_favorites` INSERT

```sql
CREATE OR REPLACE FUNCTION trg_teacher_favorited()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student_name TEXT;
BEGIN
  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;

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
    60   -- 60-minute batch window for this type
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_favorite_insert
  AFTER INSERT ON teacher_favorites
  FOR EACH ROW EXECUTE FUNCTION trg_teacher_favorited();
```

### `trg_slot_opened` — on `teacher_availability` INSERT

```sql
CREATE OR REPLACE FUNCTION trg_slot_opened()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_teacher_name TEXT;
  v_fan          RECORD;
BEGIN
  SELECT full_name INTO v_teacher_name FROM profiles WHERE id = NEW.teacher_id;

  FOR v_fan IN
    SELECT student_id FROM teacher_favorites WHERE teacher_id = NEW.teacher_id
  LOOP
    PERFORM notify_user_batched(
      v_fan.student_id,
      'slot_opened',
      'New Slot Available',
      COALESCE(v_teacher_name, 'Your favorite teacher') || ' just opened new availability slots.',
      '/teachers/' || NEW.teacher_id,
      NEW.teacher_id,
      'teacher',
      'normal',
      NEW.teacher_id::text,   -- batch by teacher so multiple slots = one notification
      15
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_availability_insert
  AFTER INSERT ON teacher_availability
  FOR EACH ROW EXECUTE FUNCTION trg_slot_opened();
```

---

## Admin Broadcast: Edge Function Contract

The existing `create-notification` Edge Function is extended to support broadcast mode.

**Request body extension**:
```typescript
{
  // existing single-user mode
  user_id?: string;

  // new broadcast mode
  broadcast?: {
    target: 'all' | 'students' | 'teachers';
    exclude_user_ids?: string[];
  };

  // shared fields
  type: string;
  title: string;
  message: string;
  action_url?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}
```

---

## Cancellation Alert Logic (Admin)

DB trigger on `bookings` UPDATE — when a teacher's cancellation rate in the last 24 hours exceeds 3:

```sql
-- Part of migration 036_notification_gaps.sql
CREATE OR REPLACE FUNCTION trg_cancellation_alert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_recent_count INT;
  v_teacher_id   UUID;
  v_teacher_name TEXT;
BEGIN
  SELECT teacher_id INTO v_teacher_id FROM classes WHERE id = NEW.class_id;
  SELECT full_name INTO v_teacher_name FROM profiles WHERE id = v_teacher_id;

  SELECT COUNT(*) INTO v_recent_count
    FROM bookings b
    JOIN classes c ON b.class_id = c.id
   WHERE c.teacher_id = v_teacher_id
     AND b.status = 'cancelled'
     AND b.updated_at > NOW() - INTERVAL '24 hours';

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
```
