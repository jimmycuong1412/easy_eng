import type { Metadata, Viewport } from 'next';
import './globals.css';

// Metadata
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

// Viewport
export const viewport: Viewport = {
  themeColor: '#0A1628',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
