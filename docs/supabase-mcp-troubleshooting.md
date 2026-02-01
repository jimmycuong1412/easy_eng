# Supabase MCP Troubleshooting Guide

**Last Updated**: 2026-01-31

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

- [ ] Is your AI tool (Claude Code/Cursor/Windsurf) up to date?
- [ ] Is the MCP server configuration file in the correct location?
- [ ] Does the configuration file have the correct project reference ID?
- [ ] Are you connected to the internet?
- [ ] Is the Supabase project active (not paused)?
- [ ] Do you have admin access to the Supabase organization?
- [ ] Has your OAuth token expired (re-authenticate)?

---

## Connection Issues

### Issue: "Failed to connect to MCP server"

**Symptoms**:
- AI tool shows "MCP server unavailable"
- No response when trying to query database
- Connection timeout errors

**Possible Causes & Solutions**:

**1. Incorrect Project Reference ID**
```
Check: Does your project ref match the format abcdefghij123456 (16 alphanumeric)?
Fix: Verify in Supabase Dashboard → Settings → General → Reference ID
Update: Edit .claude/mcp-servers.json (or equivalent) with correct ref
```

**2. Internet Connectivity**
```
Check: Can you access https://supabase.com in your browser?
Fix: Check your network connection, VPN, or firewall settings
Test: Try pinging supabase.com or checking other websites
```

**3. Supabase Project Paused**
```
Check: Log in to Supabase Dashboard and check project status
Fix: Unpause the project in project settings
Note: Free tier projects auto-pause after inactivity
```

**4. MCP Server Status**
```
Check: Visit https://status.supabase.com
Look For: Any incidents affecting MCP services
Wait: If there's an outage, wait for Supabase to resolve
```

**5. Configuration File Not Found**
```
Check: Verify file exists at correct path:
  - Claude Code: ~/.claude/mcp-servers.json (macOS/Linux) or %USERPROFILE%\.claude\mcp-servers.json (Windows)
  - Cursor: .cursor/mcp-config.json
  - Windsurf: .windsurf/mcp.json
Fix: Copy from .example.json template and add your project ref
```

**6. AI Tool Not Restarted**
```
Fix: Completely quit and restart your AI tool after configuration changes
Important: Use "Quit" not just close window
```

---

## Authentication Issues

### Issue: "Authentication failed"

**Symptoms**:
- OAuth flow starts but fails to complete
- "Invalid credentials" or "Access denied" errors
- Redirected to login but authentication doesn't persist

**Possible Causes & Solutions**:

**1. Insufficient Permissions**
```
Check: Your role in the Supabase organization
Required: Admin or Owner role
Fix: Ask your Supabase organization admin to grant you admin access
Verify: Dashboard → Organization Settings → Members
```

**2. Expired OAuth Token**
```
Symptom: Was working before, now suddenly fails
Fix: Clear OAuth tokens and re-authenticate
Steps:
  1. Quit AI tool completely
  2. Remove MCP configuration temporarily
  3. Restart AI tool
  4. Re-add MCP configuration
  5. Complete OAuth flow again
```

**3. Browser Cookie/Cache Issues**
```
Fix: Clear browser cache and cookies for supabase.com
Or: Use incognito/private browsing mode for OAuth
Then: Try authentication again
```

**4. Multiple Supabase Accounts**
```
Problem: Logged into wrong Supabase account
Fix: Log out of Supabase in browser completely
Then: Log in with the account that has access to the project
Finally: Retry OAuth authentication
```

**5. Organization MCP Not Enabled**
```
Check: MCP access may need to be enabled for your organization
Contact: Your Supabase organization administrator
Ask: "Is MCP access enabled for our organization?"
```

---

## Query Issues

### Issue: AI can't find tables or returns empty results

**Symptoms**:
- "No tables found" when asking to list tables
- Queries return 0 rows when data should exist
- "Table does not exist" errors

**Possible Causes & Solutions**:

**1. Wrong Database/Project**
```
Check: Verify you're connected to the correct project
Compare: Project ref in config vs. intended project
Fix: Update configuration with correct project reference
```

**2. Migrations Not Applied**
```
Check: Have database migrations been run?
Verify: In Supabase Dashboard → Database → Migrations
Fix: Apply migrations using: supabase db push
```

**3. Schema Name Confusion**
```
Problem: Tables might be in non-public schema
Fix: Ask AI: "List all schemas in the database"
Then: Query specific schema: "Show tables in auth schema"
```

**4. RLS Policies Blocking Access**
```
Problem: Row Level Security prevents service role from seeing data
Check: Review RLS policies in Supabase Dashboard
Note: MCP uses service role, which should bypass RLS
Rare: If custom policies block service role, adjust them
```

