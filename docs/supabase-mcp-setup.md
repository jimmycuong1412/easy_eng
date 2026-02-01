# Supabase MCP Setup Guide

**Last Updated**: 2026-01-31
**Target Audience**: Developers on the Easy Eng platform team
**Time to Complete**: 10-15 minutes

## Overview

This guide walks you through setting up Supabase MCP (Model Context Protocol) integration to enable AI-assisted database management through your development tools (Claude Code, Cursor, or Windsurf).

⚠️ **CRITICAL SECURITY REQUIREMENT**: Only use development or staging database project references. **NEVER** configure production databases with MCP.

## Prerequisites

Before starting, ensure you have:

- [ ] Supabase account with **admin access** to the organization
- [ ] Access to the development Supabase project
- [ ] One of: Claude Code, Cursor, or Windsurf installed
- [ ] Git repository cloned locally

## Step 1: Obtain Your Supabase Project Reference ID

1. **Navigate to Supabase Dashboard**
   - Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Log in with your organizational account

2. **Select Development Project**
   - Choose your **development** project from the project list
   - ⚠️ Ensure it's labeled "Development" or "Dev" (NOT "Production")

3. **Locate Project Reference ID**
   - Click on **Settings** (gear icon in sidebar)
   - Navigate to **General** settings
   - Find the **Project Reference ID** (also called "Reference ID" or "Project Ref")
   - Format: 16-character alphanumeric string (e.g., `abcdefghij123456`)

4. **Document the Reference ID**
   - Update `docs/SUPABASE_PROJECT_INFO.md` with your project ref
   - **Never commit** actual project refs to version control

## Step 2: Configure MCP in Your AI Tool

Choose the configuration section based on your AI tool:

### Option A: Claude Code

1. **Locate Configuration File**
   - **macOS/Linux**: `~/.claude/mcp-servers.json`
   - **Windows**: `%USERPROFILE%\.claude\mcp-servers.json`

2. **Create Configuration**
   - If the file doesn't exist, create it
   - Copy from `.claude/mcp-servers.example.json` in this repository
   - Replace `YOUR_DEV_PROJECT_REF` with your actual project reference ID

3. **Example Configuration**:

```json
{
  "mcpServers": {
    "supabase-dev": {
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_DEV_PROJECT_REF",
      "transport": "sse"
    }
  },
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

4. **Save and Restart**
   - Save the configuration file
   - Restart Claude Code completely

### Option B: Cursor

1. **Open Cursor Settings**
   - Press `Cmd/Ctrl + Shift + P`
   - Type "Cursor: Settings"
   - Navigate to **Extensions** → **MCP Servers**

2. **Add MCP Server**
   - Click **Add Server**
   - Fill in the form:
     - **Name**: `supabase-dev`
     - **URL**: `https://mcp.supabase.com/mcp?project_ref=YOUR_DEV_PROJECT_REF`
     - **Transport**: `sse`
     - **Manual Approval**: ✅ Enabled

3. **Alternative: JSON Configuration**
   - Copy `.cursor/mcp-config.example.json` from repository
   - Place in your Cursor settings directory
   - Replace `YOUR_DEV_PROJECT_REF` with actual ref

4. **Save Configuration**
   - Click **Save**
   - Restart Cursor

### Option C: Windsurf

1. **Open Windsurf Settings**
   - Navigate to **Preferences** → **Tools** → **MCP Servers**

2. **Add Supabase MCP Server**
   - Click **Add New Server**
   - Configure:
     - **Server ID**: `supabase-dev`
     - **Endpoint**: `https://mcp.supabase.com/mcp?project_ref=YOUR_DEV_PROJECT_REF`
     - **Transport**: `sse`
     - **OAuth Authentication**: ✅ Enabled

3. **Security Settings**
   - Enable **Manual Tool Approval**
   - Disable **Read-Only Mode** (we need write access for migrations)

4. **Alternative: JSON Configuration**
   - Copy `.windsurf/mcp.example.json` from repository
   - Place in Windsurf configuration directory
   - Replace placeholders with actual values

5. **Save and Apply**
   - Click **Save Configuration**
   - Restart Windsurf

## Step 3: Authenticate with Supabase OAuth

1. **Initiate Authentication**
   - Open a new chat/conversation in your AI tool
   - Type: "Can you connect to my Supabase database?"

