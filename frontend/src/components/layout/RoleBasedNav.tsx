/**
 * Role-Based Navigation Component
 * 
 * Displays navigation menu based on user role
 */

'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Bell,
  Calendar,
  LayoutDashboard,
  Settings,
  Users,
  Trophy,
  Coins,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';

import { Link } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

export default function RoleBasedNav() {
  const t = useTranslations('nav');
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems: NavItem[] = [
    {
      label: t('dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['student', 'teacher', 'parent', 'admin'],
    },
    {
      label: t('classes'),
      href: '/classes',
      icon: BookOpen,
      roles: ['student', 'teacher', 'parent', 'admin'],
    },
    {
      label: t('bookings'),
      href: '/bookings',
      icon: Calendar,
      roles: ['student', 'teacher', 'parent'],
    },
    {
      label: t('gems'),
      href: '/gems',
      icon: Coins,
      roles: ['student', 'parent'],
    },
    {
      label: t('leaderboard'),
      href: '/leaderboard',
      icon: Trophy,
      roles: ['student'],
    },
    {
      label: t('users'),
      href: '/users',
      icon: Users,
      roles: ['admin', 'teacher'],
    },
    {
      label: t('notifications'),
      href: '/notifications',
      icon: Bell,
      roles: ['student', 'teacher', 'admin', 'parent'],
    },
  ];

  const userRole = profile?.role || 'student';
  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="container mx-auto px-4">
      <div className="flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <span className="font-bold text-lg hidden sm:inline-block">Easy English</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 text-sm font-medium text-text-subtle hover:text-text-primary transition-colors"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          {/* Notification Bell — all roles */}
          <NotificationBell />

          {/* Gems Balance (Students only) */}
          {userRole === 'student' && (
            <Link
              href="/gems"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <Coins className="w-4 h-4" />
              <span className="text-sm font-semibold">0 Gems</span>
            </Link>
          )}

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={user?.email || ''} />
                  <AvatarFallback>
                    {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-text-subtle">{user?.email}</p>
                  <p className="text-xs text-primary capitalize">{userRole}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-error">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden py-4 border-t border-border-default"
        >
          <div className="flex flex-col gap-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-text-subtle hover:text-text-primary hover:bg-surface-elevated/50 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}
    </nav>
  );
}
