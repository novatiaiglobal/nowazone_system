'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Lock,
  ShieldCheck,
  Activity,
  UserCheck,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  FileText,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Clock,
  UserPlus,
  Download,
  RefreshCw,
  Eye,
  Shield,
  Zap,
  ChevronRight,
  ExternalLink,
  BarChart3,
} from 'lucide-react';
import { api } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface RecentActivity {
  _id: string;
  action: string;
  resource?: string;
  resourceId?: string;
  user?: { name: string; email: string } | null;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AdminDashboardStats {
  totalUsers: number;
  adminCount: number;
  activeSessions: number;
  recentActivities: RecentActivity[];
  // Enhanced stats (if your API can provide them)
  newUsersToday?: number;
  failedLoginsToday?: number;
  lockedAccounts?: number;
  permissionChanges24h?: number;
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

type ActivitySeverity = 'info' | 'success' | 'warning' | 'destructive';

function getActivityMeta(action: string): {
  icon: React.ReactNode;
  label: string;
  severity: ActivitySeverity;
} {
  const map: Record<string, { icon: React.ReactNode; label: string; severity: ActivitySeverity }> = {
    USER_LOGIN: { icon: <LogIn size={13} />, label: 'User signed in', severity: 'success' },
    USER_LOGOUT: { icon: <LogOut size={13} />, label: 'User signed out', severity: 'info' },
    USER_REGISTER: { icon: <UserPlus size={13} />, label: 'New registration', severity: 'info' },
    ADMIN_CREATE_USER: { icon: <UserCheck size={13} />, label: 'User created', severity: 'success' },
    ADMIN_UPDATE_USER: { icon: <Edit size={13} />, label: 'User updated', severity: 'info' },
    ADMIN_DELETE_USER: { icon: <Trash2 size={13} />, label: 'User deleted', severity: 'destructive' },
    ADMIN_UPDATE_ROLE_PERMISSIONS: { icon: <ShieldCheck size={13} />, label: 'Permissions changed', severity: 'warning' },
    ADMIN_SEND_PASSWORD_RESET: { icon: <Lock size={13} />, label: 'Password reset sent', severity: 'info' },
    ADMIN_FORCE_LOGOUT_USER: { icon: <LogOut size={13} />, label: 'Forced logout', severity: 'warning' },
    ADMIN_LOCK_USER: { icon: <Lock size={13} />, label: 'Account locked', severity: 'destructive' },
    ADMIN_UNLOCK_USER: { icon: <Lock size={13} />, label: 'Account unlocked', severity: 'success' },
  };
  return map[action] ?? { icon: <Activity size={13} />, label: action?.replace(/_/g, ' ').toLowerCase() ?? 'unknown', severity: 'info' as const };
}

const SEVERITY_COLORS: Record<ActivitySeverity, string> = {
  info: 'var(--text-muted)',
  success: 'var(--success)',
  warning: 'var(--warning, #f59e0b)',
  destructive: 'var(--error, #ef4444)',
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<'all' | 'security' | 'changes'>('all');

  useEffect(() => {
    api
      .get('/auth/admin/dashboard')
      .then(({ data }) => setStats(data.data))
      .catch(() =>
        setStats({
          totalUsers: 0,
          adminCount: 0,
          activeSessions: 0,
          recentActivities: [],
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredActivities = useMemo(() => {
    if (!stats?.recentActivities) return [];
    if (activityFilter === 'all') return stats.recentActivities;

    const securityActions = [
      'USER_LOGIN', 'USER_LOGOUT', 'ADMIN_LOCK_USER',
      'ADMIN_UNLOCK_USER', 'ADMIN_FORCE_LOGOUT_USER',
      'ADMIN_SEND_PASSWORD_RESET',
    ];
    const changeActions = [
      'ADMIN_CREATE_USER', 'ADMIN_UPDATE_USER',
      'ADMIN_DELETE_USER', 'ADMIN_UPDATE_ROLE_PERMISSIONS',
    ];

    const actionSet = activityFilter === 'security' ? securityActions : changeActions;
    return stats.recentActivities.filter((a) => actionSet.includes(a.action));
  }, [stats, activityFilter]);

  // Compute security posture
  const securityScore = useMemo(() => {
    if (!stats) return null;
    const issues: string[] = [];
    if ((stats.failedLoginsToday ?? 0) > 5)
      issues.push(`${stats.failedLoginsToday} failed logins today`);
    if ((stats.lockedAccounts ?? 0) > 0)
      issues.push(`${stats.lockedAccounts} locked accounts`);
    if ((stats.permissionChanges24h ?? 0) > 3)
      issues.push(`${stats.permissionChanges24h} permission changes in 24h`);

    if (issues.length === 0) return { status: 'healthy' as const, issues };
    if (issues.length <= 1) return { status: 'attention' as const, issues };
    return { status: 'warning' as const, issues };
  }, [stats]);

  /* ── Skeleton ── */
  const Skeleton = ({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ backgroundColor: 'var(--surface-muted, #e5e7eb)', ...style }}
    />
  );

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-xl font-bold">Admin Overview</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              System health, user activity & security posture
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg
                         border text-xs font-medium cursor-pointer"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-secondary)',
              }}
            >
              <RefreshCw size={13} />
              Refresh
            </motion.button>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
            ROW 1: STAT CARDS — each links to relevant page
            ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Users',
              value: stats?.totalUsers ?? 0,
              icon: <Users size={18} />,
              href: '/dashboard/users',
              color: 'var(--accent)',
              bg: 'var(--accent-subtle)',
              sub: stats?.newUsersToday
                ? `+${stats.newUsersToday} today`
                : 'View directory',
              subColor: stats?.newUsersToday
                ? 'var(--success)'
                : 'var(--text-muted)',
            },
            {
              label: 'Active Sessions',
              value: stats?.activeSessions ?? 0,
              icon: <Zap size={18} />,
              href: '/dashboard/users?tab=sessions',
              color: 'var(--success)',
              bg: 'var(--success-subtle, color-mix(in srgb, var(--success) 12%, transparent))',
              sub: 'Live now',
              subColor: 'var(--success)',
            },
            {
              label: 'Admins',
              value: stats?.adminCount ?? 0,
              icon: <ShieldCheck size={18} />,
              href: '/dashboard/users?role=admin',
              color: 'var(--warning, #f59e0b)',
              bg: 'var(--warning-subtle, color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent))',
              sub: `of ${stats?.totalUsers ?? 0} users`,
              subColor: 'var(--text-muted)',
            },
            {
              label: 'Failed Logins',
              value: stats?.failedLoginsToday ?? 0,
              icon: <AlertTriangle size={18} />,
              href: '/dashboard/audit-logs?action=USER_LOGIN_FAILED',
              color: (stats?.failedLoginsToday ?? 0) > 5
                ? 'var(--error, #ef4444)'
                : 'var(--text-muted)',
              bg: (stats?.failedLoginsToday ?? 0) > 5
                ? 'var(--error-subtle, color-mix(in srgb, var(--error, #ef4444) 12%, transparent))'
                : 'var(--surface-muted, #f3f4f6)',
              sub: 'Today',
              subColor: (stats?.failedLoginsToday ?? 0) > 5
                ? 'var(--error, #ef4444)'
                : 'var(--text-muted)',
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link
                href={card.href}
                className="block rounded-xl border p-4 transition-all
                           hover:shadow-sm group"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center
                               justify-center"
                    style={{ backgroundColor: card.bg, color: card.color }}
                  >
                    {card.icon}
                  </div>
                  <ArrowUpRight
                    size={13}
                    className="opacity-0 group-hover:opacity-100
                               transition-opacity"
                    style={{ color: 'var(--text-muted)' }}
                  />
                </div>

                {loading ? (
                  <Skeleton className="h-7 w-16 mb-1" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight">
                    {card.value}
                  </p>
                )}

                <div className="flex items-center justify-between mt-1">
                  <p
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {card.label}
                  </p>
                  <p
                    className="text-[11px] font-medium"
                    style={{ color: card.subColor }}
                  >
                    {card.sub}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════
            ROW 2: SECURITY POSTURE + QUICK ACTIONS
            ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Security Posture Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="rounded-xl border p-5"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} style={{ color: 'var(--accent)' }} />
              <h2
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Security Posture
              </h2>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                {/* Status indicator */}
                <div
                  className="rounded-lg p-3 mb-3 flex items-center gap-3"
                  style={{
                    backgroundColor:
                      securityScore?.status === 'healthy'
                        ? 'var(--success-subtle, color-mix(in srgb, var(--success) 10%, transparent))'
                        : securityScore?.status === 'attention'
                          ? 'var(--warning-subtle, color-mix(in srgb, var(--warning, #f59e0b) 10%, transparent))'
                          : 'var(--error-subtle, color-mix(in srgb, var(--error, #ef4444) 10%, transparent))',
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        securityScore?.status === 'healthy'
                          ? 'var(--success)'
                          : securityScore?.status === 'attention'
                            ? 'var(--warning, #f59e0b)'
                            : 'var(--error, #ef4444)',
                    }}
                  />
                  <span className="text-sm font-medium capitalize">
                    {securityScore?.status ?? 'Unknown'}
                  </span>
                </div>

                {securityScore?.issues && securityScore.issues.length > 0 ? (
                  <ul className="space-y-1.5">
                    {securityScore.issues.map((issue, i) => (
                      <li
                        key={i}
                        className="text-xs flex items-start gap-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <AlertTriangle
                          size={12}
                          className="mt-0.5 flex-shrink-0"
                          style={{ color: 'var(--warning, #f59e0b)' }}
                        />
                        {issue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    No security concerns detected.
                  </p>
                )}

                <Link
                  href="/dashboard/audit-logs"
                  className="flex items-center gap-1 text-xs font-medium
                             mt-3 cursor-pointer"
                  style={{ color: 'var(--accent-text)' }}
                >
                  View audit logs
                  <ChevronRight size={12} />
                </Link>
              </>
            )}
          </motion.div>

          {/* Quick Actions — REAL actions, not just navigation */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="lg:col-span-2 rounded-xl border p-5"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Quick Actions
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: 'Create User',
                  icon: <UserPlus size={18} />,
                  href: '/dashboard/users?action=create',
                  color: 'var(--accent)',
                  bg: 'var(--accent-subtle)',
                },
                {
                  label: 'Edit Permissions',
                  icon: <ShieldCheck size={18} />,
                  href: '/dashboard/roles-permissions',
                  color: 'var(--warning, #f59e0b)',
                  bg: 'var(--warning-subtle, color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent))',
                },
                {
                  label: 'Export Logs',
                  icon: <Download size={18} />,
                  href: '/dashboard/audit-logs?export=true',
                  color: 'var(--info, #3b82f6)',
                  bg: 'var(--info-subtle, color-mix(in srgb, var(--info, #3b82f6) 12%, transparent))',
                },
                {
                  label: 'View All Users',
                  icon: <Users size={18} />,
                  href: '/dashboard/users',
                  color: 'var(--text-secondary)',
                  bg: 'var(--surface-muted, #f3f4f6)',
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg
                             border transition-all hover:shadow-sm
                             hover:-translate-y-0.5 text-center group"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--bg)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center
                               justify-center transition-transform
                               group-hover:scale-110"
                    style={{ backgroundColor: action.bg, color: action.color }}
                  >
                    {action.icon}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Module navigation row — compact, below quick actions */}
            <div
              className="mt-4 pt-4 border-t flex flex-wrap gap-2"
              style={{ borderColor: 'var(--border)' }}
            >
              {[
                { label: 'User Directory', href: '/dashboard/users' },
                { label: 'Permission Matrix', href: '/dashboard/roles-permissions' },
                { label: 'Audit Logs', href: '/dashboard/audit-logs' },
                { label: 'Settings', href: '/dashboard/settings' },
              ].map((nav) => (
                <Link
                  key={nav.label}
                  href={nav.href}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md
                             text-xs font-medium transition-colors
                             hover:bg-[var(--surface-muted)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {nav.label}
                  <ExternalLink size={10} />
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            ROW 3: ACTIVITY FEED — full width, filterable
            ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="rounded-xl border"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Activity header with filter tabs */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <h2
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Recent Activity
              </h2>

              {/* Filter pills */}
              <div className="flex gap-1">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'security', label: 'Security' },
                    { key: 'changes', label: 'Changes' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActivityFilter(f.key)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium
                               cursor-pointer transition-colors"
                    style={{
                      backgroundColor:
                        activityFilter === f.key
                          ? 'var(--accent-subtle)'
                          : 'transparent',
                      color:
                        activityFilter === f.key
                          ? 'var(--accent-text)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <Link
              href="/dashboard/audit-logs"
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: 'var(--accent-text)' }}
            >
              View all
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Activity list */}
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Skeleton className="w-7 h-7 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => {
                const meta = getActivityMeta(activity.action);
                return (
                  <div
                    key={activity._id}
                    className="flex items-center gap-3 px-5 py-3
                               transition-colors hover:bg-[var(--bg)]"
                  >
                    {/* Severity-colored icon */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center
                                 justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${SEVERITY_COLORS[meta.severity]} 12%, transparent)`,
                        color: SEVERITY_COLORS[meta.severity],
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span
                          className="font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {meta.label}
                        </span>
                        {activity.user && (
                          <span
                            className="ml-1.5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            by{' '}
                            <span
                              className="font-medium"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {activity.user.name}
                            </span>
                          </span>
                        )}
                        {activity.resource && (
                          <span
                            className="ml-1"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            on {activity.resource}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Relative timestamp */}
                    <span
                      className="text-[11px] font-medium flex-shrink-0
                                 flex items-center gap-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Clock size={10} />
                      {timeAgo(activity.timestamp)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <Activity
                  size={24}
                  className="mx-auto mb-2 opacity-30"
                  style={{ color: 'var(--text-muted)' }}
                />
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {activityFilter === 'all'
                    ? 'No recent activity'
                    : `No ${activityFilter} events`}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}