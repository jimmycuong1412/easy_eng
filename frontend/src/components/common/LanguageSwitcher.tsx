'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

import { locales, localeNames, type Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    // Remove the current locale prefix from pathname
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    // Navigate to the new locale
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  // Get the other locale (for simple toggle)
  const otherLocale = locales.find((l) => l !== locale) as Locale;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => switchLocale(otherLocale)}
      className="flex items-center gap-2 text-slate-400 hover:text-white"
    >
      <Globe className="w-4 h-4" />
      <span>{localeNames[otherLocale]}</span>
    </Button>
  );
}

export function LanguageDropdown() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
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
      >
        {locales.map((loc) => (
          <option key={loc} value={loc} className="bg-[#1E3A5F]">
            {localeNames[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}
