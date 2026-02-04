# Supabase Logging and Alerts Configuration (T244)

**Purpose**: Configure comprehensive logging and alerting for Supabase services
**Scope**: Database logs, Edge Function logs, Auth logs, Real-time logs, Alerts
**Platform**: Supabase Dashboard + External Monitoring

---

## Overview

Supabase provides built-in logging for all services. This guide covers configuration, monitoring, and alerting for production environments.

---

## 1. Database Logging

### 1.1 Query Logging

**Location**: Supabase Dashboard > Database > Logs

**Configuration**:

```sql
-- Enable query logging (requires pgAudit extension)
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Configure log settings
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = 'on';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second

-- Reload configuration
SELECT pg_reload_conf();
```

**Best Practices**:
- Log slow queries (>1000ms) in production
- Log all queries in development
- Monitor query patterns for optimization

### 1.2 Database Activity Monitoring

**Key Metrics**:
- Active connections
- Long-running queries
- Idle transactions
- Lock contention
- Replication lag

**Query to Monitor Active Connections**:

```sql
-- View active connections
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query,
  query_start,
  state_change
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

**Query to Monitor Slow Queries**:

```sql
-- View slow queries (requires pg_stat_statements)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  stddev_exec_time,
  rows
FROM pg_stat_statements
WHERE mean_exec_time > 1000 -- Queries averaging > 1 second
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## 2. Edge Function Logging

### 2.1 Built-in Logging

**Location**: Supabase Dashboard > Edge Functions > Logs

**Access Logs**:
```bash
# View logs via Supabase CLI
supabase functions logs <function-name> --tail

# View specific log level
supabase functions logs <function-name> --level error

# View logs for date range
supabase functions logs <function-name> --since "2024-02-01" --until "2024-02-04"
```

### 2.2 Custom Logging in Edge Functions

**Implementation**:

```typescript
// supabase/functions/_shared/logger.ts
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function: string;
  message: string;
  metadata?: Record<string, any>;
  error?: any;
}

export class Logger {
  private functionName: string;

  constructor(functionName: string) {
    this.functionName = functionName;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      message,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    };

    // Console log (appears in Supabase logs)
    console.log(JSON.stringify(entry));

    // Optional: Send to external logging service (Sentry, Datadog, etc.)
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      this.sendToExternalService(entry);
    }
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: any, metadata?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  private async sendToExternalService(entry: LogEntry) {
    // Implement external logging (Sentry, Datadog, Logtail, etc.)
    // Example: Sentry
    if (Deno.env.get('SENTRY_DSN')) {
      // Send to Sentry
    }
  }
}

// Usage in Edge Functions
const logger = new Logger('award-gems');
logger.info('Gems awarded', { userId, amount, source });
logger.error('Failed to award gems', error, { userId, amount });
```

### 2.3 Error Logging Table

**Create Error Log Table**:

```sql
-- supabase/migrations/051_error_logs.sql (already exists)
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_function ON error_logs(function_name);
CREATE INDEX idx_error_logs_user ON error_logs(user_id);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin-only read access
CREATE POLICY "Admin can view error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Service role can insert
CREATE POLICY "Service role can insert error logs"
  ON error_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

---

## 3. Authentication Logging

### 3.1 Auth Events

**Location**: Supabase Dashboard > Authentication > Logs

**Available Events**:
- Sign up
- Sign in
- Sign out
- Password reset
- Email verification
- Token refresh
- Failed login attempts

### 3.2 Custom Auth Audit Log

**Implementation**:

```sql
-- Auth audit log table
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auth_audit_user ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_event ON auth_audit_log(event_type);
CREATE INDEX idx_auth_audit_created ON auth_audit_log(created_at DESC);

