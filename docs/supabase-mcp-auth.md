# Supabase MCP Authentication Guide (OAuth 2.1)

**Task**: T276
**Purpose**: Step-by-step guide to authenticate with Supabase MCP server using OAuth 2.1
**Audience**: Developers setting up MCP integration for the first time

---

## Overview

Supabase MCP uses **OAuth 2.1** for secure authentication. This guide walks through the authentication process with detailed steps and troubleshooting tips.

**Prerequisites**:
- Supabase organization admin access
- Claude Code, Cursor, or Windsurf IDE installed
- MCP configuration file created (see `docs/supabase-mcp-setup.md`)

---

## Authentication Flow Diagram

```
┌─────────────┐                ┌──────────────────┐                ┌─────────────────┐
│   AI Tool   │                │  Supabase MCP    │                │   Supabase      │
│ (Claude/    │                │     Server       │                │   OAuth Server  │
│  Cursor)    │                │                  │                │                 │
└──────┬──────┘                └────────┬─────────┘                └────────┬────────┘
       │                                │                                   │
       │  1. Request Auth              │                                   │
       ├──────────────────────────────>│                                   │
       │                                │                                   │
       │  2. Return Auth URL            │                                   │
       │<──────────────────────────────┤                                   │
       │                                │                                   │
       │  3. Open Browser               │                                   │
       ├────────────────────────────────┼──────────────────────────────────>│
       │                                │                                   │
       │  4. User Logs In & Approves    │                                   │
       │                                │<──────────────────────────────────┤
       │                                │                                   │
       │  5. Callback with Auth Code    │                                   │
       │                                │<──────────────────────────────────┤
       │                                │                                   │
       │  6. Exchange Code for Token    │                                   │
       │                                ├──────────────────────────────────>│
       │                                │                                   │
       │  7. Access Token               │                                   │
       │                                │<──────────────────────────────────┤
       │                                │                                   │
       │  8. Authentication Complete    │                                   │
       │<──────────────────────────────┤                                   │
       │                                │                                   │
       │  9. MCP Requests (with token)  │                                   │
       ├──────────────────────────────>│                                   │
       │                                │                                   │
```

---

## Step-by-Step Authentication

### Step 1: Start MCP Connection

When you first use an MCP tool that requires authentication, you'll see a prompt:

```
🔐 Authentication Required

Supabase MCP needs to authenticate with your Supabase account.

This will open your browser to complete OAuth login.

Continue? [y/N]
```

**Action**: Type `y` and press Enter

---

### Step 2: Browser Opens Automatically

Your default browser will open to the Supabase OAuth consent page:

**URL Format**: `https://app.supabase.com/oauth/authorize?...`

**Screenshot Placeholder**:
```
┌──────────────────────────────────────────────────────────┐
│  Supabase                                    [Close]     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│     [Supabase Logo]                                      │
│                                                           │
│     Authorize Claude Code MCP                            │
│                                                           │
│     Claude Code MCP wants to access your                 │
│     Supabase organization:                               │
│                                                           │
│     • Read database schema                               │
│     • Execute read-only queries                          │
│     • Generate migrations (requires approval)            │
│     • Execute SQL (requires approval)                    │
│                                                           │
│     Organization: [Your Org Name]                        │
│     Project: [Development Project]                       │
│                                                           │
│     ┌────────────────┐  ┌────────────────┐             │
│     │    Cancel      │  │   Authorize    │             │
│     └────────────────┘  └────────────────┘             │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

### Step 3: Review Permissions

**Carefully review the requested permissions**:

✅ **Safe Permissions** (Always granted):
- Read database schema
- Describe tables and columns
- Execute SELECT queries
- Generate TypeScript types

⚠️ **Write Permissions** (Require manual approval each time):
- Execute SQL statements (INSERT, UPDATE, DELETE)
- Generate migrations
- Modify database structure

**Important**: Write operations will **always** require manual approval in your AI tool, even after OAuth.

---

### Step 4: Select Organization and Project

If you have multiple Supabase organizations or projects:

1. **Select Organization**: Choose the organization containing your development project
2. **Select Project**: Choose **ONLY your development/staging project**

⚠️ **CRITICAL SECURITY RULE**: **NEVER** authorize MCP for production projects

```
┌─────────────────────────────────────────────┐
│  Select Project                              │
├─────────────────────────────────────────────┤
│                                              │
│  [ ] easyeng-production  ⚠️ DO NOT SELECT  │
│  [•] easyeng-development ✅ CORRECT         │
│  [ ] easyeng-staging     ✅ OK FOR TESTING  │
│                                              │
└─────────────────────────────────────────────┘
```

---

### Step 5: Authorize

Click the **"Authorize"** button.

You may be prompted to log in to Supabase if not already logged in:

```
┌──────────────────────────────────────┐
│  Sign in to Supabase                 │
├──────────────────────────────────────┤
│                                       │
│  Email: ___________________          │
│                                       │
│  Password: ___________________       │
│                                       │
│  [ ] Remember me                     │
│                                       │
│  ┌──────────────────────┐            │
│  │    Sign In           │            │
│  └──────────────────────┘            │
│                                       │
│  Or sign in with:                    │
│  [GitHub] [Google] [GitLab]          │
│                                       │
└──────────────────────────────────────┘
```

---

### Step 6: Callback and Token Exchange

After authorization, you'll see a success page:

```
┌──────────────────────────────────────────────────────────┐
│  Authorization Successful!                    [Close]     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│     ✅ Successfully Authorized                           │
│                                                           │
│     Claude Code MCP has been granted access to:          │
│                                                           │
│     Organization: Your Org Name                          │
│     Project: easyeng-development                         │
│                                                           │
│     You can close this window and return to your         │
│     editor.                                              │
│                                                           │
│     ┌────────────────────────────────────────┐          │
│     │    Return to Claude Code               │          │
│     └────────────────────────────────────────┘          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Action**: You can close the browser window or click "Return to Claude Code"

