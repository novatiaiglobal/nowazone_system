'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ClipboardList, Mail, Phone, FileText,
  ChevronRight, Download, Eye, CheckCircle, XCircle,
  Calendar, Briefcase, User, MessageSquare,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/lib/api';

type AppStatus = 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

interface Application {
  _id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  job?: { _id: string; title: string; department?: string };
  resumeUrl?: string;
  skills?: string[];
  experience?: string;
  status: AppStatus;
  notes?: string;
  createdAt: string;
}

const COLUMNS: { key: AppStatus; label: string; color: string; bg: string }[] = [
  { key: 'new',       label: 'New',       color: 'var(--info)',    bg: 'var(--info-subtle)' },
  { key: 'screening', label: 'Screening', color: 'var(--info)',    bg: 'var(--info-subtle)' },
  { key: 'interview', label: 'Interview', color: 'var(--warning)', bg: 'var(--warning-subtle)' },
  { key: 'offer',     label: 'Offer',     color: 'var(--accent)',  bg: 'var(--accent-subtle)' },
  { key: 'hired',     label: 'Hired',     color: 'var(--success)', bg: 'var(--success-subtle)' },
  { key: 'rejected',  label: 'Rejected',  color: 'var(--error)',   bg: 'var(--error-subtle)' },
];

const STATUS_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  new:       ['screening', 'rejected'],
  screening: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer:     ['hired', 'rejected'],
  hired:     [],
  rejected:  ['new'],
};

interface JobOption { _id: string; title: string }

