'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
  RefreshCw,
  TrendingUp,
  Receipt,
  BarChart3,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface InvoiceStats {
  total: number;
  paid: { count: number; amount: number };
  pending: { count: number; amount: number };
  overdue: number;
  monthlyRevenue: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const defaultStats: InvoiceStats = {
  total: 0,
  paid: { count: 0, amount: 0 },
  pending: { count: 0, amount: 0 },
  overdue: 0,
  monthlyRevenue: 0,
};

export default function FinanceOverviewPage() {
  const { data: stats = defaultStats, isLoading: loading, refetch } = useQuery({
    queryKey: ['finance', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<{ data: InvoiceStats }>('/invoices/stats');
      return data.data;
    },
    placeholderData: defaultStats,
  });

  const statCards = [
    {
      label: 'Total Invoices',
      value: loading ? '—' : stats.total,
      icon: <FileText size={20} />,
      color: 'var(--accent)',
      bg: 'var(--accent-subtle)',
      href: '/dashboard/invoices',
      trend: 'View all invoices',
    },
    {
      label: 'Paid',
      value: loading ? '—' : formatCurrency(stats.paid.amount),
      sub: stats.paid.count ? `${stats.paid.count} invoices` : undefined,
      icon: <CheckCircle size={20} />,
      color: 'var(--success)',
      bg: 'var(--success-subtle)',
      href: '/dashboard/invoices?status=paid',
      trend: 'View paid',
    },
    {
      label: 'Pending',
      value: loading ? '—' : formatCurrency(stats.pending.amount),
      sub: stats.pending.count ? `${stats.pending.count} invoices` : undefined,
      icon: <Clock size={20} />,
      color: 'var(--warning)',
      bg: 'var(--warning-subtle)',
      href: '/dashboard/invoices?status=sent',
      trend: 'View pending',
    },
    {
      label: 'Overdue',
      value: loading ? '—' : stats.overdue,
      icon: <AlertCircle size={20} />,
      color: 'var(--error)',
      bg: 'var(--error-subtle)',
      href: '/dashboard/invoices?status=overdue',
      trend: 'View overdue',
    },
  ];

  const quickActions = [
    { label: 'Create Invoice', icon: <Plus size={16} />, href: '/dashboard/invoices', color: 'var(--accent)' },
    { label: 'Manage Invoices', icon: <FileText size={16} />, href: '/dashboard/invoices', color: 'var(--info)' },
    { label: 'Add Expense', icon: <Receipt size={16} />, href: '/dashboard/finance/expenses', color: 'var(--error)' },
    { label: 'View Reports', icon: <BarChart3 size={16} />, href: '/dashboard/finance/reports', color: 'var(--success)' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <motion.div {...fadeUp}>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Finance Overview
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Invoices, revenue &amp; financial summary
          </p>
        </motion.div>
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
          <Link href="/dashboard/invoices">
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
              Open Invoices
              <ArrowRight size={14} />
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Monthly Revenue highlight */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-2xl border p-6"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--accent-subtle) 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success)' }}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Revenue this month
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
                {loading ? '—' : formatCurrency(stats.monthlyRevenue)}
              </p>
            </div>
          </div>
          <Link href="/dashboard/invoices">
            <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              View invoices →
            </span>
          </Link>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
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
              {card.sub && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {card.sub}
                </p>
              )}
              {card.trend && (
                <p className="text-[11px] mt-2 font-medium" style={{ color: card.color }}>
                  {card.trend} →
                </p>
              )}
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        className="rounded-2xl border p-5"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:shadow-md"
              style={{
                backgroundColor: 'var(--surface-muted)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${action.color}1a`, color: action.color }}
              >
                {action.icon}
              </span>
              {action.label}
              <ArrowRight size={12} style={{ color: action.color }} />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Finance Modules */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Finance Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Invoices',
              description: 'Create, send, and manage client invoices. Track payments and recurring billing.',
              icon: <DollarSign size={22} />,
              href: '/dashboard/invoices',
              color: 'var(--accent)',
              bg: 'var(--accent-subtle)',
            },
            {
              title: 'Expenses',
              description: 'Track business expenses by category. Manage approvals and reimbursements.',
              icon: <Receipt size={22} />,
              href: '/dashboard/finance/expenses',
              color: 'var(--error)',
              bg: 'var(--error-subtle)',
            },
            {
              title: 'Reports',
              description: 'Revenue vs expenses, profit overview, and financial trends.',
              icon: <BarChart3 size={22} />,
              href: '/dashboard/finance/reports',
              color: 'var(--success)',
              bg: 'var(--success-subtle)',
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
