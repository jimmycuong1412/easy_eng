'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';

import { useAuth } from '@/hooks/useAuth';
import { ArrowRIcon, CheckIcon } from '@/components/editorial/Icons';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--ed-rule-strong)',
  background: 'var(--ed-paper)',
  color: 'var(--ed-ink-2)',
  fontFamily: 'var(--ed-sans)',
  fontSize: 14,
  outline: 'none',
};

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
    } catch (err) {
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
            background: 'var(--ed-coral-2)',
            color: 'var(--ed-coral-ink)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 18px',
          }}
        >
          <CheckIcon />
        </div>
        <p className="ed-eyebrow">Sent</p>
        <h1
          className="ed-display"
          style={{ fontSize: 'clamp(32px, 4vw, 44px)', marginTop: 8 }}
        >
          Kiểm tra email.
        </h1>
        <p className="ed-body" style={{ marginTop: 14, maxWidth: 380, marginInline: 'auto' }}>
          Nếu email <strong style={{ color: 'var(--ed-ink-2)' }}>{email}</strong> tồn tại trong hệ
          thống, bạn sẽ nhận được link khôi phục mật khẩu. Vui lòng kiểm tra hộp thư (kể cả spam).
        </p>
        <Link href="/auth/login" className="ed-btn ed-btn-primary" style={{ marginTop: 22 }}>
          Quay lại đăng nhập <ArrowRIcon />
        </Link>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p className="ed-eyebrow">Reset password</p>
        <h1
          className="ed-display"
          style={{
            fontSize: 'clamp(32px, 4vw, 46px)',
            marginTop: 8,
            letterSpacing: '-0.025em',
          }}
        >
          Quên mật khẩu?
        </h1>
        <p className="ed-body" style={{ marginTop: 10, maxWidth: 360, marginInline: 'auto' }}>
          Nhập email của bạn và chúng tôi sẽ gửi link khôi phục mật khẩu.
        </p>
      </div>

      <article className="ed-card" style={{ padding: 28 }}>
        {(formError || error) && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--ed-coral-2)',
              color: 'var(--ed-coral-ink)',
              fontFamily: 'var(--ed-sans)',
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            {formError || error?.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="email" className="ed-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
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
            className="ed-btn ed-btn-primary ed-btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
          >
            {isLoading ? '…' : 'Gửi link khôi phục'} <ArrowRIcon />
          </button>
        </form>
      </article>

      <p
        style={{
          textAlign: 'center',
          marginTop: 20,
          fontFamily: 'var(--ed-sans)',
          fontSize: 14,
          color: 'var(--ed-ink-soft)',
        }}
      >
        Nhớ mật khẩu rồi?{' '}
        <Link
          href="/auth/login"
          style={{
            color: 'var(--ed-ink-2)',
            fontWeight: 600,
            textDecoration: 'underline',
            textDecorationColor: 'var(--ed-rule-strong)',
            textUnderlineOffset: 4,
          }}
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
