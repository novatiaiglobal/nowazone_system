'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Globe, Shield, Bell, Database, Save, ChevronRight, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/lib/api';
import { useTheme } from 'next-themes';

interface SettingSection {
  id: string;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
  iconColor: string;
  description: string;
}

const SECTIONS: SettingSection[] = [
  { id: 'general', label: 'General', Icon: Settings, iconColor: 'var(--accent)', description: 'Site name, timezone, and basic settings' },
  { id: 'security', label: 'Security', Icon: Shield, iconColor: 'var(--error)', description: 'Authentication, 2FA, and access control' },
  { id: 'notifications', label: 'Notifications', Icon: Bell, iconColor: 'var(--accent)', description: 'Email alerts and push notification preferences' },
  { id: 'seo', label: 'SEO & Meta', Icon: Globe, iconColor: 'var(--success)', description: 'Default meta tags, sitemap, and indexing rules' },
  { id: 'system', label: 'System', Icon: Database, iconColor: 'var(--warning)', description: 'Database, cache, and performance settings' },
];

const GENERAL_DEFAULTS = {
  siteName: 'NowAZone', tagline: 'Enterprise Console', timezone: 'Asia/Kolkata',
  language: 'en', dateFormat: 'DD/MM/YYYY', currency: 'USD',
};

const SECURITY_DEFAULTS = {
  sessionTimeout: 60, maxLoginAttempts: 5, lockoutDuration: 30,
  requireMFA: false, passwordExpiry: 90,
};

const NOTIF_DEFAULTS = {
  emailOnNewLead: true, emailOnNewTicket: true, emailOnNewApplication: false,
  emailOnInvoicePaid: true, browserPush: false,
};

const SEO_DEFAULTS = {
  defaultMetaDescription: '', googleSiteVerification: '', generateSitemap: true, allowIndexing: true,
};


const SYSTEM_DEFAULTS = {
  maintenanceMode: false, maxFileSize: 10, allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
  backupEnabled: true, backupFrequency: 'daily', logRetentionDays: 30, cacheEnabled: true, sessionTimeout: 1440,
};

const DEFAULT_BACKUP_ERROR = 'Failed to download backup';

