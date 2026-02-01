# Supabase MCP Security Policy

**Last Updated**: 2026-01-31
**Policy Version**: 1.0
**Applies To**: All developers with MCP access

## Purpose

This document establishes security policies and requirements for Supabase MCP (Model Context Protocol) usage to protect production data, prevent unauthorized access, and maintain database integrity.

## Policy Summary

🔴 **CRITICAL RULES** - Violation may result in immediate MCP access revocation:

1. ❌ **NEVER** configure production database project references in MCP
2. ✅ **ALWAYS** enable manual approval for write operations
3. ✅ **ALWAYS** code-review MCP-generated migrations before applying
4. ✅ **ONLY** use MCP with development or staging environments
5. ✅ **IMMEDIATELY** report any security incidents or violations

## Environment Policy

### Permitted Environments

✅ **ALLOWED** - MCP can be used with:
- Development databases
- Local development instances
- Staging/QA environments
- Personal test databases
- Database branches for testing

❌ **PROHIBITED** - MCP must NEVER be used with:
- Production databases
- Customer-facing environments
- Any database containing real user data
- Databases with PII (Personally Identifiable Information)
- Compliance-regulated environments (GDPR, HIPAA, etc.)

### Verification Requirements

Before configuring MCP:

1. **Verify Environment Label**
   - Project must be explicitly labeled "Development", "Dev", "Staging", or "Test"
   - If unlabeled, confirm with team lead before proceeding

2. **Check Data Contents**
   - Ensure database contains only synthetic test data
   - No real user emails, names, or personal information
   - No production transaction records

3. **Document Configuration**
   - Record project reference ID in `docs/SUPABASE_PROJECT_INFO.md`
   - Update team access table with your name and date

## Access Control Policy

### Who Can Access MCP

**Approved Roles**:
- ✅ Senior Developers (with admin privileges)
- ✅ Database Administrators
- ✅ DevOps Engineers (for infrastructure work)
- ✅ Tech Leads and Architects

**Restricted Roles**:
- ⚠️ Junior Developers (with explicit permission and supervision)
- ❌ Contractors (case-by-case approval required)
- ❌ External consultants (prohibited unless under NDA and supervision)

### Access Grant Procedure

1. **Request Access**
   - Submit request to team lead or DBA
   - Specify use case and justification
   - Complete MCP security training

2. **Approval Process**
   - Team lead reviews request
   - Admin grants Supabase organization access
   - Developer configures MCP with guidance

3. **Documentation**
   - Record access grant in `docs/SUPABASE_PROJECT_INFO.md`
   - Note date, approver, and purpose
   - Set access review date (quarterly)

### Access Revocation

Access must be revoked immediately when:
- Developer leaves the team or company
- Role changes to non-technical position
- Security violation occurs
- Quarterly review determines access no longer needed

## Operation Security Requirements

### Write Operations

**Manual Approval Required** for:
- `execute_sql` - Raw SQL execution
- `generate_migration` - Schema changes
- `create_database_branch` - Resource creation
- Any operation that modifies data or schema

**Configuration**:
```json
"mcpSettings": {
  "requireManualApproval": true,
  "approvalRequired": [
    "execute_sql",
    "generate_migration",
    "create_database_branch"
  ]
}
```

**Review Process**:
1. AI generates SQL/migration
2. Developer reviews code for:
   - Correctness and safety
   - Unintended side effects
   - Schema compatibility
   - Data integrity
3. Approve or reject operation
4. If approved: Document in commit message

### Read Operations

**Permitted** (no manual approval needed):
- `query_database` - Natural language queries (SELECT only)
- `describe_table` - Schema exploration
- `get_project_info` - Project configuration
- `view_logs` - Log viewing

**Best Practices**:
- Limit query scope to necessary data
- Avoid selecting entire large tables
- Use LIMIT clauses for exploration
- Don't share query results containing sensitive data

## Migration Management

### MCP-Generated Migrations

**Requirements**:
1. **Code Review** - All MCP-generated migrations must be code-reviewed
2. **Testing** - Test on database branch before applying to dev
3. **Documentation** - Document what the migration does and why
4. **Git Commit** - Commit migration to version control with descriptive message

**Prohibited Actions**:
- ❌ Applying migrations without review
- ❌ Bypassing code review process
- ❌ Running migrations on production via MCP
- ❌ Sharing migrations with `--no-review` flag

### Migration Review Checklist

Before approving an MCP-generated migration:

- [ ] SQL syntax is correct
- [ ] No destructive operations (DROP, TRUNCATE) unless explicitly intended
- [ ] Indexes are added for new foreign keys
- [ ] Default values are appropriate
- [ ] Constraints don't conflict with existing data
- [ ] Rollback migration is possible (provide DOWN migration)
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] No performance impact on large tables (estimated row count < 1M or uses online DDL)

## Data Protection

### Sensitive Data Handling

**Prohibited Activities**:
- ❌ Querying production data via MCP
- ❌ Copying production data to development for MCP testing
- ❌ Sharing MCP query results containing PII
- ❌ Exporting database dumps through MCP tools
- ❌ Using MCP to access customer data