---

### Step 7: Confirmation in AI Tool

Back in your AI tool (Claude Code/Cursor/Windsurf), you'll see:

```
✅ Authentication Successful

Connected to Supabase project: easyeng-development
Organization: Your Org Name

MCP tools are now available:
• query_database
• describe_table
• list_tables
• generate_types
• execute_sql (requires approval)
• generate_migration (requires approval)

Try: "Show me all tables in the database"
```

---

## Authentication Token Storage

### Token Location

Tokens are stored securely by the MCP server:

**Claude Code**:
- macOS/Linux: `~/.config/claude-code/mcp-tokens/supabase.json`
- Windows: `%APPDATA%\claude-code\mcp-tokens\supabase.json`

**Cursor**:
- macOS/Linux: `~/.cursor/mcp-tokens/supabase.json`
- Windows: `%APPDATA%\Cursor\mcp-tokens\supabase.json`

**Windsurf**:
- macOS/Linux: `~/.windsurf/mcp-tokens/supabase.json`
- Windows: `%APPDATA%\Windsurf\mcp-tokens\supabase.json`

### Token Security

✅ **Token files are**:
- Encrypted at rest
- Permissions set to user-only (600 on Unix)
- Automatically refreshed when expired
- Never logged or displayed

⚠️ **Never**:
- Share token files
- Commit tokens to version control
- Copy tokens to unsecured locations
- Send tokens in chat messages

### Token Refresh

Tokens expire after **60 days** and are automatically refreshed:

```
🔄 Token Expired - Refreshing...

Your Supabase MCP authentication token has expired.
Refreshing automatically...

✅ Token Refreshed Successfully

No action required. You can continue working.
```

If automatic refresh fails, you'll be prompted to re-authenticate.

---

## Manual Approval for Write Operations

### Example: Execute SQL

When you ask the AI to run a write operation:

```
You: "Delete all test users from the users table"

AI: I'll help you delete test users. This requires database write access.

🔐 Manual Approval Required

Operation: execute_sql
Query:
  DELETE FROM users
  WHERE email LIKE '%@test.com'

⚠️  This will permanently delete data.

Approve this operation? [y/N]
```

**Best Practices**:
- ✅ Review the SQL carefully before approving
- ✅ Verify the WHERE clause is correct
- ✅ Consider testing in a transaction first
- ❌ Don't approve without reading
- ❌ Don't approve bulk deletes without backups

---

## Troubleshooting

### Issue: "Authentication Failed"

**Symptoms**:
```
❌ Authentication Failed

Could not authenticate with Supabase.
Error: oauth_error: access_denied
```

**Causes & Solutions**:

1. **Clicked "Cancel" on OAuth page**
   - Solution: Restart the MCP connection and authorize

2. **Insufficient permissions**
   - Solution: Ensure you're an admin in the Supabase organization

