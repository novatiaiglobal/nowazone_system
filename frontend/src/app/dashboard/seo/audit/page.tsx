'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    ShieldCheck, AlertTriangle, AlertCircle, Info, RefreshCw,
    ChevronDown, ChevronUp, ExternalLink, Zap,
} from 'lucide-react';
import api from '@/lib/api';

interface AuditIssue {
    severity: 'critical' | 'warning' | 'info';
    field?: string;
    issueType?: string;
    message: string;
    recommendation?: string;
    pageUrl?: string;
    pageId?: string;
}

interface PageAudit {
    pageId: string;
    pagePath: string;
    pageUrl: string;
    score: number;
    issues: AuditIssue[];
}

interface AuditSummary {
    overallScore: number;
    totalPages: number;
    pagesWithIssues: number;
    critical: number;
    warnings: number;
    info: number;
}

const SEVERITY_CONFIG = {
    critical: { color: 'var(--error, #ef4444)', bg: 'rgba(239,68,68,0.1)', Icon: AlertCircle, label: 'Critical' },
    warning: { color: 'var(--warning, #f59e0b)', bg: 'rgba(245,158,11,0.1)', Icon: AlertTriangle, label: 'Warning' },
    info: { color: 'var(--accent)', bg: 'var(--accent-subtle)', Icon: Info, label: 'Info' },
};

function getScoreColor(score: number) {
    if (score >= 80) return 'var(--success, #22c55e)';
    if (score >= 50) return 'var(--warning, #f59e0b)';
    return 'var(--error, #ef4444)';
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = getScoreColor(score);

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth={10} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - progress }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    strokeDasharray={circumference}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color }}>{score}</span>
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>/ 100</span>
            </div>
        </div>
    );
}

