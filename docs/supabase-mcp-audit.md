# Supabase MCP Audit Process

**Task**: T289
**Purpose**: Audit procedures for MCP-generated database schema changes
**Owner**: Database Team / DevOps

---

## Overview

All MCP-generated schema changes must be audited to ensure security, correctness, and compliance with database standards.

---

## Audit Scope

### What Gets Audited

✅ **Always Audit**:
- Schema modifications (ALTER TABLE, CREATE TABLE)
- Index changes (CREATE INDEX, DROP INDEX)
- Constraint modifications
- RLS policy changes
- Permission/grant changes
- Enum type modifications

⚠️ **Review Required**:
- Data migrations (UPDATE, INSERT)
- Trigger modifications
- Function/procedure changes

ℹ️ **Log Only**:
- SELECT queries (read-only)
- Type generation
- Schema exploration

---

## Audit Workflow

### Step 1: Automatic Logging

All MCP operations are logged automatically:

```sql
-- Audit log table (already exists)
CREATE TABLE mcp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID REFERENCES auth.users(id),
  operation_type TEXT NOT NULL, -- 'query', 'migration', 'schema_change'
  sql_executed TEXT,
  ai_tool TEXT, -- 'claude', 'cursor', 'windsurf'
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 2: Pre-Commit Review

Before committing MCP-generated migration:

1. Developer self-reviews using `docs/mcp-migration-review.md`
2. Run automated checks:
   ```bash
   npm run lint:sql -- supabase/migrations/053_*.sql
   npm run check:rls -- supabase/migrations/053_*.sql
   ```
3. Test in development
4. Create PR with checklist

### Step 3: Peer Review

PR must include:

- [ ] Migration file in `supabase/migrations/`
- [ ] Migration passes syntax validation
- [ ] RLS policies included (if applicable)
- [ ] Indexes added for foreign keys
- [ ] Rollback plan documented
- [ ] Tested in development
- [ ] MCP audit log entry

**Reviewer checks**:
- Code review checklist completed
- No security violations
- Follows naming conventions
- Performance implications acceptable

### Step 4: Weekly Audit Review

Every Monday, database team reviews:

```sql
-- MCP operations from past week
SELECT
  u.email as developer,
  COUNT(*) as operations,
  SUM(CASE WHEN operation_type = 'schema_change' THEN 1 ELSE 0 END) as schema_changes,
  SUM(CASE WHEN approved = false THEN 1 ELSE 0 END) as unapproved
FROM mcp_audit_log m
JOIN auth.users u ON m.developer_id = u.id
WHERE m.created_at >= NOW() - INTERVAL '7 days'
GROUP BY u.email
ORDER BY operations DESC;
```

**Review focus**:
- Unusual patterns
- Unapproved operations
- Policy violations
- Performance impact

---

## Audit Checklist

### Security Audit

- [ ] No production database access
- [ ] RLS policies enabled on sensitive tables
- [ ] No plain-text sensitive data
- [ ] Service role usage justified
- [ ] No overly permissive grants

### Performance Audit

- [ ] Foreign keys indexed
- [ ] Query-critical columns indexed
- [ ] No missing indexes identified
- [ ] Large migrations batched
- [ ] Execution time estimated

### Compliance Audit

- [ ] Follows naming conventions
- [ ] Includes documentation/comments
- [ ] Backwards compatible
- [ ] Rollback plan exists
- [ ] Change log updated

---

## Red Flags

Immediately escalate if:

🚨 **Critical**:
- Production database accessed
- RLS disabled without justification
- Mass DELETE/UPDATE without WHERE clause
- Dropping tables without backup
- Credentials/secrets in database

⚠️ **Warning**:
- Multiple failed approval attempts
- Large migrations without batching
- Missing indexes on foreign keys
- No rollback plan
- Undocumented schema changes

---

## Audit Reports

### Monthly Report Template

```markdown
# MCP Audit Report - February 2026

## Summary
- Total operations: 145
- Schema changes: 23
- Migrations created: 12
- Issues found: 3 (all resolved)

## Breakdown by Developer
| Developer  | Operations | Schema Changes | Issues |
|------------|------------|----------------|--------|
| Alice Lee  | 56         | 8              | 1      |
| Bob Smith  | 45         | 7              | 0      |
| Jane Doe   | 44         | 8              | 2      |

## Issues Identified
1. Missing index on bookings.user_id (resolved)
2. RLS not enabled on new table (resolved)
3. Unapproved data migration (reviewed and approved)

## Recommendations
- Continue current practices
- Add pre-commit hook for RLS check
- Schedule MCP training for new team members
```

---

## Access Review

### Quarterly Review

Every quarter, audit MCP access:

```sql
-- Who has MCP access?
SELECT
  u.email,
  u.role,
  last_mcp_use,
  mcp_operations_count
FROM users u
LEFT JOIN (
  SELECT
    developer_id,
    MAX(created_at) as last_mcp_use,
    COUNT(*) as mcp_operations_count
  FROM mcp_audit_log
  GROUP BY developer_id
) m ON u.id = m.developer_id
WHERE u.mcp_access_enabled = true
ORDER BY last_mcp_use DESC NULLS LAST;
```

**Review Questions**:
- Still requires access?
- Inactive for >90 days?
- Role change (no longer developer)?
- Left company?

**Actions**:
- Revoke unused access
- Update access levels
- Document changes

---

## Compliance Requirements

### Data Protection
- All schema changes logged
- Audit logs retained for 1 year
- Access reviews quarterly
- Security violations reported within 24 hours

### Change Management
- All changes tracked in version control
- Peer review required
- Test environment validation
- Production change window adherence

---

## Incident Response

### If Unauthorized Change Detected

1. **Immediate**: Rollback change if safe
2. **Notify**: Database team + security
3. **Investigate**: Review audit logs
4. **Document**: Incident report
5. **Prevent**: Update access controls

### Incident Report Template

```markdown
# MCP Incident Report

Date: 2026-02-04
Severity: [Low/Medium/High/Critical]

## What Happened
Brief description of the incident

## Impact
- Tables affected: [list]
- Data loss: [yes/no]
- Downtime: [duration]
- Users affected: [number]

## Root Cause
What allowed this to happen

## Resolution
How it was fixed

## Prevention
Changes to prevent recurrence
```

---

## Related Documentation

- **Migration Review**: `docs/mcp-migration-review.md`
- **Security Policy**: `docs/supabase-mcp-security.md`
- **Usage Patterns**: `docs/supabase-mcp-patterns.md`

---

**Document Version**: 1.0
**Last Updated**: 2026-02-04
**Task**: T289
**Review Frequency**: Weekly (operations), Quarterly (access)
