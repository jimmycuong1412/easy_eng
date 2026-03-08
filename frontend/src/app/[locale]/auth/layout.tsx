import Link from 'next/link';
import { GemImage } from '@/components/common/GemImage';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xl font-bold text-gradient hover:opacity-80 transition-opacity"
        >
          <GemImage size={28} alt="Gem" />
          EasyEng
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-text-muted text-sm">
        <p>&copy; {new Date().getFullYear()} EasyEng. All rights reserved.</p>
      </footer>
    </div>
  );
}
