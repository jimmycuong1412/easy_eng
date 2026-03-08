# Phase 18: MCP Integration Testing & Validation Checklist

**Phase**: Phase 18 - Supabase MCP Integration
**Tasks**: T279-T285
**Purpose**: Step-by-step manual validation checklist for QA/Development team
**Status**: Ready for human testing

---

## Overview

This checklist provides detailed instructions for completing the final 7 manual validation tasks for Phase 18. These tasks verify that the Supabase MCP server integration is properly configured and functional.

**Prerequisites**:
- MCP server configuration completed (T264-T278) ✅
- OAuth 2.1 authentication with Supabase available
- Claude Code, Cursor, or Windsurf IDE with MCP support
- Access to development Supabase project

**Time Required**: ~30-45 minutes

---

## Safety & Security First

### CRITICAL: Pre-Testing Security Validation

**Before starting any tests**, complete this security check:

#### T285: Validate Production Database NOT Configured ⚠️

**Priority**: CRITICAL - Complete FIRST

**Steps**:
1. Open your MCP configuration file:
   - Claude Code: `.claude/mcp-servers.json`
   - Cursor: `.cursor/mcp-config.json`
   - Windsurf: `.windsurf/mcp.json`

2. Locate `SUPABASE_PROJECT_REF` value

3. Verify against Supabase dashboard:
   ```bash
   # Login to Supabase dashboard
   # Navigate to Settings > General
   # Compare Reference ID
   ```

4. **Confirm**:
   - ✅ Project name includes "dev" or "development"
   - ✅ Project ref matches development project
   - ❌ NOT production project reference

**Expected Result**: Configuration points to development database only

**Validation**:
```json
{
  "SUPABASE_PROJECT_REF": "xyzdevproject123",  // ✅ Development
  // NOT "xyzprodproject456"  // ❌ Production - DANGER!
}
```

**If production DB is configured**:
- ⚠️ STOP IMMEDIATELY
- Remove production configuration
- Document incident
- Notify security team

**Status**: [ ] Verified - Safe to proceed

---

## Testing Environment Setup

### Step 1: Authenticate MCP Server

**Location**: Your IDE (Claude Code/Cursor/Windsurf)

**Instructions**:
1. Restart your IDE to load MCP configuration
2. Wait for OAuth authentication prompt
3. Click "Authenticate with Supabase"
4. Sign in with your Supabase account
5. Grant permissions to development project
6. Verify "Connected" status in IDE

**Troubleshooting**: See `docs/supabase-mcp-auth.md`

**Status**: [ ] Authentication successful

---

### Step 2: Verify MCP Server Status

**In your IDE**, check MCP server status:

**Expected**:
- Server: Running
- Status: Connected
- Project: [Your Dev Project Name]
- Tools Available: 5+ tools

**Status**: [ ] MCP server running

---

## Manual Testing Tasks (T279-T284)

Complete each test in order. Document results in the validation report template.

### T279: Test MCP Connection with Natural Language Query

**Goal**: Verify basic MCP connectivity and query functionality

**Test Procedure**:
1. Open chat with your AI assistant (Claude/Cursor/etc.)
2. Send this exact query:
   ```
   Show me all tables in the database
   ```
3. Wait for MCP to query database
4. Review response

**Expected Response**:
```
The database contains the following tables:

Core Tables:
- users
- profiles
- classes
- bookings
- gem_transactions
- payments

Analytics:
- user_analytics
- booking_analytics
- gem_analytics

Additional tables:
[... more tables ...]

Total: ~30-40 tables
```

**Pass Criteria**:
- ✅ Query executed successfully
- ✅ All major tables listed
- ✅ No authentication errors
- ✅ Response time < 5 seconds

**Actual Result**:

**Status**: [ ] Pass  [ ] Fail

**Notes**:

---

### T280: Test Schema Exploration with describe_table Tool

**Goal**: Verify describe_table MCP tool provides detailed schema information

**Test Procedure**:
1. Send query:
   ```
   Describe the structure of the bookings table
   ```
2. Verify response includes:
   - All column names
   - Data types
   - Constraints (NOT NULL, UNIQUE)
   - Primary/Foreign keys
   - Indexes
   - Default values

