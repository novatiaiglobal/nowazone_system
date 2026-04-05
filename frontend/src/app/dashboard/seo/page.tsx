'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    Search, FileText, Eye, EyeOff, Clock, Plus,
    ArrowUpRight, AlertCircle, RefreshCw, Repeat, Target,
    ShieldCheck, BarChart2,
} from 'lucide-react';
import api from '@/lib/api';

/** Mapped from GET /api/seo/overview */
interface SeoOverview {
    totalManagedPages: number;
    publishedPages: number;
    draftPages: number;
    pagesInReview?: number;
    pagesApproved?: number;
    pagesMissingMetadata?: number;
    pagesMissingTitle?: number;
    pagesMissingDescription?: number;
    pagesMissingCanonical?: number;
    pagesMissingStructuredData?: number;
    redirectStats?: { total: number };
    keywordStats?: { total: number };
    latestAuditSummary?: {
        id: string;
        startedAt: string;
        status: string;
        overallScore?: number;
        criticalCount?: number;
        warningCount?: number;
    } | null;
    topIssuesSummary?: { critical: number; warning: number; info: number };
    sitemapStatus?: { lastGeneratedAt: string | null; autoGenerate: boolean };
    recentActivity?: unknown[];
}

interface SeoEntry {
    _id: string;
    pagePath?: string;
    routePath?: string;
    metaTitle?: string;
    title?: string;
    metaDescription?: string;
    status?: string;
    isPublished?: boolean;
    updatedAt: string;
    lastModifiedBy?: { name: string };
}

