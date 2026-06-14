'use client';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useGemsBalance } from '@/hooks/useGemsBalance';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GemBadge } from '@/components/features/CookieBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { GemImage } from '@/components/common/GemImage';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import NotificationBell from '@/components/layout/NotificationBell';
import ClassReminderProvider from '@/components/class/ClassReminderProvider';
import ReferralRedeemer from '@/components/student/ReferralRedeemer';

interface NavItem {
  labelKey: string;
  href: string;
  icon: string;
}

const studentNav: NavItem[] = [
  { labelKey: 'home', href: '/dashboard', icon: '🏠' },
  { labelKey: 'findTeachers', href: '/dashboard/teachers', icon: '👨‍🏫' },
  { labelKey: 'schedule', href: '/student/bookings', icon: '📅' },
  { labelKey: 'buyGems', href: '/student/gems/buy', icon: '💎' },
  { labelKey: 'gemHistory', href: '/student/gems/history', icon: '📊' },
  { labelKey: 'avatar', href: '/onboarding/career-avatar', icon: '🎮' },
  { labelKey: 'progress', href: '/student/progress', icon: '🎯' },
  { labelKey: 'recordings', href: '/recordings', icon: '📹' },
];

const teacherNav: NavItem[] = [
  { labelKey: 'home', href: '/dashboard', icon: '🏠' },
  { labelKey: 'teachingSchedule', href: '/teacher/schedule', icon: '📅' },
  { labelKey: 'myQuizzes', href: '/teacher/quiz', icon: '📝' },
  { labelKey: 'createQuiz', href: '/teacher/quiz/create', icon: '✏️' },
  { labelKey: 'earnings', href: '/teacher/earnings', icon: '💰' },
  { labelKey: 'notifications', href: '/notifications', icon: '🔔' },
];

const adminNav: NavItem[] = [
  { labelKey: 'adminDashboard', href: '/dashboard/admin', icon: '🛡️' },
  { labelKey: 'analytics', href: '/admin/analytics', icon: '📊' },
  { labelKey: 'users', href: '/admin/users', icon: '👥' },
  { labelKey: 'materials', href: '/materials/admin', icon: '📚' },
  { labelKey: 'gemRules', href: '/admin/gems-rules', icon: '💎' },
  { labelKey: 'reconciliation', href: '/admin/reconciliation', icon: '⚖️' },
  { labelKey: 'monitoring', href: '/admin/monitoring/rollbacks', icon: '🔍' },
  { labelKey: 'notifications', href: '/notifications', icon: '🔔' },
];

