'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

interface ApiError {
  response?: { status?: number; data?: { message?: string } };
  message?: string;
}

type Stage = 'checking' | 'success' | 'error';

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

export default function VerifyEmailClient() {
  const router = useRouter();
  const [stage, setStage]     = useState<Stage>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');

    if (!token) {
      setMessage('No verification token found. Please check your email link.');
      setStage('error');
      return;
    }

    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStage('success'))
      .catch((err: ApiError) => {
        setMessage(err.response?.data?.message || 'This link is invalid or has expired.');
        setStage('error');
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-6 sm:px-10 py-5 flex-shrink-0">
        <AuthHeader />
        <a href="/auth/login" className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={13} />
          Sign in
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          {stage === 'checking' && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-[460px] rounded-2xl border p-8 sm:p-10 text-center"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}
              >
                <Loader2 size={22} style={{ color: 'var(--accent)' }} />
              </motion.div>
              <h2 className="text-[22px] font-bold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Verifying your email…
              </h2>
              <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                Please wait while we confirm your email address.
              </p>
            </motion.div>
          )}

          {stage === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-[460px] rounded-2xl border p-8 sm:p-10 text-center"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.1 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}
              >
                <CheckCircle2 size={28} style={{ color: '#10B981' }} />
              </motion.div>

              <h2 className="text-[24px] font-bold mb-2.5 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Email verified!
              </h2>
              <p className="text-[14px] leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
                Your email has been verified successfully. You can now access your NowaZone workspace.
              </p>

              <motion.button
                onClick={() => router.push('/dashboard')}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              >
                Go to Dashboard
              </motion.button>
            </motion.div>
          )}

          {stage === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-[460px] rounded-2xl border p-8 sm:p-10 text-center"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.1 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)' }}
              >
                <XCircle size={28} style={{ color: '#EF4444' }} />
              </motion.div>

              <h2 className="text-[24px] font-bold mb-2.5 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Verification failed
              </h2>
              <p className="text-[14px] leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
                {message || 'This verification link is invalid or has expired.'}
              </p>

              <div className="space-y-3">
                <motion.button
                  onClick={() => router.push('/auth/login')}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                >
                  Back to Sign In
                </motion.button>

                <button
                  className="w-full py-3 rounded-xl text-[13px] font-medium transition-all cursor-pointer"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              </div>

              <p className="mt-6 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Need help?{' '}
                <a href="#" className="font-medium hover:underline" style={{ color: 'var(--accent-text)' }}>
                  Contact support
                </a>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {stage === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mx-6 mb-6 max-w-[460px] mx-auto rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Mail size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Verification links expire after 24 hours. If your link is expired, sign in again and request a new verification email from your account settings.
          </p>
        </motion.div>
      )}

      <div className="flex-shrink-0 px-6 py-5 text-center">
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <a href="#" className="hover:underline">Privacy Policy</a>
          {' · '}
          <a href="#" className="hover:underline">Terms of Service</a>
        </p>
      </div>
    </div>
  );
}
