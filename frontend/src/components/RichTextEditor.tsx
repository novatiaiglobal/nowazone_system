'use client';

import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Undo, Redo, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, X, Upload, Globe
} from 'lucide-react';

import React, { useImperativeHandle, forwardRef, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface RichTextEditorHandle {
  getLocalFiles: () => { url: string; file: File; type: 'image' | 'video' }[];
}

interface RichTextEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditorImpl({ initialContent, onChange, placeholder }, ref) {
  const [isMounted, setIsMounted] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploadType, setImageUploadType] = useState<'url' | 'file'>('url');
  const [uploading, setUploading] = useState(false);
  // Keep local files in a ref so editor doesn't re-render (image blinking).
  const localFilesRef = useRef<{ url: string; file: File; type: 'image' | 'video' }[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-cyan-400 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          loading: 'eager',
          decoding: 'sync',
          draggable: 'false',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your content...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] max-h-[600px] overflow-y-auto px-6 py-4',
      },
    },
  }, []);

  // Expose getLocalFiles to parent via ref — must be called before any early returns
  useImperativeHandle(ref, () => ({
    getLocalFiles: () => localFilesRef.current,
  }), []);

  // Don't render on server-side
  if (!isMounted) {
    return (
      <div className="border border-[#1a3d3d] rounded-lg overflow-hidden bg-[#0f2626] min-h-[400px] flex items-center justify-center">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  const handleAddLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkModal(false);
    }
  };

  const handleAddImageFromUrl = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageModal(false);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        localFilesRef.current.push({ url, file, type });
        if (type === 'image') {
          editor.chain().focus().setImage({ src: url }).run();
        } else if (type === 'video') {
          editor.chain().focus().insertContent(`<video controls src="${url}" style="max-width:100%;height:auto;"></video>`).run();
        }
        setShowImageModal(false);
      } catch (error) {
        console.error('File preview failed:', error);
        alert('Failed to preview file. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  return (
      <>
        <div className="border border-[#1a3d3d] rounded-lg overflow-hidden bg-[#0f2626]">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[#1a3d3d] bg-[#0a1a1a]">
            {/* Text Formatting */}
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('bold') ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Bold"
              type="button"
            >
              <Bold size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('italic') ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Italic"
              type="button"
            >
              <Italic size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('underline') ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Underline"
              type="button"
            >
              <UnderlineIcon size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('strike') ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Strikethrough"
              type="button"
            >
              <Strikethrough size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('code') ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Code"
              type="button"
            >
              <Code size={18} />
            </button>

            <div className="w-px h-6 bg-[#1a3d3d] mx-1" />

            {/* Headings */}
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('heading', { level: 1 }) ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Heading 1"
              type="button"
            >
              <Heading1 size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('heading', { level: 2 }) ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Heading 2"
              type="button"
            >
              <Heading2 size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('heading', { level: 3 }) ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Heading 3"
              type="button"
            >
              <Heading3 size={18} />
            </button>

            <div className="w-px h-6 bg-[#1a3d3d] mx-1" />

            {/* Lists */}
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('bulletList') ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Bullet List"
              type="button"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('orderedList') ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Numbered List"
              type="button"
            >
              <ListOrdered size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('blockquote') ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Quote"
              type="button"
            >
              <Quote size={18} />
            </button>

            <div className="w-px h-6 bg-[#1a3d3d] mx-1" />

            {/* Alignment */}
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Align Left"
              type="button"
            >
              <AlignLeft size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Align Center"
              type="button"
            >
              <AlignCenter size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Align Right"
              type="button"
            >
              <AlignRight size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive({ textAlign: 'justify' }) ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Justify"
              type="button"
            >
              <AlignJustify size={18} />
            </button>

            <div className="w-px h-6 bg-[#1a3d3d] mx-1" />

            {/* Insert */}
            <button
              onClick={() => setShowLinkModal(true)}
              className={`p-2 rounded hover:bg-[#0f2626] transition-colors ${
                editor.isActive('link') ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400'
              }`}
              title="Add Link"
              type="button"
            >
              <LinkIcon size={18} />
            </button>
            <button
              onClick={() => setShowImageModal(true)}
              className="p-2 rounded hover:bg-[#0f2626] transition-colors text-gray-400"
              title="Add Image"
              type="button"
            >
              <ImageIcon size={18} />
            </button>

            <div className="w-px h-6 bg-[#1a3d3d] mx-1" />

            {/* Undo/Redo */}
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 rounded hover:bg-[#0f2626] transition-colors text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
              type="button"
            >
              <Undo size={18} />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 rounded hover:bg-[#0f2626] transition-colors text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo"
              type="button"
            >
              <Redo size={18} />
            </button>
          </div>

          {/* Editor */}
          <EditorContent editor={editor} />
        </div>

      {/* Link Modal */}
        <AnimatePresence>
          {showLinkModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0f2626] border border-[#1a3d3d] rounded-lg p-6 w-full max-w-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Add Link</h3>
                  <button
                    onClick={() => setShowLinkModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                    type="button"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      URL
                    </label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2.5 bg-[#0a1a1a] border border-[#1a3d3d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLink();
                        }
                      }}
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLinkModal(false)}
                      className="flex-1 px-4 py-2.5 bg-[#0a1a1a] hover:bg-[#1a3d3d] text-white rounded-lg font-semibold transition-colors"
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddLink}
                      className="flex-1 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-500 text-slate-900 rounded-lg font-semibold transition-colors"
                      type="button"
                    >
                      Add Link
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      {/* Image Modal */}
        <AnimatePresence>
          {showImageModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0f2626] border border-[#1a3d3d] rounded-lg p-6 w-full max-w-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Add Image</h3>
                  <button
                    onClick={() => setShowImageModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                    type="button"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setImageUploadType('url')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                        imageUploadType === 'url'
                          ? 'bg-cyan-400 text-slate-900'
                          : 'bg-[#0a1a1a] text-gray-400 hover:text-white'
                      }`}
                      type="button"
                    >
                      <Globe size={18} />
                      From URL
                    </button>
                    <button
                      onClick={() => setImageUploadType('file')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                        imageUploadType === 'file'
                          ? 'bg-cyan-400 text-slate-900'
                          : 'bg-[#0a1a1a] text-gray-400 hover:text-white'
                      }`}
                      type="button"
                    >
                      <Upload size={18} />
                      From File
                    </button>
                  </div>

                  {imageUploadType === 'url' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Image URL
                      </label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-2.5 bg-[#0a1a1a] border border-[#1a3d3d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddImageFromUrl();
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  )}

                  {imageUploadType === 'file' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Choose Image File
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleImageFileUpload}
                        disabled={uploading}
                        className="w-full px-4 py-2.5 bg-[#0a1a1a] border border-[#1a3d3d] rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:text-slate-900 file:font-semibold hover:file:bg-cyan-500 file:cursor-pointer disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Supported formats: JPG, PNG, GIF, WebP, MP4, MOV, AVI, WEBM
                      </p>
                      {uploading && (
                        <div className="text-cyan-400 text-sm mt-2">Uploading...</div>
                      )}
                    </div>
                  )}

                  {imageUploadType === 'url' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowImageModal(false)}
                        className="flex-1 px-4 py-2.5 bg-[#0a1a1a] hover:bg-[#1a3d3d] text-white rounded-lg font-semibold transition-colors"
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddImageFromUrl}
                        className="flex-1 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-500 text-slate-900 rounded-lg font-semibold transition-colors"
                        type="button"
                      >
                        Add Image
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }
);

export default memo(RichTextEditor);