export default function SeoAuditPage() {
    const [summary, setSummary] = useState<AuditSummary | null>(null);
    const [issues, setIssues] = useState<PageAudit[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasRun, setHasRun] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const runAudit = useCallback(async () => {
        setLoading(true);
        setSummary(null);
        setIssues([]);
        try {
            const runRes = await api.post('/seo/audits/run', { scope: 'site-wide' });
            const run = runRes.data?.data;
            if (!run?._id) {
                setHasRun(true);
                return;
            }
            const sum = run.summary;
            setSummary(sum ? {
                overallScore: sum.overallScore ?? 0,
                totalPages: sum.totalPages ?? 0,
                pagesWithIssues: sum.pagesWithIssues ?? 0,
                critical: sum.criticalCount ?? 0,
                warnings: sum.warningCount ?? 0,
                info: sum.infoCount ?? 0,
            } : null);

            const issuesRes = await api.get(`/seo/audits/${run._id}/issues`);
            const flatIssues: AuditIssue[] = issuesRes.data?.data ?? [];
            const byPage = new Map<string, PageAudit>();
            for (const issue of flatIssues) {
                const key = issue.pageId ?? issue.pageUrl ?? 'site';
                if (!byPage.has(key)) {
                    byPage.set(key, {
                        pageId: key,
                        pagePath: issue.pageUrl ?? key,
                        pageUrl: issue.pageUrl ?? key,
                        score: 100,
                        issues: [],
                    });
                }
                const pa = byPage.get(key)!;
                pa.issues.push(issue);
            }
            byPage.forEach((pa) => {
                let s = 100;
                for (const i of pa.issues) {
                    if (i.severity === 'critical') s -= 15;
                    else if (i.severity === 'warning') s -= 8;
                    else s -= 3;
                }
                pa.score = Math.max(0, s);
            });
            setIssues(Array.from(byPage.values()));
            setHasRun(true);
        } catch {
            setSummary(null);
            setIssues([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
            className="p-6 min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <motion.div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-subtle)' }}
                            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }} transition={{ duration: 0.4 }}>
                            <ShieldCheck size={22} style={{ color: 'var(--accent)' }} />
                        </motion.div>
                        SEO Audit
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Automated health check for all your page SEO configurations
                    </p>
                </div>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={runAudit} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover, var(--accent)))', boxShadow: '0 4px 14px rgba(74,122,155,0.3)' }}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Scanning…' : 'Run Audit'}
                </motion.button>
            </motion.div>

            {/* Score + Summary */}
            {summary && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">

                    {/* Score Ring */}
                    <motion.div whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.16 } }}
                        className="md:col-span-2 border rounded-2xl p-6 flex items-center gap-6"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <ScoreRing score={summary.overallScore} />
                        <div>
                            <p className="text-lg font-bold">
                                {summary.overallScore >= 80 ? 'Good Health' : summary.overallScore >= 50 ? 'Needs Attention' : 'Critical Issues'}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {summary.totalPages} pages scanned · {summary.pagesWithIssues} with issues
                            </p>
                        </div>
                    </motion.div>

                    {/* Issue counts */}
                    {[
                        { ...SEVERITY_CONFIG.critical, count: summary.critical },
                        { ...SEVERITY_CONFIG.warning, label: 'Warnings' as const, count: summary.warnings },
                        { ...SEVERITY_CONFIG.info, count: summary.info },
                    ].map((item, i) => (
                        <motion.div key={item.label}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            whileHover={{ y: -4, scale: 1.015, transition: { duration: 0.16 } }}
                            className="border rounded-xl p-4"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <item.Icon size={14} style={{ color: item.color }} />
                                <span className="text-xs font-semibold" style={{ color: item.color }}>{item.label}</span>
                            </div>
                            <p className="text-2xl font-bold">{item.count}</p>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Issues List */}
            {hasRun && !loading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="border rounded-2xl overflow-hidden"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <h3 className="font-bold flex items-center gap-2">
                            <Zap size={16} style={{ color: 'var(--accent)' }} /> Page-by-Page Results
                        </h3>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{issues.length} pages with issues</span>
                    </div>

                    {issues.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <ShieldCheck size={36} className="mx-auto mb-3" style={{ color: 'var(--success, #22c55e)' }} />
                            <p className="text-sm font-medium" style={{ color: 'var(--success, #22c55e)' }}>All pages pass the SEO audit!</p>
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {issues.map((page, i) => (
                                <motion.div key={page.pageId} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.18, delay: i * 0.02 }}>
                                    <button onClick={() => toggleExpand(page.pageId)}
                                        className="w-full px-5 py-3.5 flex items-center gap-4 text-left transition-colors"
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                                        {/* Score badge */}
                                        <span className="text-xs font-bold w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${getScoreColor(page.score)}15`, color: getScoreColor(page.score) }}>
                                            {page.score}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{page.pagePath || page.pageUrl}</p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                {page.issues.filter(i => i.severity === 'critical').length} critical ·{' '}
                                                {page.issues.filter(i => i.severity === 'warning').length} warnings ·{' '}
                                                {page.issues.filter(i => i.severity === 'info').length} info
                                            </p>
                                        </div>
                                        {expanded.has(page.pageId) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    {expanded.has(page.pageId) && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                            className="px-5 pb-4">
                                            <div className="ml-14 space-y-2">
                                                {page.issues.map((issue, j) => {
                                                    const cfg = SEVERITY_CONFIG[issue.severity];
                                                    return (
                                                        <div key={j} className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm"
                                                            style={{ backgroundColor: cfg.bg }}>
                                                            <cfg.Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                                                            <div>
                                                                <span className="font-medium" style={{ color: cfg.color }}>{issue.message}</span>
                                                                {(issue.field || issue.issueType) && (
                                                                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>({issue.field ?? issue.issueType})</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <Link href="/dashboard/seo/pages"
                                                    className="inline-flex items-center gap-1 text-xs font-semibold mt-2"
                                                    style={{ color: 'var(--accent)' }}>
                                                    Edit this page <ExternalLink size={10} />
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {/* Empty State */}
            {!hasRun && !loading && (
                <div className="text-center py-16">
                    <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click &quot;Run Audit&quot; to scan all pages</p>
                </div>
            )}
        </motion.div>
    );
}
