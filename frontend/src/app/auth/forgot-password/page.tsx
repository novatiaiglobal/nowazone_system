'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import { z } from 'zod';
import api from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validations/auth';

interface ApiError {
  response?: { status?: number; data?: { message?: string } };
  message?: string;
}

type Stage = 'form' | 'success';

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

export default function ForgotPasswordPage() {
  const router  = useRouter();
  const [email, setEmail]     = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage]     = useState<Stage>('form');
  const [devUrl, setDevUrl]   = useState('');

  const focusStyle = (hasError: boolean) => ({
    borderColor: hasError ? 'var(--error)' : 'var(--accent)',
    boxShadow: `0 0 0 3px ${hasError ? 'rgba(239,68,68,0.10)' : 'rgba(59,130,246,0.12)'}`,
  });
  const blurStyle = (hasError: boolean) => ({
    borderColor: hasError ? 'var(--error)' : 'var(--border)',
    boxShadow: 'none',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (loading) return;

    try {
      forgotPasswordSchema.parse({ email });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setEmailError(err.issues[0]?.message || 'Invalid email');
        return;
      }
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      if (data?.data?.resetUrl) setDevUrl(data.data.resetUrl);
      setStage('success');
    } catch (err) {
      const error = err as ApiError;
      if (error.response?.status === 429) toast.error('Too many requests. Please wait.');
      else if (error.message === 'Network Error') toast.error('Cannot reach server.');
      else toast.error(error.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 sm:px-10 py-5 flex-shrink-0">
        <AuthHeader />
        <a href="/auth/login" className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={13} />
          Back to sign in
        </a>
      </div>

      {/* Center card */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">

          {/* ── FORM ── */}
          {stage === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.38 }}
              className="w-full max-w-[480px] rounded-2xl border p-8 sm:p-10"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
                <Lock size={20} style={{ color: 'var(--accent)' }} />
              </div>

              <h1 className="text-[26px] font-bold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Forgot your password?
              </h1>
              <p className="text-[14px] leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
                No worries. Enter your work email and we'll send a secure reset link to your inbox.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2"
                    style={{ color: 'var(--text-secondary)' }}>Work Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                      placeholder="you@company.com"
                      autoComplete="email"
                      autoFocus
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border text-[14px] transition-all duration-150 focus:outline-none"
                      style={{ backgroundColor: 'var(--surface-muted)', borderColor: emailError ? 'var(--error)' : 'var(--border)', color: 'var(--text-primary)' }}
                      onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle(!!emailError))}
                      onBlur={(e)  => Object.assign(e.currentTarget.style, blurStyle(!!emailError))}
                    />
                  </div>
                  {emailError && <p className="mt-1.5 text-[12px]" style={{ color: 'var(--error)' }}>{emailError}</p>}
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.005 }}
                  whileTap={{ scale: loading ? 1 : 0.995 }}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--accent)' }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                >
                  {loading
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Sending…</>
                    : 'Send Reset Link'}
                </motion.button>
              </form>

              <p className="mt-6 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Remembered it?{' '}
                <a href="/auth/login" className="font-medium hover:underline" style={{ color: 'var(--accent-text)' }}>
                  Back to sign in
                </a>
              </p>
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {stage === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-[480px] rounded-2xl border p-8 sm:p-10 text-center"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              {/* Animated check */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.1 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}
              >
                <CheckCircle size={28} style={{ color: '#10B981' }} />
              </motion.div>

              <h2 className="text-[24px] font-bold mb-2.5 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Check your inbox
              </h2>
              <p className="text-[14px] leading-relaxed mb-1" style={{ color: 'var(--text-muted)' }}>
                We sent a password reset link to
              </p>
              <p className="text-[14px] font-semibold mb-8" style={{ color: 'var(--text-primary)' }}>{email}</p>

              {devUrl && (
                <div className="mb-6 px-4 py-3 rounded-xl text-left"
                  style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Dev — reset link</p>
                  <a href={devUrl} className="text-[12px] font-mono break-all hover:underline" style={{ color: 'var(--accent-text)' }}>
                    {devUrl}
                  </a>
                </div>
              )}

              <div className="space-y-3">
                <motion.button
                  onClick={() => {
                    const [,, host] = email.split('@');
                    window.open(`https://${host || 'mail.google.com'}`, '_blank');
                  }}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                >
                  Open Email App
                </motion.button>

                <button
                  onClick={() => { setStage('form'); }}
                  className="w-full py-3 rounded-xl font-medium text-[13px] transition-all cursor-pointer"
                  style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent', border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Resend email
                </button>
              </div>

              <p className="mt-6 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Didn't receive it? Check spam or{' '}
                <a href="#" className="font-medium hover:underline" style={{ color: 'var(--accent-text)' }}>contact support</a>
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer */}
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
