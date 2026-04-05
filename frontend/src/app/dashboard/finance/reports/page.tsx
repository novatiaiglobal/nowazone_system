'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  RefreshCw,
  FileText,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface ReportSummary {
  revenueThisMonth: number;
  invoicesPaidThisMonth: number;
  expensesThisMonth: number;
  expensesCountThisMonth: number;
  profitThisMonth: number;
}

interface TimeSeriesPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ReportData {
  summary: ReportSummary;
  timeSeries: TimeSeriesPoint[];
  recentInvoices: Array<{ _id: string; invoiceNumber: string; clientName: string; total: number; status: string }>;
  recentExpenses: Array<{ _id: string; description: string; amount: number; status: string }>;
}

export default function FinanceReportsPage() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['finance-reports', period],
    queryFn: async () => {
      const { data: res } = await api.get<{ data: ReportData }>('/finance/reports', { params: { period } });
      return res.data;
    },
  });

  const summary = data?.summary;
  const timeSeries = data?.timeSeries ?? [];
  const recentInvoices = data?.recentInvoices ?? [];
  const recentExpenses = data?.recentExpenses ?? [];

  const maxVal = Math.max(
    ...timeSeries.flatMap((p) => [p.revenue, p.expenses]),
    1
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="p-6 min-h-screen"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/finance"
            className="p-2 rounded-lg border hover:bg-[var(--surface-muted)] transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <motion.div
                className="p-2 rounded-xl"
                style={{ backgroundColor: 'var(--accent-subtle)' }}
                whileHover={{ scale: 1.05 }}
              >
                <BarChart3 size={22} style={{ color: 'var(--accent)' }} />
              </motion.div>
              Financial Reports
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Revenue, expenses &amp; profit overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm border focus:outline-none"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <motion.button
            type="button"
            onClick={() => refetch()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-lg border"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={14} />
          </motion.button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" style={{ color: 'var(--text-muted)' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-4 border-t-transparent rounded-full"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              {
                label: 'Revenue (This Month)',
                value: summary ? formatCurrency(summary.revenueThisMonth) : '—',
                icon: <DollarSign size={18} />,
                color: 'var(--success)',
                bg: 'var(--success-subtle)',
              },
              {
                label: 'Invoices Paid',
                value: summary?.invoicesPaidThisMonth ?? '—',
                icon: <FileText size={18} />,
                color: 'var(--accent)',
                bg: 'var(--accent-subtle)',
              },
              {
                label: 'Expenses (This Month)',
                value: summary ? formatCurrency(summary.expensesThisMonth) : '—',
                icon: <Receipt size={18} />,
                color: 'var(--error)',
                bg: 'var(--error-subtle)',
              },
              {
                label: 'Expenses Count',
                value: summary?.expensesCountThisMonth ?? '—',
                icon: <Receipt size={18} />,
                color: 'var(--text-muted)',
                bg: 'var(--surface-muted)',
              },
              {
                label: 'Profit (This Month)',
                value: summary ? formatCurrency(summary.profitThisMonth) : '—',
                icon: summary && summary.profitThisMonth >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
                color: summary && summary.profitThisMonth >= 0 ? 'var(--success)' : 'var(--error)',
                bg: summary && summary.profitThisMonth >= 0 ? 'var(--success-subtle)' : 'var(--error-subtle)',
              },
            ].map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border p-4"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: s.bg, color: s.color }}
                  >
                    {s.icon}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border p-6 mb-8"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Revenue vs Expenses
            </h2>
            {timeSeries.length === 0 ? (
              <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                No data for the selected period
              </div>
            ) : (
              <div className="flex items-end gap-2 h-48 overflow-x-auto pb-6">
                {timeSeries.map((p) => (
                  <div key={p.date} className="flex-1 min-w-[40px] flex flex-col items-center gap-2">
                    <div className="w-full flex-1 flex gap-0.5 items-end justify-center" style={{ minHeight: 120 }}>
                      <div
                        className="flex-1 rounded-t min-w-[6px] transition-all"
                        style={{
                          height: `${Math.max((p.revenue / maxVal) * 100, 2)}%`,
                          backgroundColor: 'var(--success)',
                          opacity: 0.9,
                        }}
                        title={`Revenue: ${formatCurrency(p.revenue)}`}
                      />
                      <div
                        className="flex-1 rounded-t min-w-[6px] transition-all"
                        style={{
                          height: `${Math.max((p.expenses / maxVal) * 100, 2)}%`,
                          backgroundColor: 'var(--error)',
                          opacity: 0.9,
                        }}
                        title={`Expenses: ${formatCurrency(p.expenses)}`}
                      />
                    </div>
                    <span className="text-[10px] truncate max-w-full" style={{ color: 'var(--text-muted)' }}>
                      {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--success)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--error)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Expenses</span>
              </div>
            </div>
          </motion.div>

          {/* Recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border p-6"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Pending Invoices
              </h2>
              {recentInvoices.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No pending invoices</p>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.map((inv) => (
                    <Link
                      key={inv._id}
                      href="/dashboard/invoices"
                      className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-[var(--surface-muted)] rounded-lg px-2 -mx-2 transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div>
                        <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{inv.clientName}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'var(--success)' }}>
                        {formatCurrency(inv.total)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border p-6"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Pending Expenses
              </h2>
              {recentExpenses.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No pending expenses</p>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map((exp) => (
                    <Link
                      key={exp._id}
                      href="/dashboard/finance/expenses"
                      className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-[var(--surface-muted)] rounded-lg px-2 -mx-2 transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div>
                        <p className="text-sm font-medium">{exp.description}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{exp.status}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'var(--error)' }}>
                        {formatCurrency(exp.amount)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}
