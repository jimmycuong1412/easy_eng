# Supabase MCP Access Review Process

**Task**: T292
**Purpose**: Quarterly access review for MCP users
**Owner**: Security Team + Database Team

---

## Review Schedule

**Frequency**: Quarterly (January, April, July, October)
**Next Review**: 2026-04-01

---

## Review Checklist

For each user with MCP access:

- [ ] Still requires database access?
- [ ] Active in last 90 days?
- [ ] Role unchanged (still developer)?
- [ ] No security violations?
- [ ] Training current (<1 year)?

---

## Access Levels

### Full Access
- Read schema
- Read/write queries
- Generate migrations
- **Review**: Quarterly

### Read-Only Access
- Read schema
- SELECT queries only
- **Review**: Semi-annually

### Revoked
- No longer requires access
- **Action**: Remove from Supabase org

---

## Review Query

```sql
-- Users with MCP access
SELECT
  u.email,
  u.role,
  u.mcp_granted_date,
  MAX(m.created_at) as last_use,
  COUNT(m.id) as total_operations
FROM users u
LEFT JOIN mcp_audit_log m ON u.id = m.developer_id
WHERE u.mcp_access = true
GROUP BY u.id
ORDER BY last_use DESC NULLS LAST;
```

---

## Documentation

Record each review in `docs/access-reviews/`:
- `2026-Q1-mcp-access-review.md`
- `2026-Q2-mcp-access-review.md`

---

**Last Updated**: 2026-02-04
**Next Review**: 2026-04-01