---

## Query Performance Issues

### Issue: Queries are very slow or timeout

**Symptoms**:
- Queries take >30 seconds
- "Query timeout" errors
- AI tool becomes unresponsive

**Possible Causes & Solutions**:

**1. Missing LIMIT Clause**
```
Problem: Querying entire large table
Fix: Add LIMIT to your query
Example: "Show me the 100 most recent bookings" (not "Show me all bookings")
```

**2. Missing Indexes**
```
Diagnose: Ask "Explain query plan for: [your query]"
Look For: "Seq Scan" (sequential scan = slow)
Fix: Ask "Suggest indexes for this query"
Create: Review and create recommended indexes
```

**3. Complex Joins Without Filters**
```
Problem: Joining large tables without WHERE clauses
Fix: Add filters to reduce dataset size
Example: Add date ranges, status filters, or ID constraints
```

**4. N+1 Query Pattern**
```
Problem: Running many small queries instead of one join
Fix: Ask AI to combine into a single query with JOINs
```

---

## Migration Issues

### Issue: Generated migration looks wrong

**Symptoms**:
- SQL syntax errors in generated migration
- Migration does unexpected things
- Missing rollback (DOWN) migration

**Solutions**:

**1. Review Before Approving**
```
ALWAYS: Read the generated SQL carefully
Check: Column names, types, constraints
Verify: Default values make sense
Confirm: Rollback SQL reverses the change
```

**2. Be More Specific in Description**
```
Vague: "Add user field"
Better: "Add email_verified boolean column to profiles table with default false and not null constraint"
```

**3. Break Complex Changes Into Steps**
```
Instead of: "Completely redesign bookings table"
Do:
  1. "Add new column status to bookings"
  2. "Migrate data from old_status to status"
  3. "Drop old_status column"
```

**4. Test on Database Branch First**
```
Ask: "Create a database branch called 'test-migration'"
Apply: Migration to branch
Verify: Changes are correct
Then: Apply to main development database
```

**5. Provide Context About Existing Data**
```
Mention: "Table has 10,000 rows" or "Column currently allows nulls"
Helps: AI generate appropriate migration (e.g., using batched updates)
```

---

## Type Generation Issues

### Issue: Generated TypeScript types are incorrect

**Symptoms**:
- Types don't match database schema
- Missing columns or relationships
- Wrong TypeScript types for PostgreSQL types

**Solutions**:

**1. Ensure Schema is Up to Date**
```
Check: Have recent migrations been applied?
Fix: Apply migrations first, then regenerate types
```

**2. Specify Which Tables**
```
Instead of: "Generate types for all tables"
Try: "Generate types for profiles, bookings, and classes tables"
More focused = more accurate
```

**3. Verify Output Format**
```
For TypeScript: "Generate TypeScript types for profiles"
For Zod: "Generate Zod schema for profiles"
Don't Mix: Keep format consistent
```

**4. Review Custom PostgreSQL Types**
```
Problem: Enums or custom types may not translate perfectly
Fix: Manually adjust generated types
Example: PostgreSQL enum → TypeScript union type
```

**5. Check for Nullable Columns**
```
Verify: Optional (?) vs required fields
Match: Database NULL/NOT NULL constraints
Fix: Manually adjust if AI gets it wrong
```

---

## Configuration Issues

### Issue: Manual approval not triggering for write operations

**Symptoms**:
- Raw SQL executes without prompting for approval
- Migrations generated and applied without review
- No confirmation dialog appears

**Solutions**:

**1. Verify Configuration**
```json
{
  "mcpSettings": {
    "requireManualApproval": true,
    "approvalRequired": [
      "execute_sql",
      "generate_migration",
      "create_database_branch"
    ]
  }
}
```

**2. Check AI Tool Settings**
```
Claude Code: Settings → MCP → Manual Approval → Enabled
Cursor: MCP Servers → [server] → Require Manual Approval → ✓
Windsurf: Tools → MCP → Security → Manual Approval → On
```

**3. Restart After Config Changes**
```
Important: Configuration changes require full AI tool restart
Not Enough: Just reloading window
Do: Quit application and relaunch
```

---

## Read-Only Mode Issues

### Issue: Can't make schema changes in read-only mode

**Expected Behavior**: This is intentional!

**If You Need Write Access**:
```json
Change:
"url": "https://mcp.supabase.com/mcp?project_ref=YOUR_REF&mode=readonly"

To:
"url": "https://mcp.supabase.com/mcp?project_ref=YOUR_REF"

Remember: Enable manual approval for write operations!
```

