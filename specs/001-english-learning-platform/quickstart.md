# Quickstart: Supabase MCP Integration

**Last Updated**: 2026-01-31
**Target Audience**: Developers using Claude Code, Cursor, or Windsurf
**Time to Complete**: 10-15 minutes

## What You'll Achieve

By the end of this guide, you'll be able to:
- ✅ Query your Supabase database using natural language
- ✅ Explore database schema through AI assistance
- ✅ Generate TypeScript types from your database
- ✅ Create and test database migrations with AI help

## Prerequisites

Before starting, ensure you have:
- [ ] Supabase project (development or staging - **NEVER production**)
- [ ] Supabase organization account with admin access
- [ ] Claude Code, Cursor, or Windsurf installed
- [ ] Project reference ID from Supabase dashboard

## Step 1: Locate Your Project Reference ID

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **development** project (not production)
3. Navigate to **Settings** → **General**
4. Copy the **Reference ID** (looks like `abcdefghijklmnop`)

⚠️ **Security Note**: Only use development/staging projects. Never connect MCP to production databases.

## Step 2: Configure MCP in Your AI Tool

### For Claude Code

1. Open your Claude Code configuration:
   - Location: `~/.claude/mcp-servers.json` (macOS/Linux)
   - Location: `%USERPROFILE%\.claude\mcp-servers.json` (Windows)

2. Add the Supabase MCP server configuration:

```json
{
  "mcpServers": {
    "supabase-dev": {
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF",
      "transport": "sse"
    }
  }
}
```

3. Replace `YOUR_PROJECT_REF` with your project reference ID from Step 1

4. Save the file and restart Claude Code

### For Cursor

1. Open Cursor settings: `Cmd/Ctrl + Shift + P` → "Cursor: Settings"
2. Navigate to **Extensions** → **MCP Servers**
3. Click **Add Server**
4. Enter:
   - **Name**: `supabase-dev`
   - **URL**: `https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF`
   - **Transport**: `sse`
5. Click **Save**

### For Windsurf

1. Open Windsurf settings
2. Go to **Tools** → **MCP Servers**
3. Add new server with:
   - **Server ID**: `supabase-dev`
   - **Endpoint**: `https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF`
4. Enable **OAuth Authentication**
5. Save configuration

## Step 3: Authenticate with Supabase

1. Start a new chat with your AI assistant
2. Ask: "Can you connect to my Supabase database?"
3. The AI will attempt to use the MCP server and prompt for OAuth authentication
4. Click the authentication link that appears
5. Log in to your Supabase account
6. Grant permission for MCP access
7. Return to your AI tool - authentication is complete

## Step 4: Verify Connection

Test the connection by asking your AI assistant:

```
Show me all tables in my database
```

Expected response: A list of your database tables (profiles, classes, bookings, gem_transactions, etc.)

## Step 5: Try Example Queries

### Explore Schema

```
What columns does the profiles table have?
```

### Natural Language Queries

```
Show me the 10 most recent bookings
```

```
How many students have more than 50 gems?
```

```
List all classes scheduled for this week
```

### Generate Types

```
Generate TypeScript types for the bookings table
```

### Create Migrations

```
Create a migration to add an 'is_active' boolean column to the profiles table
```

⚠️ Review all generated migrations carefully before applying them.

## Step 6: Enable Safety Features

### Enable Manual Tool Approval

For added security, configure your AI tool to require manual approval before executing any MCP tools:

**Claude Code**:
Edit `~/.claude/config.json`:
```json
{
  "mcpSettings": {
    "requireManualApproval": true,
    "approvalRequired": ["execute_sql", "generate_migration", "create_database_branch"]
  }
}
```

**Cursor/Windsurf**: Enable "Manual approval for tool execution" in MCP settings

### Enable Read-Only Mode (Optional)

If you only want to explore data without making changes:

```json
{
  "mcpServers": {
    "supabase-dev": {
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&mode=readonly",
      "transport": "sse"
    }
  }
}
```

## Common Use Cases

### 1. Database Exploration

**Scenario**: You want to understand the relationships between tables

**Ask**:
```
Show me how the bookings table relates to other tables
```

**Result**: AI explains foreign key relationships and provides diagram

### 2. Query Optimization

**Scenario**: You want to check if a query is using indexes properly

**Ask**:
```
Explain the query plan for: SELECT * FROM bookings WHERE student_id = '123' ORDER BY created_at DESC
```

**Result**: AI shows the execution plan and suggests optimizations

### 3. Type Generation

**Scenario**: You added new columns and need to update TypeScript types

**Ask**:
```
Generate updated TypeScript types for the student_characters table
```

**Result**: AI generates type definitions matching current schema

### 4. Migration Creation

**Scenario**: You want to add a new index for better performance

**Ask**:
```
Create a migration to add an index on bookings(class_id, created_at)
```

**Result**: AI generates migration SQL with both up and down migrations

### 5. Data Analysis

**Scenario**: You want to understand platform usage

**Ask**:
```
What's the average number of gems used per booking in the last 30 days?
```

**Result**: AI queries the database and provides the calculated result

## Troubleshooting

### Issue: "Failed to connect to MCP server"

**Solutions**:
1. Verify your project reference ID is correct
2. Check your internet connection
3. Ensure the project is not paused in Supabase dashboard
4. Restart your AI tool

### Issue: "Authentication failed"

**Solutions**:
1. Clear OAuth tokens and re-authenticate
2. Verify you have admin access to the Supabase organization
3. Check if your Supabase account has MCP access enabled

### Issue: "Permission denied" for queries

**Solutions**:
1. Verify the project reference ID is for a development project
2. Check your Supabase organization role (must be Admin or Owner)
3. Ensure RLS policies allow the operation (MCP uses service role)

### Issue: AI can't find tables

**Solutions**:
1. Ensure migrations have been applied to the database
2. Check the schema name (public vs. custom schema)
3. Try asking: "List all schemas in the database"

## Best Practices

### ✅ DO

- Use MCP only with development/staging databases
- Review all generated SQL before executing
- Keep manual approval enabled for write operations
- Use database branches for testing schema changes
- Document any migrations generated via MCP
- Share MCP access only with trusted team members

### ❌ DON'T

- Never connect MCP to production databases
- Don't execute raw SQL without reviewing it first
- Don't share project reference IDs publicly
- Don't disable manual approval for destructive operations
- Don't assume AI-generated SQL is always optimal
- Don't skip code review for MCP-generated migrations

## Next Steps

Now that you have MCP integrated, explore these advanced features:

1. **Database Branching**
   - Create isolated branches for testing schema changes
   - Ask: "Create a database branch called 'test-new-columns'"

2. **Complex Queries**
   - Generate complex JOINs and aggregations via natural language
   - Ask: "Show me the total revenue per teacher for last month"

3. **Performance Analysis**
   - Use AI to identify slow queries and suggest indexes
   - Ask: "What queries are running slowly in my logs?"

4. **Type Safety**
   - Auto-generate Zod schemas for runtime validation
   - Ask: "Generate Zod schemas for all my database tables"

## Additional Resources

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Project Security Guidelines](./docs/supabase-mcp-security.md)
- [Custom MCP Server Guide](./docs/custom-mcp-server.md) (Phase 2)

## Getting Help

If you encounter issues:
1. Check this quickstart guide
2. Review the [MCP troubleshooting docs](https://supabase.com/docs/guides/getting-started/mcp#troubleshooting)
3. Ask your AI assistant: "I'm having trouble with MCP connection"
4. Contact your team's Supabase administrator

---

**Happy querying!** 🚀

Remember: The goal of MCP is to accelerate development, not replace careful review and testing. Always validate AI-generated code before applying it to any environment.
