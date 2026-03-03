'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Star, ChevronDown, Mail, Phone, Calendar, Briefcase, Eye, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

interface Application {
  _id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  job: { _id: string; title: string; department: string };
  status: string;
  rating?: number;
  source: string;
  experience?: string;
  createdAt: string;
}

const STATUS_OPTS = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'];
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
};
const STATUS_COLORS: Record<string, string> = {
  new:        'text-blue-500 bg-blue-500/10 border-blue-500/20',
  screening:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  interview:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  offer:      'text-purple-400 bg-purple-400/10 border-purple-400/20',
  hired:      'text-green-400 bg-green-400/10 border-green-400/20',
  rejected:   'text-red-400 bg-red-400/10 border-red-400/20',
};

export default function ApplicationsPage() {
  const [apps, setApps]           = useState<Application[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [total, setTotal]         = useState(0);
  const [selected, setSelected]   = useState<Application | null>(null);

  const fetchApps = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (search)       params.set('search', search);
      const { data } = await api.get(`/applications?${params}`);
      setApps(data.data.applications || []);
      setTotal(data.data.pagination?.total || 0);
    } catch { toast.error('Failed to load applications'); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchApps(), 400);
    return () => clearTimeout(timer);
  }, [fetchApps]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/applications/${id}`, { status });
      setApps(prev => prev.map(a => a._id === id ? { ...a, status } : a));
      if (selected?._id === id) setSelected(s => s ? { ...s, status } : s);
      toast.success('Status updated');
    } catch { toast.error('Failed to update'); }
  };

  const grouped: Record<string, Application[]> = STATUS_OPTS.reduce((acc, s) => {
    acc[s] = apps.filter(a => a.status === s);
    return acc;
  }, {} as Record<string, Application[]>);

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-4 border-t-transparent rounded-full"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

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
              <Users size={22} style={{ color: 'var(--accent)' }} />
            </motion.div>
            Applications
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{total} total applications in pipeline</p>
        </div>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicants…"
            className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm placeholder-gray-500 focus:outline-none"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          className="px-4 py-3 border rounded-xl text-sm focus:outline-none"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="">All Statuses</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </motion.div>

      {/* Kanban Board - 3 cols (2 rows) when narrow, 6 cols (1 row) when wide; no horizontal scroll */}
      {!statusFilter ? (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 xl:grid-cols-6 gap-4 xl:gap-5"
        >
          {STATUS_OPTS.map(status => (
            <motion.div key={status} variants={fadeUp} className="min-w-0">
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-b-0 border ${STATUS_COLORS[status]}`}>
                <span className="text-xs font-bold uppercase tracking-wide capitalize">{status}</span>
                <span className="text-xs font-bold">{grouped[status].length}</span>
              </div>
              <div className="space-y-2 p-2 border border-t-0 rounded-b-xl min-h-[120px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                {grouped[status].slice(0, 8).map(app => (
                  <motion.div key={app._id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="rounded-lg p-2.5 cursor-pointer border transition-all"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'transparent' }}
                    onClick={() => setSelected(app)}>
                    <p className="text-xs font-semibold truncate">{app.applicantName}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{app.job?.title || '—'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {app.rating && Array.from({ length: app.rating }).map((_, i) => (
                        <Star key={i} size={8} className="text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </motion.div>
                ))}
                {grouped[status].length > 8 && (
                  <p className="text-[10px] text-center py-1" style={{ color: 'var(--text-muted)' }}>+{grouped[status].length - 8} more</p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* List view when filtered */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="border rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="text-left px-6 py-4">Applicant</th>
                <th className="text-left px-6 py-4">Job</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-left px-6 py-4">Applied</th>
                <th className="text-left px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {apps.map(app => (
                <motion.tr key={app._id} whileHover={{ backgroundColor: 'var(--surface-muted)' }} className="transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold">{app.applicantName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{app.applicantEmail}</p>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{app.job?.title || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[app.status]}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <motion.button
                      onClick={() => setSelected(app)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="text-xs hover:underline flex items-center gap-1 cursor-pointer"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Eye size={12} /> View
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Detail Side Panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-end z-50"
            onClick={(e) => e.target === e.currentTarget && setSelected(null)}
          >
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="border-l w-full max-w-md h-full md:h-auto md:max-h-[90vh] overflow-y-auto p-6 md:rounded-l-2xl"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Application Detail</h2>
              <motion.button
                onClick={() => setSelected(null)}
                whileHover={{ scale: 1.08, rotate: 90 }}
                whileTap={{ scale: 0.92 }}
                className="transition-colors cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </motion.button>
            </div>
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl border flex items-center justify-center" style={{ backgroundColor: 'var(--accent-subtle)', borderColor: 'var(--accent-border)' }}>
                <span className="font-bold text-xl" style={{ color: 'var(--accent)' }}>
                  {selected.applicantName.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold">{selected.applicantName}</h3>
                <p className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--text-muted)' }}><Mail size={12} />{selected.applicantEmail}</p>
                {selected.applicantPhone && <p className="text-sm flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}><Phone size={12} />{selected.applicantPhone}</p>}
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--bg)' }}>
                <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Application Info</p>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Position</span>
                  <span className="font-medium">{selected.job?.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Department</span>
                  <span className="font-medium">{selected.job?.department}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Source</span>
                  <span className="capitalize font-medium">{selected.source}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Applied</span>
                  <span className="font-medium">{new Date(selected.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Update Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTS.map(s => (
                    <motion.button key={s} onClick={() => updateStatus(selected._id, s)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${selected.status === s ? STATUS_COLORS[s] + ' border-opacity-100' : ''}`}
                      style={selected.status === s ? {} : { borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
