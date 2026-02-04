# Supabase MCP Incident Response

**Task**: T291
**Purpose**: Response plan for MCP authentication failures
**Owner**: DevOps + Database Team

---

## Incident Types

### 1. Authentication Failures

**Symptoms**:
- Users cannot authenticate with MCP
- "OAuth error" messages
- Token refresh failures

**Response**:
1. Check Supabase OAuth service status
2. Verify organization permissions
3. Clear local tokens and re-auth
4. Contact Supabase support if widespread

---

### 2. Unauthorized Access Attempts

**Symptoms**:
- Audit log shows production database access
- Failed permission checks
- Suspicious query patterns

**Response**:
1. **Immediate**: Revoke MCP access for user
2. Review audit logs for damage
3. Rollback any unauthorized changes
4. Security team investigation
5. Document incident

---

### 3. Service Outage

**Symptoms**:
- MCP server returns 503/504
- Timeouts on all operations
- Health check fails

**Response**:
1. Check status.supabase.com
2. Notify team via Slack
3. Use Supabase CLI as fallback
4. Monitor for restoration

---

## Escalation Path

1. **Developer** → Report to team lead
2. **Team Lead** → DevOps + Database Team
3. **Critical** → Security Team + CTO

---

## Contact Information

- **Supabase Support**: support@supabase.com
- **Internal DevOps**: #devops-alerts
- **Security Team**: security@easyeng.com

---

**Last Updated**: 2026-02-04
