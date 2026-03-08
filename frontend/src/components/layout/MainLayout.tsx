/**
 * Main Layout Component
 *
 * Base layout with header, navigation, and footer
 */

'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import RoleBasedNav from './RoleBasedNav';
import { useAuth } from '@/hooks/useAuth';

interface MainLayoutProps {
  children: React.ReactNode;
}

const authRoutes = ['/auth/login', '/auth/register', '/auth/reset-password'];

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations('layout');
  const isAuthenticated = !!user;

  // Check if current route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname?.includes(route));

  // Don't show navigation on auth pages
  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Header with Navigation */}
      {isAuthenticated && (
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-50 w-full border-b border-border-default bg-surface-elevated/95 backdrop-blur supports-[backdrop-filter]:bg-surface-elevated/60"
        >
          <RoleBasedNav />
        </motion.header>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      {isAuthenticated && (
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="border-t border-border-default bg-surface-elevated"
        >
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-subtle">
              <p>{t('footerCopyright', { year: new Date().getFullYear() })}</p>
              <div className="flex gap-6">
                <a href="/terms" className="hover:text-text-primary transition-colors">
                  {t('footerTerms')}
                </a>
                <a href="/privacy" className="hover:text-text-primary transition-colors">
                  {t('footerPrivacy')}
                </a>
                <a href="/help" className="hover:text-text-primary transition-colors">
                  {t('footerHelp')}
                </a>
              </div>
            </div>
          </div>
        </motion.footer>
      )}
    </div>
  );
}
