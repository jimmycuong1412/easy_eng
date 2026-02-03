-- ============================================================================
-- Migration: Notifications System
-- Task: T169 - Create notifications table
-- ============================================================================
-- This migration creates the infrastructure for in-app notifications
-- ============================================================================

-- ============================================================================
-- Notifications Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User receiving the notification
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification type
  type TEXT NOT NULL CHECK (type IN (
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
    'message_received'
  )),

  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Optional link/action
  action_url TEXT,
  action_label TEXT,

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Related entities (optional)
  related_id UUID, -- ID of related booking, class, transaction, etc.
  related_type TEXT, -- Type of related entity

  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Icon/styling
  icon TEXT, -- Icon name or emoji
  color TEXT, -- Notification color theme

  -- Priority
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for fetching user's notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Index for unread notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Index for recent notifications
CREATE INDEX idx_notifications_recent ON notifications(user_id, created_at DESC);

-- Index for notification type
CREATE INDEX idx_notifications_type ON notifications(type);

-- Index for related entities
CREATE INDEX idx_notifications_related ON notifications(related_type, related_id);

-- Index for expiration cleanup
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_icon TEXT DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    action_label,
    related_id,
    related_type,
    metadata,
    icon,
    color,
    priority,
    expires_at
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_action_url,
    p_action_label,
    p_related_id,
    p_related_type,
    p_metadata,
    p_icon,
    p_color,
    p_priority,
    p_expires_at
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE,
      read_at = NOW(),
      updated_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark all user notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE,
      read_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND read = FALSE
    AND user_id = auth.uid();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get unread count for user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM notifications
  WHERE user_id = p_user_id
    AND read = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Delete expired notifications
CREATE OR REPLACE FUNCTION delete_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_notification_timestamp
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_timestamp();

-- ============================================================================
-- Realtime Publication
-- ============================================================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE notifications IS
  'In-app notifications for users';

COMMENT ON COLUMN notifications.type IS
  'Type of notification (booking_confirmed, gems_earned, etc.)';

COMMENT ON COLUMN notifications.priority IS
  'Priority level: low, normal, high, urgent';

COMMENT ON COLUMN notifications.expires_at IS
  'Optional expiration time for time-sensitive notifications';

COMMENT ON FUNCTION create_notification IS
  'Creates a new notification for a user';

COMMENT ON FUNCTION mark_notification_read IS
  'Marks a notification as read';

COMMENT ON FUNCTION mark_all_notifications_read IS
  'Marks all user notifications as read, returns count';

COMMENT ON FUNCTION get_unread_notification_count IS
  'Gets count of unread notifications for a user';

COMMENT ON FUNCTION delete_expired_notifications IS
  'Deletes expired notifications, should be run periodically';

-- ============================================================================
-- Usage Examples
-- ============================================================================

/*
-- Create a booking confirmation notification:
SELECT create_notification(
  p_user_id := 'user-uuid',
  p_type := 'booking_confirmed',
  p_title := 'Booking Confirmed',
  p_message := 'Your class "English Conversation" has been confirmed for tomorrow at 10:00 AM',
  p_action_url := '/bookings/booking-id',
  p_action_label := 'View Booking',
  p_related_id := 'booking-uuid',
  p_related_type := 'booking',
  p_icon := '✓',
  p_color := 'green',
  p_priority := 'high'
);

-- Create a Gems earned notification:
SELECT create_notification(
  p_user_id := 'user-uuid',
  p_type := 'gems_earned',
  p_title := 'You Earned 10 Gems!',
  p_message := 'Great job completing your class!',
  p_related_id := 'transaction-uuid',
  p_related_type := 'gem_transaction',
  p_icon := '💎',
  p_color := 'yellow',
  p_metadata := '{"gems": 10, "xp": 50}'::jsonb
);

-- Mark notification as read:
SELECT mark_notification_read('notification-uuid');

-- Mark all as read:
SELECT mark_all_notifications_read('user-uuid');

-- Get unread count:
SELECT get_unread_notification_count('user-uuid');

-- Query user's recent notifications:
SELECT *
FROM notifications
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 20;

-- Query unread notifications:
SELECT *
FROM notifications
WHERE user_id = auth.uid()
  AND read = FALSE
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY priority DESC, created_at DESC;
*/