const parentNav: NavItem[] = [
  { labelKey: 'home', href: '/dashboard', icon: '🏠' },
  { labelKey: 'schedule', href: '/student/bookings', icon: '📅' },
  { labelKey: 'progress', href: '/student/progress', icon: '📊' },
  { labelKey: 'recordings', href: '/recordings', icon: '📹' },
  { labelKey: 'notifications', href: '/notifications', icon: '🔔' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user: _user, profile: liveProfile, isLoading } = useAuth();
  const { profile: storedProfile, setProfile: storeProfile } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const { balance: gemCount } = useGemsBalance();

  React.useEffect(() => {
    setMounted(true);
    // Restore persisted collapsed state after mount to avoid hydration mismatch
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setSidebarCollapsed(true);
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  // Keep the store in sync with the live profile
  React.useEffect(() => {
    if (liveProfile) storeProfile(liveProfile);
  }, [liveProfile, storeProfile]);

  // After mount, prefer stored profile (instant from localStorage), fall back to live
  // Before mount, only use liveProfile to avoid hydration mismatch with persisted store
  const profile = mounted ? (storedProfile ?? liveProfile) : liveProfile;
  const tNav = useTranslations('dashboard.nav');
  const tCommon = useTranslations('common');

  // Show back button on child pages (not the dashboard root)
  const isDashboardChild = React.useMemo(() => {
    // pathname includes locale, e.g. /en/dashboard/teachers
    const segments = pathname.split('/').filter(Boolean);
    // segments: ['en', 'dashboard', 'teachers', ...] or ['en', 'dashboard']
    return segments.length > 2 && segments[1] === 'dashboard';
  }, [pathname]);

  // Select nav based on role — return empty while profile not yet loaded
  const navItems = React.useMemo(() => {
    if (!profile) return [];
    switch (profile.role) {
      case 'admin':
        return adminNav;
      case 'teacher':
        return teacherNav;
      case 'parent':
        return parentNav;
      default:
        return studentNav;
    }
  }, [profile]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen bg-bg-surface border-r border-border-default overflow-hidden',
          'transform transition-transform duration-300 ease-out-expo',
          'lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo + collapse toggle */}
          <div className="p-4 border-b border-border-default flex items-center justify-between min-h-[65px]">
            <Link
              href="/"
              className={cn(
                'flex items-center gap-2',
                sidebarCollapsed && 'justify-center w-full'
              )}
              title={sidebarCollapsed ? 'EasyEng Home' : undefined}
            >
              <GemImage size={28} alt="Gem" className="flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-xl font-bold text-gradient whitespace-nowrap">EasyEng</span>
              )}
            </Link>

            {/* Desktop-only collapse toggle */}
            {!sidebarCollapsed && (
              <button
                onClick={toggleCollapsed}
                className="hidden lg:flex items-center justify-center w-7 h-7 rounded-full bg-bg-elevated hover:bg-border-default text-text-muted hover:text-text-primary transition-colors flex-shrink-0 ml-1"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expand button — shown at top when collapsed (desktop only) */}
          {sidebarCollapsed && (
            <div className="hidden lg:flex justify-center py-2 border-b border-border-default">
              <button
                onClick={toggleCollapsed}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-bg-elevated hover:bg-border-default text-text-muted hover:text-text-primary transition-colors"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <motion.span
                  animate={{ rotate: 180 }}
                  className="flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.span>
              </button>
            </div>
          )}

          {/* User info */}
          <div className={cn(
            'p-4 border-b border-border-default',
            sidebarCollapsed && 'flex justify-center px-2'
          )}>
            {isLoading ? (
              <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                )}
              </div>
            ) : (
              <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
                <Avatar
                  title={sidebarCollapsed ? (profile?.full_name || 'User') : undefined}
                  className="flex-shrink-0"
                >
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(profile?.full_name ?? null)}</AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-text-muted capitalize">
                      {profile?.role || 'student'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Gem balance (for students) — hidden when collapsed */}
            {!sidebarCollapsed && profile?.role === 'student' && (
              <div className="mt-3">
                <GemBadge count={gemCount} size="sm" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn('flex-1 p-4 space-y-1 overflow-y-auto', sidebarCollapsed && 'px-2')}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? tNav(item.labelKey) : undefined}
                  className={cn(
                    'flex items-center rounded-lg transition-all',
                    sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                    'hover:bg-bg-elevated',
                    isActive
                      ? 'bg-accent-primary/10 text-accent-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="whitespace-nowrap">{tNav(item.labelKey)}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className={cn('p-4 border-t border-border-default space-y-2', sidebarCollapsed && 'px-2')}>
            <Link
              href="/settings"
              title={sidebarCollapsed ? tCommon('settings') : undefined}
              className={cn(
                'flex items-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all',
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
              )}
            >
              <span className="text-xl flex-shrink-0">⚙️</span>
              {!sidebarCollapsed && (
                <span className="whitespace-nowrap">{tCommon('settings')}</span>
              )}
            </Link>
            <button
              onClick={() => {
                // Clear Supabase auth cookies immediately so the middleware
                // won't bounce the user back to the dashboard.
                document.cookie.split(';').forEach((c) => {
                  const name = c.split('=')[0].trim();
                  if (name.startsWith('sb-')) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                  }
                });
                // Fire-and-forget network sign-out to invalidate the server session.
                getSupabaseClient().auth.signOut().catch(() => {});
                window.location.href = '/en/auth/login';
              }}
              title={sidebarCollapsed ? tCommon('logout') : undefined}
              className={cn(
                'w-full flex items-center rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all',
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
              )}
            >
              <span className="text-xl flex-shrink-0">🚪</span>
              {!sidebarCollapsed && (
                <span className="whitespace-nowrap">{tCommon('logout')}</span>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-lg border-b border-border-default">
          <div className="flex items-center justify-between px-4 h-16">
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-bg-surface transition-colors"
              >
                <span className="text-2xl">☰</span>
              </button>

              {/* Back to dashboard button on child pages */}
              {isDashboardChild && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">{tNav('home')}</span>
                </Link>
              )}
            </div>

            {/* Search (placeholder) */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder={tCommon('searchPlaceholder')}
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-bg-surface border border-border-default text-text-primary placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                  🔍
                </span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Language switcher */}
              <LanguageSwitcher />

              {/* Notifications */}
              <NotificationBell />

              {/* Gem badge on mobile */}
              {profile?.role === 'student' && (
                <div className="lg:hidden">
                  <GemBadge count={gemCount} size="sm" />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* App-wide class join reminder */}
      <ClassReminderProvider />
      <ReferralRedeemer />
    </div>
  );
}