2. **OAuth Flow**
   - Your AI tool will detect the MCP server configuration
   - A browser window will open for OAuth authentication
   - **If no browser opens**: Look for an authentication URL in the chat

3. **Grant Permissions**
   - Log in to Supabase (if not already logged in)
   - Review the permissions requested:
     - Read database schema
     - Query database
     - Generate migrations
     - Create database branches
   - Click **Authorize** to grant access

4. **Complete Authentication**
   - Return to your AI tool
   - You should see a success message
   - The MCP server is now connected

## Step 4: Verify Connection

Test the MCP integration with these verification steps:

### Test 1: List Tables

Ask your AI assistant:
```
Show me all tables in my database
```

**Expected Result**: List of tables (profiles, classes, bookings, gem_transactions, etc.)

### Test 2: Describe Schema

Ask:
```
What columns does the profiles table have?
```

**Expected Result**: Column names, types, constraints, and relationships

### Test 3: Natural Language Query

Ask:
```
How many students are registered in the database?
```

**Expected Result**: Count of users with role='student'

### Test 4: Manual Approval (Security Test)

Ask:
```
Generate a migration to add an 'email_verified' boolean column to profiles
```

**Expected Result**:
- AI shows the generated migration SQL
- **You receive a manual approval prompt** before execution
- Approve or deny the operation

## Step 5: Enable Security Features

### Manual Approval for Write Operations

Ensure your configuration includes:

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

### Read-Only Mode (Optional)

If you only want to explore data without making changes:

```json
"supabase-dev": {
  "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_DEV_PROJECT_REF&mode=readonly",
  "transport": "sse"
}
```

## Troubleshooting

### Issue: "Failed to connect to MCP server"

**Solutions**:
1. Verify project reference ID is correct
2. Check internet connection
3. Ensure Supabase project is not paused
4. Restart your AI tool
5. Check MCP server status: https://status.supabase.com

### Issue: "Authentication failed"

**Solutions**:
1. Clear OAuth tokens and re-authenticate
2. Verify you have admin access to Supabase organization
3. Check if MCP access is enabled for your Supabase organization
4. Try logging out and back in to Supabase

### Issue: "Permission denied" for queries

**Solutions**:
1. Verify the project reference is for a development project
2. Check your Supabase organization role (must be Admin or Owner)
3. Ensure RLS policies allow the operation
4. For service role operations, check MCP server permissions

### Issue: AI tool can't find tables

**Solutions**:
1. Ensure database migrations have been applied
2. Check you're connected to the correct project
3. Verify schema name (usually `public`)
4. Try: "List all schemas in the database"

## Next Steps

Now that MCP is set up:

1. **Explore Documentation**
   - Read `supabase-mcp-examples.md` for common use cases
   - Review `supabase-mcp-quick-ref.md` for quick commands

2. **Learn MCP Tools**
   - `query_database` - Natural language to SQL
   - `describe_table` - Schema exploration
   - `generate_types` - TypeScript type generation
   - `generate_migration` - Migration creation
   - See `supabase-mcp-tools.md` for full tool list

3. **Establish Workflows**
   - Review `supabase-mcp-vs-cli.md` for when to use MCP vs. Supabase CLI
   - Set up code review process for MCP-generated migrations
   - Configure team access (see `supabase-mcp-access-checklist.md`)

4. **Best Practices**
   - Always review AI-generated SQL before executing
   - Use manual approval for all write operations
   - Document MCP-generated migrations
   - Never disable safety features

## Security Reminders

🔒 **Development Only**: Only use MCP with development/staging databases
🔒 **Manual Approval**: Keep manual approval enabled for write operations
🔒 **Code Review**: All MCP-generated migrations must be code-reviewed
🔒 **Access Control**: Limit MCP access to trusted team members
🔒 **Audit Trail**: Keep logs of MCP operations and migrations

## Support

For issues or questions:

1. Check the troubleshooting guide above
2. Review `supabase-mcp-troubleshooting.md`
3. Contact your team's Supabase administrator
4. Check Supabase MCP documentation: https://supabase.com/docs/guides/getting-started/mcp

---

**Setup Complete!** 🎉

You can now use AI assistance to query, explore, and manage your Supabase database through natural language.