**Expected Response Elements**:
```
bookings table structure:

Columns:
- id: UUID (PRIMARY KEY, DEFAULT gen_random_uuid())
- user_id: UUID (NOT NULL, FOREIGN KEY → users.id)
- class_id: UUID (NOT NULL, FOREIGN KEY → classes.id)
- status: booking_status ENUM (DEFAULT 'pending')
- gems_used: INTEGER (DEFAULT 0)
- gems_discount_amount: NUMERIC(10,2)
- final_price: NUMERIC(10,2) (NOT NULL)
- created_at: TIMESTAMPTZ (DEFAULT NOW())
- updated_at: TIMESTAMPTZ

Constraints:
- CHECK (gems_used >= 0)
- CHECK (final_price >= 5.00)

Indexes:
- idx_bookings_user_id
- idx_bookings_class_id
- idx_bookings_status
```

**Pass Criteria**:
- ✅ All columns listed
- ✅ Data types correct
- ✅ Constraints shown
- ✅ Foreign keys identified
- ✅ Indexes displayed

**Actual Result**:

**Status**: [ ] Pass  [ ] Fail

**Notes**:

---

### T281: Test TypeScript Type Generation

**Goal**: Verify MCP can generate accurate TypeScript types from schema

**Test Procedure**:
1. Send query:
   ```
   Generate TypeScript interfaces for the bookings and gem_transactions tables
   ```
2. Verify generated code:
   - Valid TypeScript syntax
   - Correct type mappings
   - Enum types for ENUMs
   - Optional fields marked with `?`

**Expected Output**:
```typescript
export interface Booking {
  id: string;
  user_id: string;
  class_id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  gems_used: number;
  gems_discount_amount: number;
  final_price: number;
  created_at: Date;
  updated_at?: Date;
}

export interface GemTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earn' | 'spend' | 'expire' | 'admin_adjustment';
  source: string;
  created_at: Date;
}
```

**Pass Criteria**:
- ✅ Valid TypeScript syntax
- ✅ UUID → string mapping
- ✅ NUMERIC → number mapping
- ✅ TIMESTAMPTZ → Date mapping
- ✅ ENUMs → union types
- ✅ Optional fields marked correctly

**Actual Result**:

**Status**: [ ] Pass  [ ] Fail

**Notes**:

---

### T282: Test Migration Generation from Natural Language

**Goal**: Verify MCP can generate SQL migrations from natural language descriptions

**Test Procedure**:
1. Send query:
   ```
   Generate a migration to add a 'last_login_at' timestamp column to the users table
   ```
2. Verify generated migration:
   - Valid SQL syntax
   - Appropriate data type
   - Includes timestamp tracking
   - Requires manual approval before execution

**Expected Output**:
```sql
-- Migration: add_last_login_to_users.sql

ALTER TABLE users
  ADD COLUMN last_login_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN users.last_login_at IS 'Timestamp of user last login';

-- Index for querying active users
CREATE INDEX idx_users_last_login_at ON users(last_login_at DESC);
```

**Manual Approval Prompt Expected**:
```
🔐 Manual Approval Required

Operation: generate_migration
File: supabase/migrations/0XX_add_last_login_to_users.sql

This will create a new migration file.
Review the SQL before applying.

Approve? [y/N]
```

**Pass Criteria**:
- ✅ Valid SQL syntax
- ✅ Correct data type (TIMESTAMPTZ)
- ✅ Appropriate defaults
- ✅ Manual approval required
- ✅ Migration not auto-executed
- ✅ File naming convention correct

**Actual Result**:

**Status**: [ ] Pass  [ ] Fail

**Notes**:

---

### T283: Verify Manual Approval Prompts for Write Operations

**Goal**: Ensure all write operations require explicit human approval

**Test Procedure**:

#### Test 3A: DELETE Operation
1. Send query:
   ```
   Delete all test users from the database where email contains 'test'
   ```
2. Verify approval prompt appears
3. Select "No" / "Decline"
4. Verify query NOT executed

**Expected Prompt**:
```
🔐 Manual Approval Required

Operation: execute_sql
Action: DELETE

Query:
  DELETE FROM users
  WHERE email LIKE '%test%';

⚠️ WARNING: This will permanently delete data.

Estimated affected rows: X

Approve? [y/N]
```

#### Test 3B: UPDATE Operation
1. Send query:
   ```
   Update the gem balance for user ID [some-uuid] to 100
   ```