function SkeletonPulse({ className = '' }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded ${className}`}
            style={{ backgroundColor: 'var(--surface-muted)' }}
        />
    );
}

export default function SeoOverviewPage() {
    const [overview, setOverview] = useState<SeoOverview | null>(null);
    const [recentPages, setRecentPages] = useState<SeoEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [overviewRes, pagesRes] = await Promise.all([
                api.get('/seo/overview'),
                api.get('/seo/pages', { params: { limit: 8, sort: '-updatedAt' } }),
            ]);
            setOverview(overviewRes.data.data ?? null);
            setRecentPages(pagesRes.data.data?.pages ?? []);
        } catch {
            setError('Failed to load SEO data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const o = overview;
    const auditSummary = o?.latestAuditSummary && o?.topIssuesSummary
        ? {
            overallScore: o.latestAuditSummary.overallScore ?? 0,
            totalPages: 0,
            pagesWithIssues: 0,
            critical: o.topIssuesSummary.critical ?? 0,
            warnings: o.topIssuesSummary.warning ?? 0,
            info: o.topIssuesSummary.info ?? 0,
        }
        : null;

    const kpiCards = o
        ? [
            { label: 'Total Pages', value: o.totalManagedPages ?? 0, Icon: FileText, color: 'var(--accent)', href: '/dashboard/seo/pages' },
            { label: 'Published', value: o.publishedPages ?? 0, Icon: Eye, color: 'var(--success, #22c55e)', href: '/dashboard/seo/pages' },
            { label: 'Drafts', value: o.draftPages ?? 0, Icon: EyeOff, color: 'var(--warning, #f59e0b)', href: '/dashboard/seo/pages' },
            { label: 'Missing metadata', value: o.pagesMissingMetadata ?? 0, Icon: Clock, color: 'var(--accent)', href: '/dashboard/seo/pages' },
            { label: 'Redirects', value: o.redirectStats?.total ?? 0, Icon: Repeat, color: '#3b82f6', href: '/dashboard/seo/redirects' },
            { label: 'Keywords', value: o.keywordStats?.total ?? 0, Icon: Target, color: 'var(--accent)', href: '/dashboard/seo/keywords' },
        ]
        : [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="p-6 min-h-screen"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="mb-8 flex items-center justify-between"
            >
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <motion.div
                            className="p-2 rounded-xl"
                            style={{ backgroundColor: 'var(--accent-subtle)' }}
                            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
                            transition={{ duration: 0.4 }}
                        >
                            <Search size={22} style={{ color: 'var(--accent)' }} />
                        </motion.div>
                        SEO Manager
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Manage search engine optimization metadata for all pages
                    </p>
                </div>
                <Link href="/dashboard/seo/pages">
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-shadow"
                        style={{
                            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover, var(--accent)))',
                            boxShadow: '0 4px 14px rgba(74, 122, 155, 0.3)',
                        }}
                    >
                        <Plus size={16} />
                        Manage Pages
                    </motion.button>
                </Link>
            </motion.div>

            {/* Info Banner */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 mb-6 flex items-center justify-between gap-3"
                style={{
                    backgroundColor: 'var(--accent-subtle)',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'var(--accent-border)',
                }}
            >
                <div className="flex items-center gap-3">
                    <Search size={18} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>
                            SEO Metadata Manager
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {loading ? 'Loading SEO data…' : error ? error : 'Configure meta tags, Open Graph, and structured data for every page'}
                        </p>
                    </div>
                </div>
                <motion.button
                    whileHover={{ rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={fetchData}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <RefreshCw size={16} />
                </motion.button>
            </motion.div>

            {/* Audit Issues Banner */}
            {!loading && auditSummary && auditSummary.critical > 0 && (
                <Link href="/dashboard/seo/audit">
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-4 mb-6 flex items-center justify-between gap-3 cursor-pointer group"
                        style={{
                            backgroundColor: 'rgba(239,68,68,0.1)',
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: 'var(--error, #ef4444)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle size={18} style={{ color: 'var(--error, #ef4444)' }} />
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--error, #ef4444)' }}>
                                    {auditSummary.critical} critical SEO issue{auditSummary.critical !== 1 ? 's' : ''} found
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    Fix issues to improve search visibility
                                </p>
                            </div>
                        </div>
                        <ArrowUpRight size={16} className="flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" style={{ color: 'var(--error, #ef4444)' }} />
                    </motion.div>
                </Link>
            )}

            {/* Error Banner */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-4 mb-6 flex items-center gap-3"
                    style={{
                        backgroundColor: 'var(--error-subtle, rgba(239,68,68,0.1))',
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: 'var(--error, #ef4444)',
                    }}
                >
                    <AlertCircle size={18} style={{ color: 'var(--error, #ef4444)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>
                    <button
                        onClick={fetchData}
                        className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'var(--error, #ef4444)', color: '#fff' }}
                    >
                        Retry
                    </button>
                </motion.div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.04 }}
                            className="border rounded-xl p-4"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                        >
                            <SkeletonPulse className="w-4 h-4 mb-3" />
                            <SkeletonPulse className="w-16 h-7 mb-1" />
                            <SkeletonPulse className="w-20 h-3 mt-1" />
                        </motion.div>
                    ))
                    : kpiCards.map((k, i) => (
                        <Link key={k.label} href={k.href}>
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.22, delay: i * 0.05 }}
                                whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.16 } }}
                                whileTap={{ scale: 0.99 }}
                                className="border rounded-xl p-4 transition-shadow cursor-pointer group"
                                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <k.Icon size={16} style={{ color: k.color }} />
                                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                                </div>
                                <p className="text-2xl font-bold mb-0.5">{k.value}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
                            </motion.div>
                        </Link>
                    ))}
            </div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
            >
                <Link href="/dashboard/seo/audit">
                    <motion.div
                        whileHover={{ y: -2, scale: 1.01, transition: { duration: 0.14 } }}
                        whileTap={{ scale: 0.99 }}
                        className="rounded-xl border p-4 flex items-center gap-4 cursor-pointer group"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-subtle)' }}>
                            <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>SEO Audit</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Run health check on all pages</p>
                        </div>
                        <ArrowUpRight size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                    </motion.div>
                </Link>
                <Link href="/dashboard/seo/sitemap">
                    <motion.div
                        whileHover={{ y: -2, scale: 1.01, transition: { duration: 0.14 } }}
                        whileTap={{ scale: 0.99 }}
                        className="rounded-xl border p-4 flex items-center gap-4 cursor-pointer group"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-subtle)' }}>
                            <BarChart2 size={18} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sitemap</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Preview &amp; generate XML sitemap</p>
                        </div>
                        <ArrowUpRight size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                    </motion.div>
                </Link>
            </motion.div>

            {/* Recent Pages Table */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="border rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
                    <h3 className="font-bold flex items-center gap-2">
                        <Clock size={16} style={{ color: 'var(--accent)' }} />
                        Recently Updated Pages
                    </h3>
                    <Link
                        href="/dashboard/seo/pages"
                        className="text-xs font-semibold flex items-center gap-1 transition-colors"
                        style={{ color: 'var(--accent)' }}
                    >
                        View All <ArrowUpRight size={12} />
                    </Link>
                </div>

                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="px-5 py-3 flex items-center gap-4">
                                <SkeletonPulse className="w-40 h-4" />
                                <SkeletonPulse className="w-60 h-3 flex-1" />
                                <SkeletonPulse className="w-16 h-5 rounded-full" />
                            </div>
                        ))
                    ) : recentPages.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <Search size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No SEO pages configured yet</p>
                            <Link href="/dashboard/seo/pages">
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white"
                                    style={{ backgroundColor: 'var(--accent)' }}
                                >
                                    Add First Page
                                </motion.button>
                            </Link>
                        </div>
                    ) : (
                        recentPages.map((entry, i) => (
                            <motion.div
                                key={entry._id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: i * 0.03 }}
                                className="px-5 py-3 flex items-center gap-4 transition-colors"
                                style={{ cursor: 'default' }}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{entry.pagePath ?? entry.routePath ?? entry._id}</p>
                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        {entry.metaTitle ?? entry.title ?? 'No meta title set'}
                                    </p>
                                </div>
                                <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{
                                        backgroundColor: (entry.status === 'published' || entry.isPublished)
                                            ? 'rgba(34, 197, 94, 0.1)'
                                            : 'rgba(245, 158, 11, 0.1)',
                                        color: (entry.status === 'published' || entry.isPublished)
                                            ? 'var(--success, #22c55e)'
                                            : 'var(--warning, #f59e0b)',
                                    }}
                                >
                                    {entry.status === 'published' || entry.isPublished ? 'Published' : (entry.status ?? 'Draft')}
                                </span>
                                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                                    {new Date(entry.updatedAt).toLocaleDateString()}
                                </span>
                            </motion.div>
                        ))
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
