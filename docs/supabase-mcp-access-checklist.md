# Supabase MCP Access Checklist

**Purpose**: Ensure proper onboarding and access control for Supabase MCP integration

**Last Updated**: 2026-01-31

---

## New Team Member Onboarding

Use this checklist when granting MCP access to a new team member.

### Pre-Approval

- [ ] **Verify Role Eligibility**
  - [ ] Developer is Senior Developer, DBA, DevOps Engineer, or Tech Lead
  - [ ] If Junior Developer: Explicit approval from team lead obtained
  - [ ] If Contractor: NDA signed and supervision plan in place

- [ ] **Confirm Need**
  - [ ] Developer's role requires database access
  - [ ] Specific use case documented
  - [ ] Alternative tools (Supabase CLI) considered and insufficient

- [ ] **Security Training Completed**
  - [ ] Developer has read `docs/supabase-mcp-security.md`
  - [ ] Developer understands development-only policy
  - [ ] Developer acknowledges consequences of violations

### Access Grant

- [ ] **Supabase Organization Access**
  - [ ] Added to Supabase organization with Admin role
  - [ ] Can access development project in dashboard
  - [ ] Confirmed OAuth authentication works

- [ ] **Configuration Setup**
  - [ ] Developer has chosen AI tool (Claude Code/Cursor/Windsurf)
  - [ ] Configuration template provided
  - [ ] Development project reference ID shared
  - [ ] Manual approval enabled in configuration

- [ ] **Initial Setup Supervised**
  - [ ] Team lead or DBA present during first-time setup
  - [ ] MCP server connection verified
  - [ ] OAuth authentication completed successfully
  - [ ] Test query executed and reviewed

### Documentation

- [ ] **Access Recorded**
  - [ ] Added to team access table in `docs/SUPABASE_PROJECT_INFO.md`
  - [ ] Date of access grant recorded
  - [ ] Approver name documented
  - [ ] Next review date set (3 months from grant)

- [ ] **Training Logged**
  - [ ] Training completion recorded in `docs/supabase-mcp-training-log.md`
  - [ ] Developer signed acknowledgment
  - [ ] Copy of security policy acknowledgment saved

### Validation

- [ ] **Test Queries**
  - [ ] Successfully listed all tables
  - [ ] Described table schema
  - [ ] Executed natural language query
  - [ ] Manual approval prompt appeared for write operation

- [ ] **Security Checks**
  - [ ] Production project ref is NOT in configuration
  - [ ] Manual approval is enabled
  - [ ] Read-only mode tested (optional)
  - [ ] Configuration file is gitignored (not committed)

---

## Quarterly Access Review

Run this checklist every 3 months to review and maintain MCP access.

### Access Audit

- [ ] **Review Team Members**
  - [ ] List all current MCP users from `docs/SUPABASE_PROJECT_INFO.md`
  - [ ] Verify each person still on the team
  - [ ] Confirm each person's role still requires MCP access
  - [ ] Check last usage date (if tracking enabled)

- [ ] **Revoke Unnecessary Access**
  - [ ] Team members who left removed from Supabase organization
  - [ ] Role changes requiring revocation processed
  - [ ] Inactive users (no usage in 90 days) reviewed

### Configuration Review

- [ ] **Verify Configurations**
  - [ ] No production project references in any configs
  - [ ] Manual approval enabled for all users
  - [ ] Configuration templates up to date
  - [ ] Gitignore patterns working correctly

- [ ] **Update Documentation**
  - [ ] Security policy reviewed and updated if needed
  - [ ] Setup guide reflects current process
  - [ ] Troubleshooting guide includes new issues encountered

### Incident Review

- [ ] **Analyze Past Quarter**
  - [ ] Review any MCP-related incidents
  - [ ] Identify patterns or recurring issues
  - [ ] Update policies to prevent recurrence
  - [ ] Share lessons learned with team

- [ ] **Security Compliance**
  - [ ] Zero production database connections
  - [ ] All migrations code-reviewed
  - [ ] No unauthorized schema changes
  - [ ] Audit logs reviewed

### Training Refresh

- [ ] **Annual Training**
  - [ ] Users approaching 1-year anniversary reminded
  - [ ] Policy changes communicated to all users
  - [ ] New best practices shared
  - [ ] Q&A session scheduled if needed

---

## Access Revocation Checklist

Use this when removing MCP access from a team member.

### Immediate Actions

- [ ] **Revoke Supabase Access**
  - [ ] Removed from Supabase organization
  - [ ] OAuth tokens invalidated (automatic on removal)
  - [ ] Cannot access development project

- [ ] **Notify User**
  - [ ] Reason for revocation communicated
  - [ ] Documentation provided if voluntary (role change)
  - [ ] Escalation process explained if violation-related

### Documentation

