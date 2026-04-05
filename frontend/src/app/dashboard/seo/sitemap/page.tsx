'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Map, RefreshCw, Copy, Check, AlertCircle, ExternalLink, FileText,
} from 'lucide-react';
import api from '@/lib/api';

interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq: string;
    priority: string;
}

interface SitemapData {
    totalUrls: number;
    excludedNoindex: number;
    xml: string;
    urls: SitemapUrl[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function SeoSitemapPage() {
    const [data, setData] = useState<SitemapData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [urlCopied, setUrlCopied] = useState(false);
    const [baseUrl, setBaseUrl] = useState('');

    const generate = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await api.get('/seo/sitemap/preview', { params: baseUrl ? { baseUrl } : {} });
            setData(res.data.data);
        } catch { setError('Failed to generate sitemap'); }
        finally { setLoading(false); }
    }, [baseUrl]);

    useEffect(() => { generate(); }, [generate]);

    const copyXml = async () => {
        if (!data?.xml) return;
        await navigator.clipboard.writeText(data.xml);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const sitemapBase = baseUrl ? baseUrl.replace(/\/$/, '') : API_BASE.replace(/\/api\/?$/, '') || 'https://example.com';
    const sitemapUrl = `${sitemapBase}/api/seo/sitemap.xml`;
    const copySitemapUrl = async () => {
        await navigator.clipboard.writeText(sitemapUrl);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
    };

    const inputStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--text-primary)',
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
            className="p-6 min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <motion.div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-subtle)' }}
                            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }} transition={{ duration: 0.4 }}>
                            <Map size={22} style={{ color: 'var(--accent)' }} />
                        </motion.div>
                        Sitemap Generator
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Generate XML sitemaps from your published SEO pages
                    </p>
                </div>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={generate} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover, var(--accent)))', boxShadow: '0 4px 14px rgba(74,122,155,0.3)' }}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Generating…' : 'Regenerate'}
                </motion.button>
            </motion.div>

            {/* Base URL Config */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 mb-6 flex items-center gap-4"
                style={{ backgroundColor: 'var(--accent-subtle)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--accent-border)' }}>
                <ExternalLink size={18} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />
                <div className="flex-1">
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-text)' }}>Base URL</p>
                    <input type="text" placeholder="https://yourdomain.com (defaults to CLIENT_URL env)"
                        value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                </div>
            </motion.div>

            {error && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-4 mb-6 flex items-center gap-3"
                    style={{ backgroundColor: 'var(--error-subtle, rgba(239,68,68,0.1))', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--error, #ef4444)' }}>
                    <AlertCircle size={18} style={{ color: 'var(--error, #ef4444)' }} />
                    <p className="text-sm" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>
                </motion.div>
            )}

            {data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'URLs Included', value: data.totalUrls ?? (data.urls?.length ?? 0), color: 'var(--success, #22c55e)' },
                            { label: 'Excluded (noindex)', value: data.excludedNoindex ?? 0, color: 'var(--warning, #f59e0b)' },
                            { label: 'Total Published', value: (data.totalUrls ?? (data.urls?.length ?? 0)) + (data.excludedNoindex ?? 0), color: 'var(--accent)' },
                        ].map((card, i) => (
                            <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }} whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.15 } }}
                                className="border rounded-xl p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
                                <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* URL List */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="border rounded-2xl overflow-hidden mb-6"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                            <h3 className="font-bold flex items-center gap-2">
                                <FileText size={16} style={{ color: 'var(--accent)' }} /> Included URLs
                            </h3>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(data.urls?.length ?? 0)} URLs</span>
                        </div>
                        <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                            {(data.urls?.length ?? 0) === 0 ? (
                                <div className="px-5 py-10 text-center">
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No publishable URLs found. Add SEO pages first.</p>
                                </div>
                            ) : (data.urls ?? []).map((url, i) => (
                                <motion.div key={url.loc} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.15, delay: i * 0.02 }}
                                    className="px-5 py-2.5 flex items-center gap-4">
                                    <span className="text-xs font-bold w-6" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{url.loc}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {url.lastmod && `Modified: ${url.lastmod}`} · {url.changefreq} · priority: {url.priority}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* XML Preview */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="border rounded-2xl overflow-hidden"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                            <h3 className="font-bold flex items-center gap-2">
                                <Map size={16} style={{ color: 'var(--accent)' }} /> XML Preview
                            </h3>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={copyXml}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ backgroundColor: copied ? 'rgba(34,197,94,0.1)' : 'var(--bg)', color: copied ? 'var(--success, #22c55e)' : 'var(--accent)' }}>
                                {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy XML</>}
                            </motion.button>
                        </div>
                        <div className="p-4 max-h-96 overflow-auto">
                            <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                {data.xml ?? ''}
                            </pre>
                        </div>
                    </motion.div>

                    {/* Copyable Sitemap URL */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        className="mt-6 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                        style={{ backgroundColor: 'var(--surface)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Live sitemap URL</p>
                            <p className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>{sitemapUrl}</p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={copySitemapUrl}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold shrink-0"
                            style={{ backgroundColor: urlCopied ? 'rgba(34,197,94,0.2)' : 'var(--accent-subtle)', color: urlCopied ? 'var(--success, #22c55e)' : 'var(--accent)' }}
                        >
                            {urlCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy URL</>}
                        </motion.button>
                    </motion.div>
                </>
            )}
        </motion.div>
    );
}
