'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Eye, Copy, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';

/* ═══════════════════════════════════════════════════════════════
   ANIMATION PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
};

interface Page {
  _id: string;
  title: string;
  slug: string;
  template: string;
  status: 'draft' | 'published' | 'archived';
  author: { _id: string; name: string };
  sections: unknown[];
  views: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: 'var(--surface-muted)', text: 'var(--text-muted)', border: 'var(--border)' },
  published: { bg: 'rgba(5,150,105,0.12)', text: 'var(--success)', border: 'rgba(5,150,105,0.3)' },
  archived: { bg: 'rgba(225,29,72,0.12)', text: 'var(--error)', border: 'rgba(225,29,72,0.3)' },
};

export default function PagesListPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pages');
      setPages(response.data.data || response.data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to fetch pages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      await api.delete(`/pages/${id}`);
      toast.success('Page deleted successfully');
      fetchPages();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete page');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/pages/${id}/duplicate`);
      toast.success('Page duplicated successfully');
      fetchPages();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to duplicate page');
    }
  };

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ backgroundColor: 'var(--bg)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-t-transparent rounded-full"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading pages...
        </motion.p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 260, damping: 24 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <motion.div
                className="p-2 rounded-xl"
                style={{ backgroundColor: 'var(--accent-subtle)' }}
                whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                transition={{ duration: 0.4 }}
              >
                <FileText size={22} style={{ color: 'var(--accent)' }} />
              </motion.div>
              Pages
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Build dynamic pages with sections
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link href="/dashboard/pages/new">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer text-white" style={{ backgroundColor: 'var(--accent)' }}>
                <Plus size={18} />
                New Page
              </button>
            </Link>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl placeholder-gray-500 focus:outline-none"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        {filteredPages.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16 border rounded-2xl border-dashed"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No pages found</p>
          </motion.div>
        ) : (
          <motion.div key="list" variants={stagger} initial="hidden" animate="show" className="space-y-4">
            {filteredPages.map((page) => (
              <motion.div
                key={page._id}
                variants={fadeUp}
                layout
                whileHover={{ y: -2, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.995 }}
                className="border rounded-xl p-6 cursor-default"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{page.title}</h3>
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium border"
                        style={{
                          backgroundColor: STATUS_STYLES[page.status]?.bg || 'var(--surface-muted)',
                          color: STATUS_STYLES[page.status]?.text || 'var(--text-muted)',
                          borderColor: STATUS_STYLES[page.status]?.border || 'var(--border)',
                        }}
                      >
                        {page.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                      <span>Template: {page.template}</span>
                      <span>•</span>
                      <span>{page.sections.length} sections</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye size={14} />
                        {page.views} views
                      </span>
                      <span>•</span>
                      <span>By {page.author?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDuplicate(page._id)}
                      className="p-2 rounded-lg transition-colors cursor-pointer"
                      style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                      title="Duplicate"
                    >
                      <Copy size={18} />
                    </motion.button>
                    <Link href={`/dashboard/pages/${page._id}/edit`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-lg transition-colors cursor-pointer"
                        style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}
                        title="Edit"
                      >
                        <Edit size={18} />
                      </motion.button>
                    </Link>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(page._id)}
                      className="p-2 rounded-lg transition-colors cursor-pointer"
                      style={{ backgroundColor: 'rgba(225,29,72,0.1)', color: 'var(--error)' }}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
