'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { AlertCircle, X } from 'lucide-react';

export default function MaintenancePage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ status: string; data?: { maintenanceMode?: boolean } }>(
          '/maintenance-status'
        );
        if (cancelled) return;
        const isMaintenance = Boolean(data?.data?.maintenanceMode);
        if (!isMaintenance) {
          router.replace('/auth/login');
          return;
        }
        setAllowed(true);
      } catch {
        if (!cancelled) setAllowed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (allowed === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#080E1A' }}
      >
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#080E1A' }}
    >
      {/* Grid background (match login) */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
        }}
      />

      <div className="relative z-10 w-full max-w-xl">
        {/* Alert banner — exact design from screenshot */}
        <div
          className="flex items-center gap-4 px-5 py-4 rounded-xl border"
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            borderColor: 'rgba(71, 85, 105, 0.5)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
          >
            <AlertCircle className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
          </div>
          <p
            className="flex-1 text-[15px] font-medium leading-snug"
            style={{ color: '#E2E8F0' }}
          >
            The system is currently in maintenance mode. Please try again later.
          </p>
          <Link
            href="/auth/login"
            className="flex-shrink-0 p-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ color: '#94A3B8' }}
            aria-label="Close / Back to login"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </Link>
        </div>

        <p
          className="mt-6 text-center text-sm"
          style={{ color: '#64748B' }}
        >
          Need help?{' '}
          <a
            href="mailto:support@nowazone.com"
            className="underline hover:no-underline"
            style={{ color: '#60A5FA' }}
          >
            support@nowazone.com
          </a>
        </p>
      </div>
    </div>
  );
}
