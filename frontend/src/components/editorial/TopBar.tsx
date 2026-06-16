'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchIcon, BellIcon } from './Icons';

type Role = 'student' | 'teacher';

const NAV: Record<Role, { label: string; href: string }[]> = {
  student: [
    { label: 'Today',     href: '/student/dashboard' },
    { label: 'Lessons',   href: '/learning-path' },
    { label: 'Practice',  href: '/practice' },
    { label: 'Book',      href: '/dashboard/teachers' },
    { label: 'Community', href: '/community' },
  ],
  teacher: [
    { label: 'Today',     href: '/teacher/dashboard' },
    { label: 'Schedule',  href: '/teacher/schedule' },
    { label: 'Students',  href: '/teacher/students' },
    { label: 'Resources', href: '/teacher/resources' },
    { label: 'Earnings',  href: '/teacher/earnings' },
  ],
};

interface TopBarProps {
  role?: Role;
  initials?: string;
  locale?: string;
}

export function EdTopBar({ role = 'student', initials = 'AL', locale = 'en' }: TopBarProps) {
  const pathname = usePathname();

  return (
    <header
      className="et-topbar"
      style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 36 }}
    >
      <Link
        href={`/${locale}/dashboard`}
        className="et-brand"
      >
        <span className="et-mark">e</span>
        <span>easyeng</span>
      </Link>

      <nav className="et-nav" aria-label="Primary" style={{ justifySelf: 'center' }}>
        {NAV[role].map(({ label, href }) => {
          const full = `/${locale}${href}`;
          const active = pathname === full || pathname.startsWith(full + '/');
          return (
            <Link
              key={href}
              href={full}
              style={
                active
                  ? {
                      background: 'linear-gradient(180deg, #7c5cff 0%, #4c6bff 100%)',
                      color: '#fff',
                      boxShadow:
                        '0 8px 24px -8px rgba(124, 92, 255, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
                    }
                  : undefined
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifySelf: 'end',
        }}
      >
        <button className="et-iconbtn" aria-label="Search" type="button">
          <SearchIcon />
        </button>
        <button className="et-iconbtn" aria-label="Notifications" type="button">
          <BellIcon />
        </button>
        <div
          aria-label="Profile"
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: 'linear-gradient(135deg, #a48bff, #ff7a59)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            border: '2px solid #0d1a4a',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10)',
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
