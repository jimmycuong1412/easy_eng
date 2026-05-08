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
    { label: 'Book',      href: '/book' },
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
    <header className="ed-topbar">
      {/* Brand */}
      <Link href={`/${locale}/${role === 'teacher' ? 'teacher/dashboard' : 'student/dashboard'}`} className="ed-brand">
        <span className="ed-brand-mark">e</span>
        <span>easyeng</span>
      </Link>

      {/* Nav */}
      <nav className="ed-topnav">
        {NAV[role].map(({ label, href }) => {
          const full = `/${locale}${href}`;
          const active = pathname === full || pathname.startsWith(full + '/');
          return (
            <Link key={href} href={full} className={active ? 'active' : ''}>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right controls */}
      <div className="ed-topright">
        <button className="ed-iconbtn" aria-label="Search">
          <SearchIcon />
        </button>
        <button className="ed-iconbtn" aria-label="Notifications">
          <BellIcon />
        </button>
        <div className="ed-avatar" aria-label="Profile">
          {initials}
        </div>
      </div>
    </header>
  );
}
