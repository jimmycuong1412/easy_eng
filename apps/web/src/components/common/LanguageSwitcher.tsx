'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

import { locales, localeNames, type Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';

const localeFlags: Record<Locale, string> = {
  vi: '🇻🇳',
  en: '🇺🇸',
};

/**
 * Simple toggle button — switches between the two available locales.
 * When the user is authenticated, also persists the choice to their profile.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = async (newLocale: Locale) => {
    // Clear the middleware role-cache cookies AND update the DB locale.
    // Must await this before navigating — otherwise the middleware reads the
    // stale x-user-locale cookie and redirects back to the old locale.
    await fetch('/api/auth/set-locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    }).catch(() => {
      // Ignore errors — user may not be authenticated (public pages)
    });

    // Navigate to the new locale prefix
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  const otherLocale = locales.find((l) => l !== locale) as Locale;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => switchLocale(otherLocale)}
      className="flex items-center gap-2 text-slate-400 hover:text-white"
      title={`Switch to ${localeNames[otherLocale]}`}
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">{localeNames[otherLocale]}</span>
      <span className="sm:hidden">{localeFlags[otherLocale]}</span>
    </Button>
  );
}

/**
 * Dropdown selector — shows all available locales.
 * When the user is authenticated, also persists the choice to their profile.
 */
export function LanguageDropdown() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = async (newLocale: Locale) => {
    await fetch('/api/auth/set-locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    }).catch(() => {});

    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-slate-400" />
      <select
        value={locale}
        onChange={(e) => switchLocale(e.target.value as Locale)}
        className="bg-transparent text-slate-300 text-sm border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-[#3B82F6]"
        aria-label="Select language"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc} className="bg-[#1E3A5F]">
            {localeFlags[loc]} {localeNames[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
