'use client';

/**
 * ReferralRedeemer — silently redeems a pending referral code after the user
 * logs in. The code is captured by /{locale}/ref/{code} into localStorage
 * before signup; once authenticated we call redeem_referral_code once.
 */

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ReferralRedeemer() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let code: string | null = null;
      try { code = localStorage.getItem('pending_referral_code'); } catch {}
      if (!code) return;

      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase.rpc('redeem_referral_code', { p_code: code });
      // Clear on any definitive outcome (success or non-retryable error) so we
      // don't keep retrying. invalid_code / already_referred / self_referral are final.
      if (!error) {
        const res = Array.isArray(data) ? data[0] : data;
        if (res?.ok || ['invalid_code', 'already_referred', 'self_referral'].includes(res?.error)) {
          try { localStorage.removeItem('pending_referral_code'); } catch {}
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return null;
}
