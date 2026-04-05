'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Loads GA4 and sends page_view on route change. Only renders when NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
 */
export default function GoogleAnalytics() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !(window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) return;
    const current = pathname ?? window.location.pathname;
    if (prevPathRef.current === current) return;
    prevPathRef.current = current;
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'page_view', {
      page_path: current,
      page_title: document.title,
    });
  }, [pathname]);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