3. **Network/firewall blocking OAuth**
   - Solution: Check firewall, disable VPN temporarily

4. **Browser blocked popup**
   - Solution: Allow popups from `app.supabase.com`

---

### Issue: "Token Expired"

**Symptoms**:
```
❌ Token Expired

Your authentication token has expired and could not be refreshed.
Please re-authenticate.
```

**Solution**:
1. Clear cached tokens:
   ```bash
   # macOS/Linux
   rm ~/.config/claude-code/mcp-tokens/supabase.json

   # Windows
   del %APPDATA%\claude-code\mcp-tokens\supabase.json
   ```

2. Restart your AI tool

3. Re-authenticate when prompted

---

### Issue: "Wrong Project Connected"

**Symptoms**:
```
⚠️  Warning: Connected to production project

You are connected to: easyeng-production

MCP should only be used with development/staging projects.
```

**Solution**:
1. **Immediately disconnect**:
   ```
   Disconnect from MCP server
   ```

2. Clear tokens (see above)

3. Re-authenticate and select the correct project

4. Update your MCP configuration to use the correct project reference

---

### Issue: "Browser Doesn't Open"

**Symptoms**:
- Prompt says "Opening browser..." but nothing happens

**Solutions**:

1. **Copy URL manually**:
   ```
   🔐 Authentication Required

   If browser doesn't open, visit:
   https://app.supabase.com/oauth/authorize?client_id=...

   [Copy URL]
   ```

2. **Set default browser**:
   - Ensure you have a default browser set in OS settings

3. **Check terminal permissions**:
   - macOS: Allow Terminal/IDE to control other apps in System Preferences

---

## Security Best Practices

### ✅ DO

- ✅ Use MCP only with development/staging projects
- ✅ Review all write operations before approving
- ✅ Log out of Supabase when done
- ✅ Revoke MCP access if not actively using it
- ✅ Use read-only mode when possible
- ✅ Keep your AI tool updated

### ❌ DON'T

- ❌ Connect to production databases
- ❌ Share authentication tokens
- ❌ Approve write operations without reading them
- ❌ Leave sessions open on shared computers
- ❌ Commit MCP configuration files with tokens
- ❌ Use MCP on public/untrusted networks without VPN

---

## Revoking Access

### Revoke from Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your organization
3. Navigate to **Settings** → **OAuth Applications**
4. Find "Claude Code MCP" (or your AI tool name)
5. Click **"Revoke Access"**

### Revoke from AI Tool

1. Open MCP settings in your AI tool
2. Find Supabase MCP server
3. Click **"Disconnect"** or **"Remove"**
4. Delete token files (see troubleshooting above)

---

## Re-Authentication

You'll need to re-authenticate when:

- Token expires (every 60 days)
- Access is revoked
- Switching to a different project
- Reinstalling your AI tool
- Clearing application data

Simply restart the authentication flow from Step 1.

---

## Screenshots Checklist

When taking screenshots for this guide, capture:

- [ ] OAuth consent page (Step 2)
- [ ] Permission selection interface (Step 3)
- [ ] Organization/project selection (Step 4)
- [ ] Login page (if prompted) (Step 5)
- [ ] Success callback page (Step 6)
- [ ] Confirmation in AI tool (Step 7)
- [ ] Manual approval prompt example (Write Operations section)
- [ ] Token expired message (Troubleshooting)
- [ ] Wrong project warning (Troubleshooting)

**Screenshot Tool**: Use macOS Screenshot (Cmd+Shift+4) or Windows Snip & Sketch (Win+Shift+S)

**Screenshot Format**: PNG, 1200px width max, annotated with arrows/highlights

---

## Testing Your Authentication

After successful authentication, test with these queries:

```bash
# 1. List all tables
"Show me all tables in the database"

# 2. Describe a table
"Describe the structure of the users table"

# 3. Run a safe SELECT query
"Show me the first 5 users"

# Expected: All queries work without errors
```

If any fail, see Troubleshooting section.

---

## Related Documentation

- **Setup Guide**: `docs/supabase-mcp-setup.md`
- **Security Policies**: `docs/supabase-mcp-security.md`
- **Usage Examples**: `docs/supabase-mcp-examples.md`
- **Troubleshooting**: `docs/supabase-mcp-troubleshooting.md`

---

**Document Version**: 1.0
**Last Updated**: 2026-02-04
**Task**: T276
**Status**: Complete (screenshots pending)
