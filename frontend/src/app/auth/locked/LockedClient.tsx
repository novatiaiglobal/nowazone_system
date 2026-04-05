'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, Clock, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Suspense } from 'react';

function AuthHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>NowAZone</p>
        <p className="text-[10px] tracking-[0.15em] uppercase" style={{ color: 'var(--text-muted)' }}>Enterprise Console</p>
      </div>
    </div>
  );
}

const SECURITY_TIPS = [
  'Never share your credentials with anyone, including IT staff.',
  'Always sign out when using shared or public devices.',
  'Use a password manager to maintain unique, strong passwords.',
];

function LockedContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const unlockIn = searchParams.get('unlockIn');
  const [seconds, setSeconds] = useState<number | null>(unlockIn ? parseInt(unlockIn, 10) : null);

  useEffect(() => {
    if (seconds === null || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => (s !== null && s > 0 ? s - 1 : s)), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-6 sm:px-10 py-5 flex-shrink-0">
        <AuthHeader />
        <button
          onClick={() => router.push('/auth/login')}
          className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70 cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={13} />
          Sign in
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[520px]"
        >
          <div className="rounded-2xl border p-8 sm:p-10 mb-4"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.12 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)' }}
            >
              <ShieldAlert size={26} style={{ color: '#EF4444' }} />
            </motion.div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-wide text-red-400">Account Locked</span>
            </div>

            <h1 className="text-[26px] font-bold mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Account temporarily locked
            </h1>
            <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
              We've locked your account after several consecutive failed sign-in attempts. This is a security measure to protect your account from unauthorized access.
            </p>

            {seconds !== null && seconds > 0 && (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl mb-6"
                style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-[11px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Auto-unlocks in</p>
                  <p className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {formatTime(seconds)}
                  </p>
                </div>
              </div>
            )}

            {(seconds === null || seconds === 0) && (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl mb-6"
                style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Your account will unlock automatically after a short period, or contact support to unlock it now.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {seconds === 0 && (
                <motion.button
                  onClick={() => router.push('/auth/login')}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                >
                  <RefreshCw size={15} />
                  Try Signing In Again
                </motion.button>
              )}

              <a
                href="mailto:support@nowazone.com"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-[14px] transition-all cursor-pointer"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Mail size={15} />
                Contact Support
              </a>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border p-6"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>
              Security Reminders
            </p>
            <ul className="space-y-2.5">
              {SECURITY_TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                  <span className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{tip}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>

      <div className="flex-shrink-0 px-6 py-5 text-center">
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <a href="#" className="hover:underline">Privacy Policy</a>
          {' · '}
          <a href="#" className="hover:underline">Terms of Service</a>
          {' · '}
          <a href="mailto:support@nowazone.com" className="hover:underline">support@nowazone.com</a>
        </p>
      </div>
    </div>
  );
}

export default function LockedClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    }>
      <LockedContent />
    </Suspense>
  );
}
