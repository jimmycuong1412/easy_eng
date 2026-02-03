// Task: T135 - Referral abuse detection
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async () => {
  // Detect multiple referrals from same IP/device
  const { data } = await supabase.rpc('detect_gem_fraud');

  for (const alert of data || []) {
    await supabase.from('fraud_alerts').insert({
      user_id: alert.user_id,
      alert_type: 'referral_abuse',
      severity: 'medium',
      details: { issue: alert.issue },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
