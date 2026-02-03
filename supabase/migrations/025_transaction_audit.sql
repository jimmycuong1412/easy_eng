-- Task: T138 - Transaction audit log
CREATE TABLE IF NOT EXISTS transaction_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID,
  transaction_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  old_state JSONB,
  new_state JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transaction_audit_user ON transaction_audit_log(user_id, created_at);
CREATE INDEX idx_transaction_audit_type ON transaction_audit_log(transaction_type, created_at);
