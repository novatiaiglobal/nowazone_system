'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Save, Eye, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';

const templates = [
  { value: 'blank', label: 'Blank Page' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'about', label: 'About Page' },
  { value: 'services', label: 'Services Page' },
  { value: 'contact', label: 'Contact Page' },
];

export default function NewPageBuilderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    template: 'blank',
    status: 'draft',
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: [] as string[],
    },
  });

  const handleSubmit = async (status: string) => {
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }

    try {
      setLoading(true);
      await api.post('/pages', { 
        ...formData, 
        status,
        sections: [] // Start with empty sections
      });
      toast.success(`Page ${status === 'published' ? 'published' : 'saved'} successfully`);
      router.push('/dashboard/pages');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1a1a] p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/pages">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={18} />
            Back to Pages
          </button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Create New Page</h1>
            <p className="text-gray-400 text-sm">Build dynamic pages with sections</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#0f2626] hover:bg-[#1a3d3d] text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              Save Draft
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSubmit('published')}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-cyan-400 hover:bg-cyan-500 text-slate-900 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              <Eye size={18} />
              Publish
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-[#0f2626] border border-[#1a3d3d] rounded-lg p-8">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Page Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter page title..."
                className="w-full px-4 py-3 bg-[#0a1a1a] border border-[#1a3d3d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 text-xl font-semibold"
              />
            </div>

            {/* Template */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Template
              </label>
              <select
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                className="w-full px-4 py-3 bg-[#0a1a1a] border border-[#1a3d3d] rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
              >
                {templates.map(template => (
                  <option key={template.value} value={template.value}>
                    {template.label}
                  </option>
                ))}
              </select>
            </div>

            {/* SEO Settings */}
            <div className="pt-6 border-t border-[#1a3d3d]">
              <h3 className="text-lg font-semibold text-white mb-4">SEO Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData.seo.metaTitle}
                    onChange={(e) => setFormData({
                      ...formData,
                      seo: { ...formData.seo, metaTitle: e.target.value }
                    })}
                    placeholder="SEO title..."
                    className="w-full px-4 py-2.5 bg-[#0a1a1a] border border-[#1a3d3d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.seo.metaDescription}
                    onChange={(e) => setFormData({
                      ...formData,
                      seo: { ...formData.seo, metaDescription: e.target.value }
                    })}
                    placeholder="SEO description..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[#0a1a1a] border border-[#1a3d3d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.seo.keywords.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      seo: { 
                        ...formData.seo, 
                        keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                      }
                    })}
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full px-4 py-2.5 bg-[#0a1a1a] border border-[#1a3d3d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50"
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-lg p-4">
              <p className="text-cyan-400 text-sm">
                <strong>Note:</strong> After creating the page, you'll be able to add and customize sections using the page builder.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
