'use client';

export const dynamic = 'force-dynamic';

/**
 * Referral capture route: /{locale}/ref/{code}
 * Stores the code, then sends the visitor to signup. The code is redeemed
 * after they log in (see ReferralRedeemer mounted in the dashboard layout).
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReferralCapturePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'vi';
  const code = (params?.code as string) ?? '';

  useEffect(() => {
    if (code) {
      try { localStorage.setItem('pending_referral_code', code.toUpperCase()); } catch {}
    }
    router.replace(`/${locale}/auth/signup`);
  }, [code, locale, router]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--et-bg)' }}>
      <p style={{ color: 'var(--et-fg-2)', fontFamily: 'var(--et-sans)' }}>
        Đang áp dụng mã giới thiệu…
      </p>
    </div>
  );
}
