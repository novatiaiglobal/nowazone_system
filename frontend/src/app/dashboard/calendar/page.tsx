'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, RefreshCw, Link2, LogOut } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { useSearchParams } from 'next/navigation';

interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  location?: string;
  visibility: 'team' | 'private';
  createdBy?: { name: string };
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [calendarId, setCalendarId] = useState('primary');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleAccount, setGoogleAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    location: '',
    visibility: 'team',
  });

  const range = useMemo(() => {
    const [year, monthPart] = month.split('-').map((v) => parseInt(v, 10));
    const from = new Date(year, monthPart - 1, 1);
    const to = new Date(year, monthPart, 1);
    return {
      from: `${formatLocalDate(from)}T00:00:00.000Z`,
      to: `${formatLocalDate(to)}T00:00:00.000Z`,
    };
  }, [month]);

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await api.get(`/calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
      setEvents(data.data?.events || []);
    } catch {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/calendar/google/status');
      setGoogleConnected(Boolean(data.data?.connected));
      setGoogleAccount(data.data?.account || null);
    } catch {
      setGoogleConnected(false);
      setGoogleAccount(null);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  useEffect(() => {
    const google = searchParams.get('google');
    if (google === 'connected') {
      toast.success('Google Calendar connected');
      fetchGoogleStatus();
    } else if (google === 'error') {
      toast.error('Google OAuth failed. Please retry.');
    }
  }, [searchParams, fetchGoogleStatus]);

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/calendar', {
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      });
      toast.success('Calendar event created');
      setForm({ title: '', description: '', startAt: '', endAt: '', location: '', visibility: 'team' });
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const syncGoogle = async () => {
    if (!googleConnected) {
      toast.error('Connect Google Calendar first');
      return;
    }
    setSyncing(true);
    try {
      const { data } = await api.post('/calendar/google/sync', {
        calendarId: calendarId.trim() || 'primary',
        from: range.from,
        to: range.to,
      });
      const syncedCount = data.data?.syncedCount ?? 0;
      const failed = data.data?.failed ?? 0;
      toast.success(`Synced ${syncedCount} events${failed ? ` (${failed} failed)` : ''}`);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Google sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const connectGoogle = async () => {
    setConnecting(true);
    try {
      const { data } = await api.get('/calendar/google/auth-url');
      const authUrl = data.data?.authUrl;
      if (!authUrl) throw new Error('Missing OAuth URL');
      window.location.href = authUrl;
    } catch {
      toast.error('Failed to start Google OAuth');
      setConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    setDisconnecting(true);
    try {
      await api.delete('/calendar/google/disconnect');
      setGoogleConnected(false);
      setGoogleAccount(null);
      toast.success('Google Calendar disconnected');
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
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
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-subtle)' }}><CalendarDays size={22} style={{ color: 'var(--accent)' }} /></div>
            Team Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Shared schedule, deadlines, and Google Calendar sync.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border text-sm"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <motion.button
            onClick={fetchEvents}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="px-3 py-2 rounded-xl text-xs border cursor-pointer"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={12} />
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <motion.form onSubmit={createEvent} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="border rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus size={14} style={{ color: 'var(--accent)' }} /> Create Event</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Event title"
                className="px-3 py-2.5 border rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                required
              />
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="Location"
                className="px-3 py-2.5 border rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
                className="px-3 py-2.5 border rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                required
              />
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
                className="px-3 py-2.5 border rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                required
              />
              <select
                value={form.visibility}
                onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value }))}
                className="px-3 py-2.5 border rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="team">Team event</option>
                <option value="private">Private event</option>
              </select>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {creating ? 'Saving...' : 'Save event'}
              </button>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="md:col-span-2 px-3 py-2.5 border rounded-xl text-sm min-h-[70px]"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </motion.form>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="border rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold mb-3">Events</h2>
            <div className="space-y-2">
              {events.map((event) => (
                <motion.div key={event._id}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="border rounded-xl p-3 cursor-pointer"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                  <p className="font-semibold text-sm">{event.title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {new Date(event.startAt).toLocaleString()} - {new Date(event.endAt).toLocaleString()}
                  </p>
                  {event.location && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Location: {event.location}</p>}
                  <p className="text-[11px] mt-1" style={{ color: 'var(--accent-text)' }}>{event.visibility === 'team' ? 'Team' : 'Private'}</p>
                </motion.div>
              ))}
              {events.length === 0 && <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>No events for this month</p>}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="border rounded-2xl p-4 h-fit" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Link2 size={14} style={{ color: 'var(--accent)' }} /> Sync Google Calendar</h2>
          <p className="text-xs text-gray-400 mb-3">Connect once with OAuth, then sync this month&apos;s team calendar.</p>
          <div className="mb-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
            <p className="text-xs text-gray-400">Status</p>
            <p className={`text-sm font-semibold ${googleConnected ? 'text-green-300' : 'text-gray-300'}`}>
              {googleConnected ? 'Connected' : 'Not connected'}
            </p>
            {googleAccount && <p className="text-[11px] text-gray-500 mt-1 truncate">{googleAccount}</p>}
          </div>
          <input
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            placeholder="Calendar ID (default: primary)"
            className="w-full mb-2 px-3 py-2.5 border rounded-xl text-sm"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          {!googleConnected ? (
            <button
              onClick={connectGoogle}
              disabled={connecting}
              className="w-full mb-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {connecting ? 'Connecting...' : 'Connect Google'}
            </button>
          ) : (
            <button
              onClick={disconnectGoogle}
              disabled={disconnecting}
              className="w-full mb-2 px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              <LogOut size={14} className="inline mr-1" />
              {disconnecting ? 'Disconnecting...' : 'Disconnect Google'}
            </button>
          )}
          <button
            onClick={syncGoogle}
            disabled={syncing || !googleConnected}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {syncing ? 'Syncing...' : 'Sync with Google'}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
