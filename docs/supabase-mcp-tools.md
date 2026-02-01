# Supabase MCP Tools Reference

**Last Updated**: 2026-01-31

## Overview

This document describes all available MCP tools exposed by the Supabase MCP server for database interaction.

## Tool Categories

1. **Read Operations** - Query and explore data (no approval required)
2. **Write Operations** - Modify data or schema (manual approval required)
3. **Development Tools** - Generate code and types
4. **Management Tools** - Administrative operations

---

## Read Operations

### query_database

**Description**: Execute natural language queries that are translated to SQL (SELECT operations only)

**Input**:
- `query` (string, required): Natural language description of the data you want
- `limit` (integer, optional): Maximum rows to return (default: 100, max: 1000)

**Example**:
```
Query: "Show me the 10 most recent bookings"
```

**Output**:
- `rows`: Array of result rows
- `rowCount`: Number of rows returned
- `sql`: Generated SQL query (for transparency)

**Security**: No manual approval required (read-only)

---

### describe_table

**Description**: Get complete schema information for a database table

**Input**:
- `tableName` (string, required): Name of the table to describe
- `includeRelationships` (boolean, optional): Whether to include foreign key relationships (default: true)

**Example**:
```
Table: "profiles"
```

**Output**:
- `tableName`: Name of the table
- `columns`: Array of column definitions
  - `name`: Column name
  - `type`: PostgreSQL data type
  - `nullable`: Can contain NULL
  - `default`: Default value
  - `isPrimaryKey`: Is primary key
  - `isForeignKey`: Is foreign key
- `relationships`: Array of foreign key relationships
  - `foreignTable`: Referenced table
  - `foreignColumn`: Referenced column
  - `localColumn`: Local column

**Security**: No manual approval required

---

### get_project_info

**Description**: Retrieve Supabase project configuration and credentials

**Input**: None

**Output**:
- `projectRef`: Project reference ID
- `supabaseUrl`: Supabase API URL
- `anonKey`: Anonymous (public) API key
- `region`: Database region
- `postgresVersion`: PostgreSQL version

**Security**: No manual approval required (read-only metadata)

---

### view_logs

**Description**: View database logs for debugging and monitoring

**Input**:
- `logType` (string, required): Type of logs ("postgres", "api", "auth", "realtime", "storage")
- `limit` (integer, optional): Number of log entries (default: 100, max: 1000)
- `startTime` (datetime, optional): Start time for log range

**Example**:
```
LogType: "postgres"
Limit: 50
```

**Output**:
- `logs`: Array of log entries
  - `timestamp`: When the event occurred
  - `level`: Log level (INFO, WARNING, ERROR)
  - `message`: Log message
  - `metadata`: Additional context

**Security**: No manual approval required

---

## Write Operations

### execute_sql

**Description**: Execute raw SQL queries directly (SELECT, INSERT, UPDATE, DELETE, DDL)

**Input**:
- `sql` (string, required): SQL query to execute
- `params` (array, optional): Parameterized query values

**Example**:
```sql
UPDATE profiles
SET email_verified = true
WHERE id = $1
```

**Output**:
- `rows`: Result rows (for SELECT)
- `rowCount`: Number of affected rows
- `command`: SQL command type

**Security**: ⚠️ **Manual approval REQUIRED** - Can modify data

**Review Before Approving**:
- Verify SQL syntax is correct
- Check WHERE clauses to avoid unintended updates
- Confirm destructive operations (DELETE, DROP) are intentional
- Test on database branch first for DDL changes

---

### generate_migration

**Description**: Generate Supabase migration SQL file from natural language schema change description

**Input**:
- `description` (string, required): Natural language description of schema change
- `migrationName` (string, optional): Name for the migration file

**Example**:
```
Description: "Add email_verified column to profiles table"
```

**Output**:
- `migrationSQL`: Generated SQL for the migration (UP)
- `migrationName`: Suggested migration file name
- `rollbackSQL`: SQL to rollback the migration (DOWN)

**Security**: ⚠️ **Manual approval REQUIRED** - Generates schema changes

**Review Checklist**:
- [ ] Column names and types are correct
- [ ] Constraints are appropriate (NOT NULL, UNIQUE, CHECK)
- [ ] Default values make sense
- [ ] Indexes added for foreign keys
- [ ] Rollback SQL reverses the change
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] No data loss (if altering existing columns)

**After Approval**:
1. Save to `supabase/migrations/NNNN_descriptive_name.sql`
2. Review in code review
3. Test on database branch
4. Apply to development database
5. Commit to version control

---

### create_database_branch

**Description**: Create a database branch for testing schema changes safely

**Input**:
- `branchName` (string, required): Name for the new database branch (lowercase, hyphens only)
- `baseBranch` (string, optional): Branch to create from (default: "main")

**Example**:
```
BranchName: "test-new-indexes"
BaseBranch: "main"
```

**Output**:
- `branchId`: Unique identifier for the branch
- `branchUrl`: URL to access the branch database
- `status`: "creating" or "active"

**Security**: ⚠️ **Manual approval REQUIRED** - Creates new database resources

**Use Cases**:
- Test migrations before applying to main database
- Experiment with schema changes
- Prototype new features
- Performance testing with different indexes

**After Approval**:
- Branch is isolated from main database
- Test your changes on the branch
- Delete branch when done (`git branch -D branch-name` equivalent)

