'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Briefcase, MapPin, Clock, FileText, Globe } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/lib/api';

interface FormState {
  title: string;
  department: string;
  location: string;
  type: 'remote' | 'onsite' | 'hybrid';
  experienceLevel: string;
  status: 'active' | 'draft';
  description: string;
}

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Marketing', 'Sales',
  'HR', 'Finance', 'Operations', 'Customer Success', 'Legal',
];

const EXPERIENCE_LEVELS = ['Entry Level', 'Mid Level', 'Senior Level', 'Lead', 'Manager', 'Director', 'C-Suite'];

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: '', department: '', location: '', type: 'onsite',
    experienceLevel: '', status: 'draft', description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await api.post('/hr/jobs', form);
      toast.success('Job posting created!');
      router.push('/dashboard/hr/recruitment/jobs');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasError?: string) => ({
    backgroundColor: 'var(--surface)',
    borderColor: hasError ? 'var(--error)' : 'var(--border)',
    color: 'var(--text-primary)',
  });

  return (
    <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/hr/recruitment/jobs"
          className="p-2 rounded-xl border transition-all hover:bg-[var(--surface-muted)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Post New Job</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Create a new job posting</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="rounded-2xl border p-6 space-y-5"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Job Details
          </p>

          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Briefcase size={13} style={{ color: 'var(--text-muted)' }} />
              Job Title <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none"
              style={inputStyle(errors.title)}
            />
            {errors.title && <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{errors.title}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Department
              </label>
              <select
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none cursor-pointer"
                style={inputStyle()}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <MapPin size={13} style={{ color: 'var(--text-muted)' }} /> Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g. New York, NY"
                className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none"
                style={inputStyle()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Globe size={13} style={{ color: 'var(--text-muted)' }} /> Work Type
              </label>
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value as FormState['type'])}
                className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none cursor-pointer"
                style={inputStyle()}
              >
                <option value="onsite">Onsite</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Clock size={13} style={{ color: 'var(--text-muted)' }} /> Experience Level
              </label>
              <select
                value={form.experienceLevel}
                onChange={(e) => handleChange('experienceLevel', e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none cursor-pointer"
                style={inputStyle()}
              >
                <option value="">Select level</option>
                {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Publish Status
            </label>
            <div className="flex gap-3">
              {(['draft', 'active'] as const).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
                  style={{
                    borderColor: form.status === s ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: form.status === s ? 'var(--accent-subtle)' : 'transparent',
                    color: form.status === s ? 'var(--accent-text)' : 'var(--text-secondary)',
                  }}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={() => handleChange('status', s)}
                    className="hidden"
                  />
                  {s === 'draft' ? 'Save as Draft' : 'Publish Now'}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6 space-y-3"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <label className="block text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <FileText size={13} style={{ color: 'var(--text-muted)' }} />
            Job Description <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the role, responsibilities, requirements, and benefits…"
            rows={10}
            className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none resize-y"
            style={inputStyle(errors.description)}
          />
          {errors.description && <p className="text-xs" style={{ color: 'var(--error)' }}>{errors.description}</p>}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/hr/recruitment/jobs"
            className="px-4 py-2.5 text-sm font-medium rounded-xl border transition-all hover:bg-[var(--surface-muted)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-all disabled:opacity-50 cursor-pointer hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Save size={14} />
            {submitting ? 'Publishing…' : form.status === 'active' ? 'Publish Job' : 'Save Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
