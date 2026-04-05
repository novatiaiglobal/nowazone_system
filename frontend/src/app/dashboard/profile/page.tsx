'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircle, Mail, Shield, Calendar, Edit2, Key, Eye, EyeOff,
  Save, Camera, X, Check, Clock, Lock, ShieldCheck, ShieldOff,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

interface UserProfile {
  _id: string; name: string; email: string; role: string; roles?: string[];
  isActive: boolean;
  createdAt: string; lastLogin?: string; permissions?: string[]; twoFactorEnabled?: boolean;
  profileImage?: { url?: string; publicId?: string };
}

// ─── Shared Input ──────────────────────────────────────────────────────────────
function Field({
  label, type = 'text', value, onChange, disabled, icon: Icon,
  suffix, autoFocus, placeholder,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; disabled?: boolean;
  icon?: React.ElementType; suffix?: React.ReactNode;
  autoFocus?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
        style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="relative">
        {Icon && (
          <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }} />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="w-full py-2.5 rounded-xl border text-[13px] transition-all duration-150 focus:outline-none"
          style={{
            backgroundColor: 'var(--surface-muted)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            paddingLeft: Icon ? '2.5rem' : '0.875rem',
            paddingRight: suffix ? '2.75rem' : '0.875rem',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.boxShadow = `0 0 0 3px var(--focus)`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({
  title, icon: Icon, iconColor, children, action,
}: {
  title: string; icon: React.ElementType; iconColor: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-5 sm:p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${iconColor}18`, border: `1px solid ${iconColor}30` }}>
            <Icon size={14} style={{ color: iconColor }} />
          </div>
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Stat Row ──────────────────────────────────────────────────────────────────
function StatRow({ label, value, icon: Icon, iconColor }: { label: string; value: string; icon: React.ElementType; iconColor: string }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
      <div className="flex items-center gap-2.5">
        <Icon size={13} style={{ color: iconColor }} />
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

// ─── Role / Status badge ───────────────────────────────────────────────────────
const BADGE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  'var(--accent)': { bg: 'var(--accent-subtle)', border: 'var(--accent-border)', text: 'var(--accent-text)' },
  'var(--success)': { bg: 'var(--success-subtle)', border: 'var(--success)', text: 'var(--success)' },
  'var(--error)': { bg: 'var(--error-subtle)', border: 'var(--error)', text: 'var(--error)' },
};
function Badge({ label, color }: { label: string; color: string }) {
  const s = BADGE_STYLES[color] ?? { bg: 'var(--surface-muted)', border: 'var(--border)', text: color };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      {label}
    </span>
  );
}

export default function ProfilePage() {
  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [loading, setLoading]             = useState(true);
  const [editMode, setEditMode]           = useState(false);
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [saving, setSaving]               = useState(false);

  // Password
  const [showPassForm, setShowPassForm]   = useState(false);
  const [passForm, setPassForm]           = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent]     = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [savingPass, setSavingPass]       = useState(false);

  // 2FA
  const [twoFaCode, setTwoFaCode]         = useState('');
  const [twoFaLoading, setTwoFaLoading]   = useState(false);
  const [twoFaSetupMode, setTwoFaSetupMode] = useState(false);
  const [disablePassword, setDisablePass] = useState('');
  const [showDisablePass, setShowDisablePass] = useState(false);

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => {
        const u = data.data?.user;
        if (u) { setProfile(u); setName(u.name); setEmail(u.email); }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    try {
      await api.patch('/auth/profile', { name, email });
      setProfile((p) => p ? { ...p, name, email } : p);
      setEditMode(false);
      toast.success('Profile updated');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setEditMode(false);
    if (profile) { setName(profile.name); setEmail(profile.email); }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    const formData = new FormData();
    formData.append('image', file);
    setAvatarUploading(true);
    try {
      const { data } = await api.patch('/auth/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const uploaded = data?.data?.profileImage;
      if (uploaded?.url) setProfile((p) => p ? { ...p, profileImage: uploaded } : p);
      toast.success('Profile image updated');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally { setAvatarUploading(false); event.target.value = ''; }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) { toast.error('Passwords do not match'); return; }
    if (passForm.newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSavingPass(true);
    try {
      await api.patch('/auth/profile/password', { currentPassword: passForm.current, newPassword: passForm.newPass });
      toast.success('Password updated');
      setShowPassForm(false); setPassForm({ current: '', newPass: '', confirm: '' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setSavingPass(false); }
  };

  const setup2FA = async () => {
    setTwoFaLoading(true);
    try {
      await api.post('/auth/2fa/setup', {});
      setTwoFaSetupMode(true);
      toast.success('Verification code sent to your email');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to start 2FA setup');
    } finally { setTwoFaLoading(false); }
  };

  const enable2FA = async () => {
    if (twoFaCode.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setTwoFaLoading(true);
    try {
      await api.post('/auth/2fa/enable', { token: twoFaCode });
      setProfile((p) => p ? { ...p, twoFactorEnabled: true } : p);
      setTwoFaSetupMode(false); setTwoFaCode('');
      toast.success('2FA enabled');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to enable 2FA');
    } finally { setTwoFaLoading(false); }
  };

  const disable2FA = async () => {
    if (!disablePassword) { toast.error('Password required'); return; }
    setTwoFaLoading(true);
    try {
      await api.post('/auth/2fa/disable', { password: disablePassword });
      setProfile((p) => p ? { ...p, twoFactorEnabled: false } : p);
      setDisablePass('');
      toast.success('2FA disabled');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to disable 2FA');
    } finally { setTwoFaLoading(false); }
  };

  // ── Loading ──
  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ backgroundColor: 'var(--bg)' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
  if (!profile) return null;

  const initials = profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const roles = profile.roles?.length ? profile.roles : (profile.role ? [profile.role] : []);
  const roleLabel = roles.length > 1
    ? roles.map((r) => r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())).join(', ')
    : profile.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="p-5 sm:p-6 min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>

      {/* ── Page header ────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
            <UserCircle size={15} style={{ color: 'var(--accent)' }} />
          </div>
          My Profile
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Manage your personal information and account security
        </p>
      </div>

      {/* ── Body: 2-column grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] gap-5 items-start">

        {/* ═══════════════════════════════════════
            LEFT COLUMN
            ═══════════════════════════════════════ */}
        <div className="space-y-5">

          {/* Identity card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border p-5 sm:p-6"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {/* Avatar row */}
            <div className="flex items-start gap-5 mb-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0 group">
                <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-2xl overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-info))' }}>
                  {profile.profileImage?.url ? (
                    <img src={profile.profileImage.url} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">{initials}</span>
                  )}
                </div>
                {/* Upload overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 rounded-2xl flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                  title="Change photo"
                >
                  {avatarUploading
                    ? <Loader2 size={18} className="animate-spin text-white" />
                    : <Camera size={18} className="text-white" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0">
                {editMode ? (
                  <div className="space-y-3">
                    <Field label="Display Name" value={name} onChange={setName}
                      autoFocus placeholder="Your full name" />
                    <Field label="Email Address" type="email" value={email} onChange={setEmail}
                      icon={Mail} placeholder="you@company.com" />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition-all cursor-pointer disabled:opacity-60"
                        style={{ backgroundColor: 'var(--accent)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                      >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={cancelEdit}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium transition-all cursor-pointer"
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-muted)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <X size={13} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-[18px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {profile.name}
                      </h2>
                      <button
                        onClick={() => setEditMode(true)}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-all cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-muted)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        title="Edit profile"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      <Mail size={12} />
                      <span className="truncate">{profile.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roles.length > 1 ? (
                        roles.map((r) => (
                          <Badge
                            key={r}
                            label={r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            color="var(--accent)"
                          />
                        ))
                      ) : (
                        <Badge label={roleLabel} color="var(--accent)" />
                      )}
                      <Badge
                        label={profile.isActive ? '● Active' : '● Inactive'}
                        color={profile.isActive ? 'var(--success)' : 'var(--error)'}
                      />
                      {profile.twoFactorEnabled && <Badge label="2FA On" color="var(--success)" />}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Account details */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 }}
          >
            <SectionCard title="Account Details" icon={Calendar} iconColor="var(--accent)">
              <div>
                <StatRow label="Role"         value={roleLabel} icon={Shield}   iconColor="var(--accent)" />
                <StatRow label="Status"       value={profile.isActive ? 'Active' : 'Inactive'}
                  icon={Check} iconColor={profile.isActive ? 'var(--success)' : 'var(--error)'} />
                <StatRow
                  label="Member Since"
                  value={new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  icon={Calendar} iconColor="var(--accent)"
                />
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <Clock size={13} style={{ color: 'var(--warning)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Last Login</span>
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* Permissions */}
          {profile.permissions && profile.permissions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <SectionCard title="Permissions" icon={Shield} iconColor="var(--accent)">
                <div className="flex flex-wrap gap-2">
                  {profile.permissions.map((perm) => (
                    <span key={perm}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                      style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent-text)' }}>
                      {perm}
                    </span>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          )}
        </div>

        {/* ═══════════════════════════════════════
            RIGHT COLUMN — Security
            ═══════════════════════════════════════ */}
        <div className="space-y-5">

          {/* 2FA card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            <SectionCard
              title="Two-Factor Authentication"
              icon={profile.twoFactorEnabled ? ShieldCheck : ShieldOff}
              iconColor={profile.twoFactorEnabled ? 'var(--success)' : 'var(--text-muted)'}
            >
              {/* Status row */}
              <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-muted)' }}>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  Require a 6-digit code during sign-in
                </p>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                  style={{
                    backgroundColor: profile.twoFactorEnabled ? 'var(--success-subtle)' : 'var(--surface-muted)',
                    border: `1px solid ${profile.twoFactorEnabled ? 'var(--success)' : 'var(--border)'}`,
                    color: profile.twoFactorEnabled ? 'var(--success)' : 'var(--text-muted)',
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: profile.twoFactorEnabled ? 'var(--success)' : 'var(--text-muted)' }} />
                  {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <AnimatePresence mode="wait">
                {/* Enable flow */}
                {!profile.twoFactorEnabled && !twoFaSetupMode && (
                  <motion.div key="setup-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <button
                      onClick={setup2FA} disabled={twoFaLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all cursor-pointer disabled:opacity-60"
                      style={{ backgroundColor: 'var(--accent)' }}
                      onMouseEnter={(e) => !twoFaLoading && (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    >
                      {twoFaLoading
                        ? <><Loader2 size={14} className="animate-spin" /> Sending code…</>
                        : <><ShieldCheck size={14} /> Enable 2FA</>}
                    </button>
                  </motion.div>
                )}

                {/* Verify code */}
                {!profile.twoFactorEnabled && twoFaSetupMode && (
                  <motion.div key="verify-code" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      Enter the 6-digit code we sent to your email
                    </p>
                    <input
                      value={twoFaCode}
                      onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      inputMode="numeric"
                      className="w-full px-4 py-2.5 rounded-xl border text-[16px] font-mono text-center tracking-[0.4em] transition-all focus:outline-none"
                      style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <div className="flex gap-2">
                      <button onClick={enable2FA} disabled={twoFaLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all cursor-pointer disabled:opacity-60"
                        style={{ backgroundColor: 'var(--accent)' }}
                        onMouseEnter={(e) => !twoFaLoading && (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                      >
                        {twoFaLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        {twoFaLoading ? 'Verifying…' : 'Verify'}
                      </button>
                      <button onClick={() => { setTwoFaSetupMode(false); setTwoFaCode(''); }}
                        className="px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all cursor-pointer"
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-muted)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Disable flow */}
                {profile.twoFactorEnabled && (
                  <motion.div key="disable" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      Confirm your password to disable 2FA
                    </p>
                    <div className="relative">
                      <input
                        type={showDisablePass ? 'text' : 'password'}
                        value={disablePassword}
                        onChange={(e) => setDisablePass(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-[13px] transition-all focus:outline-none"
                        style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--error-subtle)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                      <button type="button" onClick={() => setShowDisablePass(!showDisablePass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}>
                        {showDisablePass ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <button onClick={disable2FA} disabled={twoFaLoading}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-60"
                      style={{ color: 'var(--error)', backgroundColor: 'var(--error-subtle)', border: '1px solid var(--error)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      {twoFaLoading ? <Loader2 size={13} className="animate-spin" /> : <ShieldOff size={13} />}
                      {twoFaLoading ? 'Disabling…' : 'Disable 2FA'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionCard>
          </motion.div>

          {/* Password card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
          >
            <SectionCard
              title="Password & Security"
              icon={Key}
              iconColor="var(--warning)"
              action={
                <button
                  onClick={() => { setShowPassForm(!showPassForm); setPassForm({ current: '', newPass: '', confirm: '' }); }}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer"
                  style={{
                    color: showPassForm ? 'var(--text-muted)' : 'var(--accent-text)',
                    backgroundColor: showPassForm ? 'var(--surface-muted)' : 'var(--accent-subtle)',
                    border: `1px solid ${showPassForm ? 'var(--border)' : 'var(--accent-border)'}`,
                  }}
                >
                  {showPassForm ? 'Cancel' : 'Change Password'}
                </button>
              }
            >
              <AnimatePresence mode="wait">
                {!showPassForm ? (
                  <motion.div key="pass-info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
                      <Lock size={13} style={{ color: 'var(--text-muted)' }} />
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        Use a strong password with uppercase, numbers, and symbols.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="pass-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onSubmit={changePassword}
                    className="space-y-4"
                  >
                    {/* Current */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
                        style={{ color: 'var(--text-secondary)' }}>Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrent ? 'text' : 'password'} required
                          value={passForm.current}
                          onChange={(e) => setPassForm((p) => ({ ...p, current: e.target.value }))}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-[13px] transition-all focus:outline-none"
                          style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                        <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity"
                          style={{ color: 'var(--text-muted)' }}>
                          {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* New */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
                        style={{ color: 'var(--text-secondary)' }}>New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'} required
                          value={passForm.newPass}
                          onChange={(e) => setPassForm((p) => ({ ...p, newPass: e.target.value }))}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-[13px] transition-all focus:outline-none"
                          style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity"
                          style={{ color: 'var(--text-muted)' }}>
                          {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
                        style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'} required
                          value={passForm.confirm}
                          onChange={(e) => setPassForm((p) => ({ ...p, confirm: e.target.value }))}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-[13px] transition-all focus:outline-none"
                          style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--focus)'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity"
                          style={{ color: 'var(--text-muted)' }}>
                          {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={savingPass}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all cursor-pointer disabled:opacity-60"
                      style={{ backgroundColor: 'var(--accent)' }}
                      onMouseEnter={(e) => !savingPass && (e.currentTarget.style.backgroundColor = 'var(--accent-strong)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    >
                      {savingPass
                        ? <><Loader2 size={13} className="animate-spin" /> Updating…</>
                        : <><Lock size={13} /> Update Password</>}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </SectionCard>
          </motion.div>

        </div>{/* end right column */}
      </div>
    </motion.div>
  );
}
