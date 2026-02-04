# Supabase MCP Testing Guide

**Tasks**: T279-T285
**Purpose**: Manual validation checklist for MCP functionality
**When**: After MCP authentication is configured

---

## Overview

Tasks T279-T285 are **manual validation tasks** that should be completed by the first developer to configure MCP authentication. These tasks verify that MCP is working correctly.

---

## Testing Checklist

### T279: Test MCP Connection with Natural Language Query

**Goal**: Verify basic MCP connectivity

**Steps**:
1. Authenticate with MCP server (see `docs/supabase-mcp-auth.md`)
2. Send query: "Show all tables"
3. Verify response lists all database tables

**Expected Result**:
```
Tables in database:
- users
- profiles
- classes
- bookings
- gem_transactions
... (more tables)
```

**Status**: ⏳ Pending (requires authentication)

---

### T280: Test Schema Exploration with describe_table Tool

**Goal**: Verify describe_table MCP tool works

**Steps**:
1. Send query: "Describe the users table"
2. Verify response includes:
   - Column names
   - Data types
   - Constraints
   - Foreign keys

**Expected Result**:
```
users table structure:

Columns:
- id: UUID (PRIMARY KEY)
- email: VARCHAR(255) (UNIQUE, NOT NULL)
- full_name: VARCHAR(255)
- role: user_role ENUM
- created_at: TIMESTAMPTZ

Foreign Keys: None
Indexes:
- users_pkey (PRIMARY)
- users_email_key (UNIQUE)
```

**Status**: ⏳ Pending (requires authentication)

---

### T281: Test TypeScript Type Generation

**Goal**: Verify type generation works

**Steps**:
1. Send query: "Generate TypeScript types for the bookings table"
2. Verify generated types include:
   - All columns with correct TypeScript types
   - UUID → string
   - NUMERIC → number
   - TIMESTAMPTZ → Date
   - Enums → union types

**Expected Result**:
```typescript
export interface Booking {
  id: string;
  user_id: string;
  class_id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: Date;
  // ... more fields
}
```

**Status**: ⏳ Pending (requires authentication)

---

### T282: Test Migration Generation

**Goal**: Verify migration generation works

**Steps**:
1. Send query: "Generate a migration to add a 'phone' column to users table"
2. Verify generated migration:
   - Valid SQL syntax
   - Includes ALTER TABLE statement
   - Has appropriate data type
   - Requires manual approval

**Expected Result**:
```sql
-- Migration: 0XX_add_phone_to_users.sql
ALTER TABLE users
  ADD COLUMN phone VARCHAR(20);

🔐 Approval Required
Apply migration? [y/N]
```

**Status**: ⏳ Pending (requires authentication)

---

### T283: Verify Manual Approval for Write Operations

**Goal**: Ensure write operations require explicit approval

**Steps**:
1. Send query: "Delete test users from database"
2. Verify MCP prompts for approval
3. Verify query is NOT executed without approval
4. Decline approval
5. Verify query was not executed

**Expected Result**:
```
🔐 Manual Approval Required

Operation: execute_sql
Query:
  DELETE FROM users WHERE email LIKE '%test%'

⚠️  This will permanently delete data.

Approve? [y/N]
> n

❌ Operation cancelled
```

**Status**: ⏳ Pending (requires authentication)

---

### T284: Test Read-Only Mode Configuration

**Goal**: Verify read-only mode can be enabled

**Steps**:
1. Configure MCP with `"readOnly": true`
2. Try to execute write operation
3. Verify operation is blocked

**Config**:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_PROJECT_REF": "your-dev-project-ref",
        "SUPABASE_ACCESS_TOKEN": "your-token",
        "SUPABASE_READ_ONLY": "true"
      }
    }
  }
}
```

**Expected Result**:
```
❌ Write operations disabled in read-only mode

Cannot execute: UPDATE, INSERT, DELETE, ALTER, DROP
Use read-only mode for safe exploration.
```

**Status**: ⏳ Pending (optional configuration)

---

### T285: Validate Production Database NOT Configured

**Goal**: Security check - ensure production DB is not accessible

**Steps**:
1. Review MCP configuration files
2. Check `SUPABASE_PROJECT_REF` value
3. Verify it matches development project only

**Config to Review**:
```json
{
  "SUPABASE_PROJECT_REF": "abcdefghijklmno"  // Must be dev, not prod
}
```

**Verification**:
```bash
# Check Supabase project name
# In Supabase dashboard, verify project ref matches:
# ✅ easyeng-development
# ❌ easyeng-production
```

**Status**: ✅ **CRITICAL** - Check before first use

---

## Completion Criteria

MCP is fully validated when:

- [x] T279: Basic queries work
- [x] T280: Table descriptions work
- [x] T281: Type generation works
- [x] T282: Migration generation works
- [x] T283: Manual approval enforced
- [x] T284: Read-only mode works (if using)
- [x] T285: Production DB NOT configured ⚠️

---

## When to Complete

These tests should be completed by the **first developer** to set up MCP. Once validated, all team members can use the same configuration.

**Recommended Order**:
1. T285 first (security check)
2. T279-T280 (basic functionality)
3. T281-T282 (advanced features)
4. T283 (security validation)
5. T284 last (optional feature)

---

## Documentation After Testing

After completing all tests, update this document with:
- Date completed
- Tester name
- Any issues encountered
- Configuration notes

**Test Results**:
- Date: [To be filled]
- Tester: [Name]
- Status: Pending
- Issues: None / [List any issues]

---

## Related Documentation

- **Authentication**: `docs/supabase-mcp-auth.md`
- **Setup Guide**: `docs/supabase-mcp-setup.md`
- **Examples**: `docs/supabase-mcp-examples.md`

---

**Document Version**: 1.0
**Last Updated**: 2026-02-04
**Status**: Testing guide complete, tests pending actual implementation
