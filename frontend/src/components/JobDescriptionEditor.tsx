'use client';

import React, { useRef, useCallback, useState } from 'react';
import { Sparkles, Loader2, Type, Zap, Maximize2, Minimize2, CornerDownRight } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';

type AiAction = 'grammar' | 'improve' | 'expand' | 'shorten' | 'continue';

const ACTIONS: { key: AiAction; label: string; icon: React.ReactNode }[] = [
  { key: 'grammar', label: 'Fix grammar', icon: <Type size={12} /> },
  { key: 'improve', label: 'Improve', icon: <Sparkles size={12} /> },
  { key: 'expand', label: 'Expand', icon: <Maximize2 size={12} /> },
  { key: 'shorten', label: 'Shorten', icon: <Minimize2 size={12} /> },
  { key: 'continue', label: 'Continue (Tab)', icon: <CornerDownRight size={12} /> },
];

interface JobDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  disabled?: boolean;
  inputStyle?: React.CSSProperties;
}

export function JobDescriptionEditor({
  value,
  onChange,
  placeholder = 'Describe the role, responsibilities, requirements, and benefits…',
  rows = 10,
  error,
  disabled,
  inputStyle = {},
}: JobDescriptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [aiLoading, setAiLoading] = useState<AiAction | null>(null);

  const runAi = useCallback(
    async (action: AiAction) => {
      const text = value.trim();
      if (!text && action !== 'continue') {
        toast.error('Add some text first');
        return;
      }
      const inputText = text || 'Write a professional job description opening for a technology role.';
      setAiLoading(action);
      try {
        const { data } = await api.post<{ data?: { text?: string } }>('/jobs/ai-refine', {
          action,
          text: inputText,
        });
        const result = data?.data?.text ?? '';
        if (action === 'continue') {
          const ta = textareaRef.current;
          if (ta && text) {
            const start = ta.selectionStart;
            const before = text.slice(0, start);
            const after = text.slice(start);
            onChange(before + (before.endsWith(' ') ? '' : ' ') + result + (after ? ' ' : '') + after);
          } else {
            onChange((text ? text + '\n\n' : '') + result);
          }
        } else {
          onChange(result);
        }
        toast.success('Done');
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(msg || 'AI refinement failed');
      } finally {
        setAiLoading(null);
      }
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        runAi('continue');
      }
    },
    [runAi]
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          AI helper:
        </span>
        {ACTIONS.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => runAi(key)}
            disabled={disabled || aiLoading !== null}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--surface-muted)',
            }}
            title={key === 'continue' ? 'Press Tab to continue' : label}
          >
            {aiLoading === key ? <Loader2 size={12} className="animate-spin" /> : icon}
            {label}
          </button>
        ))}
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Tab = suggest continuation
        </span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none resize-y"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: error ? 'var(--error)' : 'var(--border)',
          color: 'var(--text-primary)',
          ...inputStyle,
        }}
      />
      {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  );
}
