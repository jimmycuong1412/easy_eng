/**
 * CometChat Auth Token Edge Function
 *
 * Shared by web AND mobile (replaces the web-only Next.js
 * /api/cometchat/auth-token route). Holds the CometChat admin API key
 * server-side; the caller authenticates with their Supabase JWT (Authorization
 * header). Ensures the CometChat user exists and mints an auth token.
 *
 * POST body (optional): { targetUserId?: string }  // pre-register a peer
 * Returns: { success, userId, authToken }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const APP_ID = Deno.env.get('COMETCHAT_APP_ID') || '';
const REGION = Deno.env.get('COMETCHAT_REGION') || 'us';
const API_KEY = Deno.env.get('COMETCHAT_API_KEY') || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function ensureCometChatUser(apiUrl: string, uid: string, name: string): Promise<void> {
  const res = await fetch(`${apiUrl}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apiKey: API_KEY, Accept: 'application/json' },
    body: JSON.stringify({ uid, name }),
  });
  if (!res.ok && res.status !== 400) {
    const err = await res.json().catch(() => ({}));
    const code = (err as any)?.data?.code || '';
    if (code !== 'ERR_UID_ALREADY_EXISTS') {
      throw new Error(`Failed to create CometChat user ${uid}: ${JSON.stringify(err)}`);
    }
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    if (!APP_ID || !API_KEY) {
      return json({ error: 'CometChat not configured' }, 500);
    }

    // Authenticate the caller via their Supabase JWT.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = (profile as any)?.full_name || user.email?.split('@')[0] || 'User';

    const apiUrl = `https://${APP_ID}.api-${REGION}.cometchat.io/v3`;

    // Optionally pre-register a peer (e.g. the teacher) so calls can reach them.
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body?.targetUserId || null;
    } catch {
      // no body — fine
    }
    if (targetUserId && targetUserId !== user.id) {
      const { data: t } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', targetUserId)
        .single();
      await ensureCometChatUser(apiUrl, targetUserId, (t as any)?.full_name || 'User');
    }

    await ensureCometChatUser(apiUrl, user.id, userName);

    const tokenRes = await fetch(`${apiUrl}/users/${user.id}/auth_tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apiKey: API_KEY, Accept: 'application/json' },
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      console.error('[cometchat-auth-token] mint failed:', err);
      return json({ error: 'Failed to generate auth token' }, 500);
    }

    const data = await tokenRes.json();
    return json({ success: true, userId: user.id, authToken: data.data.authToken });
  } catch (err) {
    console.error('[cometchat-auth-token] error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
