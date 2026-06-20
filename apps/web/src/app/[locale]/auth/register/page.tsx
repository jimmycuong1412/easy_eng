'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { useAuth } from '@easyeng/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type UserRole = 'student' | 'teacher' | 'parent';

export default function RegisterPage() {
  const t = useTranslations('auth.register');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { signUp, signInWithGoogle, isLoading, error } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [role, setRole] = React.useState<UserRole>('student');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Validation
    if (!email || !password || !confirmPassword || !fullName) {
      setFormError(t('errors.emptyFields'));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t('errors.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      setFormError(t('errors.passwordTooShort'));
      return;
    }

    try {
      await signUp(email, password, fullName);
      setSuccessMessage(t('success.checkEmail'));
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      setFormError(t('errors.registrationFailed'));
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <Card variant="glass" className="border-border-default">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success message */}
          {successMessage && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
              {successMessage}
            </div>
          )}

          {/* Error messages */}
          {(formError || error) && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {formError || error?.message}
            </div>
          )}

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-elevated px-2 text-xs text-text-subtle">
              {tCommon('or')}
            </span>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('fields.fullName')}</Label>
              <Input
                id="fullName"
                type="text"
                placeholder={t('placeholders.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('fields.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('placeholders.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t('fields.role')}</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{t('roles.student')}</SelectItem>
                  <SelectItem value="teacher">{t('roles.teacher')}</SelectItem>
                  <SelectItem value="parent">{t('roles.parent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('fields.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('placeholders.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
              <p className="text-xs text-text-subtle">{t('hints.password')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('fields.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('placeholders.confirmPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? tCommon('loading') : t('submit')}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-text-subtle">{t('haveAccount')} </span>
            <Link href="/auth/login" className="text-primary hover:underline">
              {t('signIn')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
