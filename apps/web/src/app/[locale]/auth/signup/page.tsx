'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useAuth } from '@easyeng/core';

type UserRole = 'student' | 'teacher' | 'parent';

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

export default function SignUpPage() {
  const router = useRouter();
  const t = useTranslations('auth.signup');
  const { signUp, signInWithGoogle, isLoading, error } = useAuth();

  const roleOptions: { value: UserRole; label: string; icon: string; description: string; accent: string }[] = [
    {
      value: 'student',
      label: t('roles.student.label'),
      icon: '📚',
      description: t('roles.student.description'),
      accent: '#7c5cff',
    },
    {
      value: 'teacher',
      label: t('roles.teacher.label'),
      icon: '👨‍🏫',
      description: t('roles.teacher.description'),
      accent: '#4c6bff',
    },
    {
      value: 'parent',
      label: t('roles.parent.label'),
      icon: '👪',
      description: t('roles.parent.description'),
      accent: '#ec4899',
    },
  ];

  const [step, setStep] = React.useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = React.useState<UserRole | null>(null);
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError(t('errors.nameRequired'));
      return;
    }
    if (!email) {
      setFormError(t('errors.emailRequired'));
      return;
    }
    if (password.length < 8) {
      setFormError(t('errors.passwordMin'));
      return;
    }
    if (password !== confirmPassword) {
      setFormError(t('errors.passwordMismatch'));
      return;
    }

    try {
      await signUp(email, password, fullName);
      setSuccess(true);
    } catch (_err) {
      setFormError(t('errors.createFailed'));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (_err) {
      setFormError(t('errors.googleFailed'));
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
        <p className="et-eyebrow">{t('successEyebrow')}</p>
        <h1
          style={{
            fontSize: 'clamp(32px, 4vw, 44px)',
            marginTop: 8,
            fontWeight: 700,
            color: 'var(--et-fg)',
            letterSpacing: '-0.025em',
          }}
        >
          {t('successTitle')}
        </h1>
        <p className="et-body" style={{ marginTop: 14, maxWidth: 360, marginInline: 'auto' }}>
          {t('successBody', { email })}
        </p>
        <button
          type="button"
          onClick={() => router.push('/auth/login')}
          className="et-btn primary"
          style={{ marginTop: 22 }}
        >
          {t('backToLogin')} <ArrowRight />
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p className="et-eyebrow">{step === 'role' ? t('step1of2') : t('step2of2')}</p>
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
          {step === 'role' ? t('chooseRole') : t('createAccount')}
        </h1>
        <p className="et-body" style={{ marginTop: 10, maxWidth: 360, marginInline: 'auto' }}>
          {step === 'role'
            ? t('rolePrompt')
            : `${t('detailsPromptPrefix')} ${roleOptions.find((r) => r.value === selectedRole)?.label}`}
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

        {step === 'role' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {roleOptions.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleSelect(role.value)}
                style={{
                  width: '100%',
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid rgba(91, 141, 255, 0.20)',
                  background: '#0a1845',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'background 0.15s, border-color 0.15s',
                  color: 'var(--et-fg)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#15235e';
                  e.currentTarget.style.borderColor = `${role.accent}55`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0a1845';
                  e.currentTarget.style.borderColor = 'rgba(91, 141, 255, 0.20)';
                }}
              >
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${role.accent}1f`,
                    border: `1px solid ${role.accent}40`,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 24,
                  }}
                >
                  {role.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: 'var(--et-fg)',
                      letterSpacing: '-0.012em',
                    }}
                  >
                    {role.label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--et-fg-3)',
                      marginTop: 2,
                    }}
                  >
                    {role.description}
                  </div>
                </div>
                <span style={{ color: role.accent }}>
                  <ArrowRight />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <button
              onClick={() => setStep('role')}
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--et-fg-3)',
                fontSize: 13,
                cursor: 'pointer',
                marginBottom: 18,
                padding: 0,
              }}
            >
              {t('backToRole')}
            </button>

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
              {t('googleSignUp')}
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
              <span style={{ flex: 1, height: 1, background: 'rgba(91, 141, 255, 0.20)' }} />
              <span
                style={{
                  fontFamily: 'var(--et-mono)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {t('or')}
              </span>
              <span style={{ flex: 1, height: 1, background: 'rgba(91, 141, 255, 0.20)' }} />
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div>
                <label
                  htmlFor="fullName"
                  className="et-eyebrow"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  {t('fullName')}
                </label>
                <input
                  id="fullName"
                  type="text"
                  placeholder={t('namePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="et-eyebrow"
                  style={{ display: 'block', marginBottom: 8 }}
                >
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
                <label
                  htmlFor="password"
                  className="et-eyebrow"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  {t('password')}
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="et-eyebrow"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  {t('confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('confirmPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="et-btn primary lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
              >
                {isLoading ? '…' : t('submitCreate')} <ArrowRight />
              </button>
            </form>

            <p
              className="et-tiny"
              style={{ textAlign: 'center', marginTop: 18 }}
            >
              {t('termsText')}{' '}
              <Link
                href="/terms"
                style={{
                  color: 'var(--et-violet-2)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {t('termsLink')}
              </Link>{' '}
              {t('and')}{' '}
              <Link
                href="/privacy"
                style={{
                  color: 'var(--et-violet-2)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {t('privacyLink')}
              </Link>
            </p>
          </>
        )}
      </article>

      <p
        style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 14,
          color: 'var(--et-fg-2)',
        }}
      >
        {t('hasAccount')}{' '}
        <Link
          href="/auth/login"
          style={{
            color: 'var(--et-violet-2)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
