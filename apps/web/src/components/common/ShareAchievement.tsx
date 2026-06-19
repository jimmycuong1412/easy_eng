'use client';

/**
 * ShareAchievement — share a generated achievement card to Facebook/Zalo or
 * copy the link (Growth 2.3). The shared URL points at /share/{kind} which
 * carries the OG image so the social preview renders the card.
 */

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface Props {
  kind: 'streak' | 'level' | 'referral' | 'certificate';
  value: string | number;
  name?: string;
  label?: string;
  compact?: boolean;
}

export default function ShareAchievement({ kind, value, name, label, compact }: Props) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://easyeng-dev.vercel.app';
  const shareUrl = `${origin}/vi/share/${kind}?value=${encodeURIComponent(String(value))}${name ? `&name=${encodeURIComponent(name)}` : ''}`;

  const share = async () => {
    const data = {
      title: 'EasyEng',
      text: `Thành tích học tiếng Anh của tôi trên EasyEng!`,
      url: shareUrl,
    };
    try {
      if (navigator.share) { await navigator.share(data); return; }
    } catch { /* fall through to FB */ }
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  if (compact) {
    return (
      <button
        onClick={share}
        title="Chia sẻ thành tích"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
        style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)', border: '1px solid var(--et-line)' }}
      >
        <Share2 className="h-3.5 w-3.5" /> Chia sẻ
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={share}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
        style={{ background: 'var(--et-coral)' }}
      >
        <Share2 className="h-4 w-4" /> {label ?? 'Chia sẻ'}
      </button>
      <button
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
        style={{ background: 'var(--et-bg-3)', color: 'var(--et-fg-2)', border: '1px solid var(--et-line)' }}
      >
        {copied ? <Check className="h-4 w-4" /> : 'Sao chép link'}
      </button>
    </div>
  );
}
