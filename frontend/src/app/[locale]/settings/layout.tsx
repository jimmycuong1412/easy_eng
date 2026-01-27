'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

const settingsNav = [
  {
    title: 'Hồ sơ',
    href: '/settings/profile',
    icon: User,
    description: 'Thông tin cá nhân và avatar',
  },
  {
    title: 'Bảo mật',
    href: '/settings/security',
    icon: Shield,
    description: 'Mật khẩu và xác thực',
  },
  {
    title: 'Thông báo',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Email và push notifications',
  },
  {
    title: 'Ngôn ngữ & Khu vực',
    href: '/settings/preferences',
    icon: Globe,
    description: 'Ngôn ngữ, múi giờ, tiền tệ',
  },
  {
    title: 'Thanh toán',
    href: '/settings/billing',
    icon: CreditCard,
    description: 'Phương thức thanh toán',
  },
  {
    title: 'Giới thiệu bạn bè',
    href: '/settings/referral',
    icon: Share2,
    description: 'Mã giới thiệu và rewards',
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
            Quay lại Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">Cài đặt</h1>
          <p className="text-slate-400 mt-1">
            Quản lý tài khoản và tùy chỉnh trải nghiệm của bạn
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:w-64 flex-shrink-0"
          >
            <div className="bg-white/5 rounded-2xl border border-white/10 p-2 space-y-1">
              {settingsNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                      isActive
                        ? 'bg-[#3B82F6] text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className={cn(
                        'text-xs',
                        isActive ? 'text-white/70' : 'text-slate-500'
                      )}>
                        {item.description}
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
