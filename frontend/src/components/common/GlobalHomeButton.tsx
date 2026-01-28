'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GlobalHomeButton() {
    const pathname = usePathname();

    // Hide button on homepage (root or locale root)
    const isHomePage = pathname === '/' || /^\/[a-z]{2}$/.test(pathname);

    if (isHomePage) {
        return null;
    }

    return (
        <div className="fixed top-4 left-4 z-50">
            <Button
                variant="secondary"
                size="icon"
                className="rounded-full shadow-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md"
                asChild
            >
                <Link href="/" aria-label="Back to Home">
                    <Home className="w-5 h-5" />
                </Link>
            </Button>
        </div>
    );
}
