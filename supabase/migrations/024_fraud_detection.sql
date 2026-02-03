-- Task: T134 - Create fraud detection rules

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'confirmed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fraud_alerts_pending ON fraud_alerts(status) WHERE status = 'pending';

-- Function: Detect suspicious Gem transactions
CREATE OR REPLACE FUNCTION detect_gem_fraud()
RETURNS TABLE(user_id UUID, issue TEXT) AS $$
BEGIN
  -- Detect rapid transactions
  RETURN QUERY
  SELECT DISTINCT gt.student_id, 'Rapid Gem transactions' as issue
  FROM gem_transactions gt
  WHERE gt.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY gt.student_id
  HAVING COUNT(*) > 10;
END;
$$ LANGUAGE plpgsql;
