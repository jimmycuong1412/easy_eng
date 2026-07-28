'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { useAuth } from '@easyeng/core';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle, isLoading, error } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);

  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const authError = searchParams.get('error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError(t('errors.emptyFields'));
      return;
    }

    try {
      await signIn(email, password);
      router.push(redirectTo);
    } catch (_err) {
      setFormError(t('errors.invalidCredentials'));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (_err) {
      setFormError(t('errors.googleFailed'));
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p className="et-eyebrow">Welcome back</p>
        <h1
          style={{
            fontSize: 'clamp(36px, 4.5vw, 52px)',
            marginTop: 8,
            letterSpacing: '-0.025em',
            fontWeight: 700,
            lineHeight: 1.02,
            color: 'var(--et-fg)',
          }}
        >
          {t('title')}
        </h1>
        <p className="et-body" style={{ marginTop: 10, maxWidth: 340, marginInline: 'auto' }}>
          {t('subtitle')}
        </p>
      </div>

      <article
        className="et-card"
        style={{ padding: 28, display: 'flex', flexDirection: 'column' }}
      >
        {(formError || authError || error) && (
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
            {formError || authError || error?.message}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="et-btn secondary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px 16px',
            fontSize: 14,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#ffffff"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34d399"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#fbbf24"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#ef4444"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t('googleSignIn')}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0',
            color: 'var(--et-fg-3)',
          }}
        >
          <span style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
          <span
            style={{
              fontFamily: 'var(--et-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {tCommon('or')}
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label htmlFor="email" className="et-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              className="input"
              style={authInputStyle}
            />
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <label htmlFor="password" className="et-eyebrow">
                {t('password')}
              </label>
              <Link
                href="/auth/forgot-password"
                style={{
                  fontSize: 12,
                  color: 'var(--et-violet-2)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {t('forgotPassword')}
              </Link>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              className="input"
              style={authInputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="et-btn primary lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
          >
            {isLoading ? '…' : t('submit')}
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
        {t('noAccount')}{' '}
        <Link
          href="/auth/signup"
          style={{
            color: 'var(--et-violet-2)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {t('signUp')}
        </Link>
      </p>
    </div>
  );
}

const authInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-secondary)',
  color: 'var(--et-fg)',
  fontSize: 14,
  outline: 'none',
};