-- Trigger to log auth events
CREATE OR REPLACE FUNCTION log_auth_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auth_audit_log (user_id, event_type, metadata)
  VALUES (
    NEW.id,
    TG_ARGV[0],
    jsonb_build_object('email', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers
CREATE TRIGGER on_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION log_auth_event('signup');
```

---

## 4. Real-time Logging

### 4.1 Real-time Channel Monitoring

**Location**: Supabase Dashboard > Database > Replication

**Metrics to Monitor**:
- Active subscriptions
- Messages sent/received
- Connection errors
- Broadcast performance

---

## 5. Alert Configuration

### 5.1 Supabase Dashboard Alerts

**Configure in**: Supabase Dashboard > Project Settings > Alerts

**Recommended Alerts**:

1. **Database CPU Usage** > 80%
   - Severity: Warning
   - Notification: Email, Slack

2. **Database Memory Usage** > 90%
   - Severity: Critical
   - Notification: Email, Slack, PagerDuty

3. **Database Storage** > 85%
   - Severity: Warning
   - Notification: Email

4. **API Request Rate** > 10,000/min
   - Severity: Info
   - Notification: Email

5. **Edge Function Errors** > 100/hour
   - Severity: Critical
   - Notification: Email, Slack

6. **Failed Login Attempts** > 50/hour
   - Severity: Warning (Potential brute force)
   - Notification: Email, Slack

### 5.2 Custom Alert Queries

**High Error Rate Detection**:

```sql
-- Create alert function for high error rate
CREATE OR REPLACE FUNCTION check_error_rate()
RETURNS TABLE(error_count BIGINT, function_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as error_count,
    el.function_name
  FROM error_logs el
  WHERE el.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY el.function_name
  HAVING COUNT(*) > 100;
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (requires extension)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'check-error-rate',
  '*/15 * * * *', -- Every 15 minutes
  $$SELECT * FROM check_error_rate();$$
);
```

**Failed Transaction Detection**:

```sql
-- Detect failed gem transactions
SELECT
  COUNT(*) as failed_count,
  user_id
FROM gem_transactions
WHERE
  created_at > NOW() - INTERVAL '1 hour'
  AND status = 'failed'
GROUP BY user_id
HAVING COUNT(*) > 5;
```

### 5.3 External Monitoring Integration

**Recommended Tools**:

1. **Better Stack (formerly Logtail)**
   - Centralized log aggregation
   - Real-time search and filtering
   - Alerting and dashboards

2. **Sentry**
   - Error tracking
   - Performance monitoring
   - User session replay

3. **Datadog**
   - Full-stack observability
   - APM for Edge Functions
   - Custom dashboards

4. **PagerDuty**
   - Incident management
   - On-call scheduling
   - Escalation policies

**Webhook Integration**:

```typescript
// Send alerts to Slack
async function sendSlackAlert(message: string, severity: 'info' | 'warning' | 'error') {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!webhookUrl) return;

  const color = {
    info: '#36a64f',
    warning: '#ff9900',
    error: '#ff0000',
  }[severity];

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color,
        text: message,
        footer: 'EasyEng Platform',
        ts: Math.floor(Date.now() / 1000),
      }],
    }),
  });
}
```

---

## 6. Log Retention and Cleanup

### 6.1 Automatic Log Cleanup

**Implementation**:

```sql
-- Function to clean old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete error logs older than 90 days
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Delete auth audit logs older than 180 days
  DELETE FROM auth_audit_log
  WHERE created_at < NOW() - INTERVAL '180 days';

  -- Vacuum to reclaim space
  VACUUM ANALYZE error_logs;
  VACUUM ANALYZE auth_audit_log;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup weekly
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$SELECT cleanup_old_logs();$$
);
```

### 6.2 Log Archiving

**Export to External Storage**:

```bash
# Export logs to S3/GCS for long-term storage
supabase db dump --table error_logs > logs-backup-$(date +%Y%m%d).sql
```

---

## 7. Monitoring Dashboard

### 7.1 Admin Dashboard View

**Create Monitoring Page**: `frontend/src/app/[locale]/admin/monitoring/page.tsx`

```typescript
// Display key metrics:
// - Total errors (last 24h)
// - Error rate by function
// - Failed transactions
// - Auth failures
// - Slow queries
```

### 7.2 Health Check Endpoint

**Already implemented**: `supabase/functions/health-check/index.ts`

**Monitor**:
```bash
# Ping health check endpoint
curl https://your-project.supabase.co/functions/v1/health-check

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-02-04T12:00:00Z",
  "services": {
    "database": "up",
    "auth": "up",
    "storage": "up"
  }
}
```

---

## 8. Configuration Checklist

### Production Readiness

- [ ] Database query logging enabled
- [ ] Edge Function logging configured
- [ ] Error log table created and indexed
- [ ] Auth audit log implemented
- [ ] Dashboard alerts configured (CPU, memory, storage, errors)
- [ ] External monitoring integrated (Sentry, Datadog, Better Stack)
- [ ] Slack/email webhooks configured
- [ ] Log retention policies set
- [ ] Automated cleanup scheduled
- [ ] Admin monitoring dashboard created
- [ ] Health check endpoint monitored
- [ ] On-call rotation established

---

## 9. Alert Thresholds (Recommended)

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Database CPU | 70% | 85% | Scale up |
| Database Memory | 80% | 90% | Optimize queries |
| Storage Usage | 75% | 85% | Add capacity |
| Error Rate | 50/hour | 200/hour | Investigate |
| Failed Logins | 100/hour | 500/hour | Block IP |
| API Latency (p95) | 500ms | 1000ms | Optimize |
| Edge Function Errors | 5% | 10% | Fix code |

---

## 10. Incident Response Workflow

1. **Alert Triggered** → Notification sent (Slack/PagerDuty)
2. **Acknowledge** → Engineer acknowledges within 5 minutes
3. **Investigate** → Check logs, metrics, dashboards
4. **Mitigate** → Apply temporary fix if needed
5. **Resolve** → Implement permanent fix
6. **Post-mortem** → Document root cause and prevention

---

## References

- Supabase Logging Docs: https://supabase.com/docs/guides/platform/logs
- pg_cron Extension: https://github.com/citusdata/pg_cron
- Sentry Integration: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Better Stack: https://betterstack.com/docs

---

**Document Version**: 1.0
**Last Updated**: 2026-02-04
**Owner**: DevOps Team
