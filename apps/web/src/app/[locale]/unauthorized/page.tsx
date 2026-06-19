'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

import { ArrowRIcon } from '@/components/editorial/Icons';

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptedPath = searchParams.get('from');

  return (
    <div
      className="ed-frame"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: 'var(--ed-coral-2)',
            color: 'var(--ed-coral-ink)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 22px',
          }}
          aria-hidden
        >
          <ShieldX size={36} />
        </div>

        <p className="ed-eyebrow">Access denied · 403</p>
        <h1
          className="ed-display"
          style={{
            fontSize: 'clamp(36px, 4.5vw, 52px)',
            marginTop: 8,
            letterSpacing: '-0.025em',
          }}
        >
          Truy cập bị từ chối.
        </h1>
        <p
          className="ed-body"
          style={{ marginTop: 14, maxWidth: 380, marginInline: 'auto' }}
        >
          Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
        </p>

        {attemptedPath && (
          <div
            className="ed-card"
            style={{
              marginTop: 22,
              padding: 14,
              textAlign: 'left',
              maxWidth: 380,
              marginInline: 'auto',
            }}
          >
            <p className="ed-eyebrow" style={{ marginBottom: 6 }}>
              Đường dẫn yêu cầu
            </p>
            <code
              style={{
                fontFamily: 'var(--ed-mono)',
                fontSize: 12,
                color: 'var(--ed-ink-soft)',
                wordBreak: 'break-all',
              }}
            >
              {attemptedPath}
            </code>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            marginTop: 24,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="ed-btn"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="ed-btn ed-btn-primary"
          >
            <Home size={16} /> Về trang chủ <ArrowRIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
