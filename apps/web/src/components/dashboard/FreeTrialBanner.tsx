'use client';

/**
 * FreeTrialBanner — nudges new users to book their free trial lesson while they
 * still have the welcome gems and haven't booked yet (Growth 3.1 / conversion).
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Gift, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function FreeTrialBanner() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'vi';
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient() as any;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase.rpc('get_free_trial_status');
        if (error) return;
        const row = Array.isArray(data) ? data[0] : data;
        // Show only if they still have the trial available and enough gems.
        if (row?.trial_available && (row?.gem_balance ?? 0) >= 200) setShow(true);
      } catch { /* ignore */ }
    })();
  }, []);

  if (!show) return null;

  return (
    <Link
      href={`/${locale}/dashboard/teachers`}
      className="group block rounded-2xl p-5 transition-transform hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(135deg, var(--et-coral) 0%, #ff5a8a 100%)',
        color: '#fff',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Gift className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold">🎁 Bạn có 1 buổi học thử MIỄN PHÍ!</p>
          <p className="mt-0.5 text-sm" style={{ opacity: 0.92 }}>
            Dùng quà chào mừng để đặt buổi học 1-1 đầu tiên với giáo viên — không mất phí.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold"
              style={{ background: '#fff', color: 'var(--et-coral)' }}>
          Đặt ngay <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
