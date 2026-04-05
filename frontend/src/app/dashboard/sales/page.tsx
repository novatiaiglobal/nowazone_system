'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Filter,
  RefreshCw,
  Target,
  TrendingUp,
  Users2,
} from 'lucide-react';
import api from '@/lib/api';
import { useUserProfile } from '@/hooks/useUserProfile';

type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'converted'
  | 'lost';

interface Lead {
  _id: string;
  name?: string;
  email?: string;
  company?: string;
  status?: LeadStatus;
  score?: number;
  source?: string;
  followUpAt?: string | null;
}

interface LeadsResponse {
  leads: Lead[];
}

const STAT_CONFIG: Record<
  LeadStatus,
  { label: string; accent: string; bg: string }
> = {
  new: {
    label: 'New',
    accent: 'var(--accent)',
    bg: 'var(--accent-subtle)',
  },
  contacted: {
    label: 'Contacted',
    accent: 'var(--warning)',
    bg: 'var(--warning-subtle)',
  },
  qualified: {
    label: 'Qualified',
    accent: 'var(--accent)',
    bg: 'var(--accent-subtle)',
  },
  proposal: {
    label: 'Proposal',
    accent: 'var(--warning)',
    bg: 'var(--warning-subtle)',
  },
  negotiation: {
    label: 'Negotiation',
    accent: 'var(--warning)',
    bg: 'var(--warning-subtle)',
  },
  converted: {
    label: 'Won',
    accent: 'var(--success)',
    bg: 'var(--success-subtle)',
  },
  lost: {
    label: 'Lost',
    accent: 'var(--error)',
    bg: 'var(--error-subtle)',
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
};

export default function SalesDashboardPage() {
  const { user, loading: userLoading } = useUserProfile();

  const {
    data,
    isLoading: leadsLoading,
    refetch,
  } = useQuery({
    enabled: !!user && !userLoading,
    queryKey: ['sales-dashboard', user?._id],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: 1,
        limit: 200,
      };
      if (user?._id) {
        params.assignedTo = user._id;
      }
      const { data: response } = await api.get<{ data: LeadsResponse }>(
        '/leads',
        { params }
      );
      return response.data;
    },
  });

  const leads = data?.leads ?? [];

  const stats = useMemo(() => {
    const byStatus: Record<LeadStatus, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      converted: 0,
      lost: 0,
    };
    let upcomingFollowUps = 0;
    let todayFollowUps = 0;
    let avgScore = 0;

    if (leads.length > 0) {
      let scoreSum = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const lead of leads) {
        const status = (lead.status || 'new') as LeadStatus;
        byStatus[status] += 1;

        const score = Number(lead.score || 0);
        scoreSum += score;

        if (lead.followUpAt) {
          const followDate = new Date(lead.followUpAt);
          const followDay = new Date(followDate);
          followDay.setHours(0, 0, 0, 0);
          if (followDay.getTime() === today.getTime()) {
            todayFollowUps += 1;
          } else if (followDate > today) {
            upcomingFollowUps += 1;
          }
        }
      }
      avgScore = Math.round(scoreSum / leads.length);
    }

    return {
      total: leads.length,
      byStatus,
      avgScore,
      todayFollowUps,
      upcomingFollowUps,
    };
  }, [leads]);

  if (userLoading || leadsLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen p-6 space-y-6"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-subtle)' }}
            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
            transition={{ duration: 0.4 }}
          >
            <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
          </motion.div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Sales Dashboard
            </h1>
            <p
              className="text-[13px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Overview of your assigned leads and pipeline health.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={() => refetch()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-lg border cursor-pointer"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <RefreshCw size={14} />
          </motion.button>
          <Link href="/dashboard/sales/leads">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--button-on-accent, #fff)',
              }}
            >
              Open CRM Leads
              <ArrowRight size={14} />
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.16 } }}
          whileTap={{ scale: 0.99 }}
          className="rounded-xl border p-4 transition-shadow hover:shadow-md cursor-default"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] uppercase tracking-wide font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              Total leads
            </span>
            <Users2 size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--accent)' }}
          >
            {stats.total}
          </p>
          <p
            className="text-[12px] mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Assigned to you
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.16 } }}
          whileTap={{ scale: 0.99 }}
          className="rounded-xl border p-4 transition-shadow hover:shadow-md cursor-default"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] uppercase tracking-wide font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              Pipeline quality
            </span>
            <TrendingUp size={14} style={{ color: 'var(--warning)' }} />
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--warning)' }}
          >
            {stats.avgScore || 0}
          </p>
          <p
            className="text-[12px] mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Avg lead score
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.16 } }}
          whileTap={{ scale: 0.99 }}
          className="rounded-xl border p-4 transition-shadow hover:shadow-md cursor-default"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] uppercase tracking-wide font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              Today&apos;s follow-ups
            </span>
            <CalendarClock size={14} style={{ color: 'var(--success)' }} />
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--success)' }}
          >
            {stats.todayFollowUps}
          </p>
          <p
            className="text-[12px] mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Upcoming: {stats.upcomingFollowUps}
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.16 } }}
          whileTap={{ scale: 0.99 }}
          className="rounded-xl border p-4 transition-shadow hover:shadow-md cursor-default"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] uppercase tracking-wide font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              Conversion
            </span>
            <Target size={14} style={{ color: 'var(--success)' }} />
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--success)' }}
          >
            {stats.byStatus.converted}
          </p>
          <p
            className="text-[12px] mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Won deals
          </p>
        </motion.div>
      </div>

      <div className="rounded-xl border p-4 space-y-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Pipeline by stage
            </span>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Snapshot of leads assigned to you
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(STAT_CONFIG) as LeadStatus[]).map((status) => {
            const cfg = STAT_CONFIG[status];
            const count = stats.byStatus[status];
            return (
              <motion.div
                key={status}
                whileHover={{ y: -2, scale: 1.02, transition: { duration: 0.14 } }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg border px-3 py-3 transition-shadow hover:shadow-sm cursor-default"
                style={{
                  backgroundColor: cfg.bg,
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: cfg.accent }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p
                  className="text-xl font-bold"
                  style={{ color: cfg.accent }}
                >
                  {count}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

