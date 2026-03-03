'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Users, ClipboardList, Briefcase, UserCheck,
  Plus, TrendingUp, Clock, CheckCircle, XCircle,
  ArrowRight, Calendar, MapPin,
} from 'lucide-react';
import { api } from '@/lib/api';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  href: string;
  trend?: string;
}

interface RecentActivity {
  _id: string;
  type: 'hire' | 'application' | 'attendance' | 'job';
  message: string;
  timestamp: string;
}

interface DashboardStats {
  totalEmployees: number;
  activeJobs: number;
  openApplications: number;
  attendanceToday: number;
  recentActivities: RecentActivity[];
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const defaultStats: DashboardStats = {
  totalEmployees: 0,
  activeJobs: 0,
  openApplications: 0,
  attendanceToday: 0,
  recentActivities: [],
};

export default function HRDashboardPage() {
  const { data: stats = defaultStats, isLoading: loading } = useQuery({
    queryKey: ['hr', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<{ data: DashboardStats }>('/hr/dashboard');
      return data.data;
    },
    placeholderData: defaultStats,
  });

  const statCards: StatCard[] = [
    {
      label: 'Total Employees',
      value: loading ? '—' : (stats?.totalEmployees ?? 0),
      icon: <Users size={20} />,
      color: 'var(--accent)',
      bg: 'var(--accent-subtle)',
      href: '/dashboard/hr/employees',
      trend: 'View directory',
    },
    {
      label: 'Active Jobs',
      value: loading ? '—' : (stats?.activeJobs ?? 0),
      icon: <Briefcase size={20} />,
      color: 'var(--info)',
      bg: 'var(--info-subtle)',
      href: '/dashboard/hr/recruitment/jobs',
      trend: 'Manage listings',
    },
    {
      label: 'Open Applications',
      value: loading ? '—' : (stats?.openApplications ?? 0),
      icon: <ClipboardList size={20} />,
      color: 'var(--warning)',
      bg: 'var(--warning-subtle)',
      href: '/dashboard/hr/recruitment/applications',
      trend: 'Review pipeline',
    },
    {
      label: 'Attendance Today',
      value: loading ? '—' : (stats?.attendanceToday ?? 0),
      icon: <UserCheck size={20} />,
      color: 'var(--success)',
      bg: 'var(--success-subtle)',
      href: '/dashboard/hr/attendance',
      trend: 'View records',
    },
  ];

  const quickActions = [
    { label: 'Add Employee', icon: <Plus size={16} />, href: '/dashboard/hr/employees/new', color: 'var(--accent)' },
    { label: 'Post Job', icon: <Briefcase size={16} />, href: '/dashboard/hr/recruitment/jobs/new', color: 'var(--info)' },
    { label: 'View Attendance', icon: <Calendar size={16} />, href: '/dashboard/hr/attendance', color: 'var(--success)' },
    { label: 'Resume Database', icon: <UserCheck size={16} />, href: '/dashboard/hr/recruitment/resumes', color: 'var(--warning)' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'hire': return <CheckCircle size={14} style={{ color: 'var(--success)' }} />;
      case 'application': return <ClipboardList size={14} style={{ color: 'var(--info)' }} />;
      case 'attendance': return <Clock size={14} style={{ color: 'var(--warning)' }} />;
      case 'job': return <Briefcase size={14} style={{ color: 'var(--accent)' }} />;
      default: return <TrendingUp size={14} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          HR Overview
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Human Resources management — employees, attendance &amp; recruitment
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
          >
            <Link
              href={card.href}
              className="block rounded-2xl border p-5 transition-all hover:shadow-md group"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: card.bg, color: card.color }}
                >
                  {card.icon}
                </div>
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {card.value}
              </p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>
                {card.label}
              </p>
              {card.trend && (
                <p className="text-[11px] mt-2 font-medium" style={{ color: card.color }}>
                  {card.trend} →
                </p>
              )}
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          className="lg:col-span-1 rounded-2xl border p-5"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[var(--surface-muted)] group"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${action.color}1a`, color: action.color }}
                >
                  {action.icon}
                </span>
                {action.label}
                <ArrowRight
                  size={12}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: action.color }}
                />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Recent Activity
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--surface-muted)' }} />
                  <div className="flex-1 h-4 rounded" style={{ backgroundColor: 'var(--surface-muted)' }} />
                  <div className="w-20 h-3 rounded" style={{ backgroundColor: 'var(--surface-muted)' }} />
                </div>
              ))}
            </div>
          ) : stats?.recentActivities?.length ? (
            <div className="space-y-3">
              {stats.recentActivities.map((activity) => (
                <div key={activity._id} className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: 'var(--surface-muted)' }}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {activity.message}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--surface-muted)' }}
              >
                <TrendingUp size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                No recent activity
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Activity will appear here as you use the HR module
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Navigation cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.38 }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          HR Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Employee Management',
              description: 'Directory, profiles, departments, documents',
              icon: <Users size={22} />,
              href: '/dashboard/hr/employees',
              color: 'var(--accent)',
              bg: 'var(--accent-subtle)',
            },
            {
              title: 'Attendance Tracking',
              description: 'Daily records, check-in/out, leave management',
              icon: <ClipboardList size={22} />,
              href: '/dashboard/hr/attendance',
              color: 'var(--success)',
              bg: 'var(--success-subtle)',
            },
            {
              title: 'Recruitment',
              description: 'Job postings, applications, resume database',
              icon: <Briefcase size={22} />,
              href: '/dashboard/hr/recruitment/jobs',
              color: 'var(--info)',
              bg: 'var(--info-subtle)',
            },
          ].map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="rounded-2xl border p-5 transition-all hover:shadow-md group flex items-start gap-4"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: module.bg, color: module.color }}
              >
                {module.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {module.title}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {module.description}
                </p>
              </div>
              <ArrowRight
                size={14}
                className="flex-shrink-0 mt-0.5 transition-transform group-hover:translate-x-1"
                style={{ color: 'var(--text-muted)' }}
              />
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