2. Verify approval prompt
3. Decline
4. Verify no changes made

#### Test 3C: ALTER TABLE Operation
1. Send query:
   ```
   Add a new column 'test_column' to bookings table
   ```
2. Verify approval prompt
3. Decline
4. Verify schema unchanged

**Pass Criteria**:
- ✅ All write operations require approval
- ✅ Approval prompt is clear and descriptive
- ✅ Shows affected data/tables
- ✅ Declining prevents execution
- ✅ No data modified without approval

**Actual Results**:
- Test 3A (DELETE):
- Test 3B (UPDATE):
- Test 3C (ALTER):

**Status**: [ ] Pass  [ ] Fail

**Notes**:

---

### T284: Test Read-Only Mode Configuration (Optional)

**Goal**: Verify read-only mode blocks all write operations

**Note**: This test is OPTIONAL. Only complete if you plan to use read-only mode.

**Test Procedure**:
1. Edit MCP configuration file
2. Add read-only environment variable:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": ["-y", "@supabase/mcp-server"],
         "env": {
           "SUPABASE_PROJECT_REF": "your-dev-ref",
           "SUPABASE_ACCESS_TOKEN": "your-token",
           "SUPABASE_READ_ONLY": "true"
         }
       }
     }
   }
   ```
3. Restart IDE to reload configuration
4. Attempt write operation:
   ```
   Add a test column to the users table
   ```

**Expected Response**:
```
❌ Operation Blocked: Read-Only Mode Enabled

Cannot execute: ALTER TABLE

Write operations are disabled in read-only mode.
Allowed operations: SELECT, DESCRIBE

To enable writes, remove SUPABASE_READ_ONLY from configuration.
```

**Pass Criteria**:
- ✅ Write operations completely blocked
- ✅ Clear error message
- ✅ Read operations still work
- ✅ Can re-enable write mode by removing flag

**Actual Result**:

**Status**: [ ] Pass  [ ] Fail  [ ] Skipped (not using read-only)

**Notes**:

---

## Post-Testing Validation

### Configuration Review

After completing all tests, verify:

- [ ] All 7 tests completed (or 6 if T284 skipped)
- [ ] Production database NOT in configuration
- [ ] Development database accessible
- [ ] Manual approval working correctly
- [ ] All generated SQL reviewed and valid
- [ ] No unauthorized database changes made

### Documentation Update

- [ ] Fill out validation report (see `docs/phase-18-mcp-validation-report.md`)
- [ ] Update testing status in tasks.md
- [ ] Document any issues in troubleshooting guide
- [ ] Share results with team

---

## Issue Tracking

If any test fails, document in this format:

**Test**: T2XX - [Test Name]
**Status**: FAIL
**Issue**: [Description]
**Error Message**: [If applicable]
**Resolution**: [How to fix]
**Retest Status**: [ ] Pass  [ ] Fail

---

## Success Criteria

Phase 18 testing is complete when:

- ✅ T279: Basic connectivity verified
- ✅ T280: Schema exploration working
- ✅ T281: Type generation accurate
- ✅ T282: Migration generation functional
- ✅ T283: Manual approval enforced
- ✅ T284: Read-only mode tested (if using)
- ✅ T285: Production DB NOT configured (CRITICAL)

---

## Next Steps After Testing

Once all tests pass:

1. Mark tasks T279-T285 as complete in `specs/001-english-learning-platform/tasks.md`
2. Complete validation report template
3. Share with team in standup/Slack
4. Update `docs/supabase-mcp-testing-guide.md` with test date and results
5. Proceed with using MCP for database work

---

## Support & Resources

**Documentation**:
- Setup Guide: `docs/supabase-mcp-setup.md`
- Authentication: `docs/supabase-mcp-auth.md`
- Examples: `docs/supabase-mcp-examples.md`
- Troubleshooting: `docs/supabase-mcp-troubleshooting.md`
- Quick Reference: `docs/supabase-mcp-quick-ref.md`

**Getting Help**:
- Supabase MCP GitHub: https://github.com/supabase/mcp-server
- Team Slack: #mcp-support
- Documentation: `/docs/supabase-mcp-*.md`

---

**Document Version**: 1.0
**Created**: 2026-02-06
**Purpose**: Final Phase 18 validation checklist
**Status**: Ready for QA team
**Estimated Time**: 30-45 minutes
