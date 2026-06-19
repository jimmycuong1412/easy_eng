'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

/**
 * Back to Dashboard button shown on pages outside the dashboard layout.
 * Used in student, teacher, and admin sections.
 */
export function BackToDashboard() {
  const t = useTranslations('dashboard.nav');

  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4"
    >
      <ChevronLeft className="w-4 h-4" />
      <span>{t('home')}</span>
    </Link>
  );
}
