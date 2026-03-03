'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Save, Eye, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import RichTextEditor, { RichTextEditorHandle } from '@/components/RichTextEditor';
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
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
};

export default function NewPostPage() {
  const router = useRouter();
  const editorRef = useRef<RichTextEditorHandle>(null);
  const contentRef = useRef('');
  const [loading, setLoading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    status: 'draft',
    featuredImage: {
      url: '',
      alt: '',
      caption: '',
    },
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: [] as string[],
    },
  });

  const handleContentChange = useCallback((content: string) => {
    contentRef.current = content;
  }, []);

  useEffect(() => {
    return () => {
      if (thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const handleSubmit = async (status: string) => {
    const errors = [];
    if (!formData.title || formData.title.trim() === '') errors.push('Title');
    const currentContent = contentRef.current;
    if (!currentContent || currentContent === '<p></p>' || currentContent.trim() === '') errors.push('Content');
    if (!thumbnailFile && !formData.featuredImage.url) errors.push('Thumbnail');
    if (errors.length > 0) {
      toast.error(`${errors.join(' and ')} ${errors.length > 1 ? 'are' : 'is'} required`);
      return;
    }
    try {
      setLoading(true);
      setThumbnailUploading(true);
      let thumbnailUrl = formData.featuredImage.url;

      if (thumbnailFile) {
        const thumbnailPayload = new FormData();
        thumbnailPayload.append('file', thumbnailFile);
        const thumbnailRes = await api.post('/upload/file', thumbnailPayload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        thumbnailUrl = thumbnailRes.data?.data?.url;
        if (!thumbnailUrl) throw new Error('Thumbnail upload failed');
      }

      let content = currentContent;
      const localFiles = editorRef.current?.getLocalFiles() || [];
      for (const { url, file, type } of localFiles) {
        const formDataFile = new FormData();
        formDataFile.append('file', file);
        const response = await api.post('/upload/file', formDataFile, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const cloudUrl = response.data.data.url;
        if (type === 'image' || type === 'video') {
          content = content.replaceAll(url, cloudUrl);
        }
      }

      const submitData = {
        title: formData.title.trim(),
        content,
        excerpt: formData.excerpt?.trim() || '',
        status: status,
        featuredImage: {
          url: thumbnailUrl,
          alt: formData.featuredImage.alt?.trim() || '',
          caption: formData.featuredImage.caption?.trim() || '',
        },
        seo: {
          metaTitle: formData.seo.metaTitle?.trim() || '',
          metaDescription: formData.seo.metaDescription?.trim() || '',
          keywords: formData.seo.keywords.filter((k) => k.trim() !== ''),
        },
      };
      await api.post('/posts', submitData);
      toast.success(`Post ${status === 'published' ? 'published' : 'saved'} successfully`);
      router.push('/dashboard/posts');
    } catch (error: any) {
      console.error('Post creation error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save post');
    } finally {
      setThumbnailUploading(false);
      setLoading(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
      const previewUrl = URL.createObjectURL(file);
      setThumbnailFile(file);
      setThumbnailPreview(previewUrl);
      setFormData((prev) => ({
        ...prev,
        featuredImage: {
          ...prev.featuredImage,
          url: '',
          alt: prev.featuredImage.alt || prev.title || 'Post thumbnail',
        },
      }));
      toast.success('Thumbnail selected. It will upload on Save/Publish.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Thumbnail preview failed');
    } finally {
      e.target.value = '';
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--bg)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  };
  const focusRing = { outline: 'none', borderColor: 'var(--accent-border)' };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* ═══════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 260, damping: 24 }}
        className="mb-8"
      >
        <motion.div whileHover={{ x: -4 }} className="mb-4">
          <Link
            href="/dashboard/posts"
            className="flex items-center gap-2 text-sm cursor-pointer transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={18} />
            Back to Posts
          </Link>
        </motion.div>
        <div className="flex items-center justify-between flex-wrap gap-4">
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
              Create New Post
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Write and publish your blog content
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Save size={18} />
              Save Draft
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSubmit('published')}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer disabled:opacity-50 text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Eye size={18} />
              Publish
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={fadeUp}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Title <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter post title..."
              className="w-full px-4 py-3 border rounded-xl text-xl font-semibold focus:outline-none placeholder-gray-500"
              style={{ ...inputStyle } as React.CSSProperties}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Excerpt
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Brief summary of your post..."
              rows={3}
              className="w-full px-4 py-3 border rounded-xl resize-none focus:outline-none placeholder-gray-500"
              style={{ ...inputStyle } as React.CSSProperties}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Content <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <RichTextEditor
              ref={editorRef}
              initialContent=""
              onChange={handleContentChange}
              placeholder="Start writing your post content..."
            />
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <motion.div
            variants={fadeUp}
            className="border rounded-xl p-6"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              SEO Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.seo.metaTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, seo: { ...formData.seo, metaTitle: e.target.value } })
                  }
                  placeholder="SEO title..."
                  className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none placeholder-gray-500"
                  style={{ ...inputStyle } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Meta Description
                </label>
                <textarea
                  value={formData.seo.metaDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, seo: { ...formData.seo, metaDescription: e.target.value } })
                  }
                  placeholder="SEO description..."
                  rows={3}
                  className="w-full px-3 py-2.5 border rounded-xl text-sm resize-none focus:outline-none placeholder-gray-500"
                  style={{ ...inputStyle } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.seo.keywords.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seo: {
                        ...formData.seo,
                        keywords: e.target.value
                          .split(',')
                          .map((k) => k.trim())
                          .filter((k) => k),
                      },
                    })
                  }
                  placeholder="keyword1, keyword2, keyword3"
                  className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none placeholder-gray-500"
                  style={{ ...inputStyle } as React.CSSProperties}
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="border rounded-xl p-6"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Publishing
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Thumbnail <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div
                  className="relative w-full h-40 rounded-xl border mb-2 overflow-hidden"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-muted)' }}
                >
                  {(thumbnailPreview || formData.featuredImage.url) ? (
                    <img
                      src={thumbnailPreview || formData.featuredImage.url}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      No thumbnail selected
                    </div>
                  )}
                  {thumbnailUploading && (
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          className="w-10 h-10 border-4 border-t-transparent rounded-full"
                          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                        />
                        <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--accent)' }}>
                          Uploading thumbnail...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="w-full px-3 py-2 border rounded-xl text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:font-semibold file:cursor-pointer file:text-white file:bg-[var(--accent)]"
                  style={{
                    ...inputStyle,
                  } as React.CSSProperties}
                />
                <input
                  type="text"
                  value={formData.featuredImage.alt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      featuredImage: { ...prev.featuredImage, alt: e.target.value },
                    }))
                  }
                  placeholder="Thumbnail alt text"
                  className="mt-2 w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none placeholder-gray-500"
                  style={{ ...inputStyle } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none cursor-pointer"
                  style={{ ...inputStyle } as React.CSSProperties}
                >
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