export default function ApplicationsPage() {
  const [applications, setApplications]   = useState<Application[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [jobFilter, setJobFilter]         = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [jobs, setJobs]                   = useState<JobOption[]>([]);
  const [selected, setSelected]           = useState<Application | null>(null);
  const [notes, setNotes]                 = useState('');
  const [savingNotes, setSavingNotes]     = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    api.get('/jobs?limit=100').then(({ data }) => {
      setJobs(data.data?.jobs || []);
    }).catch(() => {});
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search)       params.set('search', search);
      if (jobFilter)    params.set('job', jobFilter);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/applications?${params.toString()}`);
      setApplications(data.data?.applications || data.data || []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [search, jobFilter, statusFilter]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (app: Application, newStatus: AppStatus) => {
    setUpdatingStatus(true);
    try {
      const { data } = await api.patch(`/applications/${app._id}`, { status: newStatus });
      if (newStatus === 'hired') {
        const h = data?.data?.hiring;
        const filled = h?.positionsFilled ?? 1;
        const total = h?.totalPositions ?? 1;
        if (h?.jobClosed) {
          toast.success(`Hired! All ${total} position${total > 1 ? 's' : ''} filled. Welcome email sent, job closed, other applicants notified.`, { autoClose: 5000 });
        } else {
          toast.success(`Hired! Welcome email sent. ${filled} of ${total} position${total > 1 ? 's' : ''} filled.`, { autoClose: 5000 });
        }
      } else {
        toast.success(`Moved to ${COLUMNS.find((c) => c.key === newStatus)?.label}`);
      }
      if (selected?._id === app._id) setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
      fetchApplications();
    } catch { toast.error('Failed to update status'); }
    finally { setUpdatingStatus(false); }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await api.patch(`/applications/${selected._id}`, { notes });
      toast.success('Notes saved');
      setSelected((prev) => prev ? { ...prev, notes } : null);
      fetchApplications();
    } catch { toast.error('Failed to save notes'); }
    finally { setSavingNotes(false); }
  };

  const openPanel = (app: Application) => {
    setSelected(app);
    setNotes(app.notes || '');
  };

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = applications.filter((a) => a.status === col.key);
    return acc;
  }, {} as Record<AppStatus, Application[]>);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Application Pipeline</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {applications.length} application{applications.length !== 1 ? 's' : ''} across {COLUMNS.length} stages
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search applicants…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none w-56"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <option value="">All Jobs</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <option value="">All Stages</option>
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="min-w-0">
            {/* Column header */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-xl mb-2"
              style={{ backgroundColor: col.bg }}
            >
              <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: col.color, color: 'white' }}
              >
                {loading ? '…' : grouped[col.key]?.length ?? 0}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              <AnimatePresence>
                {loading
                  ? [...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-xl border p-4 animate-pulse" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', height: 100 }} />
                  ))
                  : grouped[col.key]?.map((app) => (
                    <motion.div
                      key={app._id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm group"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                      onClick={() => openPanel(app)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {app.applicantName}
                          </p>
                          {app.job && (
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                              {app.job.title}
                            </p>
                          )}
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      {app.skills && app.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {app.skills.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
                            >
                              {s}
                            </span>
                          ))}
                          {app.skills.length > 3 && (
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              +{app.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))
                }
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setSelected(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 overflow-y-auto shadow-2xl"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <div className="p-6 space-y-5">
                {/* Panel header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {selected.applicantName}
                    </h2>
                    {selected.job && (
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Applied for: <strong>{selected.job.title}</strong>
                      </p>
                    )}
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[var(--surface-muted)] cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Contact</p>
                  {[
                    { icon: <Mail size={13} />, value: selected.applicantEmail || (selected as any).email },
                    (selected.applicantPhone || (selected as any).phone) && { icon: <Phone size={13} />, value: selected.applicantPhone || (selected as any).phone },
                    { icon: <Calendar size={13} />, value: `Applied ${new Date(selected.createdAt).toLocaleDateString()}` },
                  ].filter(Boolean).map((item, i) => item && (
                    <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                      {item.value}
                    </div>
                  ))}
                </div>

                {/* Skills */}
                {selected.skills && selected.skills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.skills.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {selected.experience && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Experience</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.experience}</p>
                  </div>
                )}

                {/* Resume download */}
                {(selected.resumeUrl || (selected as any).fileUrl) && (
                  <a
                    href={selected.resumeUrl || (selected as any).fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border transition-all hover:bg-[var(--surface-muted)] text-sm font-medium"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <FileText size={16} style={{ color: 'var(--accent)' }} />
                    View Resume (PDF)
                    <Download size={13} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
                  </a>
                )}

                {/* Status actions — hidden for hired (final state) */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                    Current Stage: <span style={{ color: COLUMNS.find((c) => c.key === selected.status)?.color }}>
                      {COLUMNS.find((c) => c.key === selected.status)?.label}
                    </span>
                  </p>
                  {selected.status === 'hired' ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Hired — no further changes allowed.</p>
                  ) : (
                  <div className="flex flex-wrap gap-2">
                    {(STATUS_TRANSITIONS[selected.status] || []).map((next) => {
                      const col = COLUMNS.find((c) => c.key === next)!;
                      return (
                        <button
                          key={next}
                          onClick={() => updateStatus(selected, next)}
                          disabled={updatingStatus}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 transition-all hover:opacity-90"
                          style={{ backgroundColor: col.bg, color: col.color }}
                        >
                          {next === 'hired' ? <CheckCircle size={13} /> : next === 'rejected' ? <XCircle size={13} /> : <ChevronRight size={13} />}
                          Move to {col.label}
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>

                {/* Notes — read-only for hired */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <MessageSquare size={11} /> Recruiter Notes
                  </label>
                  {selected.status === 'hired' ? (
                    <p className="text-sm py-2" style={{ color: 'var(--text-secondary)' }}>
                      {notes || 'No notes.'}
                    </p>
                  ) : (
                    <>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add internal notes about this candidate…"
                        rows={4}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none resize-none"
                        style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <button
                        onClick={saveNotes}
                        disabled={savingNotes}
                        className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50 hover:opacity-90 text-white"
                        style={{ backgroundColor: 'var(--accent)' }}
                      >
                        {savingNotes ? 'Saving…' : 'Save Notes'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
