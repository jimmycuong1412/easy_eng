/**
 * Analytics Script Component
 *
 * Loads Plausible or Google Analytics based on environment configuration
 */

'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { analytics } from '@/lib/analytics';

export function AnalyticsScripts() {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      {/* Plausible Analytics (Privacy-first, recommended) */}
      {plausibleDomain && (
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}

      {/* Google Analytics (Fallback) */}
      {!plausibleDomain && gaMeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaMeasurementId}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}
    </>
  );
}

/**
 * Analytics Page View Tracker
 * Automatically tracks page views on route changes
 */
export function AnalyticsPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!analytics.isEnabled()) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    analytics.pageview(url);
  }, [pathname, searchParams]);

  return null;
}

/**
 * Complete Analytics Component
 * Include this in your root layout
 */
export default function Analytics() {
  return (
    <>
      <AnalyticsScripts />
      <Suspense fallback={null}>
        <AnalyticsPageViewTracker />
      </Suspense>
    </>
  );
}
