'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  FileText,
  Briefcase,
  DollarSign,
  TrendingUp,
  Globe,
  Calendar,
  Download,
  UserPlus,
  Activity,
  Server,
  Database,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  Eye,
  ArrowUpRight,
  ExternalLink,
  BarChart3,
  Zap,
  Minus,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/lib/api';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface TopPage {
  path: string;
  views: number;
}

interface CountryTraffic {
  country: string;
  visitors: number;
}

interface DashboardData {
  traffic: {
    visitorsToday: number;
    visitorsMonth: number;
    topPages: TopPage[];
    bounceRate: number;
    trafficByCountry: CountryTraffic[];
  };
  leads: {
    formsSubmittedToday: number;
    assessmentsRequested: number;
    appointmentsBooked: number;
    downloads: number;
    newSubscribers: number;
  };
  hiring: {
    activeJobs: number;
    applicationsToday: number;
    totalResumes: number;
    shortlistedCandidates: number;
  };
  content: {
    publishedBlogs: number;
    drafts: number;
    pendingReviews: number;
    commentsPendingApproval: number;
  };
  revenue: {
    invoicesGeneratedMonth: number;
    invoicesPaid: number;
    invoicesPending: number;
    totalRevenueMonth: number;
  };
  systemHealth: {
    loggedInUsers: number;
    activeSessions: number;
    apiErrors: number;
    serverHealth: string;
    dbPerformance: number;
  };
}

type TimePeriod = 'today' | 'week' | 'month';
type ThresholdStatus = 'ok' | 'warn' | 'critical';

interface AlertItem {
  message: string;
  severity: 'warning' | 'error';
  href: string;
}

interface KpiCard {
  label: string;
  value: number;
  format: 'number' | 'currency';
  icon: React.ReactNode;
  color: string;
  bg: string;
  sub: string;
  href: string;
  statusDot?: string;
}

