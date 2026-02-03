# CometChat Quick Start - 5 Minute Setup

**For**: Developers setting up local development environment
**Phase**: 8 - CometChat Video Integration

---

## Prerequisites ✓

- Node.js 20+ installed
- Supabase CLI installed (`npm install -g supabase`)
- CometChat account (free tier is fine for dev)

---

## 1️⃣ Get CometChat Credentials (2 minutes)

1. Go to: https://app.cometchat.com/
2. Sign up or log in
3. Click "Create New App" or select existing app
4. Copy these 4 values:

```
App ID:    ___________________________
API Key:   ___________________________
Auth Key:  ___________________________
Region:    us  (or eu)
```

---

## 2️⃣ Configure Frontend (30 seconds)

Create/edit `frontend/.env.local`:

```env
# CometChat - Get from https://app.cometchat.com/
NEXT_PUBLIC_COMETCHAT_APP_ID=your-app-id-here
NEXT_PUBLIC_COMETCHAT_REGION=us
NEXT_PUBLIC_COMETCHAT_AUTH_KEY=your-auth-key-here
```

---

## 3️⃣ Configure Supabase (1 minute)

```bash
# Set secrets for Edge Functions
cd F:/Git/easy_eng

supabase secrets set COMETCHAT_APP_ID=your-app-id-here
supabase secrets set COMETCHAT_API_KEY=your-api-key-here
supabase secrets set COMETCHAT_REGION=us
```

---

## 4️⃣ Update Database Config (30 seconds)

Get your Supabase project URL:
- Go to: https://supabase.com/dashboard
- Click your project
- Go to: Settings > API
- Copy "Project URL" (e.g., `https://abcd1234.supabase.co`)

Update webhook URL:

```sql
-- Run this in Supabase SQL Editor
UPDATE public.system_settings
SET value = 'https://YOUR-PROJECT-URL.supabase.co/functions/v1/cometchat-user-sync'
WHERE key = 'cometchat_webhook_url';
```

---

## 5️⃣ Deploy Edge Function (30 seconds)

```bash
supabase functions deploy cometchat-user-sync
```

---

## 6️⃣ Test It Works (1 minute)

### Quick Test - Create a User

```sql
-- Run in Supabase SQL Editor
INSERT INTO public.profiles (id, email, display_name, role)
VALUES (
  gen_random_uuid(),
  'devtest@example.com',
  'Dev Test User',
  'student'
);
```

### Check Logs

```bash
# Should show "Successfully synced profile..."
supabase functions logs cometchat-user-sync --tail
```

### Verify in CometChat

1. Go to: https://app.cometchat.com/
2. Click "Users" tab
3. You should see "Dev Test User" in the list ✓

---

## ✅ You're Done!

Video features now work locally:
- Teachers can start video classes
- Students can join video calls
- All users automatically sync to CometChat

---

## Common Issues

### "Function not found"
**Fix**: Deploy the function
```bash
supabase functions deploy cometchat-user-sync
```

### "Invalid credentials"
**Fix**: Double-check your App ID and API Key in CometChat dashboard

### "User not syncing"
**Fix**: Check webhook URL is correct
```sql
SELECT value FROM public.system_settings WHERE key = 'cometchat_webhook_url';
```

---

## Next Steps

- Read full setup guide: `docs/cometchat-setup-guide.md`
- Test video calls: Login as teacher → Create class → Start class
- Review components: `frontend/src/components/video/`

---

**Need Help?** Check `docs/cometchat-setup-guide.md` for detailed troubleshooting.

**Ready to Test?** Login as a teacher and click "Start Class" on any scheduled class!
