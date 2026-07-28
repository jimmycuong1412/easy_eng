import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';

import { locales, type Locale } from '@/i18n/config';
import { CoreBootstrap } from '@/components/CoreBootstrap';
import DevDebugPopup from '@/components/DevDebugPopup';
import { GlobalHomeButton } from '@/components/common';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import Analytics from '@/components/Analytics';
import { THEME_SCRIPT } from '@/components/theme/theme-script';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const ogLocale = locale === 'vi' ? 'vi_VN' : 'en_US';

  return {
    title: {
      default: t('title'),
      template: '%s | EasyEng',
    },
    description: t('description'),
    keywords: [
      'learn english',
      'english learning',
      'online tutoring',
      'video classes',
      'gamification',
      'vietnam education',
      'english for vietnamese',
      'gem rewards',
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
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ],
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: '/',
      siteName: 'EasyEng',
      type: 'website',
      locale: ogLocale,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'EasyEng - Learn English Platform',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
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
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: 'light',
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
      data-theme="bright"
      className={`${inter.variable} ${jetbrainsMono.variable} ${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg-primary font-sans antialiased" suppressHydrationWarning>
        {/* Pre-hydration theme: server renders data-theme="bright"; this only
            swaps to "dark" when the user chose it, before paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <NextIntlClientProvider messages={messages}>
          {/* Register @easyeng/core platform adapters before any descendant
              client hook (useAuth, stores) runs — SSR and client. */}
          <CoreBootstrap />

          {/* Skip to main content link for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent-primary focus:text-white focus:rounded-lg"
          >
            Skip to main content
          </a>

          {/* Analytics */}
          <Analytics />

          {/* Offline/Online Indicator */}
          <OfflineIndicator />

          {/* Main content area */}
          {children}

          {/* Global Home Button */}
          <GlobalHomeButton />

          {/* Development Debug Popup */}
          <DevDebugPopup />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
