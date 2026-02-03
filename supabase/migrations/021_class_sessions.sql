-- Migration: Create Class Sessions Table
-- Purpose: Track live video class sessions and attendance
-- Phase: Phase 8 - CometChat Video Integration
-- Task: T115 [P] Create class_sessions table

-- ============================================================================
-- Class Sessions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_sessions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- CometChat integration
  cometchat_group_id TEXT NOT NULL UNIQUE,
  cometchat_session_id TEXT,

  -- Session status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'waiting', 'live', 'ended', 'cancelled', 'no_show')
  ),

  -- Timing
  scheduled_start_time TIMESTAMPTZ NOT NULL,
  actual_start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Participants
  max_participants INTEGER NOT NULL DEFAULT 20,
  current_participants INTEGER NOT NULL DEFAULT 0,

  -- Session metadata
  recording_url TEXT,
  recording_enabled BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_class_sessions_class_id ON public.class_sessions(class_id);
CREATE INDEX idx_class_sessions_teacher_id ON public.class_sessions(teacher_id);
CREATE INDEX idx_class_sessions_status ON public.class_sessions(status);
CREATE INDEX idx_class_sessions_scheduled_start ON public.class_sessions(scheduled_start_time);
CREATE INDEX idx_class_sessions_cometchat_group ON public.class_sessions(cometchat_group_id);

-- Updated_at trigger
CREATE TRIGGER update_class_sessions_updated_at
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.class_sessions IS 'Tracks live video class sessions with CometChat integration';

-- ============================================================================
-- Session Participants Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_participants (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,

  -- Participant role
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'observer')),

  -- Attendance tracking
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  is_present BOOLEAN DEFAULT false,

  -- Engagement metrics
  messages_sent INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,
  screen_shares_count INTEGER DEFAULT 0,

  -- Connection quality
  avg_connection_quality TEXT, -- 'excellent', 'good', 'fair', 'poor'
  disconnection_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(session_id, user_id)
);

-- Indexes
CREATE INDEX idx_session_participants_session ON public.session_participants(session_id);
CREATE INDEX idx_session_participants_user ON public.session_participants(user_id);
CREATE INDEX idx_session_participants_booking ON public.session_participants(booking_id);
CREATE INDEX idx_session_participants_presence ON public.session_participants(is_present);

-- Updated_at trigger
CREATE TRIGGER update_session_participants_updated_at
  BEFORE UPDATE ON public.session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.session_participants IS 'Tracks participant attendance and engagement in video sessions';

-- ============================================================================
-- Session Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'session_started',
      'session_ended',
      'participant_joined',
      'participant_left',
      'screen_share_started',
      'screen_share_ended',
      'recording_started',
      'recording_stopped',
      'technical_issue',
      'chat_message',
      'reaction'
    )
  ),

  -- Event data
  event_data JSONB DEFAULT '{}',

  -- Timestamp
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_session_events_session ON public.session_events(session_id);
CREATE INDEX idx_session_events_user ON public.session_events(user_id);
CREATE INDEX idx_session_events_type ON public.session_events(event_type);
CREATE INDEX idx_session_events_occurred ON public.session_events(occurred_at);

