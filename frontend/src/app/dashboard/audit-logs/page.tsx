'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Search, RefreshCw, Activity, User,
  Trash2, LogIn, LogOut, Edit, ChevronDown, ChevronRight,
  Download, Calendar, Filter, X, Clock, Monitor,
  Lock, Unlock, UserPlus, UserCheck, Shield, AlertCircle,
  FileText, ChevronLeft, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface AuditLog {
  _id: string;
  action: string;
  userId?: { name: string; email: string } | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  resource?: string;
  resourceId?: string;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

type ActionCategory = 'all' | 'auth' | 'admin' | 'content' | 'system';
type SeverityLevel = 'info' | 'success' | 'warning' | 'destructive';

interface ActionMeta {
  icon: React.ReactNode;
  label: string;
  severity: SeverityLevel;
  category: ActionCategory;
}

/* ═══════════════════════════════════════════════════════════════
   ACTION CONFIGURATION — single source of truth
   ═══════════════════════════════════════════════════════════════ */

const ACTION_META: Record<string, ActionMeta> = {
  USER_LOGIN: {
    icon: <LogIn size={13} />,
    label: 'User Login',
    severity: 'success',
    category: 'auth',
  },
  USER_LOGOUT: {
    icon: <LogOut size={13} />,
    label: 'User Logout',
    severity: 'info',
    category: 'auth',
  },
  USER_REGISTER: {
    icon: <UserPlus size={13} />,
    label: 'User Registration',
    severity: 'info',
    category: 'auth',
  },
  USER_LOGIN_FAILED: {
    icon: <AlertCircle size={13} />,
    label: 'Login Failed',
    severity: 'warning',
    category: 'auth',
  },
  ADMIN_CREATE_USER: {
    icon: <UserCheck size={13} />,
    label: 'Create User',
    severity: 'success',
    category: 'admin',
  },
  ADMIN_UPDATE_USER: {
    icon: <Edit size={13} />,
    label: 'Update User',
    severity: 'info',
    category: 'admin',
  },
  ADMIN_DELETE_USER: {
    icon: <Trash2 size={13} />,
    label: 'Delete User',
    severity: 'destructive',
    category: 'admin',
  },
  ADMIN_UPDATE_ROLE_PERMISSIONS: {
    icon: <Shield size={13} />,
    label: 'Permission Change',
    severity: 'warning',
    category: 'admin',
  },
  ADMIN_SEND_PASSWORD_RESET: {
    icon: <Lock size={13} />,
    label: 'Password Reset Sent',
    severity: 'info',
    category: 'admin',
  },
  ADMIN_FORCE_LOGOUT_USER: {
    icon: <LogOut size={13} />,
    label: 'Force Logout',
    severity: 'warning',
    category: 'admin',
  },
  ADMIN_LOCK_USER: {
    icon: <Lock size={13} />,
    label: 'Account Locked',
    severity: 'destructive',
    category: 'admin',
  },
  ADMIN_UNLOCK_USER: {
    icon: <Unlock size={13} />,
    label: 'Account Unlocked',
    severity: 'success',
    category: 'admin',
  },
  CREATE: {
    icon: <FileText size={13} />,
    label: 'Create',
    severity: 'success',
    category: 'content',
  },
  UPDATE: {
    icon: <Edit size={13} />,
    label: 'Update',
    severity: 'info',
    category: 'content',
  },
  DELETE: {
    icon: <Trash2 size={13} />,
    label: 'Delete',
    severity: 'destructive',
    category: 'content',
  },
};

const SEVERITY_STYLES: Record<SeverityLevel, { color: string; bg: string }> = {
  info: {
    color: 'var(--text-muted)',
    bg: 'color-mix(in srgb, var(--text-muted) 10%, transparent)',
  },
  success: {
    color: 'var(--success, #22c55e)',
    bg: 'color-mix(in srgb, var(--success, #22c55e) 10%, transparent)',
  },
  warning: {
    color: 'var(--warning, #f59e0b)',
    bg: 'color-mix(in srgb, var(--warning, #f59e0b) 10%, transparent)',
  },
  destructive: {
    color: 'var(--error, #ef4444)',
    bg: 'color-mix(in srgb, var(--error, #ef4444) 10%, transparent)',
  },
};

const CATEGORY_OPTIONS: { key: ActionCategory; label: string }[] = [
  { key: 'all', label: 'All Events' },
  { key: 'auth', label: 'Authentication' },
  { key: 'admin', label: 'Admin Actions' },
  { key: 'content', label: 'Content' },
  { key: 'system', label: 'System' },
];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function getActionMeta(action: string): ActionMeta {
  return (
    ACTION_META[action] ?? {
      icon: <Activity size={13} />,
      label: action.replace(/_/g, ' ').toLowerCase(),
      severity: 'info' as SeverityLevel,
      category: 'system' as ActionCategory,
    }
  );
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function parseUserAgent(ua?: string): string {
  if (!ua) return 'Unknown';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('curl')) return 'cURL';
  if (ua.includes('Postman')) return 'Postman';
  return 'Other';
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ backgroundColor: 'var(--surface-muted, #e5e7eb)' }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pages: 1,
    limit: 25,
  });

  // Filters — all server-side
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState<ActionCategory>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce timer ref
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch ── */
  const fetchLogs = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pageNum));
        params.set('limit', String(pagination.limit));
        if (search) params.set('search', search);
        if (category !== 'all') {
          const categoryActions = Object.entries(ACTION_META)
            .filter(([, meta]) => meta.category === category)
            .map(([key]) => key);
          if (categoryActions.length > 0) {
            params.set('actions', categoryActions.join(','));
          }
        }
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);

        const { data } = await api.get(`/auth/audit-logs?${params.toString()}`);
        setLogs(data.data?.logs || []);
        setPagination((prev) => ({
          ...prev,
          total: data.data?.pagination?.total || 0,
          page: data.data?.pagination?.page || pageNum,
          pages: data.data?.pagination?.pages || 1,
        }));
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 403) {
          router.replace('/dashboard/profile');
          return;
        }
        if (status === 401) {
          router.push('/auth/login');
          return;
        }
        setLogs([]);
        setPagination((prev) => ({ ...prev, total: 0, page: 1, pages: 1 }));
      } finally {
        setLoading(false);
      }
    },
    [search, category, dateFrom, dateTo, pagination.limit, router]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  /* ── Debounced search ── */
  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(value);
    }, 400);
  };

  /* ── Clear all filters ── */
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = search || category !== 'all' || dateFrom || dateTo;

  /* ── Page navigation ── */
  const goToPage = (p: number) => {
    if (p < 1 || p > pagination.pages) return;
    fetchLogs(p);
  };

  /* ── Export ── */
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');
      params.set('limit', '10000');
      if (search) params.set('search', search);
      if (category !== 'all') {
        const categoryActions = Object.entries(ACTION_META)
          .filter(([, meta]) => meta.category === category)
          .map(([key]) => key);
        if (categoryActions.length > 0) {
          params.set('actions', categoryActions.join(','));
        }
      }
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const { data } = await api.get(
        `/auth/audit-logs/export?${params.toString()}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Audit logs exported');
    } catch {
      toast.error('Export failed');
    }
  };

  /* ── Expanded row toggle ── */
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-5">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{ backgroundColor: 'var(--accent-subtle)' }}
              >
                <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
              </div>
              Audit Logs
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {pagination.total.toLocaleString()} total events
              {hasActiveFilters && ' (filtered)'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg
                         text-xs font-medium cursor-pointer transition-colors
                         hover:bg-[var(--bg)]"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <Download size={13} />
              Export CSV
            </button>
            <button
              onClick={() => fetchLogs(pagination.page)}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg
                         text-xs font-medium cursor-pointer transition-colors
                         hover:bg-[var(--bg)]"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* ── Search + Filter Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="space-y-3"
        >
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search by action, user, or IP address…"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm
                           focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category filter */}
            <div
              className="flex rounded-lg border overflow-hidden text-xs font-medium"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
              }}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className="px-3 py-2.5 cursor-pointer transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor:
                      category === cat.key
                        ? 'var(--accent-subtle)'
                        : 'transparent',
                    color:
                      category === cat.key
                        ? 'var(--accent-text)'
                        : 'var(--text-muted)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Toggle date filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2.5 border rounded-lg
                         text-xs font-medium cursor-pointer transition-colors"
              style={{
                borderColor: showFilters
                  ? 'var(--accent-border, var(--accent))'
                  : 'var(--border)',
                backgroundColor: showFilters
                  ? 'var(--accent-subtle)'
                  : 'var(--surface)',
                color: showFilters
                  ? 'var(--accent-text)'
                  : 'var(--text-muted)',
              }}
            >
              <Calendar size={13} />
              Date Range
            </button>
          </div>

          {/* Expandable date range */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 p-3 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <label
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-2 py-1.5 rounded-md border text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <label
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-2 py-1.5 rounded-md border text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                      }}
                      className="text-xs cursor-pointer ml-1"
                      style={{ color: 'var(--accent-text)' }}
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                Active filters:
              </span>
              {search && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                             text-[11px] font-medium"
                  style={{
                    backgroundColor: 'var(--accent-subtle)',
                    color: 'var(--accent-text)',
                  }}
                >
                  Search: &quot;{search}&quot;
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setSearch('');
                    }}
                    className="cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              {category !== 'all' && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                             text-[11px] font-medium"
                  style={{
                    backgroundColor: 'var(--accent-subtle)',
                    color: 'var(--accent-text)',
                  }}
                >
                  {CATEGORY_OPTIONS.find((c) => c.key === category)?.label}
                  <button
                    onClick={() => setCategory('all')}
                    className="cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              {(dateFrom || dateTo) && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                             text-[11px] font-medium"
                  style={{
                    backgroundColor: 'var(--accent-subtle)',
                    color: 'var(--accent-text)',
                  }}
                >
                  {dateFrom || '∞'} → {dateTo || '∞'}
                  <button
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-[11px] font-medium cursor-pointer underline"
                style={{ color: 'var(--text-muted)' }}
              >
                Clear all
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          {loading ? (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {/* Table header skeleton */}
              <div
                className="grid grid-cols-[1fr_1fr_140px_140px_40px] gap-4 px-5 py-3"
                style={{ backgroundColor: 'var(--bg)' }}
              >
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-14" />
                <div />
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_140px_140px_40px] gap-4 px-5 py-4 items-center"
                >
                  <Skeleton className="h-6 w-32 rounded-md" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-4" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Table header */}
              <div
                className="grid grid-cols-[1fr_1fr_140px_140px_40px] gap-4 px-5 py-3
                           text-[11px] font-semibold uppercase tracking-wider border-b"
                style={{
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--bg)',
                }}
              >
                <span>Event</span>
                <span>User</span>
                <span>IP Address</span>
                <span>Time</span>
                <span />
              </div>

              {/* Rows */}
              <div
                className="divide-y"
                style={{ borderColor: 'var(--border)' }}
              >
                {logs.length > 0 ? (
                  logs.map((log) => {
                    const meta = getActionMeta(log.action);
                    const severity = SEVERITY_STYLES[meta.severity];
                    const isExpanded = expandedId === log._id;

                    return (
                      <div key={log._id}>
                        {/* Main row */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(log._id)}
                          className="w-full grid grid-cols-[1fr_1fr_140px_140px_40px] gap-4
                                     px-5 py-3.5 items-center text-left transition-colors
                                     cursor-pointer hover:bg-[var(--bg)]"
                        >
                          {/* Action badge */}
                          <div>
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1
                                         rounded-md text-xs font-semibold"
                              style={{
                                color: severity.color,
                                backgroundColor: severity.bg,
                              }}
                            >
                              {meta.icon}
                              {meta.label}
                            </span>
                          </div>

                          {/* User */}
                          <div className="min-w-0">
                            {log.userId ? (
                              <>
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {log.userId.name}
                                </p>
                                <p
                                  className="text-[11px] truncate"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {log.userId.email}
                                </p>
                              </>
                            ) : (
                              <span
                                className="text-xs font-medium"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                System
                              </span>
                            )}
                          </div>

                          {/* IP */}
                          <span
                            className="text-xs font-mono"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {log.ipAddress || '—'}
                          </span>

                          {/* Time — relative + tooltip */}
                          <div>
                            <p
                              className="text-xs font-medium"
                              style={{ color: 'var(--text-secondary)' }}
                              title={formatFullDate(log.createdAt)}
                            >
                              {timeAgo(log.createdAt)}
                            </p>
                            <p
                              className="text-[10px]"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {new Date(log.createdAt).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </p>
                          </div>

                          {/* Expand chevron */}
                          <div className="flex justify-center">
                            <ChevronDown
                              size={14}
                              className="transition-transform"
                              style={{
                                color: 'var(--text-muted)',
                                transform: isExpanded
                                  ? 'rotate(180deg)'
                                  : 'rotate(0deg)',
                              }}
                            />
                          </div>
                        </button>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div
                                className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4
                                           border-t text-xs"
                                style={{
                                  borderColor: 'var(--border)',
                                  backgroundColor: 'var(--bg)',
                                }}
                              >
                                {/* Raw action */}
                                <div>
                                  <p
                                    className="font-semibold mb-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    Action Code
                                  </p>
                                  <p
                                    className="font-mono text-[11px]"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    {log.action}
                                  </p>
                                </div>

                                {/* Full timestamp */}
                                <div>
                                  <p
                                    className="font-semibold mb-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    <Clock
                                      size={11}
                                      className="inline mr-1"
                                    />
                                    Timestamp
                                  </p>
                                  <p style={{ color: 'var(--text-secondary)' }}>
                                    {formatFullDate(log.createdAt)}
                                  </p>
                                </div>

                                {/* User Agent */}
                                <div>
                                  <p
                                    className="font-semibold mb-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    <Monitor
                                      size={11}
                                      className="inline mr-1"
                                    />
                                    Browser
                                  </p>
                                  <p style={{ color: 'var(--text-secondary)' }}>
                                    {parseUserAgent(log.userAgent)}
                                  </p>
                                  {log.userAgent && (
                                    <p
                                      className="font-mono text-[10px] mt-0.5 truncate max-w-[200px]"
                                      style={{ color: 'var(--text-muted)' }}
                                      title={log.userAgent}
                                    >
                                      {log.userAgent}
                                    </p>
                                  )}
                                </div>

                                {/* Resource */}
                                <div>
                                  <p
                                    className="font-semibold mb-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    Resource
                                  </p>
                                  <p style={{ color: 'var(--text-secondary)' }}>
                                    {log.resource || '—'}
                                    {log.resourceId && (
                                      <span
                                        className="font-mono text-[10px] ml-1"
                                        style={{ color: 'var(--text-muted)' }}
                                      >
                                        #{log.resourceId}
                                      </span>
                                    )}
                                  </p>
                                </div>

                                {/* Metadata */}
                                {log.metadata &&
                                  Object.keys(log.metadata).length > 0 && (
                                    <div className="col-span-full">
                                      <p
                                        className="font-semibold mb-1"
                                        style={{ color: 'var(--text-muted)' }}
                                      >
                                        Metadata
                                      </p>
                                      <pre
                                        className="font-mono text-[11px] p-3 rounded-md
                                                   overflow-x-auto max-h-32"
                                        style={{
                                          backgroundColor: 'var(--surface)',
                                          color: 'var(--text-secondary)',
                                          border: '1px solid var(--border)',
                                        }}
                                      >
                                        {JSON.stringify(log.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="py-16 text-center"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ShieldCheck
                      size={32}
                      className="mx-auto mb-3 opacity-30"
                    />
                    <p className="text-sm font-medium">No audit logs found</p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs mt-2 underline cursor-pointer"
                        style={{ color: 'var(--accent-text)' }}
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <p
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Page {pagination.page} of {pagination.pages}
              <span className="mx-1">·</span>
              {pagination.total.toLocaleString()} total events
            </p>

            <div className="flex items-center gap-1">
              {/* First page */}
              <button
                onClick={() => goToPage(1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-md border cursor-pointer disabled:opacity-30
                           disabled:cursor-not-allowed transition-colors hover:bg-[var(--bg)]"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-secondary)',
                }}
                title="First page"
              >
                <ChevronsLeft size={14} />
              </button>

              {/* Previous */}
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-md border cursor-pointer disabled:opacity-30
                           disabled:cursor-not-allowed transition-colors hover:bg-[var(--bg)]"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-secondary)',
                }}
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page numbers */}
              {(() => {
                const pages: number[] = [];
                const current = pagination.page;
                const total = pagination.pages;
                const start = Math.max(1, current - 2);
                const end = Math.min(total, current + 2);

                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }

                return pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className="w-8 h-8 rounded-md border text-xs font-medium
                               cursor-pointer transition-colors"
                    style={{
                      borderColor:
                        p === current ? 'var(--accent)' : 'var(--border)',
                      backgroundColor:
                        p === current ? 'var(--accent-subtle)' : 'var(--surface)',
                      color:
                        p === current
                          ? 'var(--accent-text)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {p}
                  </button>
                ));
              })()}

              {/* Next */}
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="p-2 rounded-md border cursor-pointer disabled:opacity-30
                           disabled:cursor-not-allowed transition-colors hover:bg-[var(--bg)]"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-secondary)',
                }}
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>

              {/* Last page */}
              <button
                onClick={() => goToPage(pagination.pages)}
                disabled={pagination.page === pagination.pages}
                className="p-2 rounded-md border cursor-pointer disabled:opacity-30
                           disabled:cursor-not-allowed transition-colors hover:bg-[var(--bg)]"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-secondary)',
                }}
                title="Last page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}