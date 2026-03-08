'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Bell,
  Globe,
  CreditCard,
  Share2,
  ChevronLeft,
} from 'lucide-react';

import { cn } from '@/lib/utils';

type NavItem = {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  descriptionKey: string;
};

const settingsNavItems: NavItem[] = [
  {
    titleKey: 'profile',
    href: '/settings/profile',
    icon: User,
    descriptionKey: 'profile',
  },
  {
    titleKey: 'security',
    href: '/settings/security',
    icon: Shield,
    descriptionKey: 'security',
  },
  {
    titleKey: 'notifications',
    href: '/settings/notifications',
    icon: Bell,
    descriptionKey: 'notifications',
  },
  {
    titleKey: 'preferences',
    href: '/settings/preferences',
    icon: Globe,
    descriptionKey: 'preferences',
  },
  {
    titleKey: 'billing',
    href: '/settings/billing',
    icon: CreditCard,
    descriptionKey: 'billing',
  },
  {
    titleKey: 'referral',
    href: '/settings/referral',
    icon: Share2,
    descriptionKey: 'referral',
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('settings');

  // Match active item against locale-aware pathname
  const isActive = (href: string) => {
    return pathname === `/${locale}${href}` || pathname === href;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('backToDashboard')}
          </Link>
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-slate-400 mt-1">{t('subtitle')}</p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:w-64 flex-shrink-0"
          >
            <div className="bg-white/5 rounded-2xl border border-white/10 p-2 space-y-1">
              {settingsNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={`/${locale}${item.href}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                      active
                        ? 'bg-[#3B82F6] text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{t(`nav.${item.titleKey}.title`)}</p>
                      <p className={cn(
                        'text-xs',
                        active ? 'text-white/70' : 'text-slate-500'
                      )}>
                        {t(`nav.${item.descriptionKey}.description`)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.nav>

          {/* Main Content */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 min-w-0"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