**Data Masking Requirements**:
- Development databases should use masked/synthetic data
- Any real data copied must be anonymized first
- PII fields must be randomized or removed

### Compliance Considerations

If your database contains regulated data:

- **GDPR**: Ensure "right to be forgotten" can be honored
- **CCPA**: Track data subject requests separately
- **HIPAA**: MCP not suitable for PHI - use traditional tools
- **PCI DSS**: Card data must never be in MCP-accessible databases

## Incident Response

### Security Incident Types

Report immediately if:
- Production project ref was accidentally configured in MCP
- Unauthorized person gained MCP access
- MCP used to make unintended changes to database
- Sensitive data was exposed through MCP query
- MCP authentication credentials were compromised

### Reporting Procedure

1. **Immediate Actions**
   - Stop using MCP immediately
   - Disable MCP server connection (remove from config)
   - Do NOT attempt to "fix" or "undo" without guidance

2. **Notify Team**
   - Contact team lead and DBA immediately
   - Send incident report to security team
   - Document what happened, when, and impact

3. **Investigation**
   - Review MCP audit logs
   - Check database audit trails
   - Determine scope of incident
   - Identify affected data/systems

4. **Remediation**
   - Follow incident response plan (`supabase-mcp-incidents.md`)
   - Apply fixes or rollbacks as needed
   - Update policies to prevent recurrence

### Incident Severity Levels

**CRITICAL** (production impact):
- Production database accessed via MCP
- Data loss or corruption occurred
- Compliance breach (PII exposed)

**HIGH** (potential for harm):
- Staging database modified unintentionally
- Migration applied without review
- Unauthorized access detected

**MEDIUM** (policy violation):
- Manual approval bypassed for write operation
- Migration not code-reviewed before commit
- Access granted without proper approval

**LOW** (procedural):
- Documentation not updated
- Best practices not followed
- Training not completed

## Audit and Compliance

### Audit Logging

**Required Logs**:
- All MCP authentication events
- All write operations (SQL executed, migrations generated)
- Manual approval decisions (approved/rejected)
- Access grants and revocations

**Log Retention**:
- Minimum 12 months for audit purposes
- Archive logs after 12 months
- Never delete logs during active investigations

### Quarterly Access Review

**Process**:
1. **Review Team Access** (every 3 months)
   - List all users with MCP access
   - Verify each still requires access
   - Revoke access for inactive users

2. **Review Configuration**
   - Verify no production refs configured
   - Check manual approval settings
   - Update security settings if needed

3. **Review Incidents**
   - Analyze incidents from past quarter
   - Identify trends or recurring issues
   - Update policies accordingly

4. **Document Review**
   - Record review date and findings
   - Update `docs/supabase-mcp-access-review.md`
   - Share results with team

## Training Requirements

### Initial Training

Before granting MCP access, developers must:

1. **Read Documentation**
   - This security policy
   - Setup guide (`supabase-mcp-setup.md`)
   - Best practices (`supabase-mcp-patterns.md`)

2. **Complete Training Module**
   - Attend MCP security training session
   - Demonstrate understanding of policies
   - Sign acknowledgment of policy (in `docs/supabase-mcp-training-log.md`)

3. **Supervised First Use**
   - Configure MCP with team lead present
   - Run test queries under supervision
   - Review first migration together

### Ongoing Training

- **Annual Refresher**: Review security policies annually
- **Policy Updates**: Read and acknowledge when policies change
- **Incident Learning**: Participate in post-incident reviews
- **Best Practice Sharing**: Attend quarterly MCP best practices sessions

## Consequences of Violations

### First Violation (Low/Medium Severity)
- **Action**: Written warning
- **Training**: Mandatory security refresher
- **Monitoring**: Supervised MCP usage for 30 days

### Second Violation or High Severity
- **Action**: MCP access revoked for 90 days
- **Review**: Manager and DBA review required for reinstatement
- **Training**: Complete full MCP training again

### Critical Violation
- **Action**: Immediate permanent MCP access revocation
- **Escalation**: Report to security team and management
- **Investigation**: Full security audit of developer's recent activities
- **Disciplinary Action**: Per company HR policies

## Policy Updates

This policy may be updated as needed to address:
- New security threats or vulnerabilities
- Changes in Supabase MCP features
- Lessons learned from incidents
- Regulatory or compliance changes

**Notification**: All MCP users will be notified of policy changes and must acknowledge updates.

## Acknowledgment

By using Supabase MCP, you acknowledge that you have:
- ✅ Read and understood this security policy
- ✅ Completed MCP security training
- ✅ Agree to follow all security requirements
- ✅ Understand consequences of violations

**Sign Here**: Record your acknowledgment in `docs/supabase-mcp-training-log.md`

---

**Questions or Clarifications?**

Contact:
- **Team Lead**: [Name] - [Email]
- **Database Administrator**: [Name] - [Email]
- **Security Team**: [Email]

**Policy Effective Date**: 2026-01-31
**Next Review Date**: 2026-05-01 (Quarterly)
