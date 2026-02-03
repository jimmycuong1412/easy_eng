# Supabase CLI Usage Guide

**Installation**: ✅ Complete (installed as project dev dependency)
**Version**: 2.75.0

---

## ✅ Installation Complete

The Supabase CLI is now installed in your project as a dev dependency (not globally). This is the recommended approach per Supabase's official documentation.

---

## How to Use Supabase CLI

### Method 1: Using npx (Recommended)

```bash
npx supabase <command>
```

**Examples:**
```bash
npx supabase --version
npx supabase status
npx supabase functions list
npx supabase functions deploy cometchat-user-sync
```

### Method 2: Using npm scripts

We've added convenient npm scripts to `package.json`:

```bash
# Check Supabase status
npm run supabase:status

# Start local Supabase instance
npm run supabase:start

# Stop local Supabase instance
npm run supabase:stop

# View function logs
npm run supabase:logs cometchat-user-sync

# Deploy Edge Function
npm run supabase:deploy cometchat-user-sync
```

### Method 3: Direct access (if in project root)

```bash
./node_modules/.bin/supabase <command>
```

---

## Common Commands

### Project Setup

```bash
# Initialize Supabase in the project (if not already done)
npx supabase init

# Link to remote Supabase project
npx supabase link --project-ref your-project-ref

# Check connection status
npx supabase status
```

### Edge Functions

```bash
# List all Edge Functions
npx supabase functions list

# Deploy a specific function
npx supabase functions deploy cometchat-user-sync

# Deploy all functions
npx supabase functions deploy

# View function logs
npx supabase functions logs cometchat-user-sync --tail

# View recent logs (last 50)
npx supabase functions logs cometchat-user-sync --limit 50
```

### Secrets Management

```bash
# Set a secret
npx supabase secrets set COMETCHAT_APP_ID=your-app-id

# List all secrets (names only, not values)
npx supabase secrets list

# Unset a secret
npx supabase secrets unset COMETCHAT_APP_ID
```

### Database Migrations

```bash
# Create a new migration
npx supabase migration new migration_name

# Check migration status
npx supabase db diff

# Apply migrations to remote database
npx supabase db push

# Pull remote schema to local
npx supabase db pull

# Reset local database
npx supabase db reset
```

### Local Development

```bash
# Start local Supabase instance (Docker required)
npx supabase start

# Stop local instance
npx supabase stop

# View local instance status
npx supabase status

# View Studio URL (local database UI)
npx supabase status | grep "Studio URL"
```

---

## Phase 8 Specific Commands

### Deploy CometChat User Sync Function

```bash
# Deploy the function
npx supabase functions deploy cometchat-user-sync

# Set required secrets
npx supabase secrets set COMETCHAT_APP_ID=your-app-id
npx supabase secrets set COMETCHAT_API_KEY=your-api-key
npx supabase secrets set COMETCHAT_REGION=us

# Verify deployment
npx supabase functions list

# Check logs
npx supabase functions logs cometchat-user-sync --tail
```

### Apply Database Trigger Migration

```bash
# Check if migration is pending
npx supabase db diff

# Apply the migration (if connected to remote)
npx supabase db push

# Or apply via SQL Editor in Supabase Dashboard
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Check version | `npx supabase --version` |
| Link project | `npx supabase link --project-ref XXX` |
| Deploy function | `npx supabase functions deploy <name>` |
| View logs | `npx supabase functions logs <name> --tail` |
| Set secret | `npx supabase secrets set KEY=value` |
| Check status | `npx supabase status` |
| Apply migrations | `npx supabase db push` |

---

## Troubleshooting

### "supabase: command not found"

**Solution**: Use `npx supabase` instead of just `supabase`

The CLI is installed locally in the project, not globally. Always prefix with `npx`.

### "Not linked to remote project"

**Solution**: Link your project first

```bash
npx supabase link --project-ref your-project-ref
```

Find your project ref in: Supabase Dashboard > Settings > API > Project URL

### "Docker not running" (for local development)

**Solution**: Start Docker Desktop

Local Supabase (`supabase start`) requires Docker to be running.

### "Permission denied"

**Solution**: Run as administrator or use npx

On Windows, some commands may require administrator privileges.

---

## Alternative: Global Installation (Not Recommended)

If you really want global installation, use Scoop:

```powershell
# Install Scoop (if not installed)
iwr -useb get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Note**: The project approach (npx) is recommended to ensure version consistency across the team.

---

## Next Steps for Phase 8 Setup

Now that Supabase CLI is installed, follow these steps:

1. **Link your project**:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

2. **Set CometChat secrets**:
   ```bash
   npx supabase secrets set COMETCHAT_APP_ID=your-app-id
   npx supabase secrets set COMETCHAT_API_KEY=your-api-key
   npx supabase secrets set COMETCHAT_REGION=us
   ```

3. **Deploy user sync function**:
   ```bash
   npx supabase functions deploy cometchat-user-sync
   ```

4. **Apply database migration**:
   ```bash
   npx supabase db push
   ```

5. **Test the integration**:
   ```bash
   npx supabase functions logs cometchat-user-sync --tail
   ```

See `docs/cometchat-quick-start.md` for complete setup instructions.

---

**Installation Date**: 2026-02-03
**Installed By**: npm (dev dependency)
**Version**: 2.75.0
**Documentation**: https://supabase.com/docs/guides/cli