---

## Project Reference ID Issues

### Issue: "Invalid project reference"

**Symptoms**:
- "Project not found" errors
- "Invalid project ref format" warnings

**Solutions**:

**1. Verify Format**
```
Correct Format: 16 alphanumeric characters
Example: abcdefghij123456
Wrong: URLs like https://abcdefghij123456.supabase.co (remove URL part)
```

**2. Copy from Correct Location**
```
Source: Supabase Dashboard → Settings → General → Reference ID
Not: Project URL, API URL, or anon key
Field Name: "Reference ID" or "Project Ref"
```

**3. Check for Typos**
```
Common Mistakes:
  - Swapped similar characters (O vs 0, l vs 1)
  - Missing characters (15 chars instead of 16)
  - Extra spaces or line breaks
Fix: Copy-paste directly, don't type manually
```

---

## Organization Access Issues

### Issue: "You don't have access to this organization"

**Symptoms**:
- Can't complete OAuth flow
- "Access denied" after logging in
- Project not listed in OAuth consent screen

**Solutions**:

**1. Check Organization Membership**
```
Verify: Supabase Dashboard → [Select Organization] → Settings → Members
Your Email: Should be listed
Role: Should be Admin or Owner (not just Member)
```

**2. Request Access**
```
Contact: Your team's Supabase organization administrator
Ask For: Admin role in the organization
Provide: Your email address used for Supabase
```

**3. Verify Logged Into Correct Account**
```
Check: Email address shown in OAuth flow
If Wrong: Log out of Supabase completely, log in with correct account
Then: Retry OAuth authentication
```

---

## Performance Degradation

### Issue: MCP was fast, now it's slow

**Possible Causes**:

**1. Database Growth**
```
Problem: Tables grew significantly
Impact: Queries without LIMIT take longer
Fix: Always use LIMIT for large tables
Optimize: Add indexes for frequent query patterns
```

**2. Network Issues**
```
Check: Your internet speed
Test: Other Supabase operations (dashboard, API)
If Slow: Check network connection, switch networks if possible
```

**3. Supabase Project Region**
```
Latency: Higher if project is in distant region
Check: Project Settings → General → Region
Consider: Creating new project in closer region for development
```

---

## Reporting Bugs

If you've tried all troubleshooting steps and the issue persists:

**Gather Information**:
1. AI tool name and version
2. Operating system
3. MCP configuration (remove sensitive project refs)
4. Exact error message
5. Steps to reproduce
6. What you expected vs what happened

**Report To**:
- **Team Issues**: Your team lead or DBA
- **Supabase MCP Issues**: https://github.com/supabase-community/supabase-mcp/issues
- **AI Tool Issues**: Respective tool's support channel

**Include**:
- Logs (if available)
- Screenshots of errors
- Configuration files (sanitized)

---

## Emergency Procedures

### If You Accidentally Queried/Modified Production

1. **STOP immediately** - Don't make any more queries
2. **Disconnect MCP** - Remove configuration, quit AI tool
3. **Notify team lead and DBA** - Escalate immediately
4. **Document what happened** - What query was run, what data was affected
5. **Follow incident response plan** - See `supabase-mcp-incidents.md`

### If You Lost Data

1. **Don't panic** - Supabase has automatic backups
2. **Stop all operations** - Don't make it worse
3. **Contact DBA immediately** - They can restore from backup
4. **Document the incident** - When, what, how
5. **Learn and improve** - Update procedures to prevent recurrence

---

## Preventive Measures

To avoid common issues:

✅ **Always**:
- Review SQL before executing
- Test migrations on database branches
- Use LIMIT for exploratory queries
- Keep manual approval enabled
- Double-check project references

✅ **Never**:
- Configure production databases
- Disable safety features
- Share your OAuth tokens
- Execute SQL without reading it
- Skip code review for migrations

---

## Getting Help

**Resources**:
1. This troubleshooting guide
2. `docs/supabase-mcp-setup.md` - Setup guide
3. `docs/supabase-mcp-security.md` - Security policies
4. `docs/supabase-mcp-examples.md` - Usage examples
5. Supabase MCP documentation: https://supabase.com/docs/guides/getting-started/mcp

**Support Channels**:
- **Team**: Your team lead or DBA
- **Supabase**: https://supabase.com/support
- **Community**: Supabase Discord

---

**Still Stuck?**

Contact your team's Supabase administrator or create a support ticket with:
- This troubleshooting guide reference
- Steps you've already tried
- Detailed error description
- Your environment details

**Last Updated**: 2026-01-31
