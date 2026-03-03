'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, Search, UserPlus, Trash2, Download, RefreshCw, Users } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

interface Subscriber { _id: string; email: string; name?: string; status: string; source: string; country?: string; createdAt: string; }

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  active:       { text: 'var(--success)', bg: 'var(--success-subtle)' },
  unsubscribed: { text: 'var(--text-muted)', bg: 'var(--surface-muted)' },
  bounced:      { text: 'var(--error)', bg: 'var(--error-subtle)' },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
};

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('active');
  const [total, setTotal]             = useState(0);
  const [stats, setStats]             = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [page, setPage]               = useState(1);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const [subRes, statsRes] = await Promise.all([
        api.get(`/subscribers?${params}`),
        api.get('/subscribers/stats'),
      ]);
      setSubscribers(subRes.data.data.subscribers || []);
      setTotal(subRes.data.data.pagination?.total || 0);
      setStats(statsRes.data.data);
    } catch { toast.error('Failed to load subscribers'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchAll, 400);
    return () => clearTimeout(t);
  }, [fetchAll]);

  const deleteSubscriber = async (id: string) => {
    if (!confirm('Remove this subscriber?')) return;
    try {
      await api.delete(`/subscribers/${id}`);
      setSubscribers(prev => prev.filter(s => s._id !== id));
      toast.success('Subscriber removed');
    } catch { toast.error('Failed'); }
  };

  const exportCSV = () => {
    const header = 'Email,Name,Status,Source,Country,Joined\n';
    const rows = subscribers.map(s =>
      `${s.email},${s.name || ''},${s.status},${s.source},${s.country || ''},${new Date(s.createdAt).toLocaleDateString()}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'subscribers.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported!');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="p-6 min-h-screen"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 260, damping: 24 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <motion.div
              className="p-2 rounded-xl"
              style={{ backgroundColor: 'var(--accent-subtle)' }}
              whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
              transition={{ duration: 0.4 }}
            >
              <Mail size={22} style={{ color: 'var(--accent)' }} />
            </motion.div>
            Email Subscribers
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your subscriber list and newsletter audience</p>
        </div>
        <motion.button
          onClick={exportCSV}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm cursor-pointer"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <Download size={14} /> Export CSV
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 gap-4 mb-6"
      >
        {[
          { label: 'Total', value: stats.total, accent: 'var(--accent)', bg: 'var(--accent-subtle)', Icon: Users },
          { label: 'Active', value: stats.active, accent: 'var(--success)', bg: 'var(--success-subtle)', Icon: UserPlus },
          { label: 'Unsubscribed', value: stats.unsubscribed, accent: 'var(--text-muted)', bg: 'var(--surface-muted)', Icon: Mail },
        ].map(s => (
          <motion.div key={s.label} variants={fadeUp}
            whileHover={{ scale: 1.03, y: -3, transition: { type: 'spring' as const, stiffness: 400, damping: 18 } }}
            whileTap={{ scale: 0.98 }}
            className="border rounded-xl p-4 transition-shadow cursor-pointer"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <s.Icon size={14} style={{ color: s.accent }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: s.accent }}>{s.value.toLocaleString()}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex gap-3 mb-6 flex-wrap"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subscribers…"
            className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm placeholder-gray-500 focus:outline-none"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          className="px-4 py-3 border rounded-xl text-sm focus:outline-none"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="border rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-4 border-t-transparent rounded-full"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading subscribers...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="text-left px-6 py-4">Subscriber</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-left px-6 py-4">Source</th>
                <th className="text-left px-6 py-4">Country</th>
                <th className="text-left px-6 py-4">Joined</th>
                <th className="text-left px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {subscribers.map(sub => (
                <motion.tr key={sub._id} whileHover={{ backgroundColor: 'var(--surface-muted)' }} className="transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold">{sub.email}</p>
                    {sub.name && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub.name}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        color: STATUS_COLORS[sub.status]?.text ?? 'var(--text-muted)',
                        backgroundColor: STATUS_COLORS[sub.status]?.bg ?? 'var(--surface-muted)',
                      }}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${sub.status === 'active' ? 'animate-pulse' : ''}`}
                        style={{ backgroundColor: STATUS_COLORS[sub.status]?.text ?? 'var(--text-muted)' }}
                      />
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{sub.source}</td>
                  <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{sub.country || '—'}</td>
                  <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>{new Date(sub.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <motion.button
                      onClick={() => deleteSubscriber(sub._id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
              {subscribers.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Mail size={32} className="mx-auto mb-2 opacity-20" />
                  No subscribers found
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </motion.div>

      {total > 50 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between mt-4"
        >
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subscribers.length} of {total}</p>
          <div className="flex gap-2">
            <motion.button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              whileHover={{ scale: page === 1 ? 1 : 1.03 }}
              whileTap={{ scale: page === 1 ? 1 : 0.97 }}
              className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Previous
            </motion.button>
            <motion.button
              onClick={() => setPage(p => p + 1)}
              disabled={subscribers.length < 50}
              whileHover={{ scale: subscribers.length < 50 ? 1 : 1.03 }}
              whileTap={{ scale: subscribers.length < 50 ? 1 : 0.97 }}
              className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Next
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
