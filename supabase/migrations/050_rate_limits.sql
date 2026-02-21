-- Rate Limiting Table (T236)
-- Tracks API request counts for rate limiting enforcement
-- Created: 2026-02-03

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  limit_key TEXT NOT NULL,
  identifier TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for fast lookups
  CONSTRAINT rate_limits_key_unique UNIQUE (key)
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Index for limit key lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_limit_key ON rate_limits(limit_key);

-- Index for identifier lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rate_limits_timestamp
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limits_updated_at();

-- Function to clean up old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE reset_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only service role can access)
CREATE POLICY "Service role only access" ON rate_limits
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking table for API endpoint throttling';
COMMENT ON COLUMN rate_limits.key IS 'Unique key combining limit_key and identifier (e.g., ratelimit:booking:user:123)';
COMMENT ON COLUMN rate_limits.limit_key IS 'Type of rate limit (e.g., booking, payment, gem:transaction)';
COMMENT ON COLUMN rate_limits.identifier IS 'User ID or IP address being rate limited';
COMMENT ON COLUMN rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN rate_limits.window_start IS 'Unix timestamp when current window started';
COMMENT ON COLUMN rate_limits.reset_at IS 'When the rate limit window resets';
