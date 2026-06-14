/**
 * send-daily-reminder — Web Push "keep your streak" nudge (Growth 1.3 delivery)
 *
 * Sends a browser push to students who have NOT recorded a learning activity
 * today (Asia/Ho_Chi_Minh) and have a current streak ≥ 1 to protect.
 * Run on a cron (e.g. 20:00 ICT = 13:00 UTC) with the x-cron-secret header.
 *
 * Uses the standard `web-push` npm library via esm.sh — accepts the raw
 * base64url VAPID keys produced by `npx web-push generate-vapid-keys`.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
 *      VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), FRONTEND_URL, CRON_SECRET.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@easyeng.app';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'https://easyeng-dev.vercel.app';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function todayICT(): string {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = todayICT();

    const { data: atRisk, error } = await supabase
      .from('attendance_streaks')
      .select('student_id, current_streak, last_attendance_date')
      .gte('current_streak', 1)
      .neq('last_attendance_date', today);
    if (error) throw error;

    const userIds = (atRisk ?? []).map((r) => r.student_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no at-risk users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds);
    if (subErr) throw subErr;

    const streakByUser = new Map((atRisk ?? []).map((r) => [r.student_id, r.current_streak]));
    let sent = 0; const stale: string[] = [];

    for (const s of subs ?? []) {
      const streak = streakByUser.get(s.user_id) ?? 0;
      const payload = JSON.stringify({
        title: '🔥 Đừng để mất chuỗi học!',
        body: `Bạn đang có ${streak} ngày liên tục. Học một chút hôm nay để giữ chuỗi nhé!`,
        url: `${FRONTEND_URL}/vi/dashboard`,
      });
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) stale.push(s.endpoint);
      }
    }

    if (stale.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', stale);
    }

    return new Response(JSON.stringify({ sent, at_risk: userIds.length, pruned: stale.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
