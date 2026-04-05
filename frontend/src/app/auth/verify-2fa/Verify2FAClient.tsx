'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ArrowLeft, RotateCcw, Key } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import { getRoleHome, getUserRoles } from '@/lib/roleUtils';
import { clearProfileCache } from '@/hooks/useUserProfile';

interface ApiError {
  response?: { status?: number; data?: { message?: string } };
  message?: string;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

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

export default function Verify2FAClient() {
  const router   = useRouter();
  const [otp, setOtp]           = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs               = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown === 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const focusInput = useCallback((i: number) => {
    inputRefs.current[Math.max(0, Math.min(i, OTP_LENGTH - 1))]?.focus();
  }, []);

  const handleChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    setError('');
    if (v && i < OTP_LENGTH - 1) focusInput(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) { focusInput(i - 1); }
    if (e.key === 'ArrowLeft'  && i > 0)           { e.preventDefault(); focusInput(i - 1); }
    if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) { e.preventDefault(); focusInput(i + 1); }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const str = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill('');
    [...str].forEach((c, idx) => { next[idx] = c; });
    setOtp(next);
    setError('');
    focusInput(Math.min(str.length, OTP_LENGTH - 1));
  };

  const code = otp.join('');
  useEffect(() => {
    if (code.length === OTP_LENGTH && !loading) {
      handleVerify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleVerify = async (codeValue: string) => {
    const tempToken = sessionStorage.getItem('twoFactorTempToken');
    if (!tempToken) { toast.error('Session expired. Please sign in again.'); router.push('/auth/login'); return; }
    if (codeValue.length !== OTP_LENGTH) { setError('Please enter all 6 digits.'); return; }

    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/2fa/verify-login', { token: codeValue, tempToken });
      sessionStorage.removeItem('twoFactorTempToken');
      toast.success('Signed in successfully');
      clearProfileCache();
      const userRoles = getUserRoles(data?.data?.user || {});
      router.push(getRoleHome(userRoles));
    } catch (err) {
      const error = err as ApiError;
      const msg = error.response?.data?.message || 'Invalid code. Try again.';
      setError(msg);
      setOtp(Array(OTP_LENGTH).fill(''));
      focusInput(0);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    const tempToken = sessionStorage.getItem('twoFactorTempToken');
    if (!tempToken) { toast.error('Session expired.'); router.push('/auth/login'); return; }

    setResending(true);
    try {
      await api.post('/auth/resend-2fa', { tempToken });
      toast.success('New code sent to your email.');
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      focusInput(0);
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-6 sm:px-10 py-5 flex-shrink-0">
        <AuthHeader />
        <button
          onClick={() => { sessionStorage.removeItem('twoFactorTempToken'); router.push('/auth/login'); }}
          className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70 cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={13} />
          Cancel
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[460px] rounded-2xl border p-8 sm:p-10"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
            <ShieldCheck size={22} style={{ color: 'var(--accent)' }} />
          </div>

          <h1 className="text-[26px] font-bold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Two-factor authentication
          </h1>
          <p className="text-[14px] leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
            Enter the 6-digit code sent to your registered email address.
          </p>

          <div className="flex gap-2.5 sm:gap-3 justify-between mb-6">
            {otp.map((digit, i) => (
              <motion.input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={loading}
                autoFocus={i === 0}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center text-[22px] font-bold rounded-xl border transition-all duration-150 focus:outline-none disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--surface-muted)',
                  borderColor: error ? 'var(--error)' : digit ? 'var(--accent)' : 'var(--border)',
                  color: 'var(--text-primary)',
                  boxShadow: digit && !error ? '0 0 0 2px rgba(59,130,246,0.14)' : 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = error ? 'var(--error)' : 'var(--accent)';
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? 'rgba(239,68,68,0.10)' : 'rgba(59,130,246,0.12)'}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = error ? 'var(--error)' : digit ? 'var(--accent)' : 'var(--border)';
                  e.currentTarget.style.boxShadow = digit && !error ? '0 0 0 2px rgba(59,130,246,0.14)' : 'none';
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.04 }}
              />
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-5 text-[13px] text-center font-medium"
                style={{ color: 'var(--error)' }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => handleVerify(code)}
            disabled={loading || code.length !== OTP_LENGTH}
            whileHover={{ scale: (loading || code.length !== OTP_LENGTH) ? 1 : 1.005 }}
            whileTap={{ scale: (loading || code.length !== OTP_LENGTH) ? 1 : 0.995 }}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-[14px] text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            style={{ backgroundColor: 'var(--accent)' }}
            onMouseEnter={(e) => !(loading || code.length !== OTP_LENGTH) && (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            {loading
              ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Verifying…</>
              : 'Verify Code'}
          </motion.button>

          <div className="flex items-center justify-center gap-1.5">
            <RotateCcw size={12} style={{ color: 'var(--text-muted)' }} />
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-[12px] font-medium hover:underline cursor-pointer transition-opacity disabled:opacity-60"
                style={{ color: 'var(--accent-text)' }}
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Resend code in <span className="font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{countdown}s</span>
              </p>
            )}
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => toast.info('Backup code feature coming soon.')}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer"
              style={{ color: 'var(--text-muted)', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-muted)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <Key size={13} />
              Use a backup code instead
            </button>
          </div>
        </motion.div>
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
