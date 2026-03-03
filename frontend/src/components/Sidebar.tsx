'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Lock, FileText, Briefcase, Users, ChevronDown,
  DollarSign, LifeBuoy, Bell, UserCircle, LogOut,
  BarChart2, CalendarDays, PanelLeftClose, PanelLeftOpen,
  UserCheck, ClipboardList, Search, ShieldCheck,
  Sparkles, ChevronRight, Dot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useNotifications } from '@/hooks/useNotifications';
import { useSupportCounts } from '@/hooks/useSupportCounts';
import { useUserProfile, hasRole, hasPermission, clearProfileCache } from '@/hooks/useUserProfile';
import ThemeToggle from './ThemeToggle';

/* ────────────────────────────────────────────────────────────────
   Types & Menu Definitions
   ──────────────────────────────────────────────────────────────── */

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: (Omit<MenuItem, 'children' | 'group'> & { badge?: number })[];
  badge?: number;
  match?: 'exact' | 'prefix';
  requiredPermission?: string;
  /** Visual grouping — items after a group header share a section */
  group?: string;
}

const adminMenuItems = (unreadCount: number, ticketsCount = 0): MenuItem[] => [
  {
    label: 'Executive Overview', icon: <LayoutGrid size={17} />,
    href: '/dashboard', group: 'Main',
  },
  {
    label: 'Admin Module', icon: <ShieldCheck size={17} />,
    requiredPermission: 'users.read', group: 'Modules',
    children: [
      { label: 'Admin Overview',    icon: null, href: '/dashboard/admin', match: 'exact' },
      { label: 'Users & Roles',     icon: null, href: '/dashboard/users' },
      { label: 'Permission Matrix', icon: null, href: '/dashboard/roles-permissions' },
      { label: 'Audit Logs',        icon: null, href: '/dashboard/audit-logs' },
    ],
  },
  {
    label: 'Content Module', icon: <FileText size={17} />,
    requiredPermission: 'cms.read', group: 'Modules',
    children: [
      { label: 'Content Overview', icon: null, href: '/dashboard/content', match: 'exact' },
      { label: 'Posts',      icon: null, href: '/dashboard/posts' },
      { label: 'Pages',      icon: null, href: '/dashboard/pages' },
      { label: 'Categories', icon: null, href: '/dashboard/categories' },
      { label: 'Tags',       icon: null, href: '/dashboard/tags' },
      { label: 'Comments',   icon: null, href: '/dashboard/comments' },
      { label: 'FAQ',        icon: null, href: '/dashboard/faq' },
    ],
  },
  {
    label: 'HR Module', icon: <UserCheck size={17} />,
    requiredPermission: 'users.read', group: 'Modules',
    children: [
      { label: 'HR Overview',     icon: null, href: '/dashboard/hr', match: 'exact' },
      { label: 'Employees',       icon: null, href: '/dashboard/hr/employees' },
      { label: 'Attendance',      icon: null, href: '/dashboard/hr/attendance' },
      { label: 'Job Listings',    icon: null, href: '/dashboard/hr/recruitment/jobs' },
      { label: 'Applications',    icon: null, href: '/dashboard/hr/recruitment/applications' },
      { label: 'Resume Database', icon: null, href: '/dashboard/hr/recruitment/resumes' },
    ],
  },
  {
    label: 'Sales Module', icon: <Users size={17} />,
    requiredPermission: 'crm.write', group: 'Modules',
    children: [
      { label: 'Sales Overview',   icon: null, href: '/dashboard/sales', match: 'exact' },
      { label: 'CRM Leads',        icon: null, href: '/crm/leads' },
      { label: 'Form Submissions', icon: null, href: '/dashboard/form-submissions' },
      { label: 'Subscribers',      icon: null, href: '/dashboard/subscribers' },
    ],
  },
  {
    label: 'CRM Portal', icon: <Users size={17} />,
    requiredPermission: 'crm.write', group: 'Modules',
    children: [
      { label: 'Leads',            icon: null, href: '/crm/leads' },
      { label: 'Form Submissions', icon: null, href: '/dashboard/form-submissions' },
      { label: 'Subscribers',      icon: null, href: '/dashboard/subscribers' },
    ],
  },
  {
    label: 'Finance', icon: <DollarSign size={17} />,
    requiredPermission: 'finance.write', group: 'Operations',
    children: [
      { label: 'Invoices', icon: null, href: '/dashboard/invoices' },
    ],
  },
  {
    label: 'Support', icon: <LifeBuoy size={17} />,
    requiredPermission: 'tickets.update', group: 'Operations',
    badge: ticketsCount > 0 ? ticketsCount : undefined,
    children: [
      { label: 'Tickets', icon: null, href: '/dashboard/tickets', badge: ticketsCount > 0 ? ticketsCount : undefined },
      { label: 'Chatbot', icon: null, href: '/dashboard/chatbot' },
    ],
  },
  {
    label: 'Analytics', icon: <BarChart2 size={17} />,
    requiredPermission: 'analytics.read', group: 'Insights',
    children: [
      { label: 'Overview', icon: null, href: '/dashboard/analytics' },
    ],
  },
  {
    label: 'Planning', icon: <CalendarDays size={17} />,
    group: 'Insights',
    children: [
      { label: 'Todo Tasks',    icon: null, href: '/dashboard/tasks' },
      { label: 'Team Calendar', icon: null, href: '/dashboard/calendar' },
    ],
  },
  {
    label: 'Notifications', icon: <Bell size={17} />,
    href: '/dashboard/notifications', group: 'System',
    badge: unreadCount > 0 ? unreadCount : undefined,
  },
  {
    label: 'Account', icon: <UserCircle size={17} />,
    group: 'System',
    children: [
      { label: 'My Profile', icon: null, href: '/dashboard/profile' },
      { label: 'Settings',   icon: null, href: '/dashboard/settings' },
    ],
  },
];

