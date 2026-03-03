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

type AppStatus = 'new' | 'interview' | 'selected' | 'rejected';

interface Application {
  _id: string;
  applicantName: string;
  email: string;
  phone?: string;
  jobId?: { _id: string; title: string };
  fileUrl?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  applicationStatus: AppStatus;
  notes?: string;
  createdAt: string;
}

const COLUMNS: { key: AppStatus; label: string; color: string; bg: string }[] = [
  { key: 'new',       label: 'New',       color: 'var(--info)',    bg: 'var(--info-subtle)' },
  { key: 'interview', label: 'Interview', color: 'var(--warning)', bg: 'var(--warning-subtle)' },
  { key: 'selected',  label: 'Selected',  color: 'var(--success)', bg: 'var(--success-subtle)' },
  { key: 'rejected',  label: 'Rejected',  color: 'var(--error)',   bg: 'var(--error-subtle)' },
];

const STATUS_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  new:       ['interview', 'rejected'],
  interview: ['selected', 'rejected'],
  selected:  [],
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
    api.get('/hr/jobs').then(({ data }) => {
      setJobs(data.data?.jobs || []);
    }).catch(() => {});
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search',            search);
      if (jobFilter)    params.set('jobId',              jobFilter);
      if (statusFilter) params.set('applicationStatus', statusFilter);
      const { data } = await api.get(`/hr/resumes?${params.toString()}`);
      setApplications(data.data?.resumes || data.data || []);
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
      await api.patch(`/hr/resumes/${app._id}/status`, { applicationStatus: newStatus });
      toast.success(`Moved to ${COLUMNS.find((c) => c.key === newStatus)?.label}`);
      if (selected?._id === app._id) setSelected((prev) => prev ? { ...prev, applicationStatus: newStatus } : null);
      fetchApplications();
    } catch { toast.error('Failed to update status'); }
    finally { setUpdatingStatus(false); }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await api.patch(`/hr/resumes/${selected._id}/status`, { notes });
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
    acc[col.key] = applications.filter((a) => a.applicationStatus === col.key);
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
                          {app.jobId && (
                            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                              {app.jobId.title}
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
                    {selected.jobId && (
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Applied for: <strong>{selected.jobId.title}</strong>
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
                    { icon: <Mail size={13} />, value: selected.email },
                    selected.phone && { icon: <Phone size={13} />, value: selected.phone },
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

                {/* Experience + Education */}
                {(selected.experience || selected.education) && (
                  <div className="space-y-3">
                    {selected.experience && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Experience</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.experience}</p>
                      </div>
                    )}
                    {selected.education && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Education</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.education}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Resume download */}
                {selected.fileUrl && (
                  <a
                    href={selected.fileUrl}
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

                {/* Status actions */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                    Current Stage: <span style={{ color: COLUMNS.find((c) => c.key === selected.applicationStatus)?.color }}>
                      {COLUMNS.find((c) => c.key === selected.applicationStatus)?.label}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_TRANSITIONS[selected.applicationStatus].map((next) => {
                      const col = COLUMNS.find((c) => c.key === next)!;
                      return (
                        <button
                          key={next}
                          onClick={() => updateStatus(selected, next)}
                          disabled={updatingStatus}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 transition-all hover:opacity-90"
                          style={{ backgroundColor: col.bg, color: col.color }}
                        >
                          {next === 'selected' ? <CheckCircle size={13} /> : next === 'rejected' ? <XCircle size={13} /> : <ChevronRight size={13} />}
                          Move to {col.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <MessageSquare size={11} /> Recruiter Notes
                  </label>
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
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
