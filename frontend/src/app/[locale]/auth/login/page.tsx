'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRIcon } from '@/components/editorial/Icons';

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
    } catch (err) {
      setFormError(t('errors.invalidCredentials'));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setFormError(t('errors.googleFailed'));
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p className="ed-eyebrow">Welcome back</p>
        <h1
          className="ed-display"
          style={{
            fontSize: 'clamp(36px, 4.5vw, 52px)',
            marginTop: 8,
            letterSpacing: '-0.025em',
          }}
        >
          {t('title')}
        </h1>
        <p className="ed-body" style={{ marginTop: 10, maxWidth: 340, marginInline: 'auto' }}>
          {t('subtitle')}
        </p>
      </div>

      <article className="ed-card" style={{ padding: 28 }}>
        {/* Error messages */}
        {(formError || authError || error) && (
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
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            {formError || authError || error?.message}
          </div>
        )}

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="ed-btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px 16px',
            fontSize: 14,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t('googleSignIn')}
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0',
            color: 'var(--ed-ink-mute)',
          }}
        >
          <span style={{ flex: 1, height: 1, background: 'var(--ed-rule)' }} />
          <span
            className="ed-tiny"
            style={{
              fontFamily: 'var(--ed-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {tCommon('or')}
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--ed-rule)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="email" className="ed-eyebrow" style={{ display: 'block', marginBottom: 8 }}>
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
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <label htmlFor="password" className="ed-eyebrow">
                {t('password')}
              </label>
              <Link
                href="/auth/forgot-password"
                style={{
                  fontFamily: 'var(--ed-sans)',
                  fontSize: 12,
                  color: 'var(--ed-ink-soft)',
                  textDecoration: 'none',
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
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="ed-btn ed-btn-primary ed-btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
          >
            {isLoading ? '…' : t('submit')} <ArrowRIcon />
          </button>
        </form>
      </article>

      {/* Sign up link */}
      <p
        style={{
          textAlign: 'center',
          marginTop: 20,
          fontFamily: 'var(--ed-sans)',
          fontSize: 14,
          color: 'var(--ed-ink-soft)',
        }}
      >
        {t('noAccount')}{' '}
        <Link
          href="/auth/signup"
          style={{
            color: 'var(--ed-ink-2)',
            fontWeight: 600,
            textDecoration: 'underline',
            textDecorationColor: 'var(--ed-rule-strong)',
            textUnderlineOffset: 4,
          }}
        >
          {t('signUp')}
        </Link>
      </p>
    </div>
  );
}

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
  transition: 'border-color 0.12s, box-shadow 0.12s',
};
