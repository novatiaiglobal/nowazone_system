'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Briefcase, MapPin, Clock, Globe,
  Pencil, Trash2, ToggleLeft, ToggleRight,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/lib/api';

interface JobPosting {
  _id: string;
  title: string;
  department?: string;
  location?: string;
  type: 'remote' | 'onsite' | 'hybrid';
  experienceLevel?: string;
  status: 'active' | 'draft' | 'closed';
  publishedPlatforms?: { linkedin?: boolean; indeed?: boolean; naukri?: boolean };
  applicantCount?: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  remote: 'Remote', onsite: 'Onsite', hybrid: 'Hybrid',
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'var(--success)', bg: 'var(--success-subtle)' },
  draft:  { label: 'Draft',  color: 'var(--warning)', bg: 'var(--warning-subtle)' },
  closed: { label: 'Closed', color: 'var(--text-muted)', bg: 'var(--surface-muted)' },
};

export default function JobListingsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/hr/jobs?${params.toString()}`);
      setJobs(data.data?.jobs || data.data || []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job posting?')) return;
    try {
      await api.delete(`/hr/jobs/${id}`);
      toast.success('Job deleted');
      fetchJobs();
    } catch { toast.error('Failed to delete job'); }
  };

  const toggleStatus = async (job: JobPosting) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    try {
      await api.patch(`/hr/jobs/${job._id}`, { status: newStatus });
      toast.success(`Job ${newStatus === 'active' ? 'activated' : 'closed'}`);
      fetchJobs();
    } catch { toast.error('Failed to update status'); }
  };

  const togglePlatform = async (job: JobPosting, platform: 'linkedin' | 'indeed' | 'naukri') => {
    const current = job.publishedPlatforms?.[platform] ?? false;
    try {
      await api.post(`/hr/integrations/${platform}/post-job`, { jobId: job._id, publish: !current });
      toast.success(current ? `Removed from ${platform}` : `Published to ${platform}`);
      fetchJobs();
    } catch {
      toast.error(`Failed to sync with ${platform}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Job Listings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage job postings and sync to job boards
          </p>
        </div>
        <Link
          href="/dashboard/hr/recruitment/jobs/new"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Plus size={14} /> Post Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search jobs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border outline-none cursor-pointer"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <option value="">All Types</option>
          <option value="remote">Remote</option>
          <option value="onsite">Onsite</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm rounded-xl border outline-none cursor-pointer"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Job cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 animate-pulse" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="h-5 w-48 rounded mb-2" style={{ backgroundColor: 'var(--surface-muted)' }} />
              <div className="h-4 w-32 rounded" style={{ backgroundColor: 'var(--surface-muted)' }} />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface-muted)' }}>
            <Briefcase size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No job postings yet</p>
          <Link
            href="/dashboard/hr/recruitment/jobs/new"
            className="px-4 py-2 text-sm font-semibold rounded-xl text-white hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Create First Job
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {jobs.map((job, i) => {
              const statusCfg = STATUS_CONFIG[job.status];
              return (
                <motion.div
                  key={job._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border p-5"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Left: Job info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {job.title}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                          style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {job.department && (
                          <span className="flex items-center gap-1"><Briefcase size={11} /> {job.department}</span>
                        )}
                        {job.location && (
                          <span className="flex items-center gap-1"><MapPin size={11} /> {job.location}</span>
                        )}
                        <span className="flex items-center gap-1"><Globe size={11} /> {TYPE_LABELS[job.type]}</span>
                        {job.experienceLevel && (
                          <span className="flex items-center gap-1"><Clock size={11} /> {job.experienceLevel}</span>
                        )}
                        <span>{job.applicantCount ?? 0} applicant{job.applicantCount !== 1 ? 's' : ''}</span>
                        <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Platform sync */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(['linkedin', 'indeed', 'naukri'] as const).map((platform) => {
                          const synced = job.publishedPlatforms?.[platform];
                          return (
                            <button
                              key={platform}
                              onClick={() => togglePlatform(job, platform)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer hover:opacity-80"
                              style={{
                                borderColor: synced ? 'var(--success)' : 'var(--border)',
                                color: synced ? 'var(--success)' : 'var(--text-muted)',
                                backgroundColor: synced ? 'var(--success-subtle)' : 'transparent',
                              }}
                            >
                              {synced ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleStatus(job)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all hover:bg-[var(--surface-muted)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                      >
                        {job.status === 'active' ? <ToggleRight size={14} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={14} />}
                        {job.status === 'active' ? 'Close' : 'Activate'}
                      </button>
                      <Link
                        href={`/dashboard/hr/recruitment/jobs/${job._id}/edit`}
                        className="p-2 rounded-xl border transition-all hover:bg-[var(--surface-muted)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                      >
                        <Pencil size={13} />
                      </Link>
                      <button
                        onClick={() => handleDelete(job._id)}
                        className="p-2 rounded-xl border cursor-pointer transition-all hover:bg-[var(--error-subtle)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