interface LeadRow {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

interface HiringMetric {
  label: string;
  value: number;
  shouldFormat?: boolean;
  highlight?: boolean;
}

interface ContentMetric {
  label: string;
  value: number;
  actionable?: boolean;
  positive?: boolean;
}

interface HealthMetric {
  label: string;
  value: string;
  icon: React.ReactNode;
  status: ThresholdStatus;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toLocaleString()}`;
}

function getThresholdStatus(
  value: number,
  thresholds: { ok: number; warn: number }
): ThresholdStatus {
  if (value <= thresholds.ok) return 'ok';
  if (value <= thresholds.warn) return 'warn';
  return 'critical';
}

function getThresholdColor(status: ThresholdStatus): string {
  if (status === 'critical') return 'var(--error, #ef4444)';
  if (status === 'warn') return 'var(--warning, #f59e0b)';
  return 'var(--text-primary)';
}

function getThresholdMutedColor(status: ThresholdStatus): string {
  if (status === 'critical') return 'var(--error, #ef4444)';
  if (status === 'warn') return 'var(--warning, #f59e0b)';
  return 'var(--text-muted)';
}

const EMPTY_DATA: DashboardData = {
  traffic: {
    visitorsToday: 0,
    visitorsMonth: 0,
    topPages: [],
    bounceRate: 0,
    trafficByCountry: [],
  },
  leads: {
    formsSubmittedToday: 0,
    assessmentsRequested: 0,
    appointmentsBooked: 0,
    downloads: 0,
    newSubscribers: 0,
  },
  hiring: {
    activeJobs: 0,
    applicationsToday: 0,
    totalResumes: 0,
    shortlistedCandidates: 0,
  },
  content: {
    publishedBlogs: 0,
    drafts: 0,
    pendingReviews: 0,
    commentsPendingApproval: 0,
  },
  revenue: {
    invoicesGeneratedMonth: 0,
    invoicesPaid: 0,
    invoicesPending: 0,
    totalRevenueMonth: 0,
  },
  systemHealth: {
    loggedInUsers: 0,
    activeSessions: 0,
    apiErrors: 0,
    serverHealth: 'unknown',
    dbPerformance: 0,
  },
};

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'healthy'
      ? 'var(--success, #22c55e)'
      : status === 'degraded'
        ? 'var(--warning, #f59e0b)'
        : 'var(--error, #ef4444)';

  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ backgroundColor: 'var(--surface-muted, #e5e7eb)' }}
    />
  );
}

function EmptyAwareValue({
  value,
  format = 'number',
}: {
  value: number | null | undefined;
  format?: 'number' | 'currency';
}) {
  if (value === null || value === undefined) {
    return (
      <span
        className="text-2xl font-bold tracking-tight leading-none"
        style={{ color: 'var(--text-muted)' }}
      >
        —
      </span>
    );
  }

  return (
    <span className="text-2xl font-bold tracking-tight leading-none">
      {format === 'currency' ? formatCurrency(value) : formatNumber(value)}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function ExecutiveDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverOffline, setServerOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>('today');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /* ── Fetch ── */
  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const { data: response } = await api.get<{ status?: string; data?: DashboardData }>('/dashboard/overview', {
          params: { period },
        });
        const payload = response?.data ?? response;
        if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'traffic' in payload && 'systemHealth' in payload) {
          setData(payload as DashboardData);
        } else {
          setData(EMPTY_DATA);
        }
        setServerOffline(false);
        setLastUpdated(new Date());
      } catch (error: unknown) {
        const err = error as { response?: { status?: number }; code?: string; message?: string };
        if (err.response?.status === 403) {
          router.replace('/dashboard/profile');
          return;
        }
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          router.push('/auth/login');
          return;
        }
        if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
          setServerOffline(true);
          if (!silent) toast.error('Server unreachable', { toastId: 'offline' });
        } else if (!silent) {
          toast.error('Failed to load dashboard data');
        }
        if (!data) setData(EMPTY_DATA);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* ── Alerts ── */
  const alerts = useMemo<AlertItem[]>(() => {
    if (!data) return [];
    const items: AlertItem[] = [];

    if (data.systemHealth.apiErrors > 0) {
      items.push({
        message: `${data.systemHealth.apiErrors} API error${data.systemHealth.apiErrors !== 1 ? 's' : ''} detected`,
        severity: 'error',
        href: '/dashboard/audit-logs?tab=system',
      });
    }
    if (data.systemHealth.serverHealth !== 'healthy' && data.systemHealth.serverHealth !== 'unknown') {
      items.push({
        message: `Server status: ${data.systemHealth.serverHealth}`,
        severity: 'error',
        href: '/dashboard/audit-logs?tab=system',
      });
    }
    if (data.content.pendingReviews > 0) {
      items.push({
        message: `${data.content.pendingReviews} content item${data.content.pendingReviews !== 1 ? 's' : ''} awaiting review`,
        severity: 'warning',
        href: '/dashboard/content?status=pending',
      });
    }
    if (data.content.commentsPendingApproval > 0) {
      items.push({
        message: `${data.content.commentsPendingApproval} comment${data.content.commentsPendingApproval !== 1 ? 's' : ''} need approval`,
        severity: 'warning',
        href: '/dashboard/content/comments',
      });
    }
    if (data.revenue.invoicesPending > 0) {
      items.push({
        message: `${data.revenue.invoicesPending} invoice${data.revenue.invoicesPending !== 1 ? 's' : ''} pending payment`,
        severity: 'warning',
        href: '/dashboard/invoices?status=pending',
      });
    }
    if (data.systemHealth.dbPerformance > 200) {
      items.push({
        message: `Database latency elevated: ${data.systemHealth.dbPerformance}ms`,
        severity: 'warning',
        href: '/dashboard/audit-logs?tab=system',
      });
    }

    return items;
  }, [data]);

  const hasErrorAlerts = alerts.some((a) => a.severity === 'error');

  /* ── Totals ── */
  const totalLeadsToday = useMemo(() => {
    if (!data) return 0;
    return (
      data.leads.formsSubmittedToday +
      data.leads.assessmentsRequested +
      data.leads.appointmentsBooked
    );
  }, [data]);

  /* ── KPI cards config ── */
  const kpiCards = useMemo<KpiCard[]>(() => {
    if (!data) return [];
    return [
      {
        label: 'Visitors',
        value: data.traffic.visitorsToday,
        format: 'number',
        icon: <Eye size={16} />,
        color: 'var(--accent)',
        bg: 'var(--accent-subtle)',
        sub: `${formatNumber(data.traffic.visitorsMonth)} this month`,
        href: '/dashboard/analytics',
      },
      {
        label: 'Revenue',
        value: data.revenue.totalRevenueMonth,
        format: 'currency',
        icon: <DollarSign size={16} />,
        color: 'var(--success, #22c55e)',
        bg: 'color-mix(in srgb, var(--success, #22c55e) 12%, transparent)',
        sub: `${data.revenue.invoicesPaid} paid · ${data.revenue.invoicesPending} pending`,
        href: '/dashboard/invoices',
      },
      {
        label: 'Leads Today',
        value: totalLeadsToday,
        format: 'number',
        icon: <TrendingUp size={16} />,
        color: 'var(--info, #3b82f6)',
        bg: 'color-mix(in srgb, var(--info, #3b82f6) 12%, transparent)',
        sub: `${data.leads.newSubscribers} new subscribers`,
        href: '/dashboard/sales/leads',
      },
      {
        label: 'Active Sessions',
        value: data.systemHealth.activeSessions,
        format: 'number',
        icon: <Zap size={16} />,
        color:
          data.systemHealth.serverHealth === 'healthy'
            ? 'var(--success, #22c55e)'
            : 'var(--warning, #f59e0b)',
        bg:
          data.systemHealth.serverHealth === 'healthy'
            ? 'color-mix(in srgb, var(--success, #22c55e) 12%, transparent)'
            : 'color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent)',
        sub: `${data.systemHealth.loggedInUsers} users online`,
        href: '/dashboard/audit-logs?tab=system',
        statusDot: data.systemHealth.serverHealth,
      },
    ];
  }, [data, totalLeadsToday]);

  /* ── Lead rows ── */
  const leadRows = useMemo<LeadRow[]>(() => {
    if (!data) return [];
    return [
      {
        key: 'forms',
        label: 'Form Submissions',
        value: data.leads.formsSubmittedToday,
        icon: <FileText size={14} />,
        color: 'var(--accent)',
      },
      {
        key: 'assessments',
        label: 'Assessment Requests',
        value: data.leads.assessmentsRequested,
        icon: <CheckCircle size={14} />,
        color: 'var(--success, #22c55e)',
      },
      {
        key: 'appointments',
        label: 'Appointments Booked',
        value: data.leads.appointmentsBooked,
        icon: <Calendar size={14} />,
        color: 'var(--info, #3b82f6)',
      },
      {
        key: 'downloads',
        label: 'Downloads',
        value: data.leads.downloads,
        icon: <Download size={14} />,
        color: 'var(--text-secondary)',
      },
      {
        key: 'subscribers',
        label: 'New Subscribers',
        value: data.leads.newSubscribers,
        icon: <UserPlus size={14} />,
        color: 'var(--warning, #f59e0b)',
      },
    ];
  }, [data]);

  /* ── Hiring metrics ── */
  const hiringMetrics = useMemo<HiringMetric[]>(() => {
    if (!data) return [];
    return [
      { label: 'Active Jobs', value: data.hiring.activeJobs, highlight: true },
      { label: 'Apps Today', value: data.hiring.applicationsToday },
      { label: 'Total Resumes', value: data.hiring.totalResumes, shouldFormat: true },
      { label: 'Shortlisted', value: data.hiring.shortlistedCandidates, highlight: true },
    ];
  }, [data]);

  /* ── Content metrics ── */
  const contentMetrics = useMemo<ContentMetric[]>(() => {
    if (!data) return [];
    return [
      { label: 'Published', value: data.content.publishedBlogs, positive: true },
      { label: 'Drafts', value: data.content.drafts },
      { label: 'Pending Review', value: data.content.pendingReviews, actionable: true },
      { label: 'Comments', value: data.content.commentsPendingApproval, actionable: true },
    ];
  }, [data]);

  /* ── System health metrics ── */
  const healthMetrics = useMemo<HealthMetric[]>(() => {
    if (!data) return [];
    return [
      {
        label: 'DB Latency',
        value: `${data.systemHealth.dbPerformance}ms`,
        icon: <Database size={14} />,
        status: getThresholdStatus(data.systemHealth.dbPerformance, { ok: 100, warn: 200 }),
      },
      {
        label: 'Bounce Rate',
        value: `${data.traffic.bounceRate}%`,
        icon: <Activity size={14} />,
        status: getThresholdStatus(data.traffic.bounceRate, { ok: 50, warn: 70 }),
      },
      {
        label: 'Invoices (Month)',
        value: String(data.revenue.invoicesGeneratedMonth),
        icon: <BarChart3 size={14} />,
        status: 'ok' as ThresholdStatus,
      },
      {
        label: 'API Errors',
        value: String(data.systemHealth.apiErrors),
        icon: <AlertCircle size={14} />,
        status: getThresholdStatus(data.systemHealth.apiErrors, { ok: 0, warn: 5 }),
      },
    ];
  }, [data]);

  /* ═══════════════════════════════════════════════════════════════
     LOADING STATE
     ═══════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* ── Server Offline Banner ── */}
      <AnimatePresence>
        {serverOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="px-6 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--error, #ef4444) 10%, var(--bg))',
                color: 'var(--error, #ef4444)',
              }}
            >
              <StatusDot status="down" />
              Server connection lost — displaying cached data
              <button
                onClick={() => fetchData(true)}
                className="underline cursor-pointer ml-2 font-semibold"
              >
                Retry now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        {/* ══════════════════════════════════════════════════════
            HEADER
            ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-xl font-bold">Executive Overview</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Business metrics, operations &amp; system health
              {lastUpdated && (
                <span className="ml-2">
                  · Updated{' '}
                  {lastUpdated.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div
              className="flex rounded-lg border overflow-hidden text-xs font-medium"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
              }}
            >
              {(['today', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-3 py-2 cursor-pointer capitalize transition-colors"
                  style={{
                    backgroundColor: period === p ? 'var(--accent-subtle)' : 'transparent',
                    color: period === p ? 'var(--accent-text)' : 'var(--text-muted)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 rounded-lg border cursor-pointer disabled:opacity-50 transition-opacity"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
              }}
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin' : ''}
                style={{ color: 'var(--text-muted)' }}
              />
            </button>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════
            ALERTS BANNER
            ══════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: hasErrorAlerts
                    ? 'color-mix(in srgb, var(--error, #ef4444) 30%, var(--border))'
                    : 'color-mix(in srgb, var(--warning, #f59e0b) 30%, var(--border))',
                  backgroundColor: hasErrorAlerts
                    ? 'color-mix(in srgb, var(--error, #ef4444) 5%, var(--surface))'
                    : 'color-mix(in srgb, var(--warning, #f59e0b) 5%, var(--surface))',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle
                    size={14}
                    style={{
                      color: hasErrorAlerts
                        ? 'var(--error, #ef4444)'
                        : 'var(--warning, #f59e0b)',
                    }}
                  />
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{
                      color: hasErrorAlerts
                        ? 'var(--error, #ef4444)'
                        : 'var(--warning, #f59e0b)',
                    }}
                  >
                    {alerts.length} item{alerts.length !== 1 ? 's' : ''} need attention
                  </span>
                </div>

                <div className="space-y-1">
                  {alerts.map((alert, i) => (
                    <Link
                      key={i}
                      href={alert.href}
                      className="flex items-center justify-between py-1.5 group rounded-md px-1 -mx-1 transition-colors hover:bg-black/[0.03]"
                    >
                      <span
                        className="text-sm flex items-center gap-2"
                        style={{
                          color:
                            alert.severity === 'error'
                              ? 'var(--error, #ef4444)'
                              : 'var(--text-secondary)',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              alert.severity === 'error'
                                ? 'var(--error, #ef4444)'
                                : 'var(--warning, #f59e0b)',
                          }}
                        />
                        {alert.message}
                      </span>
                      <ChevronRight
                        size={12}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════
            KPI CARDS
            ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Link
                href={card.href}
                className="block rounded-xl border p-4 transition-shadow hover:shadow-sm group"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                {/* Icon + status row */}
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.bg, color: card.color }}
                  >
                    {card.icon}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {card.statusDot && <StatusDot status={card.statusDot} />}
                    <ArrowUpRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </div>
                </div>

                {/* Value */}
                <EmptyAwareValue value={card.value} format={card.format} />

                {/* Label */}
                <p
                  className="text-xs font-medium mt-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {card.label}
                </p>

                {/* Sub-context */}
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {card.sub}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            ROW 2: LEADS + TOP PAGES
            ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Leads & Conversions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 rounded-xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
                <h2 className="text-sm font-semibold">Leads &amp; Conversions</h2>
              </div>
              <Link
                href="/dashboard/sales/leads"
                className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-text)' }}
              >
                CRM
                <ExternalLink size={10} />
              </Link>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {leadRows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => {
                    if (row.key === 'subscribers') {
                      router.push('/dashboard/subscribers');
                      return;
                    }
                    if (['forms', 'assessments', 'appointments', 'downloads'].includes(row.key)) {
                      const typeMap: Record<string, string> = {
                        forms: 'contact',
                        assessments: 'assessment',
                        appointments: 'appointment',
                        downloads: 'download',
                      };
                      const type = typeMap[row.key];
                      router.push(type ? `/dashboard/form-submissions?type=${type}` : '/dashboard/form-submissions');
                      return;
                    }
                    router.push('/dashboard/sales/leads');
                  }}
                  className="w-full flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--bg)] cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <span style={{ color: row.color }}>{row.icon}</span>
                    <span
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {row.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums">
                      {row.value}
                    </span>
                    <ChevronRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Top Pages */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Globe size={16} style={{ color: 'var(--accent)' }} />
                <h2 className="text-sm font-semibold">Top Pages</h2>
              </div>
              <Link
                href="/dashboard/analytics"
                className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-text)' }}
              >
                Analytics
                <ExternalLink size={10} />
              </Link>
            </div>

            <div className="px-5 py-3">
              {data?.traffic.topPages && data.traffic.topPages.length > 0 ? (
                <div className="space-y-1">
                  {data.traffic.topPages.slice(0, 6).map((page, i) => {
                    const maxViews = data.traffic.topPages[0]?.views || 1;
                    const percent = Math.round((page.views / maxViews) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <span
                          className="text-[11px] font-bold w-5 text-center flex-shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {page.path}
                          </p>
                          <div
                            className="h-1 rounded-full mt-1 overflow-hidden"
                            style={{ backgroundColor: 'var(--surface-muted, #e5e7eb)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: 'var(--accent)',
                                opacity: 0.5,
                              }}
                            />
                          </div>
                        </div>
                        <span
                          className="text-xs font-medium tabular-nums flex-shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {formatNumber(page.views)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="py-10 text-center text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Globe size={24} className="mx-auto mb-2 opacity-30" />
                  No page data available
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════
            ROW 3: HIRING + CONTENT + GEOGRAPHY
            ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Hiring */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Briefcase size={16} style={{ color: 'var(--warning, #f59e0b)' }} />
                <h2 className="text-sm font-semibold">Hiring</h2>
              </div>
              <Link
                href="/dashboard/hr"
                className="text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-text)' }}
              >
                View →
              </Link>
            </div>

            <div className="p-5 grid grid-cols-2 gap-4">
              {hiringMetrics.map((item) => (
                <div key={item.label}>
                  <p
                    className="text-[11px] font-medium mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-xl font-bold"
                    style={{
                      color: item.highlight
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {item.shouldFormat ? formatNumber(item.value) : item.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} style={{ color: 'var(--accent)' }} />
                <h2 className="text-sm font-semibold">Content</h2>
              </div>
              <Link
                href="/dashboard/content"
                className="text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-text)' }}
              >
                View →
              </Link>
            </div>

            <div className="p-5 grid grid-cols-2 gap-4">
              {contentMetrics.map((item) => {
                let valueColor = 'var(--text-secondary)';
                if (item.positive && item.value > 0) {
                  valueColor = 'var(--success, #22c55e)';
                } else if (item.actionable && item.value > 0) {
                  valueColor = 'var(--warning, #f59e0b)';
                }

                return (
                  <div key={item.label}>
                    <p
                      className="text-[11px] font-medium mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {item.label}
                    </p>
                    <p className="text-xl font-bold" style={{ color: valueColor }}>
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Geography */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Globe size={16} style={{ color: 'var(--info, #3b82f6)' }} />
                <h2 className="text-sm font-semibold">Traffic by Country</h2>
              </div>
            </div>

            <div className="px-5 py-3">
              {data?.traffic.trafficByCountry && data.traffic.trafficByCountry.length > 0 ? (
                <div className="space-y-3">
                  {data.traffic.trafficByCountry.slice(0, 5).map((country, i) => {
                    const total = data.traffic.trafficByCountry.reduce(
                      (sum, c) => sum + c.visitors,
                      0
                    );
                    const pct = total ? Math.round((country.visitors / total) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[11px] font-bold w-4 text-center"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium">{country.country}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-xs tabular-nums"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {formatNumber(country.visitors)}
                          </span>
                          <span
                            className="text-[11px] font-semibold w-10 text-right tabular-nums"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="py-10 text-center text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Globe size={24} className="mx-auto mb-2 opacity-30" />
                  No country data
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════
            ROW 4: SYSTEM HEALTH STRIP
            ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Server size={14} style={{ color: 'var(--text-muted)' }} />
              <h2
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                System Health
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusDot status={data?.systemHealth.serverHealth ?? 'unknown'} />
              <span
                className="text-xs font-medium capitalize"
                style={{ color: 'var(--text-muted)' }}
              >
                {data?.systemHealth.serverHealth ?? 'Unknown'}
              </span>
            </div>
          </div>

          {/* Metrics strip */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 divide-x"
            style={{ borderColor: 'var(--border)' }}
          >
            {healthMetrics.map((metric, i) => (
              <div key={i} className="px-5 py-4 text-center">
                <div
                  className="flex items-center justify-center gap-1.5 mb-2"
                  style={{ color: getThresholdMutedColor(metric.status) }}
                >
                  {metric.icon}
                  <span className="text-[11px] font-medium">{metric.label}</span>
                </div>
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{ color: getThresholdColor(metric.status) }}
                >
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}