import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { Metadata, Viewport } from 'next';

import { locales, type Locale } from '@/i18n/config';
import DevDebugPopup from '@/components/DevDebugPopup';
import { GlobalHomeButton } from '@/components/common';
import '../globals.css';

// Fonts
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'EasyEng - Learn English with Fun',
    template: '%s | EasyEng',
  },
  description:
    'Modern English learning platform with gamification, career avatars, and live video classes. Book teachers, earn cookies, and level up your language skills!',
  keywords: [
    'learn english',
    'english learning',
    'online tutoring',
    'video classes',
    'gamification',
    'vietnam education',
    'english for vietnamese',
    'cookie rewards',
  ],
  authors: [{ name: 'EasyEng Team' }],
  creator: 'EasyEng',
  publisher: 'EasyEng',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon.svg',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'EasyEng - Learn English with Fun',
    description:
      'Modern English learning platform with gamification and live video classes.',
    url: '/',
    siteName: 'EasyEng',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EasyEng - Learn English with Fun',
    description:
      'Modern English learning platform with gamification and live video classes.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#0A1628',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: 'dark',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming locale is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Fetch messages for the current locale
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg-primary font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          {/* Skip to main content link for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent-primary focus:text-white focus:rounded-lg"
          >
            Skip to main content
          </a>

          {/* Main content area */}
          <main id="main-content" className="relative">
            {children}
          </main>


          {/* Global Home Button */}
          <GlobalHomeButton />

          {/* Development Debug Popup */}
          <DevDebugPopup />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
