'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText, FileStack, FolderOpen, Tag, MessageCircle, HelpCircle,
  ArrowRight, PenLine, CheckCircle, Clock, List,
} from 'lucide-react';
import api from '@/lib/api';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  href: string;
  trend?: string;
}

interface ContentDashboardStats {
  totalPosts: number;
  draftPosts: number;
  publishedPosts: number;
  totalPages: number;
  totalCategories: number;
  totalTags: number;
  pendingComments: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const defaultStats: ContentDashboardStats = {
  totalPosts: 0,
  draftPosts: 0,
  publishedPosts: 0,
  totalPages: 0,
  totalCategories: 0,
  totalTags: 0,
  pendingComments: 0,
};

export default function ContentOverviewPage() {
  const [stats, setStats] = useState<ContentDashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: ContentDashboardStats }>('/content/dashboard')
      .then(({ data }) => {
        setStats(data.data ?? defaultStats);
      })
      .catch(() => {
        setStats(defaultStats);
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards: StatCard[] = [
    {
      label: 'Total Posts',
      value: loading ? '—' : stats.totalPosts,
      icon: <FileText size={20} />,
      color: 'var(--accent)',
      bg: 'var(--accent-subtle)',
      href: '/dashboard/posts',
      trend: 'Manage posts',
    },
    {
      label: 'Drafts',
      value: loading ? '—' : stats.draftPosts,
      icon: <PenLine size={20} />,
      color: 'var(--warning)',
      bg: 'var(--warning-subtle)',
      href: '/dashboard/posts',
      trend: 'Continue editing',
    },
    {
      label: 'Published',
      value: loading ? '—' : stats.publishedPosts,
      icon: <CheckCircle size={20} />,
      color: 'var(--success)',
      bg: 'var(--success-subtle)',
      href: '/dashboard/posts',
      trend: 'View live',
    },
    {
      label: 'Pages',
      value: loading ? '—' : stats.totalPages,
      icon: <FileStack size={20} />,
      color: 'var(--info)',
      bg: 'var(--info-subtle)',
      href: '/dashboard/pages',
      trend: 'Manage pages',
    },
    {
      label: 'Categories',
      value: loading ? '—' : stats.totalCategories,
      icon: <FolderOpen size={20} />,
      color: 'var(--accent)',
      bg: 'var(--accent-subtle)',
      href: '/dashboard/categories',
      trend: 'Organize',
    },
    {
      label: 'Tags',
      value: loading ? '—' : stats.totalTags,
      icon: <Tag size={20} />,
      color: 'var(--text-secondary)',
      bg: 'var(--surface-muted)',
      href: '/dashboard/tags',
      trend: 'Manage tags',
    },
    {
      label: 'Pending Comments',
      value: loading ? '—' : stats.pendingComments,
      icon: <MessageCircle size={20} />,
      color: stats.pendingComments > 0 ? 'var(--warning)' : 'var(--text-muted)',
      bg: stats.pendingComments > 0 ? 'var(--warning-subtle)' : 'var(--surface-muted)',
      href: '/dashboard/comments',
      trend: 'Moderate',
    },
  ];

  const quickActions = [
    { label: 'Posts', icon: <FileText size={16} />, href: '/dashboard/posts', color: 'var(--accent)' },
    { label: 'Pages', icon: <FileStack size={16} />, href: '/dashboard/pages', color: 'var(--info)' },
    { label: 'Categories', icon: <FolderOpen size={16} />, href: '/dashboard/categories', color: 'var(--warning)' },
    { label: 'Tags', icon: <Tag size={16} />, href: '/dashboard/tags', color: 'var(--text-muted)' },
    { label: 'Comments', icon: <MessageCircle size={16} />, href: '/dashboard/comments', color: 'var(--success)' },
    { label: 'FAQ', icon: <HelpCircle size={16} />, href: '/dashboard/faq', color: 'var(--accent)' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div {...fadeUp}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Content Overview
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage posts, pages, categories, tags &amp; comments
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
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
            {quickActions.map((action, i) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-[var(--surface-muted)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <span style={{ color: action.color }}>{action.icon}</span>
                <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {action.label}
                </span>
                <ArrowRight size={12} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Placeholder for recent activity or tips */}
        <motion.div
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <List size={16} style={{ color: 'var(--accent)' }} />
            Content Module
          </h2>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Use <strong>Posts</strong> to create and publish blog articles. <strong>Pages</strong> are for static
            content with dynamic sections. <strong>Categories</strong> and <strong>Tags</strong> help organize content.
            Moderate <strong>Comments</strong> and manage <strong>FAQ</strong> entries from the links above.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
