-- Task: T131 - Create Gem expiration tracking

-- Add expiration tracking to gem_transactions
ALTER TABLE gem_transactions
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expired BOOLEAN DEFAULT FALSE;

-- Index for expiration queries
CREATE INDEX IF NOT EXISTS idx_gem_transactions_expiration
  ON gem_transactions(student_id, expires_at, expired)
  WHERE expires_at IS NOT NULL AND expired = FALSE;

-- Function: Set expiration date (180 days from earning)
CREATE OR REPLACE FUNCTION set_gem_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'earned' THEN
    NEW.expires_at := NOW() + INTERVAL '180 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_gem_expiration
  BEFORE INSERT ON gem_transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_gem_expiration();

-- Function: Expire Gems
CREATE OR REPLACE FUNCTION expire_gems()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE gem_transactions
  SET expired = TRUE
  WHERE transaction_type = 'earned'
    AND expires_at < NOW()
    AND expired = FALSE;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- View: Expiring soon (within 30 days)
CREATE OR REPLACE VIEW gems_expiring_soon AS
SELECT
  student_id,
  SUM(amount) as expiring_gems,
  MIN(expires_at) as earliest_expiration
FROM gem_transactions
WHERE transaction_type = 'earned'
  AND expired = FALSE
  AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
GROUP BY student_id;
