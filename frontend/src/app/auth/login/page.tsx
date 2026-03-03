'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Cpu, Globe } from 'lucide-react';
import { toast } from 'react-toastify';
import { z } from 'zod';
import api from '@/lib/api';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { getRoleHome, getUserRoles } from '@/lib/roleUtils';
import { clearProfileCache } from '@/hooks/useUserProfile';

interface ApiError {
  response?: { status?: number; data?: { message?: string } };
  message?: string;
}

const SECURITY_BULLETS = [
  { icon: ShieldCheck, text: 'Multi-factor authentication' },
  { icon: Cpu,         text: 'Zero-trust access control' },
  { icon: Globe,       text: 'End-to-end encrypted sessions' },
];

function BrandPanel() {
  return (
    <aside
      className="hidden lg:flex lg:w-[44%] xl:w-[46%] flex-shrink-0 flex-col relative overflow-hidden"
      style={{ backgroundColor: '#080E1A' }}
    >
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.055) 1px, transparent 1px)
        `,
        backgroundSize: '52px 52px',
      }} />
      {/* Glows */}
      <div className="absolute -top-40 -right-40 w-[520px] h-[520px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.20) 0%, transparent 65%)' }} />
      <div className="absolute bottom-0 -left-24 w-[340px] h-[340px] pointer-events-none rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)' }} />

      <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-3 flex-shrink-0"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#3B82F6' }}>
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-[13px] tracking-wide">NowAZone</p>
            <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: '#3B82F6' }}>Enterprise Console</p>
          </div>
        </motion.div>

        {/* Body */}
        <div className="flex-1 flex flex-col justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22 }}
          >
            {/* Status */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
              style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium tracking-wide text-emerald-400">All Systems Operational</span>
            </div>

            <h1 className="text-[34px] xl:text-[40px] font-bold leading-[1.18] mb-5 tracking-tight" style={{ color: '#F8FAFC' }}>
              Enterprise access.<br />
              <span style={{ color: '#3B82F6' }}>Built for your team.</span>
            </h1>

            <p className="text-[14px] leading-relaxed mb-10 max-w-[300px]" style={{ color: '#64748B' }}>
              Manage your content, users, and operations from a single secure workspace.
            </p>

            <div className="space-y-4">
              {SECURITY_BULLETS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.18)' }}>
                    <Icon size={14} style={{ color: '#60A5FA' }} />
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-[11px] flex-shrink-0"
          style={{ color: '#1E293B' }}
        >
          © 2025 NowAZone Systems · ISO 27001 · SOC 2 Type II
        </motion.p>
      </div>
    </aside>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData]       = useState<LoginFormData>({ email: '', password: '', rememberMe: false });
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const clearError = (field: 'email' | 'password') =>
    setFieldErrors((p) => ({ ...p, [field]: undefined }));

  const focusStyle = (hasError?: string) => ({
    borderColor: hasError ? 'var(--error)' : 'var(--accent)',
    boxShadow: `0 0 0 3px ${hasError ? 'rgba(239,68,68,0.10)' : 'rgba(59,130,246,0.12)'}`,
  });
  const blurStyle = (hasError?: string) => ({
    borderColor: hasError ? 'var(--error)' : 'var(--border)',
    boxShadow: 'none',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    if (loading) return;

    try {
      const validated = loginSchema.parse(formData);
      setLoading(true);
      const { data } = await api.post('/auth/login', validated);
      if (data?.data?.requiresTwoFactor && data?.data?.tempToken) {
        sessionStorage.setItem('twoFactorTempToken', data.data.tempToken);
        toast.info('2FA code sent to your email.');
        router.push('/auth/verify-2fa');
        return;
      }
      toast.success('Signed in successfully');
      clearProfileCache();
      const userRoles = getUserRoles(data?.data?.user || {});
      router.push(getRoleHome(userRoles));
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errs: typeof fieldErrors = {};
        err.issues.forEach((i) => {
          if (i.path[0] === 'email')    errs.email    = i.message;
          if (i.path[0] === 'password') errs.password = i.message;
        });
        setFieldErrors(errs);
        return;
      }
      const error = err as ApiError;
      if (error.response?.status === 423) { router.push('/auth/locked'); return; }
      if (error.response?.status === 401) setFieldErrors({ password: 'Incorrect email or password.' });
      else if (error.response?.status === 429) toast.error('Too many attempts. Please wait.');
      else if (error.message === 'Network Error') toast.error('Cannot reach server. Check your connection.');
      else toast.error(error.response?.data?.message || 'Sign in failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <BrandPanel />

      {/* ── Right: Form ─────────────────────────────────── */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        {/* Mobile header */}
        <div className="flex lg:hidden items-center gap-3 px-6 pt-7 pb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>NowAZone Enterprise</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-[440px]">

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 }}
              className="mb-8"
            >
              <h2 className="text-[30px] font-bold tracking-tight mb-2 leading-tight" style={{ color: 'var(--text-primary)' }}>
                Welcome back
              </h2>
              <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                Sign in to NowaZone Enterprise Console
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.24 }}
              onSubmit={handleSubmit}
              className="space-y-5"
              noValidate
            >
              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2"
                  style={{ color: 'var(--text-secondary)' }}>Work Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); clearError('email'); }}
                    placeholder="you@company.com"
                    autoComplete="email"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border text-[14px] transition-all duration-150 focus:outline-none"
                    style={{ backgroundColor: 'var(--surface)', borderColor: fieldErrors.email ? 'var(--error)' : 'var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle(fieldErrors.email))}
                    onBlur={(e)  => Object.assign(e.currentTarget.style, blurStyle(fieldErrors.email))}
                  />
                </div>
                {fieldErrors.email && <p className="mt-1.5 text-[12px]" style={{ color: 'var(--error)' }}>{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                    style={{ color: 'var(--text-secondary)' }}>Password</label>
                  <a href="/auth/forgot-password" className="text-[12px] font-medium hover:underline"
                    style={{ color: 'var(--accent-text)' }}>
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => { setFormData({ ...formData, password: e.target.value }); clearError('password'); }}
                    autoComplete="current-password"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl border text-[14px] transition-all duration-150 focus:outline-none"
                    style={{ backgroundColor: 'var(--surface)', borderColor: fieldErrors.password ? 'var(--error)' : 'var(--border)', color: 'var(--text-primary)' }}
                    onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle(fieldErrors.password))}
                    onBlur={(e)  => Object.assign(e.currentTarget.style, blurStyle(fieldErrors.password))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 text-[12px]" style={{ color: 'var(--error)' }}>{fieldErrors.password}</p>}
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="sr-only"
                  disabled={loading}
                />
                <span
                  className="w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center transition-all duration-150"
                  style={{ borderColor: 'var(--accent)', backgroundColor: formData.rememberMe ? 'var(--accent)' : 'transparent' }}
                >
                  {formData.rememberMe && (
                    <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
                      <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Keep me signed in for 30 days</span>
              </label>

              {/* Submit */}
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
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Signing in…</>
                  : 'Sign In'}
              </motion.button>
            </motion.form>

            {/* Security note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42 }}
              className="mt-6 flex items-center justify-center gap-1.5"
            >
              <Lock size={11} style={{ color: 'var(--text-muted)' }} />
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Protected by enterprise-grade security</p>
            </motion.div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.48 }}
              className="mt-3 text-center text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              <a href="#" className="hover:underline">Privacy Policy</a>
              {' · '}
              <a href="#" className="hover:underline">Terms of Service</a>
              {' · '}
              <a href="#" className="hover:underline">Support</a>
            </motion.p>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
