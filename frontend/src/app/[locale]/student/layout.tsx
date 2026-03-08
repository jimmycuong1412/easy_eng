'use client';

import { BackToDashboard } from '@/components/common';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <BackToDashboard />
        {children}
      </div>
    </div>
  );
}
