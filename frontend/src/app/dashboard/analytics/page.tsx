'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Globe, Eye, MousePointer, Clock, MapPin, ChevronDown, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface Overview {
  totalVisitors: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;
  newUsers: number;
}

interface TopPage {
  path: string;
  views: number;
  uniqueViews: number;
  avgDuration: number;
  bounceRate: number;
}

interface TrafficSource {
  source: string;
  visitors: number;
}

interface CountryTraffic {
  country: string;
  visitors: number;
}

const asArray = <T,>(value: unknown, nestedKey?: string): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (
    nestedKey &&
    value &&
    typeof value === 'object' &&
    nestedKey in value &&
    Array.isArray((value as Record<string, unknown>)[nestedKey])
  ) {
    return (value as Record<string, unknown>)[nestedKey] as T[];
  }
  return [];
};

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
] as const;

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function SkeletonPulse({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ backgroundColor: 'var(--surface-muted)', ...style }}
    />
  );
}

const KPI_COLORS: Record<string, string> = {
  cyan: 'var(--accent)',
  blue: 'var(--accent)',
  green: 'var(--success)',
  purple: 'var(--accent)',
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7d');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [countryTraffic, setCountryTraffic] = useState<CountryTraffic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, topPagesRes, sourcesRes, countryRes] = await Promise.all([
        api.get('/analytics/overview', { params: { period } }),
        api.get('/analytics/top-pages', { params: { period, limit: 10 } }),
        api.get('/analytics/traffic-sources', { params: { period } }),
        api.get('/analytics/traffic-country', { params: { period } }),
      ]);
      setOverview(overviewRes.data.data);
      setTopPages(asArray<TopPage>(topPagesRes.data.data, 'pages'));
      setTrafficSources(asArray<TrafficSource>(sourcesRes.data.data, 'sources'));
      setCountryTraffic(asArray<CountryTraffic>(countryRes.data.data, 'countries'));
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSourceVisitors = trafficSources.reduce((sum, s) => sum + s.visitors, 0);

  const kpiCards = overview
    ? [
        { label: 'Total Visitors', value: formatNumber(overview.totalVisitors), Icon: Eye, color: 'cyan' },
        { label: 'Avg. Session', value: formatDuration(overview.avgSessionDuration), Icon: Clock, color: 'blue' },
        { label: 'Bounce Rate', value: `${overview.bounceRate.toFixed(1)}%`, Icon: MousePointer, color: 'green' },
        { label: 'New Users', value: formatNumber(overview.newUsers), Icon: Globe, color: 'purple' },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="p-6 min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 260, damping: 24 }} className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <motion.div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-subtle)' }}
            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }} transition={{ duration: 0.4 }}>
            <BarChart2 size={22} style={{ color: 'var(--accent)' }} />
          </motion.div>
          Analytics Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Website traffic, performance, and audience insights</p>
      </motion.div>

      {/* Period Selector & Status */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-4 mb-6 flex items-center justify-between gap-3"
        style={{ backgroundColor: 'var(--accent-subtle)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--accent-border)' }}>
        <div className="flex items-center gap-3">
          <TrendingUp size={18} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>Real-time data from Nowazone Analytics</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Loading analytics data…' : error ? error : 'Showing data for the selected period'}
            </p>
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="appearance-none text-sm font-medium rounded-lg px-4 py-2 pr-8 cursor-pointer outline-none transition-colors"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'var(--border)',
            }}
          >
            {PERIODS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{ backgroundColor: 'var(--error-subtle, rgba(239,68,68,0.1))', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--error, #ef4444)' }}>
          <AlertCircle size={18} style={{ color: 'var(--error, #ef4444)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>
          <button
            onClick={fetchData}
            className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--error, #ef4444)', color: '#fff' }}
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className="border rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <SkeletonPulse className="w-4 h-4" />
              </div>
              <SkeletonPulse className="w-24 h-7 mb-1" />
              <SkeletonPulse className="w-16 h-3 mt-1" />
            </motion.div>
          ))
        ) : (
          kpiCards.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: i * 0.05 }}
              whileHover={{ y: -4, scale: 1.015, transition: { duration: 0.16 } }}
              whileTap={{ scale: 0.99 }}
              className="border rounded-xl p-4 transition-shadow"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <k.Icon size={16} style={{ color: KPI_COLORS[k.color] }} />
              </div>
              <p className="text-2xl font-bold mb-0.5">{k.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            </motion.div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, scale: 1.005, transition: { duration: 0.18 } }}
          className="border rounded-2xl p-5 transition-shadow"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><Eye size={16} style={{ color: 'var(--accent)' }} />Top Pages</h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonPulse className="w-4 h-4" />
                  <div className="flex-1">
                    <SkeletonPulse className="w-32 h-4 mb-1" />
                    <SkeletonPulse className="w-20 h-3" />
                  </div>
                  <SkeletonPulse className="w-16 h-4" />
                  <SkeletonPulse className="w-20 h-1.5" />
                </div>
              ))
            ) : topPages.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No page data available</p>
            ) : (
              topPages.map((page, i) => {
                const maxViews = topPages[0]?.views || 1;
                return (
                  <div key={page.path} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-4" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{page.path}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{formatNumber(page.uniqueViews)} unique · {formatDuration(page.avgDuration)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold">{page.views.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{page.bounceRate.toFixed(1)}% bounce</p>
                    </div>
                    <div className="w-20 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(page.views / maxViews) * 100}%`, backgroundColor: 'var(--accent)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Traffic Sources */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          whileHover={{ y: -3, scale: 1.005, transition: { duration: 0.18 } }}
          className="border rounded-2xl p-5 transition-shadow"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><Globe size={16} style={{ color: 'var(--accent)' }} />Traffic Sources</h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <SkeletonPulse className="w-24 h-4" />
                    <SkeletonPulse className="w-20 h-4" />
                  </div>
                  <SkeletonPulse className="w-full h-2" />
                </div>
              ))
            ) : trafficSources.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No traffic source data available</p>
            ) : (
              trafficSources.map(src => {
                const pct = totalSourceVisitors > 0 ? Math.round((src.visitors / totalSourceVisitors) * 100) : 0;
                return (
                  <div key={src.source} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{src.source}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{src.visitors.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-muted)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 }}
                        className="h-full rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Traffic by Country */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          whileHover={{ y: -3, scale: 1.005, transition: { duration: 0.18 } }}
          className="border rounded-2xl p-5 transition-shadow lg:col-span-2"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><MapPin size={16} style={{ color: 'var(--accent)' }} />Traffic by Country</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg)' }}>
                  <SkeletonPulse className="w-20 h-4" />
                  <SkeletonPulse className="w-12 h-4 ml-auto" />
                </div>
              ))
            ) : countryTraffic.length === 0 ? (
              <p className="text-sm col-span-full text-center py-4" style={{ color: 'var(--text-muted)' }}>No country data available</p>
            ) : (
              countryTraffic.map(c => {
                const maxVisitors = countryTraffic[0]?.visitors || 1;
                return (
                  <div key={c.country} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg)' }}>
                    <span className="text-sm font-medium truncate flex-1">{c.country}</span>
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--accent)' }}>{formatNumber(c.visitors)}</span>
                    <div className="w-12 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--surface-muted)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(c.visitors / maxVisitors) * 100}%`, backgroundColor: 'var(--accent)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
