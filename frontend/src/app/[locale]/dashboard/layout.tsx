'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CookieBadge } from '@/components/features/CookieBadge';
import { Skeleton } from '@/components/ui/skeleton';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const studentNav: NavItem[] = [
  { label: 'Trang chủ', href: '/dashboard', icon: '🏠' },
  { label: 'Tìm giáo viên', href: '/dashboard/teachers', icon: '👨‍🏫' },
  { label: 'Lịch học', href: '/student/bookings', icon: '📅' },
  { label: 'Avatar', href: '/onboarding/career-avatar', icon: '🎮' },
  { label: 'Tiến trình', href: '/student/progress', icon: '🎯' },
  { label: 'Bản ghi', href: '/recordings', icon: '📹' },
];

const teacherNav: NavItem[] = [
  { label: 'Trang chủ', href: '/teacher/dashboard', icon: '🏠' },
  { label: 'Lịch dạy', href: '/teacher/schedule', icon: '📅' },
  { label: 'Tạo Quiz', href: '/teacher/quiz/create', icon: '📝' },
  { label: 'Thông báo', href: '/notifications', icon: '🔔' },
  { label: 'Phân tích', href: '/admin/analytics', icon: '📊' },
];

const parentNav: NavItem[] = [
  { label: 'Trang chủ', href: '/dashboard', icon: '🏠' },
  { label: 'Lịch học', href: '/student/bookings', icon: '📅' },
  { label: 'Tiến trình', href: '/student/progress', icon: '📊' },
  { label: 'Bản ghi', href: '/recordings', icon: '📹' },
  { label: 'Thông báo', href: '/notifications', icon: '🔔' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, profile, isLoading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [cookieCount] = React.useState(150); // TODO: Fetch from API

  // Select nav based on role
  const navItems = React.useMemo(() => {
    if (!profile) return studentNav;
    switch (profile.role) {
      case 'teacher':
        return teacherNav;
      case 'parent':
        return parentNav;
      default:
        return studentNav;
    }
  }, [profile]);

  const getInitials = (name: string | null) => {
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
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-bg-surface border-r border-border-default',
          'transform transition-transform duration-300 ease-out-expo',
          'lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border-default">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍪</span>
              <span className="text-xl font-bold text-gradient">EasyEng</span>
            </Link>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-border-default">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-text-muted capitalize">
                    {profile?.role || 'student'}
                  </p>
                </div>
              </div>
            )}

            {/* Cookie balance (for students) */}
            {profile?.role === 'student' && (
              <div className="mt-3">
                <CookieBadge count={cookieCount} size="sm" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                    'hover:bg-bg-elevated',
                    isActive
                      ? 'bg-accent-primary/10 text-accent-primary font-medium'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-border-default space-y-2">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
            >
              <span className="text-xl">⚙️</span>
              <span>Cài đặt</span>
            </Link>
            <button
              onClick={async () => {
                try {
                  await signOut();
                } catch (error) {
                  console.error('Logout error:', error);
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-error hover:bg-error/10 transition-all"
            >
              <span className="text-xl">🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-lg border-b border-border-default">
          <div className="flex items-center justify-between px-4 h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-bg-surface transition-colors"
            >
              <span className="text-2xl">☰</span>
            </button>

            {/* Search (placeholder) */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Tìm kiếm giáo viên, bài học..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-bg-surface border border-border-default text-text-primary placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                  🔍
                </span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <span className="text-xl">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
              </Button>

              {/* Cookie badge on mobile */}
              {profile?.role === 'student' && (
                <div className="lg:hidden">
                  <CookieBadge count={cookieCount} size="sm" />
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
    </div>
  );
}
