'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { z } from 'zod';
import api from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validations/auth';

interface ApiError {
  response?: { status?: number; data?: { message?: string } };
  message?: string;
}

type Stage = 'form' | 'success';

function calcStrength(pwd: string): 0 | 1 | 2 | 3 | 4 {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return Math.min(s, 4) as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_CONFIG = [
  { label: '',        color: '' },
  { label: 'Weak',   color: '#EF4444' },
  { label: 'Fair',   color: '#F59E0B' },
  { label: 'Good',   color: '#3B82F6' },
  { label: 'Strong', color: '#10B981' },
];

function StrengthMeter({ password }: { password: string }) {
  const score = calcStrength(password);
  const config = STRENGTH_CONFIG[score];
  if (!password) return null;

  return (
    <div className="mt-2.5 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <motion.div
            key={n}
            className="flex-1 h-[3px] rounded-full"
            animate={{ backgroundColor: n <= score ? config.color : 'var(--border)' }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium" style={{ color: config.color || 'var(--text-muted)' }}>
        {config.label}
      </p>
    </div>
  );
}

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

export default function ResetPasswordPage() {
  const router    = useRouter();
  const params    = useParams();
  const token     = params?.token as string;

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [stage,           setStage]           = useState<Stage>('form');
  const [fieldErrors,     setFieldErrors]     = useState<{ password?: string; confirmPassword?: string }>({});

  const focusStyle = (hasError?: string) => ({
    borderColor: hasError ? 'var(--error)' : 'var(--accent)',
    boxShadow: `0 0 0 3px ${hasError ? 'rgba(239,68,68,0.10)' : 'rgba(59,130,246,0.12)'}`,
  });
  const blurStyle = (hasError?: string) => ({
    borderColor: hasError ? 'var(--error)' : 'var(--border)',
    boxShadow: 'none',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (loading || !token) return;

    try {
      resetPasswordSchema.parse({ password, confirmPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errs: typeof fieldErrors = {};
        err.issues.forEach((i) => {
          if (i.path[0] === 'password')        errs.password        = i.message;
          if (i.path[0] === 'confirmPassword') errs.confirmPassword = i.message;
        });
        setFieldErrors(errs);
        return;
      }
    }

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password, confirmPassword });
      setStage('success');
    } catch (err) {
      const error = err as ApiError;
      if (error.response?.status === 400) {
        toast.error(error.response.data?.message || 'Invalid or expired link.');
      } else if (error.message === 'Network Error') {
        toast.error('Cannot reach server.');
      } else {
        toast.error(error.response?.data?.message || 'Reset failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 sm:px-10 py-5 flex-shrink-0">
        <AuthHeader />
        <a href="/auth/forgot-password" className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={13} />
          Back
        </a>
      </div>

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
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
                <ShieldCheck size={22} style={{ color: 'var(--accent)' }} />
              </div>

              <h1 className="text-[26px] font-bold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Set new password
              </h1>
              <p className="text-[14px] leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
                Choose a strong password for your account. Min 8 characters with uppercase, lowercase, and number.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* New password */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2"
                    style={{ color: 'var(--text-secondary)' }}>New Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                      autoComplete="new-password"
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-12 py-3 rounded-xl border text-[14px] transition-all duration-150 focus:outline-none"
                      style={{ backgroundColor: 'var(--surface-muted)', borderColor: fieldErrors.password ? 'var(--error)' : 'var(--border)', color: 'var(--text-primary)' }}
                      onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle(fieldErrors.password))}
                      onBlur={(e)  => Object.assign(e.currentTarget.style, blurStyle(fieldErrors.password))}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={loading}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <StrengthMeter password={password} />
                  {fieldErrors.password && <p className="mt-1.5 text-[12px]" style={{ color: 'var(--error)' }}>{fieldErrors.password}</p>}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2"
                    style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                      autoComplete="new-password"
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-12 py-3 rounded-xl border text-[14px] transition-all duration-150 focus:outline-none"
                      style={{ backgroundColor: 'var(--surface-muted)', borderColor: fieldErrors.confirmPassword ? 'var(--error)' : 'var(--border)', color: 'var(--text-primary)' }}
                      onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle(fieldErrors.confirmPassword))}
                      onBlur={(e)  => Object.assign(e.currentTarget.style, blurStyle(fieldErrors.confirmPassword))}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} disabled={loading}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="mt-1.5 text-[12px]" style={{ color: 'var(--error)' }}>{fieldErrors.confirmPassword}</p>}
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
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Resetting…</>
                    : 'Reset Password'}
                </motion.button>
              </form>
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
                Password updated
              </h2>
              <p className="text-[14px] leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
                Your password has been reset successfully. You can now sign in with your new password.
              </p>

              <motion.button
                onClick={() => router.push('/auth/login')}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className="w-full py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--accent)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              >
                Continue to Sign In
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

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
