'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, ListTodo, Plus, RefreshCw, AlertTriangle, Users, Pencil, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  reminderAt?: string;
  assignedTo?: { _id: string; name: string; email: string };
  createdBy?: { _id: string; name: string };
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

const STATUS_STYLES: Record<TaskStatus, { bg: string; border: string; text: string }> = {
  todo: { bg: 'var(--surface-muted)', border: 'var(--border)', text: 'var(--text-muted)' },
  in_progress: { bg: 'var(--accent-subtle)', border: 'var(--accent-border)', text: 'var(--accent-text)' },
  done: { bg: 'var(--success-subtle)', border: 'rgba(5,150,105,0.3)', text: 'var(--success)' },
  blocked: { bg: 'var(--error-subtle)', border: 'rgba(225,29,72,0.3)', text: 'var(--error)' },
};

const PRIORITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  low: { bg: 'var(--surface-muted)', border: 'var(--border)', text: 'var(--text-muted)' },
  medium: { bg: 'var(--warning-subtle)', border: 'rgba(180,83,9,0.3)', text: 'var(--warning)' },
  high: { bg: 'var(--accent-subtle)', border: 'var(--accent-border)', text: 'var(--accent-text)' },
  urgent: { bg: 'var(--error-subtle)', border: 'rgba(225,29,72,0.3)', text: 'var(--error)' },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'my' | 'team'>('my');
  const [stats, setStats] = useState({ todo: 0, inProgress: 0, done: 0, overdue: 0 });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    reminderAt: '',
    assignedTo: '',
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRes, statsRes] = await Promise.all([
        api.get(`/tasks?scope=${scope}`),
        api.get(`/tasks/stats?scope=${scope}`),
      ]);
      setTasks(taskRes.data.data?.tasks || []);
      setStats(statsRes.data.data || { todo: 0, inProgress: 0, done: 0, overdue: 0 });
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    api.get('/tasks/users')
      .then((res) => setUsers(res.data.data?.users || []))
      .catch(() => setUsers([]));
  }, []);

  const grouped = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      done: tasks.filter((t) => t.status === 'done'),
      blocked: tasks.filter((t) => t.status === 'blocked'),
    };
  }, [tasks]);

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await api.post('/tasks', {
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        reminderAt: form.reminderAt ? new Date(form.reminderAt).toISOString() : undefined,
        assignedTo: form.assignedTo || undefined,
      });
      toast.success('Task created');
      setForm({ title: '', description: '', priority: 'medium', dueDate: '', reminderAt: '', assignedTo: '' });
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (task: Task) => {
    setEditTaskId(task._id);
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
      reminderAt: task.reminderAt ? new Date(task.reminderAt).toISOString().slice(0, 16) : '',
      assignedTo: task.assignedTo?._id || '',
    });
  };

  const cancelEdit = () => {
    setEditTaskId(null);
    setForm({ title: '', description: '', priority: 'medium', dueDate: '', reminderAt: '', assignedTo: '' });
  };

  const updateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTaskId) return;
    setUpdating(true);
    try {
      await api.patch(`/tasks/${editTaskId}`, {
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        reminderAt: form.reminderAt ? new Date(form.reminderAt).toISOString() : undefined,
        assignedTo: form.assignedTo || undefined,
      });
      toast.success('Task updated');
      cancelEdit();
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    } finally {
      setUpdating(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast.success('Task deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const updateStatus = async (task: Task, status: TaskStatus) => {
    try {
      await api.patch(`/tasks/${task._id}`, { status });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status } : t)));
      if (status === 'done') toast.success('Task completed');
    } catch {
      toast.error('Failed to update task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-t-transparent rounded-full"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 260, damping: 24 }}
        className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-subtle)' }}><ListTodo size={22} style={{ color: 'var(--accent)' }} /></div>
            Todo & Task Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Assign tasks, track deadlines, and receive reminder alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScope('my')}
            className={`px-3 py-2 rounded-xl text-xs border cursor-pointer`}
            style={scope === 'my'
              ? { backgroundColor: 'var(--accent-subtle)', borderColor: 'var(--accent-border)', color: 'var(--accent-text)' }
              : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            My Tasks
          </button>
          <button
            onClick={() => setScope('team')}
            className={`px-3 py-2 rounded-xl text-xs border cursor-pointer`}
            style={scope === 'team'
              ? { backgroundColor: 'var(--accent-subtle)', borderColor: 'var(--accent-border)', color: 'var(--accent-text)' }
              : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <Users size={12} className="inline mr-1" /> Team
          </button>
          <motion.button
            onClick={fetchTasks}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="px-3 py-2 rounded-xl text-xs border cursor-pointer"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={12} />
          </motion.button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Todo', value: stats.todo, icon: Clock3, color: 'var(--text-muted)' },
          { label: 'In Progress', value: stats.inProgress, icon: RefreshCw, color: 'var(--accent-text)' },
          { label: 'Done', value: stats.done, icon: CheckCircle2, color: 'var(--success)' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'var(--error)' },
        ].map((item) => (
          <motion.div key={item.label}
            whileHover={{ scale: 1.03, y: -3, transition: { type: 'spring' as const, stiffness: 400, damping: 18 } }}
            whileTap={{ scale: 0.98 }}
            className="border rounded-xl p-4 transition-shadow cursor-pointer"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
            <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <form onSubmit={createTask} className="border rounded-2xl p-4 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus size={14} style={{ color: 'var(--accent)' }} /> New Task</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Task title"
            className="px-3 py-2.5 border rounded-xl text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            required
          />
          <select
            value={form.priority}
            onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
            className="px-3 py-2.5 border rounded-xl text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent Priority</option>
          </select>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description"
            className="md:col-span-2 px-3 py-2.5 border rounded-xl text-sm focus:outline-none min-h-[70px]"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <input
            type="datetime-local"
            value={form.dueDate}
            onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
            className="px-3 py-2.5 border rounded-xl text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <input
            type="datetime-local"
            value={form.reminderAt}
            onChange={(e) => setForm((p) => ({ ...p, reminderAt: e.target.value }))}
            className="px-3 py-2.5 border rounded-xl text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <select
            value={form.assignedTo}
            onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}
            className="md:col-span-2 px-3 py-2.5 border rounded-xl text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option value={u._id} key={u._id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="mt-3 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {creating ? 'Creating...' : 'Create Task'}
        </button>
      </form>

      {editTaskId && (
        <form onSubmit={updateTask} className="border rounded-2xl p-4 mb-6"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--accent-border)' }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Pencil size={14} style={{ color: 'var(--accent)' }} /> Edit Task
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Task title"
              className="px-3 py-2.5 border rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              required
            />
            <select
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              className="px-3 py-2.5 border rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description"
              className="md:col-span-2 px-3 py-2.5 border rounded-xl text-sm min-h-[70px]"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <input
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              className="px-3 py-2.5 border rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <input
              type="datetime-local"
              value={form.reminderAt}
              onChange={(e) => setForm((p) => ({ ...p, reminderAt: e.target.value }))}
              className="px-3 py-2.5 border rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <select
              value={form.assignedTo}
              onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}
              className="md:col-span-2 px-3 py-2.5 border rounded-xl text-sm"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option value={u._id} key={u._id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <motion.button
              type="submit"
              disabled={updating}
              whileHover={{ scale: updating ? 1 : 1.03 }} whileTap={{ scale: updating ? 1 : 0.97 }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </motion.button>
            <motion.button
              type="button"
              onClick={cancelEdit}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="px-3 py-2.5 border rounded-xl text-sm cursor-pointer"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <X size={14} className="inline mr-1" /> Cancel
            </motion.button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {(['todo', 'in_progress', 'blocked', 'done'] as TaskStatus[]).map((status) => (
          <motion.div key={status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="border rounded-2xl p-3"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{status.replace('_', ' ')}</h3>
            <div className="space-y-2">
              {grouped[status].map((task) => (
                <motion.div key={task._id}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="border rounded-xl p-3 cursor-pointer"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold mb-1">{task.title}</p>
                  {task.description && <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{task.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] border" style={{ backgroundColor: STATUS_STYLES[task.status].bg, borderColor: STATUS_STYLES[task.status].border, color: STATUS_STYLES[task.status].text }}>{task.status.replace('_', ' ')}</span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] border" style={{ backgroundColor: PRIORITY_STYLES[task.priority]?.bg ?? PRIORITY_STYLES.medium.bg, borderColor: PRIORITY_STYLES[task.priority]?.border ?? PRIORITY_STYLES.medium.border, color: PRIORITY_STYLES[task.priority]?.text ?? PRIORITY_STYLES.medium.text }}>{task.priority}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : '—'}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                    Assignee: {task.assignedTo?.name || 'Unassigned'}
                  </p>
                  {task.status !== 'done' && (
                    <button
                      onClick={() => updateStatus(task, 'done')}
                      className="mt-2 text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors hover:opacity-90"
                      style={{ borderColor: 'var(--success)', color: 'var(--success)', backgroundColor: 'var(--success-subtle)' }}
                    >
                      Mark done
                    </button>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => startEdit(task)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors hover:opacity-90"
                      style={{ borderColor: 'var(--accent-border)', color: 'var(--accent-text)', backgroundColor: 'var(--accent-subtle)' }}
                    >
                      <Pencil size={11} className="inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => deleteTask(task._id)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors hover:opacity-90"
                      style={{ borderColor: 'var(--error)', color: 'var(--error)', backgroundColor: 'var(--error-subtle)' }}
                    >
                      <Trash2 size={11} className="inline mr-1" /> Delete
                    </button>
                  </div>
                </motion.div>
              ))}
              {grouped[status].length === 0 && <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No tasks</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
