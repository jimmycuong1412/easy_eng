-- ============================================================================
-- Migration 034: Notifications Schema Fix
-- Adds 9 columns required by useRealtimeNotifications hook and UI components
-- ============================================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS action_url    TEXT,
  ADD COLUMN IF NOT EXISTS action_label  TEXT,
  ADD COLUMN IF NOT EXISTS related_id    UUID,
  ADD COLUMN IF NOT EXISTS related_type  TEXT,
  ADD COLUMN IF NOT EXISTS metadata      JSONB        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS icon          TEXT,
  ADD COLUMN IF NOT EXISTS color         TEXT,
  ADD COLUMN IF NOT EXISTS priority      TEXT         DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS expires_at    TIMESTAMPTZ;

-- Index for related entity lookups (e.g. "all notifications for booking X")
CREATE INDEX IF NOT EXISTS idx_notifications_related
  ON notifications (related_type, related_id)
  WHERE related_type IS NOT NULL;

-- Index for expiration cleanup jobs
CREATE INDEX IF NOT EXISTS idx_notifications_expires
  ON notifications (expires_at)
  WHERE expires_at IS NOT NULL;
