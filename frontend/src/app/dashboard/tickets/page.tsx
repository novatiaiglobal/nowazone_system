'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy, Plus, Search, AlertTriangle, Clock, CheckCircle,
  MessageSquare, X, Send, Filter, ChevronDown, Zap, Shield,
  User, Mail, Tag, ArrowRight, Inbox, XCircle, CircleDot,
  Timer, TrendingUp, Hash, Paperclip, Smile, MoreHorizontal,
  RefreshCw, ChevronRight, AlertCircle, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { toast } from 'react-toastify';

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  requesterName: string;
  requesterEmail: string;
  assignedTo?: { name: string };
  messages: Array<{
    content: string;
    senderName: string;
    isInternal: boolean;
    createdAt: string;
  }>;
  createdAt: string;
  slaDeadline?: string;
}

/* ── colour tokens ─────────────────────────────────────────── */
const PRIORITY_CONFIG: Record<string, {
  color: string; bg: string; border: string; icon: typeof Zap; label: string; glow: string;
}> = {
  low: {
    color: 'var(--text-muted)', bg: 'var(--surface)',
    border: 'var(--border)', icon: CircleDot, label: 'Low', glow: 'transparent',
  },
  medium: {
    color: 'var(--accent-text)', bg: 'var(--accent-subtle)',
    border: 'var(--accent-border)', icon: TrendingUp, label: 'Medium', glow: 'var(--accent-subtle)',
  },
  high: {
    color: 'var(--warning)', bg: 'var(--warning-subtle)',
    border: 'var(--warning)', icon: AlertCircle, label: 'High', glow: 'var(--warning-subtle)',
  },
  critical: {
    color: 'var(--error)', bg: 'var(--error-subtle)',
    border: 'var(--error)', icon: Zap, label: 'Critical', glow: 'var(--error-subtle)',
  },
};

const STATUS_CONFIG: Record<string, {
  color: string; bg: string; icon: typeof Inbox; label: string;
}> = {
  open:        { color: 'var(--accent-text)', bg: 'var(--accent-subtle)', icon: Inbox,      label: 'Open' },
  in_progress: { color: 'var(--warning)', bg: 'var(--warning-subtle)', icon: Clock,      label: 'In Progress' },
  pending:     { color: 'var(--accent)',  bg: 'var(--accent-subtle)',  icon: Timer,      label: 'Pending' },
  resolved:    { color: 'var(--success)', bg: 'var(--success-subtle)', icon: CheckCircle,label: 'Resolved' },
  closed:      { color: 'var(--text-muted)', bg: 'var(--surface)',     icon: XCircle,    label: 'Closed' },
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: '🔧 Technical',
  billing: '💳 Billing',
  general: '📋 General',
  feature_request: '✨ Feature Request',
  bug: '🐛 Bug Report',
};

const EMPTY_FORM = {
  subject: '', description: '', priority: 'medium',
  category: 'general', requesterName: '', requesterEmail: '',
};

/* ── animation presets ─────────────────────────────────────── */
const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };
const gentleSpring = { type: 'spring' as const, stiffness: 200, damping: 24 };

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: spring },
};
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: spring },
};

/* ── helpers ───────────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    'var(--accent)',
    'var(--success)',
    'var(--info)',
    'var(--warning)',
    'var(--error)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

/* ── components ────────────────────────────────────────────── */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const bg = getAvatarColor(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: bg,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function SLAIndicator({ deadline, status }: { deadline?: string; status: string }) {
  if (!deadline || status === 'resolved' || status === 'closed') return null;
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const breached = dl < now;
  const hoursLeft = Math.floor((dl - now) / 3600000);

  if (breached) {
    return (
      <motion.span
        animate={{ opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
        style={{
          color: 'var(--error)',
          backgroundColor: 'var(--error-subtle)',
          border: '1px solid var(--error)',
        }}
      >
        <AlertTriangle size={9} />
        SLA BREACHED
      </motion.span>
    );
  }

  if (hoursLeft < 4) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
        style={{
          color: 'var(--warning)',
          backgroundColor: 'var(--warning-subtle)',
          border: '1px solid var(--warning)',
        }}
      >
        <Timer size={9} />
        {hoursLeft}h left
      </span>
    );
  }

  return null;
}

function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={gentleSpring}
      className="flex flex-col items-center justify-center py-24 px-8"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mb-6"
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-subtle)' }}
        >
          <Inbox size={36} style={{ color: 'var(--accent)', opacity: 0.5 }} />
        </div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full"
          style={{ backgroundColor: 'var(--accent)', opacity: 0.3 }}
        />
      </motion.div>
      <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        No tickets found
      </h3>
      <p className="text-sm text-center max-w-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        All clear! There are no tickets matching your filters. Create one to get started.
      </p>
      <motion.button
        onClick={onAction}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        <Plus size={15} />
        Create First Ticket
      </motion.button>
    </motion.div>
  );
}

