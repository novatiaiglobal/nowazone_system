'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, X, User, Mail, Phone, Building2, Briefcase, Calendar, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/lib/api';

interface FormState {
  name: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  employeeId: string;
  startDate: string;
  status: 'active' | 'inactive' | 'on_leave';
}

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Marketing', 'Sales',
  'HR', 'Finance', 'Operations', 'Customer Success', 'Legal',
];

function Field({
  label, icon, required, error, children,
}: { label: string; icon: React.ReactNode; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {icon && <span className="inline-flex align-middle mr-1.5" style={{ color: 'var(--text-muted)' }}>{icon}</span>}
        {label}{required && <span style={{ color: 'var(--error)' }}> *</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>{error}</p>}
    </div>
  );
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', department: '', jobTitle: '',
    employeeId: '', startDate: '', status: 'active',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5 MB'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (photoFile) formData.append('photo', photoFile);
      await api.post('/hr/employees', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Employee created successfully');
      router.push('/dashboard/hr/employees');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create employee');
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/hr/employees"
          className="p-2 rounded-xl border transition-all hover:bg-[var(--surface-muted)] cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Add Employee</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Create a new employee record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className="rounded-2xl border p-6 space-y-6"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* Photo Upload */}
          <div className="flex items-start gap-5">
            <div
              className="relative w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-dashed"
              style={{ borderColor: 'var(--accent-border)', backgroundColor: 'var(--surface-muted)' }}
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </>
              ) : (
                <Upload size={20} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Profile Photo</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>JPEG or PNG, max 5 MB</p>
              <label
                className="mt-2 inline-block cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:bg-[var(--surface-muted)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Choose File
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
              </label>
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
              Personal Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Field label="Full Name" icon={<User size={13} />} required error={errors.name}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all"
                  style={inputStyle(errors.name)}
                />
              </Field>
              <Field label="Email" icon={<Mail size={13} />} required error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all"
                  style={inputStyle(errors.email)}
                />
              </Field>
              <Field label="Phone" icon={<Phone size={13} />}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 555 0100"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all"
                  style={inputStyle()}
                />
              </Field>
              <Field label="Employee ID" icon={<User size={13} />}>
                <input
                  type="text"
                  value={form.employeeId}
                  onChange={(e) => handleChange('employeeId', e.target.value)}
                  placeholder="EMP-0001"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all"
                  style={inputStyle()}
                />
              </Field>
            </div>
          </div>

          {/* Job Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
              Job Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Field label="Department" icon={<Building2 size={13} />}>
                <select
                  value={form.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none cursor-pointer"
                  style={inputStyle()}
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Job Title" icon={<Briefcase size={13} />}>
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => handleChange('jobTitle', e.target.value)}
                  placeholder="Software Engineer"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all"
                  style={inputStyle()}
                />
              </Field>
              <Field label="Start Date" icon={<Calendar size={13} />}>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all"
                  style={inputStyle()}
                />
              </Field>
              <Field label="Status" icon={<User size={13} />}>
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value as FormState['status'])}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border outline-none cursor-pointer"
                  style={inputStyle()}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 mt-4">
          <Link
            href="/dashboard/hr/employees"
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
            {submitting ? 'Saving…' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