COMMENT ON TABLE public.session_events IS 'Logs all events that occur during video sessions for analytics';

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_session_duration(
  p_session_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_duration INTEGER;
BEGIN
  SELECT EXTRACT(EPOCH FROM (end_time - actual_start_time))::INTEGER / 60
  INTO v_duration
  FROM public.class_sessions
  WHERE id = p_session_id;

  RETURN COALESCE(v_duration, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate participant attendance duration
CREATE OR REPLACE FUNCTION calculate_participant_duration(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_duration INTEGER;
BEGIN
  SELECT duration_seconds
  INTO v_duration
  FROM public.session_participants
  WHERE session_id = p_session_id AND user_id = p_user_id;

  RETURN COALESCE(v_duration, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to mark participant as present (attended >= 50% of session)
CREATE OR REPLACE FUNCTION mark_participant_present()
RETURNS TRIGGER AS $$
DECLARE
  v_session_duration INTEGER;
  v_attendance_threshold INTEGER;
BEGIN
  -- Get total session duration
  SELECT duration_minutes INTO v_session_duration
  FROM public.class_sessions
  WHERE id = NEW.session_id;

  -- Calculate 50% threshold in seconds
  v_attendance_threshold := (v_session_duration * 60 * 0.5)::INTEGER;

  -- Mark as present if attended >= 50% of session
  IF NEW.duration_seconds >= v_attendance_threshold THEN
    NEW.is_present := true;
  ELSE
    NEW.is_present := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate presence
CREATE TRIGGER calculate_participant_presence
  BEFORE INSERT OR UPDATE OF duration_seconds ON public.session_participants
  FOR EACH ROW
  EXECUTE FUNCTION mark_participant_present();

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- View: Active sessions
CREATE OR REPLACE VIEW public.active_class_sessions AS
SELECT
  cs.*,
  c.title as class_title,
  c.description as class_description,
  p.display_name as teacher_name,
  p.avatar_url as teacher_avatar
FROM public.class_sessions cs
JOIN public.classes c ON cs.class_id = c.id
JOIN public.profiles p ON cs.teacher_id = p.id
WHERE cs.status IN ('waiting', 'live')
ORDER BY cs.scheduled_start_time;

COMMENT ON VIEW public.active_class_sessions IS 'Currently active or waiting video sessions';

-- View: Session attendance summary
CREATE OR REPLACE VIEW public.session_attendance_summary AS
SELECT
  cs.id as session_id,
  cs.class_id,
  cs.status,
  cs.scheduled_start_time,
  cs.actual_start_time,
  cs.end_time,
  cs.duration_minutes,
  COUNT(sp.id) as total_participants,
  COUNT(sp.id) FILTER (WHERE sp.is_present = true) as present_count,
  ROUND(
    100.0 * COUNT(sp.id) FILTER (WHERE sp.is_present = true) / NULLIF(COUNT(sp.id), 0),
    2
  ) as attendance_rate_pct,
  AVG(sp.duration_seconds) as avg_duration_seconds
FROM public.class_sessions cs
LEFT JOIN public.session_participants sp ON cs.id = sp.session_id
GROUP BY cs.id
ORDER BY cs.scheduled_start_time DESC;

COMMENT ON VIEW public.session_attendance_summary IS 'Attendance statistics for each session';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view and manage their own sessions
CREATE POLICY teacher_own_sessions ON public.class_sessions
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Policy: Students can view sessions for classes they booked
CREATE POLICY student_booked_sessions ON public.class_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.class_id = class_sessions.class_id
      AND b.student_id = auth.uid()
      AND b.status IN ('confirmed', 'completed')
    )
  );

-- Policy: Admins can view all sessions
CREATE POLICY admin_all_sessions ON public.class_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Participants can view their own participation records
CREATE POLICY own_participation ON public.session_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Teachers can view all participants in their sessions
CREATE POLICY teacher_session_participants ON public.session_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = session_participants.session_id
      AND cs.teacher_id = auth.uid()
    )
  );

-- Policy: System can insert/update participant records
CREATE POLICY system_manage_participants ON public.session_participants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone in a session can view session events
CREATE POLICY session_events_visibility ON public.session_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = session_events.session_id
      AND sp.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON public.active_class_sessions TO authenticated;
GRANT SELECT ON public.session_attendance_summary TO authenticated;

-- ============================================================================
-- Sample Data (Development Only)
-- ============================================================================

-- Note: Uncomment for development testing
/*
-- Create a sample session
INSERT INTO public.class_sessions (
  class_id,
  teacher_id,
  cometchat_group_id,
  status,
  scheduled_start_time,
  max_participants
) VALUES (
  (SELECT id FROM public.classes LIMIT 1),
  (SELECT id FROM public.profiles WHERE role = 'teacher' LIMIT 1),
  'class-session-' || gen_random_uuid(),
  'scheduled',
  NOW() + INTERVAL '1 hour',
  20
);
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA public IS
'Schema includes class session tracking for video integration (Phase 8)';
