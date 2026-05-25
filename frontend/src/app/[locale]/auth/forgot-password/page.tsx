'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';

import { useAuth } from '@/hooks/useAuth';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid rgba(91, 141, 255, 0.20)',
  background: '#0a1845',
  color: 'var(--et-fg)',
  fontSize: 14,
  outline: 'none',
};

function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const { resetPassword, isLoading, error } = useAuth();

  const [email, setEmail] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email) {
      setFormError('Vui lòng nhập email');
      return;
    }
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (_err) {
      setFormError('Không thể gửi email khôi phục. Vui lòng thử lại.');
    }
  };

  if (success) {
    return (
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(52, 211, 153, 0.15)',
            color: '#34d399',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 18px',
            border: '1px solid rgba(52, 211, 153, 0.35)',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <p className="et-eyebrow">Sent</p>
        <h1
          style={{
            fontSize: 'clamp(32px, 4vw, 44px)',
            marginTop: 8,
            fontWeight: 700,
            color: 'var(--et-fg)',
            letterSpacing: '-0.025em',
          }}
        >
          Kiểm tra email.
        </h1>
        <p className="et-body" style={{ marginTop: 14, maxWidth: 380, marginInline: 'auto' }}>
          Nếu email <strong style={{ color: 'var(--et-fg)' }}>{email}</strong> tồn tại trong hệ
          thống, bạn sẽ nhận được link khôi phục mật khẩu. Vui lòng kiểm tra hộp thư (kể cả spam).
        </p>
        <Link href="/auth/login" className="et-btn primary" style={{ marginTop: 22 }}>
          Quay lại đăng nhập <ArrowRight />
        </Link>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p className="et-eyebrow">Reset password</p>
        <h1
          style={{
            fontSize: 'clamp(32px, 4vw, 46px)',
            marginTop: 8,
            letterSpacing: '-0.025em',
            fontWeight: 700,
            lineHeight: 1.05,
            color: 'var(--et-fg)',
          }}
        >
          Quên mật khẩu?
        </h1>
        <p className="et-body" style={{ marginTop: 10, maxWidth: 360, marginInline: 'auto' }}>
          Nhập email của bạn và chúng tôi sẽ gửi link khôi phục mật khẩu.
        </p>
      </div>

      <article className="et-card" style={{ padding: 28 }}>
        {(formError || error) && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#fca5a5',
              fontSize: 13,
              marginBottom: 18,
              border: '1px solid rgba(239, 68, 68, 0.30)',
            }}
          >
            {formError || error?.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              htmlFor="email"
              className="et-eyebrow"
              style={{ display: 'block', marginBottom: 8 }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="et-btn primary lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
          >
            {isLoading ? '…' : 'Gửi link khôi phục'} <ArrowRight />
          </button>
        </form>
      </article>

      <p
        style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 14,
          color: 'var(--et-fg-2)',
        }}
      >
        Nhớ mật khẩu rồi?{' '}
        <Link
          href="/auth/login"
          style={{
            color: 'var(--et-violet-2)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