---

## Development Tools

### generate_types

**Description**: Generate TypeScript type definitions from database schema

**Input**:
- `tables` (array, optional): Specific tables to generate types for (empty = all tables)
- `outputFormat` (string, optional): Type definition format ("typescript" or "zod", default: "typescript")

**Example**:
```
Tables: ["profiles", "bookings"]
OutputFormat: "typescript"
```

**Output**:
- `types`: Generated TypeScript type definitions
- `fileName`: Suggested file name for the types

**Example Output**:
```typescript
export interface Profile {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  display_name: string;
  avatar_url?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  student_id: string;
  class_id: string;
  gems_used: number;
  discount_amount: number;
  final_price: number;
  status: 'pending' | 'confirmed' | 'attended' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```

**Security**: No manual approval required (code generation only)

**After Generation**:
1. Save to `frontend/src/types/database.ts` or similar
2. Review for accuracy
3. Update imports in your code
4. Commit to version control

---

## Resource URIs

The MCP server also exposes resources via URI patterns:

### supabase://tables

**Description**: List of all tables in the database

**Output**: JSON array of table names

---

### supabase://schema

**Description**: Complete database schema including tables, views, functions, and policies

**Output**: Full schema definition in JSON format

---

### supabase://migrations

**Description**: List of migrations that have been applied to the database

**Output**: Array of migration files with applied timestamps

---

## Tool Usage Patterns

### Exploration Workflow

1. **List Tables**: `query_database` with "Show all tables"
2. **Explore Schema**: `describe_table` for each table
3. **Understand Relationships**: Review foreign keys from `describe_table`
4. **Query Data**: Use `query_database` for specific data exploration

### Schema Change Workflow

1. **Plan Change**: Describe what you want to change
2. **Generate Migration**: Use `generate_migration` with description
3. **Review SQL**: Carefully review the generated migration
4. **Create Branch**: Use `create_database_branch` for testing
5. **Test Migration**: Apply to branch and verify
6. **Apply to Dev**: If successful, apply to development database
7. **Code Review**: Submit migration for team review

### Type Generation Workflow

1. **Apply Migrations**: Ensure schema is up to date
2. **Generate Types**: Use `generate_types` for all or specific tables
3. **Save Types**: Write to `src/types/database.ts`
4. **Update Code**: Import and use new types
5. **Verify**: TypeScript compiler checks for type safety

### Debugging Workflow

1. **Query Data**: Use `query_database` to investigate
2. **Check Schema**: Use `describe_table` to verify structure
3. **View Logs**: Use `view_logs` to see errors or slow queries
4. **Get Project Info**: Verify configuration if connection issues

---

## Best Practices

### When to Use MCP Tools

✅ **Good Use Cases**:
- Quick data exploration during development
- Generating types after schema changes
- Creating migrations from natural language
- Understanding database structure
- Debugging data issues

❌ **Avoid Using MCP For**:
- Production database queries
- Bulk data modifications
- Performance-critical operations
- Automated scripts (use Supabase CLI instead)

### Security Reminders

🔒 **Always**:
- Review generated SQL before approving
- Test migrations on database branches
- Keep manual approval enabled
- Use development databases only

🔒 **Never**:
- Disable manual approval for write operations
- Execute raw SQL without reviewing
- Share sensitive query results
- Configure production project references

---

## Tool Comparison: MCP vs Supabase CLI

| Task | MCP | Supabase CLI |
|------|-----|--------------|
| Quick queries | ✅ Excellent | ⚠️ Requires SQL knowledge |
| Schema exploration | ✅ Excellent | ⚠️ Manual |
| Type generation | ✅ One command | ✅ `supabase gen types` |
| Migrations | ✅ Natural language | ✅ Full control |
| Production use | ❌ Not recommended | ✅ Designed for it |
| CI/CD integration | ❌ Not suitable | ✅ Excellent |
| Team collaboration | ⚠️ Individual | ✅ Version controlled |

**Recommendation**: Use MCP for exploration and rapid development, Supabase CLI for production operations and CI/CD.

---

## Troubleshooting Tool Issues

### Tool Not Found

**Error**: "Tool 'query_database' not found"

**Solutions**:
1. Verify MCP server is connected
2. Check OAuth authentication is valid
3. Restart your AI tool
4. Re-authenticate if needed

### Query Timeout

**Error**: "Query exceeded time limit"

**Solutions**:
1. Add LIMIT clause to large queries
2. Optimize query with indexes
3. Break into smaller queries
4. Check for missing WHERE clauses

### Permission Denied

**Error**: "Permission denied for operation"

**Solutions**:
1. Verify you have admin access to Supabase organization
2. Check project reference is correct
3. Ensure RLS policies allow the operation
4. Verify manual approval was granted

---

## Additional Resources

- **Setup Guide**: `docs/supabase-mcp-setup.md`
- **Usage Examples**: `docs/supabase-mcp-examples.md`
- **Security Policy**: `docs/supabase-mcp-security.md`
- **Quick Reference**: `docs/supabase-mcp-quick-ref.md`
- **Supabase MCP Docs**: https://supabase.com/docs/guides/getting-started/mcp

---

**Last Updated**: 2026-01-31
**Tool Version**: Supabase MCP Server v1.0