const hrMenuItems = (unreadCount: number): MenuItem[] => [
  { label: 'HR Overview', icon: <LayoutGrid size={17} />, href: '/dashboard/hr', match: 'exact', group: 'Main' },
  { label: 'Employees', icon: <UserCheck size={17} />, href: '/dashboard/hr/employees', group: 'Manage' },
  { label: 'Attendance', icon: <ClipboardList size={17} />, href: '/dashboard/hr/attendance', group: 'Manage' },
  {
    label: 'Recruitment', icon: <Search size={17} />, group: 'Manage',
    children: [
      { label: 'Job Listings',    icon: null, href: '/dashboard/hr/recruitment/jobs' },
      { label: 'Applications',    icon: null, href: '/dashboard/hr/recruitment/applications' },
      { label: 'Resume Database', icon: null, href: '/dashboard/hr/recruitment/resumes' },
    ],
  },
  {
    label: 'Notifications', icon: <Bell size={17} />, href: '/dashboard/notifications',
    badge: unreadCount > 0 ? unreadCount : undefined, group: 'System',
  },
  {
    label: 'Account', icon: <UserCircle size={17} />, group: 'System',
    children: [
      { label: 'My Profile', icon: null, href: '/dashboard/profile' },
    ],
  },
];

const contentMenuItems = (unreadCount: number): MenuItem[] => [
  { label: 'Content Overview', icon: <LayoutGrid size={17} />, href: '/dashboard/content', match: 'exact', group: 'Main' },
  {
    label: 'Content Module', icon: <FileText size={17} />, group: 'Content',
    children: [
      { label: 'Posts',      icon: null, href: '/dashboard/posts' },
      { label: 'Pages',      icon: null, href: '/dashboard/pages' },
      { label: 'Categories', icon: null, href: '/dashboard/categories' },
      { label: 'Tags',       icon: null, href: '/dashboard/tags' },
      { label: 'Comments',   icon: null, href: '/dashboard/comments' },
      { label: 'FAQ',        icon: null, href: '/dashboard/faq' },
    ],
  },
  {
    label: 'Notifications', icon: <Bell size={17} />, href: '/dashboard/notifications',
    badge: unreadCount > 0 ? unreadCount : undefined, group: 'System',
  },
  {
    label: 'Account', icon: <UserCircle size={17} />, group: 'System',
    children: [
      { label: 'My Profile', icon: null, href: '/dashboard/profile' },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */

const getActiveSections = (pathname: string, isHR = false, isContent = false): string[] => {
  if (isHR) {
    const hrMap: Record<string, string> = {
      '/dashboard/hr/employees':                'Employees',
      '/dashboard/hr/attendance':               'Attendance',
      '/dashboard/hr/recruitment/jobs':         'Recruitment',
      '/dashboard/hr/recruitment/applications': 'Recruitment',
      '/dashboard/hr/recruitment/resumes':      'Recruitment',
      '/dashboard/notifications':               'Notifications',
      '/dashboard/profile':                     'Account',
    };
    for (const [prefix, section] of Object.entries(hrMap)) {
      if (pathname.startsWith(prefix)) return [section];
    }
    return [];
  }

  if (isContent) {
    const contentMap: Record<string, string> = {
      '/dashboard/content':        'Content Overview',
      '/dashboard/posts':          'Content Module',
      '/dashboard/pages':          'Content Module',
      '/dashboard/categories':     'Content Module',
      '/dashboard/tags':           'Content Module',
      '/dashboard/comments':       'Content Module',
      '/dashboard/faq':            'Content Module',
      '/dashboard/notifications':  'Notifications',
      '/dashboard/profile':        'Account',
    };
    for (const [prefix, section] of Object.entries(contentMap)) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) return [section];
    }
    return [];
  }

  const map: Record<string, string> = {
    '/dashboard/admin':             'Admin Module',
    '/dashboard/users':             'Admin Module',
    '/dashboard/roles-permissions': 'Admin Module',
    '/dashboard/audit-logs':        'Admin Module',
    '/dashboard/content':           'Content Module',
    '/dashboard/posts':             'Content Module',
    '/dashboard/pages':             'Content Module',
    '/dashboard/categories':        'Content Module',
    '/dashboard/tags':              'Content Module',
    '/dashboard/comments':          'Content Module',
    '/dashboard/faq':               'Content Module',
    '/dashboard/hr':                'HR Module',
    '/dashboard/sales':             'Sales Module',
    '/crm':                         'Sales Module',
    '/dashboard/subscribers':       'Sales Module',
    '/dashboard/form-submissions':  'Sales Module',
    '/dashboard/invoices':          'Finance',
    '/dashboard/tickets':           'Support',
    '/dashboard/chatbot':           'Support',
    '/dashboard/analytics':         'Analytics',
    '/dashboard/tasks':             'Planning',
    '/dashboard/calendar':          'Planning',
    '/dashboard/profile':           'Account',
    '/dashboard/settings':          'Account',
  };
  for (const [prefix, section] of Object.entries(map)) {
    if (pathname.startsWith(prefix)) return [section];
  }
  return [];
};

const COLLAPSED_KEY = 'sidebar_collapsed';

/* Tooltip for collapsed mode */
function Tooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const [hovered, setHovered] = useState(false);

  if (!show) return <>{children}</>;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -4, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50"
          >
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg border"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              {label}
            </div>
            {/* Arrow */}
            <div
              className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0"
              style={{
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderRight: '5px solid var(--border)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main Sidebar Component
   ──────────────────────────────────────────────────────────────── */

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const { unreadCount } = useNotifications();
  const { ticketsCount } = useSupportCounts();
  const { user: profileUser, loading: profileLoading } = useUserProfile();

  const isHRUser = profileUser
    ? !hasRole(profileUser, ['admin', 'super_admin']) && hasRole(profileUser, ['hr'])
    : false;

  const isContentUser = profileUser
    ? !hasRole(profileUser, ['admin', 'super_admin']) && hasRole(profileUser, ['content_creator'])
    : false;

  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    getActiveSections(pathname, isHRUser, isContentUser),
  );
  const [userInfo, setUserInfo] = useState<{ name: string; role: string; avatar?: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [collapsedReady, setCollapsedReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    setCollapsed(saved === 'true');
    setCollapsedReady(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const active = getActiveSections(pathname, isHRUser, isContentUser);
    if (active.length) {
      setExpandedItems((prev) => Array.from(new Set([...prev, ...active])));
    }
  }, [pathname, isHRUser, isContentUser]);

  useEffect(() => {
    api
      .get('/auth/profile')
      .then(({ data }) => {
        const u = data.data?.user;
        if (u) setUserInfo({ name: u.name, role: u.role?.replace(/_/g, ' '), avatar: u.avatar });
      })
      .catch(() => {});
  }, []);

  const toggleExpand = (label: string) => {
    if (collapsed) {
      setCollapsed(false);
      localStorage.setItem(COLLAPSED_KEY, 'false');
      setExpandedItems([label]);
      return;
    }
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label],
    );
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    clearProfileCache();
    router.push('/auth/login');
  };

  const filterByPermission = (items: MenuItem[]): MenuItem[] => {
    if (!profileUser) return items;
    return items.filter((item) => {
      if (!item.requiredPermission) return true;
      return hasPermission(profileUser, item.requiredPermission);
    });
  };

  const menuItems = profileLoading
    ? []
    : isHRUser
      ? hrMenuItems(unreadCount)
      : isContentUser
        ? contentMenuItems(unreadCount)
        : filterByPermission(adminMenuItems(unreadCount, ticketsCount));

  const initials =
    userInfo?.name
      ?.split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '??';

  const sidebarWidth = collapsedReady
    ? collapsed
      ? 'w-[68px]'
      : 'w-[252px]'
    : 'w-[252px]';

  const isHrefActive = (href?: string, match: MenuItem['match'] = 'prefix') => {
    if (!href) return false;
    if (pathname === href) return true;
    if (match === 'prefix') return pathname.startsWith(href + '/');
    return false;
  };

  /* Group items by their `group` field to insert section headers */
  const groupedItems: Array<{ type: 'header'; label: string } | { type: 'item'; item: MenuItem }> = [];
  let lastGroup: string | undefined;
  for (const item of menuItems) {
    if (item.group && item.group !== lastGroup) {
      groupedItems.push({ type: 'header', label: item.group });
      lastGroup = item.group;
    }
    groupedItems.push({ type: 'item', item });
  }

  return (
    <aside
      className={cn(
        'h-screen flex flex-col flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden',
        'border-r relative',
        sidebarWidth,
      )}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* ── Brand Header ───────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center flex-shrink-0 border-b transition-all duration-300',
          collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 justify-between',
        )}
        style={{ borderColor: 'var(--border)' }}
      >
        <div className={cn('flex items-center gap-3 min-w-0', collapsed && 'justify-center')}>
          {/* Brand icon */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center cursor-pointer relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover, var(--accent-strong)))',
              boxShadow: '0 2px 10px rgba(74, 122, 155, 0.25)',
            }}
            onClick={collapsed ? toggleCollapsed : undefined}
          >
            {/* Subtle shine effect */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
              }}
            />
            <svg className="w-[18px] h-[18px] text-white relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="brand-label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <p
                  className="font-bold text-[13px] uppercase tracking-wide leading-tight whitespace-nowrap"
                  style={{ color: 'var(--text-primary)' }}
                >
                  NowAZone
                </p>
                <p
                  className="text-[10px] font-medium tracking-wider leading-tight whitespace-nowrap mt-0.5"
                  style={{ color: 'var(--accent)' }}
                >
                  Enterprise Console
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!collapsed && (
          <motion.button
            onClick={toggleCollapsed}
            whileHover={{ scale: 1.08, backgroundColor: 'var(--surface-muted)' }}
            whileTap={{ scale: 0.92 }}
            title="Collapse sidebar"
            className="flex-shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <PanelLeftClose size={15} />
          </motion.button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-3',
          collapsed ? 'px-2' : 'px-3',
        )}
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="space-y-0.5">
          {groupedItems.map((entry, idx) => {
            /* Section Headers */
            if (entry.type === 'header') {
              return (
                <AnimatePresence key={`header-${entry.label}`} initial={false}>
                  {!collapsed ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn('px-3 pb-1', idx > 0 ? 'pt-5' : 'pt-1')}
                    >
                      <span
                        className="text-[10px] uppercase tracking-[0.08em] font-semibold"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {entry.label}
                      </span>
                    </motion.div>
                  ) : (
                    idx > 0 && (
                      <div className="py-2 px-2">
                        <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
                      </div>
                    )
                  )}
                </AnimatePresence>
              );
            }

            /* Menu Items */
            const item = entry.item;
            const isActive = isHrefActive(item.href, item.match);
            const isExpanded = item.children ? expandedItems.includes(item.label) : false;
            const hasActiveChild = item.children?.some((c) => isHrefActive(c.href, c.match));

            return (
              <div key={item.label}>
                {item.children ? (
                  /* ── Expandable Section ── */
                  <>
                    <Tooltip label={item.label} show={collapsed}>
                      <motion.button
                        onClick={() => toggleExpand(item.label)}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          'w-full flex items-center rounded-xl transition-all text-[13px] font-medium group cursor-pointer relative',
                          collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2 gap-3',
                        )}
                        style={{
                          backgroundColor:
                            isExpanded || hasActiveChild
                              ? 'var(--accent-subtle)'
                              : 'transparent',
                          color:
                            isExpanded || hasActiveChild
                              ? 'var(--accent-text, var(--accent))'
                              : 'var(--text-secondary)',
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded && !hasActiveChild) {
                            e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded && !hasActiveChild) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {/* Active indicator bar */}
                        {(isExpanded || hasActiveChild) && !collapsed && (
                          <motion.div
                            layoutId="section-indicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                            style={{ backgroundColor: 'var(--accent)' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                          />
                        )}

                        <span
                          className="flex-shrink-0 transition-colors"
                          style={{
                            color: isExpanded || hasActiveChild ? 'var(--accent)' : undefined,
                          }}
                        >
                          {item.icon}
                        </span>

                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left text-[13px] truncate">
                              {item.label}
                            </span>
                            {item.badge != null && item.badge > 0 && (
                              <span
                                className="flex-shrink-0 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                                style={{
                                  backgroundColor: 'var(--error)',
                                  color: 'white',
                                }}
                              >
                                {item.badge > 99 ? '99+' : item.badge}
                              </span>
                            )}
                            <motion.span
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                              className="flex-shrink-0"
                            >
                              <ChevronDown
                                size={12}
                                style={{
                                  color: isExpanded || hasActiveChild
                                    ? 'var(--accent)'
                                    : 'var(--text-muted)',
                                }}
                              />
                            </motion.span>
                          </>
                        )}

                        {/* Collapsed mode: dot for active child or new support activity */}
                        {collapsed && (hasActiveChild || (item.badge != null && item.badge > 0)) && (
                          <div
                            className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: item.badge && item.badge > 0 ? 'var(--error)' : 'var(--accent)',
                            }}
                          />
                        )}
                      </motion.button>
                    </Tooltip>

                    {/* Children */}
                    <AnimatePresence initial={false}>
                      {isExpanded && !collapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="ml-[22px] mt-1 mb-1 space-y-0.5 border-l pl-3" style={{ borderColor: 'var(--border)' }}>
                            {item.children!.map((child) => {
                              const childActive = isHrefActive(child.href, child.match);
                              const childBadge = 'badge' in child ? child.badge : undefined;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href!}
                                  className={cn(
                                    'flex items-center gap-2 px-3 py-[7px] rounded-lg text-[12.5px] font-medium transition-all relative',
                                    childActive
                                      ? 'font-semibold'
                                      : 'hover:bg-[var(--surface-muted)]',
                                  )}
                                  style={{
                                    color: childActive
                                      ? 'var(--accent-text, var(--accent))'
                                      : 'var(--text-muted)',
                                    backgroundColor: childActive
                                      ? 'var(--accent-subtle)'
                                      : 'transparent',
                                  }}
                                >
                                  {/* Active dot */}
                                  <span
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
                                    style={{
                                      backgroundColor: childActive
                                        ? 'var(--accent)'
                                        : 'var(--border)',
                                      transform: childActive ? 'scale(1)' : 'scale(0.7)',
                                    }}
                                  />
                                  <span className="flex-1 truncate">{child.label}</span>
                                  {childBadge != null && childBadge > 0 && (
                                    <span
                                      className="flex-shrink-0 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                                      style={{
                                        backgroundColor: 'var(--error)',
                                        color: 'white',
                                      }}
                                    >
                                      {childBadge > 99 ? '99+' : childBadge}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  /* ── Direct Link ── */
                  <Tooltip label={item.label} show={collapsed}>
                    <Link
                      href={item.href!}
                      className={cn(
                        'flex items-center rounded-xl transition-all text-[13px] font-medium group relative',
                        collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2 gap-3',
                        isActive
                          ? 'font-semibold'
                          : 'hover:bg-[var(--surface-muted)]',
                      )}
                      style={{
                        backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                        color: isActive ? 'white' : 'var(--text-secondary)',
                        boxShadow: isActive
                          ? '0 2px 8px rgba(74, 122, 155, 0.3)'
                          : 'none',
                      }}
                    >
                      <span
                        className="flex-shrink-0 transition-colors"
                        style={{ color: isActive ? 'white' : undefined }}
                      >
                        {item.icon}
                      </span>

                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge != null && item.badge > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex-shrink-0 min-w-[20px] h-[20px] text-[10px] font-bold rounded-full flex items-center justify-center px-1.5"
                              style={{
                                backgroundColor: isActive
                                  ? 'rgba(255,255,255,0.25)'
                                  : 'var(--error)',
                                color: 'white',
                              }}
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </motion.span>
                          )}
                        </>
                      )}

                      {/* Collapsed badge dot */}
                      {collapsed && item.badge != null && item.badge > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2"
                          style={{
                            backgroundColor: 'var(--error)',
                            borderColor: 'var(--surface)',
                          }}
                        />
                      )}
                    </Link>
                  </Tooltip>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Bottom Section ────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Theme Toggle */}
        <div className={cn('px-3 pt-3', collapsed && 'flex justify-center')}>
          <ThemeToggle iconOnly={collapsed} />
        </div>

        {/* User Card */}
        <div className={cn('p-3 pt-2', collapsed && 'px-2')}>
          <div
            className={cn(
              'flex items-center rounded-xl transition-all',
              collapsed ? 'flex-col gap-2 p-2 justify-center' : 'gap-3 p-3',
            )}
            style={{
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border-muted, var(--border))',
            }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--highlight, var(--accent-strong)))',
                boxShadow: '0 2px 6px rgba(74, 122, 155, 0.2)',
              }}
            >
              {userInfo?.avatar ? (
                <img
                  src={userInfo.avatar}
                  alt={userInfo.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-[11px]">{initials}</span>
              )}

              {/* Online indicator */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                style={{
                  backgroundColor: 'var(--success)',
                  borderColor: 'var(--surface-muted)',
                }}
              />
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] font-semibold truncate leading-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {userInfo?.name || 'Loading…'}
                  </p>
                  <p
                    className="text-[11px] capitalize truncate leading-tight mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {userInfo?.role || '—'}
                  </p>
                </div>

                <motion.button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Logout"
                  className="flex-shrink-0 p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--error)';
                    e.currentTarget.style.backgroundColor = 'var(--error-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut size={14} />
                </motion.button>
              </>
            )}

            {collapsed && (
              <motion.button
                onClick={handleLogout}
                disabled={loggingOut}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Logout"
                className="p-1 rounded-md transition-all cursor-pointer disabled:opacity-50"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--error)';
                  e.currentTarget.style.backgroundColor = 'var(--error-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={13} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}