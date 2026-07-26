'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/**
 * Global navigation button shown on pages that don't have their own back button.
 * - Hidden on: home, auth pages, dashboard (has its own nav), settings (has own back link)
 * - Hidden on: student/teacher/admin pages (their layouts have BackToDashboard)
 * - Shown on: standalone pages like /notifications, /recordings, /quiz, /leaderboard,
 *   /book, /booking/*, /class/*, /learning-path, /onboarding/*
 */
export function GlobalHomeButton() {
  const pathname = usePathname();
  const t = useTranslations('dashboard.nav');
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  // Strip locale prefix for route matching
  const segments = pathname.split('/').filter(Boolean);
  const hasLocale = segments.length > 0 && /^[a-z]{2}$/.test(segments[0]);
  const pathWithoutLocale = hasLocale
    ? '/' + segments.slice(1).join('/')
    : pathname;

  // Hide on home page
  if (pathWithoutLocale === '/' || pathWithoutLocale === '') return null;

  // Hide on pages that already have their own back/nav button
  const sectionsWithOwnNav = ['/auth', '/dashboard', '/settings', '/student', '/teacher', '/admin'];
  const hasOwnNav = sectionsWithOwnNav.some(
    (s) => pathWithoutLocale === s || pathWithoutLocale.startsWith(s + '/')
  );
  if (hasOwnNav) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <Button
        variant="secondary"
        size="sm"
        className="global-home-btn rounded-full shadow-lg backdrop-blur-md gap-1.5"
        asChild
      >
        <Link href="/dashboard">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('home')}</span>
        </Link>
      </Button>
    </div>
  );
}
