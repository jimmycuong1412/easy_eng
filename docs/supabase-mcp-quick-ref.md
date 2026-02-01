# Supabase MCP Quick Reference

**Last Updated**: 2026-01-31

## Quick Commands

### Database Exploration
- `Show all tables` - List all tables
- `Describe [table]` - Show table schema
- `Show relationships for [table]` - Display foreign keys
- `List indexes on [table]` - Show table indexes

### Queries
- `Count [entity]` - Get record count
- `Show recent [table]` - Get latest records
- `Find [criteria]` - Search with conditions
- `Calculate [metric]` - Run aggregation queries

### Schema Changes
- `Add column [name] to [table]` - Add new column
- `Create index on [table]([columns])` - Add index
- `Generate migration for [description]` - Create migration

### Type Generation
- `Generate types for [table]` - TypeScript types
- `Generate Zod schema for [table]` - Runtime validation

### Analysis
- `Explain query: [SQL]` - Show query plan
- `Suggest indexes for [table]` - Performance recommendations

## Security Checklist

✅ Development database only
✅ Manual approval enabled
✅ Review SQL before executing
✅ Code review migrations
✅ Never use production refs

## Common Patterns

**Explore Schema**: `What tables exist? → Describe profiles → Show relationships`

**Add Feature**: `Generate migration → Review SQL → Test on branch → Code review → Apply`

**Debug Issue**: `Query data → Check constraints → Explain query plan → Suggest fixes`

**Type Safety**: `Generate types → Update code → Validate with Zod`

## Emergency Commands

**Stop Connection**: Remove MCP config and restart AI tool
**Report Incident**: See `supabase-mcp-security.md`
**Get Help**: Check `supabase-mcp-troubleshooting.md`