- [ ] **Update Records**
  - [ ] Access table in `docs/SUPABASE_PROJECT_INFO.md` updated
  - [ ] Revocation date and reason recorded
  - [ ] Approver documented

- [ ] **Audit Trail**
  - [ ] Recent MCP activity reviewed
  - [ ] Any pending migrations reviewed
  - [ ] Handoff to another developer if needed

### Security Review (If Violation)

- [ ] **Incident Investigation**
  - [ ] Determine scope of violation
  - [ ] Review database audit logs
  - [ ] Identify any data changes made
  - [ ] Document findings

- [ ] **Remediation**
  - [ ] Rollback unauthorized changes if needed
  - [ ] Update security policies
  - [ ] Inform team of lessons learned (anonymized)

---

## Emergency Access Checklist

Use this for urgent access needs (rare).

### Justification

- [ ] **Document Emergency**
  - [ ] Specific urgent need described
  - [ ] Normal access process timing explained
  - [ ] Business impact of delay documented

- [ ] **Approval**
  - [ ] Team lead approval obtained
  - [ ] DBA notified
  - [ ] Time-limited access agreed (e.g., 48 hours)

### Expedited Setup

- [ ] **Quick Configuration**
  - [ ] Configuration template provided
  - [ ] Project ref shared securely
  - [ ] OAuth setup completed

- [ ] **Immediate Supervision**
  - [ ] Senior developer or DBA available for questions
  - [ ] First queries reviewed in real-time
  - [ ] Usage monitored closely

### Follow-Up

- [ ] **Regular Process Completion**
  - [ ] Full onboarding completed within 7 days
  - [ ] Security training scheduled
  - [ ] Documentation updated
  - [ ] Access review date set

---

## Team Access Table Template

Maintain this table in `docs/SUPABASE_PROJECT_INFO.md`:

| Team Member | Email | Role | Access Granted | Granted By | Next Review | Status |
|-------------|-------|------|----------------|------------|-------------|--------|
| John Doe | john@example.com | Senior Dev | 2026-01-15 | Jane Smith | 2026-04-15 | ✅ Active |
| Jane Smith | jane@example.com | DBA | 2026-01-10 | Admin | 2026-04-10 | ✅ Active |
| Mike Jones | mike@example.com | Junior Dev | 2026-01-20 | Jane Smith | 2026-04-20 | ⚠️ Supervised |

**Status Codes**:
- ✅ Active: Full access with manual approval
- ⚠️ Supervised: Access with senior developer oversight
- ⏸️ Suspended: Temporary access removal
- ❌ Revoked: Permanently removed

---

## Best Practices

### For Access Grantors

✅ **Do**:
- Verify identity and role before granting access
- Document all access grants thoroughly
- Provide supervised first-time setup
- Schedule regular access reviews
- Revoke access promptly when no longer needed

❌ **Don't**:
- Grant access without proper approval
- Skip security training
- Forget to set review dates
- Leave inactive accounts with access

### For MCP Users

✅ **Do**:
- Complete security training before using MCP
- Use only development databases
- Keep manual approval enabled
- Report any issues immediately
- Acknowledge policy updates

❌ **Don't**:
- Share your OAuth credentials
- Disable security features
- Skip code review for migrations
- Use MCP with production databases
- Share your configuration files

---

## Compliance Tracking

### Metrics to Monitor

- **Total Active Users**: [Number]
- **Average Access Duration**: [Days]
- **Quarterly Revocations**: [Number]
- **Security Incidents**: [Number]
- **Training Completion Rate**: [Percentage]

### Quarterly Report Template

```
Quarter: Q[1-4] YYYY
Total MCP Users: [N]
New Grants: [N]
Revocations: [N]
Incidents: [N]
Training Completion: [N/N] ([%])
Security Compliance: ✅/⚠️/❌
Notes: [Any significant events or changes]
```

---

## Appendix: Access Request Template

Use this template when requesting MCP access:

```
To: [Team Lead / DBA]
Subject: MCP Access Request

Name: [Your Name]
Role: [Your Role]
Start Date: [Date you joined team]

Reason for Access:
[Explain why you need MCP access specifically]

Use Cases:
- [Specific task 1]
- [Specific task 2]

Alternative Tools Considered:
- [Tool 1]: [Why insufficient]
- [Tool 2]: [Why insufficient]

Training Completion:
- [ ] Read security policy (docs/supabase-mcp-security.md)
- [ ] Understand development-only restriction
- [ ] Acknowledge consequences of violations

AI Tool Preference: [Claude Code / Cursor / Windsurf]

Signature: __________________
Date: __________________
```

---

**Questions?**

Contact:
- **Access Requests**: [Team Lead Email]
- **Access Reviews**: [DBA Email]
- **Security Issues**: [Security Team Email]

**Last Updated**: 2026-01-31
