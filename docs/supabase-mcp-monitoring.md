# Supabase MCP Monitoring

**Task**: T290
**Purpose**: Monitor MCP server status and usage
**Owner**: DevOps Team

---

## Monitoring Dashboard

### Key Metrics

1. **Availability**: MCP server uptime
2. **Authentication**: OAuth success rate
3. **Operations**: Query count, error rate
4. **Performance**: Response time, timeout rate

### Check MCP Server Status

```bash
# Health check
curl https://mcp.supabase.com/health

# Expected response
{
  "status": "healthy",
  "version": "1.2.0",
  "timestamp": "2026-02-04T12:00:00Z"
}
```

---

## Usage Monitoring

### Daily Operations

```sql
-- Today's MCP operations
SELECT
  operation_type,
  COUNT(*) as count,
  AVG(CASE WHEN approved THEN 1.0 ELSE 0.0 END) * 100 as approval_rate
FROM mcp_audit_log
WHERE created_at >= CURRENT_DATE
GROUP BY operation_type;
```

### Error Tracking

```sql
-- Failed operations
SELECT
  developer_id,
  operation_type,
  error_message,
  created_at
FROM mcp_audit_log
WHERE approved = false
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## Alerts

### Critical Alerts

- MCP server down (> 5 min)
- Authentication failure rate > 10%
- Unauthorized access attempt

### Warning Alerts

- Response time > 5 seconds
- Operations > 1000/day for single user
- Failed operations > 50/day

---

## Related
- **Incidents**: `docs/supabase-mcp-incidents.md`
- **Access Review**: `docs/supabase-mcp-access-review.md`

---

**Last Updated**: 2026-02-04