/* ── main page ─────────────────────────────────────────────── */
export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatus] = useState('');
  const [priorityFilter, setPriority] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    open: 0, inProgress: 0, resolved: 0, critical: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (search) params.set('search', search);
      const [tRes, sRes] = await Promise.all([
        api.get(`/tickets?${params}`),
        api.get('/tickets/stats'),
      ]);
      setTickets(tRes.data.data.tickets || []);
      setStats(sRes.data.data);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchAll, 400);
    return () => clearTimeout(t);
  }, [fetchAll]);

  // Refetch when a new ticket is created (e.g. from chat escalation)
  useEffect(() => {
    const socket = connectSocket();
    const handler = (payload: { type?: string }) => {
      if (payload.type === 'chat_escalated') void fetchAll();
    };
    socket.on('notification:new', handler);
    return () => {
      socket.off('notification:new', handler);
    };
  }, [fetchAll]);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else if (showModal) setShowModal(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, showModal]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  const openTicket = async (ticket: Ticket) => {
    try {
      const { data } = await api.get(`/tickets/${ticket._id}`);
      setSelected(data.data.ticket);
    } catch {
      toast.error('Failed to load ticket');
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    try {
      await api.post(`/tickets/${selected._id}/messages`, { content: reply });
      setReply('');
      openTicket(selected);
    } catch {
      toast.error('Failed to send');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/tickets/${id}`, { status });
      const isClosedOrResolved = status === 'closed' || status === 'resolved';
      if (isClosedOrResolved) {
        setTickets(prev => prev.filter(t => t._id !== id));
        if (selected?._id === id) setSelected(null);
      } else {
        setTickets(prev =>
          prev.map(t => (t._id === id ? { ...t, status } : t)),
        );
        if (selected?._id === id)
          setSelected(s => (s ? { ...s, status } : s));
      }
      toast.success('Status updated');
    } catch {
      toast.error('Failed');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tickets', form);
      toast.success('Ticket created!');
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const totalTickets = tickets.length;
  const activeFilters = [statusFilter, priorityFilter].filter(Boolean).length;

  const isSlaBreach = (t: Ticket) =>
    t.slaDeadline && new Date(t.slaDeadline) < new Date() && t.status !== 'resolved' && t.status !== 'closed';

  const sortedTickets = useMemo(() => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...tickets].sort((a, b) => {
      // SLA breached first
      const aBreach = isSlaBreach(a) ? 0 : 1;
      const bBreach = isSlaBreach(b) ? 0 : 1;
      if (aBreach !== bBreach) return aBreach - bBreach;
      // Then by priority
      const aPri = priorityOrder[a.priority] ?? 2;
      const bPri = priorityOrder[b.priority] ?? 2;
      if (aPri !== bPri) return aPri - bPri;
      // Then by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tickets]);

  // Group by requester to avoid noisy duplicates for the same user
  const groupedTickets = useMemo(() => {
    const groups = new Map<string, {
      primary: Ticket;
      total: number;
      openCount: number;
    }>();

    for (const t of sortedTickets) {
      const key = t.requesterEmail || t.requesterName || t._id;
      const existing = groups.get(key);
      const isOpenish = t.status !== 'resolved' && t.status !== 'closed';

      if (!existing) {
        groups.set(key, {
          primary: t,
          total: 1,
          openCount: isOpenish ? 1 : 0,
        });
      } else {
        existing.total += 1;
        if (isOpenish) existing.openCount += 1;
        // Keep the newest ticket as primary
        if (new Date(t.createdAt).getTime() > new Date(existing.primary.createdAt).getTime()) {
          existing.primary = t;
        }
      }
    }

    return Array.from(groups.values());
  }, [sortedTickets]);

  /* ── loading state ────────────────────────────────────── */
  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-4"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-[3px] border-t-transparent rounded-full"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading tickets…
        </p>
      </div>
    );
  }

  /* ── main render ──────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 py-6">

        {/* ── Header ────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-start justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
              }}
            >
              <LifeBuoy size={24} className="text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Support Tickets
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {totalTickets} ticket{totalTickets !== 1 ? 's' : ''} · Manage
                requests & SLA compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleRefresh}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 rounded-xl border cursor-pointer"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
              title="Refresh"
            >
              <motion.div
                animate={refreshing ? { rotate: 360 } : {}}
                transition={
                  refreshing
                    ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                    : {}
                }
              >
                <RefreshCw size={16} />
              </motion.div>
            </motion.button>

            <motion.button
              onClick={() => setShowModal(true)}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              New Ticket
            </motion.button>
          </div>
        </motion.header>

        {/* ── Stats ─────────────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {([
            {
              label: 'Open',
              value: stats.open,
              icon: Inbox,
              color: 'var(--info)',
              bg: 'var(--info-subtle)',
              border: 'var(--info)',
              desc: 'Awaiting response',
            },
            {
              label: 'In Progress',
              value: stats.inProgress,
              icon: Clock,
              color: 'var(--warning)',
              bg: 'var(--warning-subtle)',
              border: 'var(--warning)',
              desc: 'Being worked on',
            },
            {
              label: 'Resolved',
              value: stats.resolved,
              icon: CheckCircle,
              color: 'var(--success)',
              bg: 'var(--success-subtle)',
              border: 'var(--success)',
              desc: 'Successfully closed',
            },
            {
              label: 'Critical',
              value: stats.critical,
              icon: AlertTriangle,
              color: 'var(--error)',
              bg: 'var(--error-subtle)',
              border: 'var(--error)',
              desc: 'Needs immediate action',
            },
          ] as const).map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                variants={fadeUp}
                whileHover={{
                  y: -4,
                  transition: { type: 'spring', stiffness: 400, damping: 18 },
                }}
                className="relative overflow-hidden rounded-2xl border p-5 cursor-pointer group"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    backgroundColor: 'var(--surface-muted)',
                  }}
                />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}
                    >
                      <Icon size={16} style={{ color: s.color }} />
                    </div>
                    {s.label === 'Critical' && stats.critical > 0 && (
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: s.color,
                          boxShadow: `0 0 8px ${s.color}60`,
                        }}
                      />
                    )}
                  </div>
                  <p
                    className="text-3xl font-bold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {s.value}
                  </p>
                  <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                    {s.label}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                    {s.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Search & Filters ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-3"
        >
          <div className="flex gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets by subject, name, or number…"
                className="w-full pl-11 pr-20 py-3 border rounded-xl text-sm placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <kbd
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border hidden sm:inline-block"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                Ctrl&nbsp;K
              </kbd>
            </div>

            {/* Filter toggle */}
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-3 border rounded-xl text-sm cursor-pointer relative"
              style={{
                backgroundColor: showFilters
                  ? 'var(--accent-subtle)'
                  : 'var(--surface)',
                borderColor: showFilters
                  ? 'var(--accent-border, var(--accent))'
                  : 'var(--border)',
                color: showFilters
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              }}
            >
              <Filter size={15} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {activeFilters}
                </span>
              )}
            </motion.button>
          </div>

          {/* Expandable filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={gentleSpring}
                className="overflow-hidden"
              >
                <div
                  className="flex gap-3 flex-wrap p-4 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Status
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {['', 'open', 'in_progress', 'pending', 'resolved', 'closed'].map(
                        (s) => (
                          <motion.button
                            key={s}
                            onClick={() => setStatus(s)}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                            style={{
                              backgroundColor:
                                statusFilter === s
                                  ? 'var(--accent-subtle)'
                                  : 'var(--bg)',
                              color:
                                statusFilter === s
                                  ? 'var(--accent)'
                                  : 'var(--text-muted)',
                              border: `1px solid ${
                                statusFilter === s
                                  ? 'var(--accent-border, var(--accent))'
                                  : 'var(--border)'
                              }`,
                            }}
                          >
                            {s === '' ? 'All' : s.replace('_', ' ')}
                          </motion.button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="w-px self-stretch" style={{ backgroundColor: 'var(--border)' }} />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Priority
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {['', 'low', 'medium', 'high', 'critical'].map((p) => (
                        <motion.button
                          key={p}
                          onClick={() => setPriority(p)}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          style={{
                            backgroundColor:
                              priorityFilter === p
                                ? 'var(--accent-subtle)'
                                : 'var(--bg)',
                            color:
                              priorityFilter === p
                                ? 'var(--accent)'
                                : 'var(--text-muted)',
                            border: `1px solid ${
                              priorityFilter === p
                                ? 'var(--accent-border, var(--accent))'
                                : 'var(--border)'
                            }`,
                          }}
                        >
                          {p === '' ? 'All' : p}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {activeFilters > 0 && (
                    <>
                      <div className="w-px self-stretch" style={{ backgroundColor: 'var(--border)' }} />
                      <motion.button
                        onClick={() => { setStatus(''); setPriority(''); }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="self-end px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                        style={{ color: 'var(--error)' }}
                      >
                        Clear filters
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Ticket List (grouped by requester) ───────── */}
        {groupedTickets.length === 0 ? (
          <EmptyState onAction={() => setShowModal(true)} />
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {groupedTickets.map((group) => {
              const ticket = group.primary;
              const breach = isSlaBreach(ticket);
              const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;

              return (
                <motion.div
                  key={ticket._id}
                  variants={fadeUp}
                  whileHover={{
                    x: 3,
                    transition: { type: 'spring', stiffness: 400, damping: 22 },
                  }}
                  whileTap={{ scale: 0.998 }}
                  onClick={() => openTicket(ticket)}
                  className="relative group border rounded-2xl p-4 cursor-pointer overflow-hidden transition-all"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: breach
                      ? 'rgba(248,113,113,0.35)'
                      : 'var(--border)',
                    boxShadow: breach
                      ? '0 0 0 1px rgba(248,113,113,0.15), inset 0 0 20px rgba(248,113,113,0.04)'
                      : undefined,
                  }}
                >
                  {/* Priority accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all"
                    style={{
                      backgroundColor: priorityCfg.color,
                      opacity: ticket.priority === 'low' ? 0.3 : 0.7,
                    }}
                  />

                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      backgroundColor: 'var(--surface-muted)',
                    }}
                  />

                  <div className="relative flex items-center gap-4 pl-2">
                    {/* Avatar */}
                    <Avatar name={ticket.requesterName} size={40} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-[11px] font-mono"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {ticket.ticketNumber}
                        </span>
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                        <SLAIndicator
                          deadline={ticket.slaDeadline}
                          status={ticket.status}
                        />
                        {ticket.category && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              color: 'var(--text-muted)',
                              backgroundColor: 'var(--bg)',
                            }}
                          >
                            {CATEGORY_LABELS[ticket.category] || ticket.category}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-[15px] truncate pr-4">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className="text-xs truncate"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {ticket.requesterName}
                        </span>
                        <span
                          className="text-[10px]"
                          style={{ color: 'var(--text-muted)', opacity: 0.5 }}
                        >
                          •
                        </span>
                        <span
                          className="text-xs truncate"
                          style={{ color: 'var(--text-muted)', opacity: 0.7 }}
                        >
                          {ticket.requesterEmail}
                        </span>
                        {group.total > 1 && (
                          <>
                            <span
                              className="text-[10px]"
                              style={{ color: 'var(--text-muted)', opacity: 0.5 }}
                            >
                              •
                            </span>
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {group.total} tickets{group.openCount > 0 ? ` • ${group.openCount} open` : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right side meta */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <span
                        className="text-[11px]"
                        style={{ color: 'var(--text-muted)' }}
                        suppressHydrationWarning
                      >
                        {timeAgo(ticket.createdAt)}
                      </span>
                      <div className="flex items-center gap-3">
                        {ticket.messages?.length > 0 && (
                          <div
                            className="flex items-center gap-1 text-[11px]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <MessageSquare size={12} />
                            {ticket.messages.length}
                          </div>
                        )}
                        {ticket.assignedTo && (
                          <Avatar
                            name={ticket.assignedTo.name}
                            size={22}
                          />
                        )}
                      </div>
                      <ChevronRight
                        size={14}
                        className="opacity-0 group-hover:opacity-50 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ── Detail Slide Panel ─────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex"
            onClick={(e) =>
              e.target === e.currentTarget && setSelected(null)
            }
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={spring}
              className="absolute right-0 top-0 bottom-0 w-full max-w-2xl flex flex-col border-l shadow-2xl"
              style={{
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--border)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel Header */}
              <div
                className="flex-shrink-0 p-6 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <Avatar name={selected.requesterName} size={44} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-mono"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {selected.ticketNumber}
                        </span>
                        <SLAIndicator
                          deadline={selected.slaDeadline}
                          status={selected.status}
                        />
                      </div>
                      <h2 className="text-lg font-bold truncate">
                        {selected.subject}
                      </h2>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <StatusBadge status={selected.status} />
                        <PriorityBadge priority={selected.priority} />
                        {selected.category && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-md"
                            style={{
                              color: 'var(--text-muted)',
                              backgroundColor: 'var(--surface)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {CATEGORY_LABELS[selected.category] ||
                              selected.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="p-2 rounded-lg cursor-pointer"
                      style={{
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--surface)',
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </motion.button>
                    <motion.button
                      onClick={() => setSelected(null)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="p-2 rounded-lg cursor-pointer"
                      style={{
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--surface)',
                      }}
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Requester Info Bar */}
              <div
                className="flex-shrink-0 px-6 py-3 border-b flex items-center gap-6 text-xs"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <User size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>
                    {selected.requesterName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>
                    {selected.requesterEmail}
                  </span>
                </div>
                {selected.assignedTo && (
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--accent)' }}>
                      {selected.assignedTo.name}
                    </span>
                  </div>
                )}
                <span
                  className="ml-auto"
                  style={{ color: 'var(--text-muted)' }}
                  suppressHydrationWarning
                >
                  Created {timeAgo(selected.createdAt)}
                </span>
              </div>

              {/* Description */}
              <div
                className="flex-shrink-0 px-6 py-4 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Description
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {selected.description}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {selected.messages?.map((msg, i) => {
                  const isAgent = msg.isInternal;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}
                    >
                      <Avatar
                        name={msg.senderName || 'Support'}
                        size={30}
                      />
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          isAgent
                            ? 'rounded-tl-md'
                            : 'rounded-tr-md'
                        }`}
                        style={
                          isAgent
                            ? {
                                backgroundColor: 'var(--surface)',
                                border: '1px solid var(--border)',
                              }
                            : {
                                backgroundColor: 'var(--accent)',
                                color: 'white',
                              }
                        }
                      >
                        <p
                          className="text-[11px] font-semibold mb-1"
                          style={{
                            color: isAgent
                              ? 'var(--text-muted)'
                              : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {msg.senderName || 'Support'}
                        </p>
                        <p className="text-sm leading-relaxed">
                          {msg.content}
                        </p>
                        <p
                          className="text-[10px] mt-1.5"
                          style={{
                            color: isAgent
                              ? 'var(--text-muted)'
                              : 'rgba(255,255,255,0.5)',
                            opacity: 0.8,
                          }}
                          suppressHydrationWarning
                        >
                          {timeAgo(msg.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

                {(!selected.messages || selected.messages.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: 'var(--surface)' }}
                    >
                      <MessageSquare
                        size={20}
                        style={{ color: 'var(--text-muted)', opacity: 0.4 }}
                      />
                    </div>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      No messages yet — start the conversation
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Status Bar */}
              <div
                className="flex-shrink-0 px-6 py-3 border-t"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider mr-2 flex-shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Status
                  </span>
                  {['open', 'in_progress', 'resolved', 'closed'].map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = selected.status === s;
                    return (
                      <motion.button
                        key={s}
                        onClick={() => updateStatus(selected._id, s)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all flex-shrink-0"
                        style={{
                          backgroundColor: isActive ? cfg.bg : 'transparent',
                          color: isActive ? cfg.color : 'var(--text-muted)',
                          border: isActive
                            ? `1px solid ${cfg.color}30`
                            : '1px solid transparent',
                        }}
                      >
                        <cfg.icon size={11} />
                        {cfg.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Reply Box */}
              <div
                className="flex-shrink-0 p-4 border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="flex gap-3 items-end rounded-xl border p-3 transition-colors"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: reply.trim()
                      ? 'var(--accent-border, var(--accent))'
                      : 'var(--border)',
                  }}
                >
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                    placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    className="flex-1 text-sm focus:outline-none resize-none bg-transparent"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      onClick={sendReply}
                      disabled={!reply.trim()}
                      whileHover={{ scale: reply.trim() ? 1.05 : 1 }}
                      whileTap={{ scale: reply.trim() ? 0.95 : 1 }}
                    className="p-2.5 rounded-xl disabled:opacity-30 cursor-pointer text-white transition-all"
                    style={{
                      backgroundColor: reply.trim() ? 'var(--accent)' : 'var(--border)',
                      boxShadow: reply.trim() ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                    }}
                    >
                      <Send size={15} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Modal ───────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) =>
              e.target === e.currentTarget && setShowModal(false)
            }
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={spring}
              className="relative border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
              style={{
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--border)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                className="p-6 pb-4 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: 'var(--accent)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      }}
                    >
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Create Ticket</h2>
                      <p
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Submit a new support request
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowModal(false)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="p-2 rounded-lg cursor-pointer"
                    style={{
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--surface)',
                    }}
                  >
                    <X size={16} />
                  </motion.button>
                </div>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreate} className="p-6 space-y-5">
                {/* Requester Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="flex items-center gap-1.5 text-xs font-semibold mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <User size={12} />
                      Name
                    </label>
                    <input
                      type="text"
                      value={form.requesterName}
                      placeholder="John Doe"
                      required
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          requesterName: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="flex items-center gap-1.5 text-xs font-semibold mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Mail size={12} />
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.requesterEmail}
                      placeholder="john@example.com"
                      required
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          requesterEmail: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label
                    className="flex items-center gap-1.5 text-xs font-semibold mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Hash size={12} />
                    Subject
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    placeholder="Brief description of the issue"
                    required
                    onChange={(e) =>
                      setForm((p) => ({ ...p, subject: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* Priority & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="flex items-center gap-1.5 text-xs font-semibold mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Zap size={12} />
                      Priority
                    </label>
                    <div className="flex gap-2">
                      {['low', 'medium', 'high', 'critical'].map((p) => {
                        const cfg = PRIORITY_CONFIG[p];
                        const isActive = form.priority === p;
                        return (
                          <motion.button
                            key={p}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({ ...prev, priority: p }))
                            }
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex-1 py-2 rounded-lg text-[11px] font-semibold capitalize cursor-pointer transition-all"
                            style={{
                              backgroundColor: isActive ? cfg.bg : 'var(--surface)',
                              color: isActive ? cfg.color : 'var(--text-muted)',
                              border: `1px solid ${isActive ? cfg.border : 'var(--border)'}`,
                            }}
                          >
                            {p === 'critical' ? 'Crit.' : p}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label
                      className="flex items-center gap-1.5 text-xs font-semibold mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Tag size={12} />
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, category: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label
                    className="flex items-center gap-1.5 text-xs font-semibold mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <MessageSquare size={12} />
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    rows={4}
                    required
                    placeholder="Describe the issue in detail — include steps to reproduce, expected behavior, etc."
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none resize-none leading-relaxed"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <motion.button
                    type="button"
                    onClick={() => setShowModal(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 border rounded-xl text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={saving}
                    whileHover={{ scale: saving ? 1 : 1.02 }}
                    whileTap={{ scale: saving ? 1 : 0.98 }}
                    className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 text-white flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'var(--accent)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    }}
                  >
                    {saving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          className="w-4 h-4 border-2 border-t-transparent rounded-full border-white"
                        />
                        Creating…
                      </>
                    ) : (
                      <>
                        <Plus size={15} />
                        Create Ticket
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}