/** When using responseType: 'blob', Axios gives error.response.data as a Blob. Parse it to get the API error message. */
async function getErrorMessageFromBlobResponse(error: any): Promise<string> {
  const data = error?.response?.data;
  if (!error?.response) {
    const msg = error?.message || '';
    if (msg.toLowerCase().includes('network') || error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK') {
      return 'Network error. Check that the API server is running and reachable, then try again.';
    }
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'Request timed out. The backup may be large; try again.';
    }
    return msg || DEFAULT_BACKUP_ERROR;
  }
  if (!data) return error?.message || DEFAULT_BACKUP_ERROR;
  if (typeof data === 'object' && data !== null && typeof (data as { message?: string }).message === 'string') {
    return (data as { message: string }).message;
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as { message?: string };
      if (typeof parsed?.message === 'string') return parsed.message;
    } catch {
      // ignore parse errors
    }
  }
  const status = error?.response?.status;
  if (status === 401) return 'Not authorized. Please log in again.';
  if (status === 403) return 'You do not have permission to download backups.';
  if (status === 404) return 'No backups available.';
  return DEFAULT_BACKUP_ERROR;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [general, setGeneral]     = useState(GENERAL_DEFAULTS);
  const [security, setSecurity]   = useState(SECURITY_DEFAULTS);
  const [notif, setNotif]         = useState(NOTIF_DEFAULTS);
  const [seo, setSeo]             = useState(SEO_DEFAULTS);
  const [system, setSystem]         = useState(SYSTEM_DEFAULTS);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  // Load settings from backend when component mounts
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/settings');
        const settings = response.data.data;
        
        // Update state with fetched settings
        setGeneral({
          siteName: settings.siteName,
          tagline: settings.tagline,
          timezone: settings.timezone,
          language: settings.language,
          dateFormat: settings.dateFormat,
          currency: settings.currency,
        });
        
        setSecurity({
          sessionTimeout: settings.security.sessionTimeout,
          maxLoginAttempts: settings.security.maxLoginAttempts,
          lockoutDuration: settings.security.lockoutDuration,
          requireMFA: settings.security.requireMFA,
          passwordExpiry: settings.security.passwordExpiry,
        });
        
        setNotif({
          emailOnNewLead: settings.notifications.emailOnNewLead,
          emailOnNewTicket: settings.notifications.emailOnNewTicket,
          emailOnNewApplication: settings.notifications.emailOnNewApplication,
          emailOnInvoicePaid: settings.notifications.emailOnInvoicePaid,
          browserPush: settings.notifications.browserPush,
        });
        
        setSeo({
          defaultMetaDescription: settings.seo.defaultMetaDescription,
          googleSiteVerification: settings.seo.googleSiteVerification,
          generateSitemap: settings.seo.generateSitemap,
          allowIndexing: settings.seo.allowIndexing,
        });
        
        
        
        setSystem({
          maintenanceMode: settings.system.maintenanceMode,
          maxFileSize: settings.system.maxFileSize,
          allowedFileTypes: settings.system.allowedFileTypes,
          backupEnabled: settings.system.backupEnabled,
          backupFrequency: settings.system.backupFrequency,
          logRetentionDays: settings.system.logRetentionDays,
          cacheEnabled: settings.system.cacheEnabled,
          sessionTimeout: settings.system.sessionTimeout,
        });
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  const { setTheme } = useTheme();
  
  const handleDownloadBackup = async () => {
    try {
      setDownloadingBackup(true);
      const response = await api.get('/settings/backups/latest', {
        responseType: 'blob',
        timeout: 120000,
      });

      // Success: response.data is the file blob
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      const disposition = response.headers['content-disposition'] as string | undefined;
      let filename = 'backup-latest.json';
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/i);
        if (match?.[1]) filename = match[1];
      }

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Backup download started');
    } catch (error: any) {
      const message = await getErrorMessageFromBlobResponse(error);
      toast.error(message);
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        general: {
          siteName: general.siteName,
          tagline: general.tagline,
          timezone: general.timezone,
          language: general.language,
          dateFormat: general.dateFormat,
          currency: general.currency,
        },
        security: {
          sessionTimeout: security.sessionTimeout,
          maxLoginAttempts: security.maxLoginAttempts,
          lockoutDuration: security.lockoutDuration,
          requireMFA: security.requireMFA,
          passwordExpiry: security.passwordExpiry,
        },
        notifications: {
          emailOnNewLead: notif.emailOnNewLead,
          emailOnNewTicket: notif.emailOnNewTicket,
          emailOnNewApplication: notif.emailOnNewApplication,
          emailOnInvoicePaid: notif.emailOnInvoicePaid,
          browserPush: notif.browserPush,
        },
        seo: {
          defaultMetaDescription: seo.defaultMetaDescription,
          googleSiteVerification: seo.googleSiteVerification,
          generateSitemap: seo.generateSitemap,
          allowIndexing: seo.allowIndexing,
        },

        system: {
          maintenanceMode: system.maintenanceMode,
          maxFileSize: system.maxFileSize,
          allowedFileTypes: system.allowedFileTypes,
          backupEnabled: system.backupEnabled,
          backupFrequency: system.backupFrequency,
          logRetentionDays: system.logRetentionDays,
          cacheEnabled: system.cacheEnabled,
          sessionTimeout: system.sessionTimeout,
        },
      };
      
      await api.patch('/settings', payload);
      
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto" style={{ borderColor: 'var(--accent)' }}></div>
          <p className="mt-4" style={{ color: 'var(--text-primary)' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="p-6 min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-subtle)' }}><Settings size={22} style={{ color: 'var(--accent)' }} /></div>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure your enterprise console preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(section => (
              <button key={section.id} onClick={() => setActiveSection(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left border cursor-pointer"
                style={activeSection === section.id
                  ? { backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)', borderColor: 'var(--accent-border)' }
                  : { backgroundColor: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                <span style={{ color: activeSection === section.id ? section.iconColor : 'var(--text-muted)' }}><section.Icon size={16} /></span>
                {section.label}
                {activeSection === section.id && <span className="ml-auto" style={{ color: 'var(--accent-text)' }}><ChevronRight size={12} /></span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <motion.div key={activeSection} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            className="border rounded-2xl p-6"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            {activeSection === 'general' && (
              <div className="space-y-5">
                <div><h2 className="font-bold text-lg">General Settings</h2><p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Basic configuration for your platform</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Site Name', key: 'siteName' },
                    { label: 'Tagline', key: 'tagline' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                      <input value={(general as any)[f.key]} onChange={e => setGeneral(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Timezone</label>
                    <select value={general.timezone} onChange={e => setGeneral(p => ({ ...p, timezone: e.target.value }))}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London'].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Currency</label>
                    <select value={general.currency} onChange={e => setGeneral(p => ({ ...p, currency: e.target.value }))}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {['USD', 'EUR', 'GBP', 'INR', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-5">
                <div><h2 className="font-bold text-lg">Security Settings</h2><p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Control access and authentication policies</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Session Timeout (min)', key: 'sessionTimeout', type: 'number' },
                    { label: 'Max Login Attempts', key: 'maxLoginAttempts', type: 'number' },
                    { label: 'Lockout Duration (min)', key: 'lockoutDuration', type: 'number' },
                    { label: 'Password Expiry (days)', key: 'passwordExpiry', type: 'number' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                      <input type={f.type} value={(security as any)[f.key]} onChange={e => setSecurity(p => ({ ...p, [f.key]: +e.target.value }))}
                        className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => setSecurity(p => ({ ...p, requireMFA: !p.requireMFA }))}
                      className="w-10 h-5 rounded-full transition-all relative"
                      style={{ backgroundColor: security.requireMFA ? 'var(--accent)' : 'var(--surface-muted)' }}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${security.requireMFA ? 'left-5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-sm font-semibold">Require 2FA for all users</span>
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-5">
                <div><h2 className="font-bold text-lg">Notification Preferences</h2><p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure when and how you receive alerts</p></div>
                <div className="space-y-3">
                  {[
                    { label: 'Email on new lead', key: 'emailOnNewLead' },
                    { label: 'Email on new support ticket', key: 'emailOnNewTicket' },
                    { label: 'Email on new job application', key: 'emailOnNewApplication' },
                    { label: 'Email when invoice is paid', key: 'emailOnInvoicePaid' },
                    { label: 'Browser push notifications', key: 'browserPush' },
                  ].map(f => (
                    <label key={f.key} className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors" style={{ backgroundColor: 'var(--bg)' }}>
                      <span className="text-sm font-medium">{f.label}</span>
                      <div onClick={() => setNotif(p => ({ ...p, [f.key]: !(p as any)[f.key] }))}
                        className="w-10 h-5 rounded-full transition-all relative"
                        style={{ backgroundColor: (notif as any)[f.key] ? 'var(--accent)' : 'var(--surface-muted)' }}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${(notif as any)[f.key] ? 'left-5' : 'left-0.5'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'seo' && (
              <div className="space-y-5">
                <div><h2 className="font-bold text-lg">SEO & Meta Settings</h2><p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure search engine optimization defaults</p></div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Default Meta Description</label>
                    <textarea value={seo.defaultMetaDescription} onChange={e => setSeo(p => ({ ...p, defaultMetaDescription: e.target.value }))} rows={3}
                      placeholder="Default meta description for pages without a custom one…"
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none resize-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Google Site Verification</label>
                    <input value={seo.googleSiteVerification} onChange={e => setSeo(p => ({ ...p, googleSiteVerification: e.target.value }))}
                      placeholder="Google Search Console verification code (meta tag content)"
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in the frontend env to this value so the verification meta tag is rendered on the site.</p>
                  </div>
                  {[
                    { label: 'Auto-generate sitemap', key: 'generateSitemap' },
                    { label: 'Allow search engine indexing', key: 'allowIndexing' },
                  ].map(f => (
                    <label key={f.key} className="flex items-center justify-between p-4 rounded-xl cursor-pointer" style={{ backgroundColor: 'var(--bg)' }}>
                      <span className="text-sm font-medium">{f.label}</span>
                      <div onClick={() => setSeo(p => ({ ...p, [f.key]: !(p as any)[f.key] }))}
                        className="w-10 h-5 rounded-full transition-all relative"
                        style={{ backgroundColor: (seo as any)[f.key] ? 'var(--accent)' : 'var(--surface-muted)' }}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${(seo as any)[f.key] ? 'left-5' : 'left-0.5'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}


            
            {activeSection === 'system' && (
              <div className="space-y-5">
                <div><h2 className="font-bold text-lg">System Settings</h2><p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure system-level parameters and maintenance options</p></div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
                    <div>
                      <span className="text-sm font-medium">Maintenance Mode</span>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Put the system in maintenance mode to restrict access</p>
                    </div>
                    <div onClick={() => setSystem(p => ({ ...p, maintenanceMode: !p.maintenanceMode }))}
                      className="w-10 h-5 rounded-full transition-all relative"
                      style={{ backgroundColor: system.maintenanceMode ? 'var(--error)' : 'var(--surface-muted)' }}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${system.maintenanceMode ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
                    <div>
                      <span className="text-sm font-medium">Cache Enabled</span>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Enable caching for improved performance</p>
                    </div>
                    <div onClick={() => setSystem(p => ({ ...p, cacheEnabled: !p.cacheEnabled }))}
                      className="w-10 h-5 rounded-full transition-all relative"
                      style={{ backgroundColor: system.cacheEnabled ? 'var(--accent)' : 'var(--surface-muted)' }}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${system.cacheEnabled ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
                    <div>
                      <span className="text-sm font-medium">Backup Enabled</span>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Enable automated backups</p>
                    </div>
                    <div onClick={() => setSystem(p => ({ ...p, backupEnabled: !p.backupEnabled }))}
                      className="w-10 h-5 rounded-full transition-all relative"
                      style={{ backgroundColor: system.backupEnabled ? 'var(--accent)' : 'var(--surface-muted)' }}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${system.backupEnabled ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Max File Size (MB)</label>
                    <input type="number" value={system.maxFileSize} onChange={e => setSystem(p => ({ ...p, maxFileSize: parseInt(e.target.value) || 10 }))}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Log Retention (Days)</label>
                    <input type="number" value={system.logRetentionDays} onChange={e => setSystem(p => ({ ...p, logRetentionDays: parseInt(e.target.value) || 30 }))}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Session Timeout (minutes)</label>
                    <input type="number" value={system.sessionTimeout} onChange={e => setSystem(p => ({ ...p, sessionTimeout: parseInt(e.target.value) || 1440 }))}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Backup Frequency</label>
                    <select value={system.backupFrequency} onChange={e => setSystem(p => ({ ...p, backupFrequency: e.target.value }))}
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Allowed File Types</label>
                  <input value={system.allowedFileTypes.join(',')} onChange={e => setSystem(p => ({ ...p, allowedFileTypes: e.target.value.split(',').map(ext => ext.trim()) }))}
                    placeholder="Comma separated file extensions (e.g., jpg,jpeg,png,pdf)"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                </div>

                <div className="mt-4 p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  style={{ backgroundColor: 'var(--bg)' }}>
                  <div>
                    <p className="text-sm font-medium">On-demand backup export</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Download the latest server-side JSON backup snapshot. Only system administrators can access this.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={downloadingBackup}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition disabled:opacity-60"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--accent-text)' }}
                  >
                    <Download size={14} />
                    {downloadingBackup ? 'Preparing backup…' : 'Download latest backup'}
                  </button>
                </div>
              </div>
            )}

            {/* Save Button - available for all sections */}
            <div className="flex justify-end mt-6 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 text-white"
                style={{ backgroundColor: 'var(--accent)' }}>
                <Save size={16} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
