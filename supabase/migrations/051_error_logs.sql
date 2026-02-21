-- Error Logging Table (T226)
-- Stores error logs from Edge Functions for monitoring and debugging
-- Created: 2026-02-03

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  message TEXT NOT NULL,
  function_name TEXT NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  context JSONB,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  request_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_occurred_at ON error_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_function_name ON error_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_request_id ON error_logs(request_id) WHERE request_id IS NOT NULL;

-- Index for context JSONB queries
CREATE INDEX IF NOT EXISTS idx_error_logs_context_gin ON error_logs USING GIN (context);

-- Function to clean up old error logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM error_logs
  WHERE occurred_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get error statistics
CREATE OR REPLACE FUNCTION get_error_statistics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  function_name TEXT,
  error_count BIGINT,
  fatal_count BIGINT,
  last_error_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.function_name,
    COUNT(*) as error_count,
    COUNT(*) FILTER (WHERE el.level = 'fatal') as fatal_count,
    MAX(el.occurred_at) as last_error_at
  FROM error_logs el
  WHERE el.occurred_at BETWEEN p_start_date AND p_end_date
    AND el.level IN ('error', 'fatal')
  GROUP BY el.function_name
  ORDER BY error_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent errors for a user
CREATE OR REPLACE FUNCTION get_user_errors(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  level TEXT,
  message TEXT,
  function_name TEXT,
  occurred_at TIMESTAMPTZ,
  context JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.id,
    el.level,
    el.message,
    el.function_name,
    el.occurred_at,
    el.context
  FROM error_logs el
  WHERE el.user_id = p_user_id
  ORDER BY el.occurred_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only service role and admins can access error logs
CREATE POLICY "Service role full access" ON error_logs
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view all errors" ON error_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can only view their own errors (if needed for support)
CREATE POLICY "Users can view own errors" ON error_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE error_logs IS 'Error logs from Edge Functions for monitoring and debugging';
COMMENT ON COLUMN error_logs.level IS 'Log level: debug, info, warn, error, fatal';
COMMENT ON COLUMN error_logs.message IS 'Human-readable error message';
COMMENT ON COLUMN error_logs.function_name IS 'Name of the Edge Function that logged the error';
COMMENT ON COLUMN error_logs.error_message IS 'Error message from exception';
COMMENT ON COLUMN error_logs.error_stack IS 'Stack trace from exception';
COMMENT ON COLUMN error_logs.context IS 'Additional context data (request details, user info, etc.)';
COMMENT ON COLUMN error_logs.user_id IS 'User associated with the error (if applicable)';
COMMENT ON COLUMN error_logs.request_id IS 'Unique identifier for the request';
COMMENT ON COLUMN error_logs.occurred_at IS 'When the error occurred';

-- Create view for error summary dashboard
CREATE OR REPLACE VIEW error_logs_summary AS
SELECT
  DATE_TRUNC('hour', occurred_at) as hour,
  function_name,
  level,
  COUNT(*) as error_count
FROM error_logs
WHERE occurred_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', occurred_at), function_name, level
ORDER BY hour DESC, error_count DESC;

COMMENT ON VIEW error_logs_summary IS 'Hourly error summary for the last 7 days';
