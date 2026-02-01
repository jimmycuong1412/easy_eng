# Supabase Project Information

**Last Updated**: 2026-01-31

## Development Project

**Purpose**: Development and testing environment for MCP integration

**Project Reference ID**: `evrcwtsexlamacawofxo`

**How to Find Your Project Reference ID**:

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **development** project (NOT production)
3. Navigate to **Settings** → **General**
4. Copy the **Reference ID** (format: `abcdefghijklmnop`)
5. Update this document with the reference ID

**Security Note**: ⚠️ This should ONLY be your development/staging project reference. NEVER use production project reference for MCP integration.

## Project Locations

- **Development**: `evrcwtsexlamacawofxo` (to be filled)
- **Staging**: `[PROJECT_REF]` (to be filled, optional)
- **Production**: ❌ **DO NOT USE WITH MCP**

## Environment Variables

After obtaining the project reference ID, you'll use it in MCP configuration files:

- `.claude/mcp-servers.json` (Claude Code)
- `.cursor/mcp-config.json` (Cursor)
- `.windsurf/mcp.json` (Windsurf)

**Format**: `https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF`

## Team Access

Track which team members have MCP access:

| Team Member | Role | MCP Access Granted | Date | Notes |
|-------------|------|-------------------|------|-------|
| [Name] | [Developer/Admin] | ✅/❌ | YYYY-MM-DD | [Notes] |

## Next Steps

1. Fill in your development project reference ID above
2. Configure MCP in your AI tool (see `docs/supabase-mcp-setup.md`)
3. Authenticate using OAuth 2.1
4. Test connection (see `docs/supabase-mcp-quick-ref.md`)
