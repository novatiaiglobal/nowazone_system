'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Save,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  CircleDotDashed,
  ChevronDown,
  ChevronRight,
  Filter,
  Eye,
  X,
  Undo2,
  AlertCircle,
  Check,
  Minus,
  Lock,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { clearProfileCache } from '@/hooks/useUserProfile';

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface RoleDef {
  key: string;
  label: string;
}

interface MatrixModule {
  moduleKey: string;
  moduleLabel: string;
  permissionKey: string;
  capabilityLabel: string;
  roles: { role: string; allowed: boolean }[];
}

interface RolePermissionEntry {
  role: string;
  label: string;
  permissions: string[];
}

type ViewMode = 'matrix' | 'by-role';
type FilterMode = 'all' | 'allowed' | 'denied';

/* ═══════════════════════════════════════════════════════════════
   ANIMATION PRIMITIVES
   ═══════════════════════════════════════════════════════════════ */

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 26 },
  },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function RolesPermissionsPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [modules, setModules] = useState<MatrixModule[]>([]);
  const [rolePermissions, setRolePermissions] = useState<
    Record<string, Set<string>>
  >({});
  // Snapshot of original state for dirty tracking
  const [originalPermissions, setOriginalPermissions] = useState<
    Record<string, Set<string>>
  >({});

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [showChangesOnly, setShowChangesOnly] = useState(false);

  /* ── Data fetching ── */
  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/auth/admin/role-permissions');
      const payload = (res as { data?: { roles?: RoleDef[]; modules?: MatrixModule[]; rolePermissions?: RolePermissionEntry[] } })?.data ?? res;
      const nextRoles: RoleDef[] = Array.isArray(payload?.roles) ? payload.roles : [];
      const nextModules: MatrixModule[] = Array.isArray(payload?.modules) ? payload.modules : [];
      const nextRolePerms = (Array.isArray(payload?.rolePermissions) ? payload.rolePermissions : []) as RolePermissionEntry[];

      const permMap: Record<string, Set<string>> = {};
      const origMap: Record<string, Set<string>> = {};
      nextRolePerms.forEach((entry) => {
        const perms = entry.permissions ?? [];
        permMap[entry.role] = new Set(perms);
        origMap[entry.role] = new Set(perms);
      });

      setRoles(nextRoles);
      setModules(nextModules);
      setRolePermissions(permMap);
      setOriginalPermissions(origMap);
      if (nextRoles.length > 0 && !selectedRole) {
        setSelectedRole(nextRoles[0].key);
      }
      const moduleKeys = new Set(nextModules.map((m) => m.moduleKey));
      setExpandedModules(moduleKeys);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        router.replace('/dashboard/profile');
        return;
      }
      if (status === 401) {
        router.push('/auth/login');
        return;
      }
      toast.error('Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  /* ── Derived state ── */

  // Group modules by moduleKey
  const groupedModules = useMemo(() => {
    const groups: Record<
      string,
      { label: string; permissions: MatrixModule[] }
    > = {};
    modules.forEach((m) => {
      if (!groups[m.moduleKey]) {
        groups[m.moduleKey] = { label: m.moduleLabel, permissions: [] };
      }
      groups[m.moduleKey].permissions.push(m);
    });
    return groups;
  }, [modules]);

  // Count changes
  const changedPermissions = useMemo(() => {
    const changes: {
      role: string;
      permission: string;
      from: boolean;
      to: boolean;
    }[] = [];
    roles.forEach((role) => {
      const current = rolePermissions[role.key] || new Set();
      const original = originalPermissions[role.key] || new Set();
      const allPerms = new Set([...Array.from(current), ...Array.from(original)]);
      allPerms.forEach((perm) => {
        const was = original.has(perm) || original.has('*');
        const is = current.has(perm) || current.has('*');
        if (was !== is) {
          changes.push({
            role: role.key,
            permission: perm,
            from: was,
            to: is,
          });
        }
      });
    });
    return changes;
  }, [rolePermissions, originalPermissions, roles]);

  const hasChanges = changedPermissions.length > 0;

  const filteredGroupedModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result: Record<
      string,
      { label: string; permissions: MatrixModule[] }
    > = {};

    Object.entries(groupedModules).forEach(([key, group]) => {
      let perms = group.permissions;

      // Text search
      if (q) {
        perms = perms.filter(
          (m) =>
            m.moduleLabel.toLowerCase().includes(q) ||
            m.capabilityLabel.toLowerCase().includes(q) ||
            m.permissionKey.toLowerCase().includes(q)
        );
      }

      // Filter by allowed/denied for selected role
      if (filterMode !== 'all' && selectedRole) {
        perms = perms.filter((m) => {
          const allowed = hasPermission(selectedRole, m.permissionKey);
          return filterMode === 'allowed' ? allowed : !allowed;
        });
      }

      // Show changes only
      if (showChangesOnly) {
        perms = perms.filter((m) =>
          changedPermissions.some((c) => c.permission === m.permissionKey)
        );
      }

      if (perms.length > 0) {
        result[key] = { label: group.label, permissions: perms };
      }
    });

    return result;
  }, [
    groupedModules,
    search,
    filterMode,
    selectedRole,
    showChangesOnly,
    changedPermissions,
  ]);

  /* ── Permission helpers ── */
  const hasPermission = (role: string, permissionKey: string) => {
    const set = rolePermissions[role];
    if (!set) return false;
    return set.has('*') || set.has(permissionKey);
  };

  const wasPermission = (role: string, permissionKey: string) => {
    const set = originalPermissions[role];
    if (!set) return false;
    return set.has('*') || set.has(permissionKey);
  };

  const isChanged = (role: string, permissionKey: string) => {
    return hasPermission(role, permissionKey) !== wasPermission(role, permissionKey);
  };

  const togglePermission = (role: string, permissionKey: string) => {
    setRolePermissions((prev) => {
      const next = { ...prev };
      const set = new Set(next[role] ? Array.from(next[role]) : []);
      if (set.has(permissionKey)) set.delete(permissionKey);
      else set.add(permissionKey);
      next[role] = set;
      return next;
    });
  };

  // Bulk toggle all permissions in a module for a role
  const toggleModuleForRole = (
    moduleKey: string,
    role: string,
    enable: boolean
  ) => {
    setRolePermissions((prev) => {
      const next = { ...prev };
      const set = new Set(next[role] ? Array.from(next[role]) : []);
      const perms =
        groupedModules[moduleKey]?.permissions.map(
          (p) => p.permissionKey
        ) || [];
      perms.forEach((p) => {
        if (enable) set.add(p);
        else set.delete(p);
      });
      next[role] = set;
      return next;
    });
  };

  // Check if all permissions in module are enabled for a role
  const moduleStatusForRole = (moduleKey: string, role: string) => {
    const perms = groupedModules[moduleKey]?.permissions || [];
    const allEnabled = perms.every((p) =>
      hasPermission(role, p.permissionKey)
    );
    const noneEnabled = perms.every(
      (p) => !hasPermission(role, p.permissionKey)
    );
    if (allEnabled) return 'all';
    if (noneEnabled) return 'none';
    return 'partial';
  };

  const toggleModuleExpand = (moduleKey: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  };

  const resetChanges = () => {
    const restored: Record<string, Set<string>> = {};
    Object.entries(originalPermissions).forEach(([key, set]) => {
      restored[key] = new Set(set);
    });
    setRolePermissions(restored);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const payload = roles.map((role) => ({
        role: role.key,
        permissions: Array.from(rolePermissions[role.key] || []),
      }));
      await api.put('/auth/admin/role-permissions', {
        rolePermissions: payload,
      });
      clearProfileCache();
      toast.success('Permissions saved — reloading…');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
      setSaving(false);
    }
  };

  /* ── Loading ── */
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
          style={{
            borderColor: 'var(--accent)',
            borderTopColor: 'transparent',
          }}
        />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading permission matrix…
        </p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* ── Sticky Header ── */}
      <div
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg) 85%, transparent)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-xl"
                style={{ backgroundColor: 'var(--accent-subtle)' }}
              >
                <ShieldCheck size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h1 className="text-lg font-bold">Permission Matrix</h1>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {roles.length} roles · {modules.length} permissions
                  {hasChanges && (
                    <span
                      className="ml-2 font-medium"
                      style={{ color: 'var(--warning, #f59e0b)' }}
                    >
                      · {changedPermissions.length} unsaved{' '}
                      {changedPermissions.length === 1
                        ? 'change'
                        : 'changes'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasChanges && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={resetChanges}
                  className="flex items-center gap-1.5 px-3 py-2 
                             rounded-lg text-xs font-medium cursor-pointer
                             border"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--surface)',
                  }}
                >
                  <Undo2 size={13} />
                  Reset
                </motion.button>
              )}

              <Link
                href="/dashboard/audit-logs"
                className="flex items-center gap-1.5 px-3 py-2 
                           rounded-lg border text-xs font-medium"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Audit Log
              </Link>

              <motion.button
                onClick={saveChanges}
                disabled={saving || !hasChanges}
                whileHover={hasChanges ? { scale: 1.02 } : {}}
                whileTap={hasChanges ? { scale: 0.98 } : {}}
                className="flex items-center gap-2 px-4 py-2 rounded-lg 
                           text-xs font-bold text-white cursor-pointer
                           disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Save size={13} />
                {saving
                  ? 'Saving…'
                  : hasChanges
                    ? `Save ${changedPermissions.length} Changes`
                    : 'No Changes'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* ── Toolbar Row ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permissions…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm 
                         focus:outline-none"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 
                           cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div
            className="flex rounded-lg border overflow-hidden text-xs 
                        font-medium"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          >
            <button
              onClick={() => setViewMode('matrix')}
              className="px-3 py-2.5 cursor-pointer transition-colors"
              style={{
                backgroundColor:
                  viewMode === 'matrix'
                    ? 'var(--accent-subtle)'
                    : 'transparent',
                color:
                  viewMode === 'matrix'
                    ? 'var(--accent-text)'
                    : 'var(--text-secondary)',
              }}
            >
              Matrix View
            </button>
            <button
              onClick={() => setViewMode('by-role')}
              className="px-3 py-2.5 cursor-pointer transition-colors"
              style={{
                backgroundColor:
                  viewMode === 'by-role'
                    ? 'var(--accent-subtle)'
                    : 'transparent',
                color:
                  viewMode === 'by-role'
                    ? 'var(--accent-text)'
                    : 'var(--text-secondary)',
              }}
            >
              By Role
            </button>
          </div>

          {/* Filter */}
          <div
            className="flex rounded-lg border overflow-hidden text-xs 
                        font-medium"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          >
            {(['all', 'allowed', 'denied'] as FilterMode[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterMode(f)}
                className="px-3 py-2.5 cursor-pointer capitalize 
                           transition-colors"
                style={{
                  backgroundColor:
                    filterMode === f
                      ? 'var(--accent-subtle)'
                      : 'transparent',
                  color:
                    filterMode === f
                      ? 'var(--accent-text)'
                      : 'var(--text-secondary)',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Show changes toggle */}
          {hasChanges && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowChangesOnly(!showChangesOnly)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg 
                         border text-xs font-medium cursor-pointer"
              style={{
                borderColor: showChangesOnly
                  ? 'var(--accent-border)'
                  : 'var(--border)',
                backgroundColor: showChangesOnly
                  ? 'var(--accent-subtle)'
                  : 'var(--surface)',
                color: showChangesOnly
                  ? 'var(--accent-text)'
                  : 'var(--text-secondary)',
              }}
            >
              <AlertCircle size={13} />
              Changes only
            </motion.button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            VIEW: MATRIX TABLE (default — spreadsheet-style)
            ═══════════════════════════════════════════════════════ */}
        {viewMode === 'matrix' && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="border rounded-xl overflow-hidden"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {/* Table head — sticky roles row */}
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--bg)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <th
                      className="text-left py-3 px-4 font-semibold 
                                 sticky left-0 z-10 min-w-[260px]"
                      style={{ backgroundColor: 'var(--bg)' }}
                    >
                      Permission
                    </th>
                    {roles.map((role) => (
                      <th
                        key={role.key}
                        className="py-3 px-3 text-center font-medium 
                                   text-xs whitespace-nowrap min-w-[100px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(filteredGroupedModules).map(
                    ([moduleKey, group]) => (
                      <>
                        {/* Module group header row */}
                        <tr
                          key={`header-${moduleKey}`}
                          style={{
                            backgroundColor: 'var(--accent-subtle)',
                          }}
                        >
                          <td
                            className="py-2.5 px-4 sticky left-0 z-10"
                            style={{
                              backgroundColor: 'var(--accent-subtle)',
                            }}
                          >
                            <button
                              onClick={() =>
                                toggleModuleExpand(moduleKey)
                              }
                              className="flex items-center gap-2 
                                         cursor-pointer font-semibold 
                                         text-xs tracking-wide uppercase"
                              style={{ color: 'var(--accent-text)' }}
                            >
                              {expandedModules.has(moduleKey) ? (
                                <ChevronDown size={14} />
                              ) : (
                                <ChevronRight size={14} />
                              )}
                              {group.label}
                              <span
                                className="font-normal normal-case 
                                           tracking-normal"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                ({group.permissions.length})
                              </span>
                            </button>
                          </td>

                          {/* Module-level bulk toggles */}
                          {roles.map((role) => {
                            const status = moduleStatusForRole(
                              moduleKey,
                              role.key
                            );
                            return (
                              <td
                                key={role.key}
                                className="py-2.5 px-3 text-center"
                              >
                                <button
                                  onClick={() =>
                                    toggleModuleForRole(
                                      moduleKey,
                                      role.key,
                                      status !== 'all'
                                    )
                                  }
                                  className="mx-auto w-5 h-5 rounded 
                                             flex items-center 
                                             justify-center 
                                             cursor-pointer border"
                                  style={{
                                    borderColor:
                                      status === 'all'
                                        ? 'var(--accent)'
                                        : 'var(--border)',
                                    backgroundColor:
                                      status === 'all'
                                        ? 'var(--accent)'
                                        : 'transparent',
                                    color:
                                      status === 'all'
                                        ? 'white'
                                        : 'var(--text-muted)',
                                  }}
                                  title={`${status === 'all' ? 'Disable' : 'Enable'} all ${group.label} for ${role.label}`}
                                >
                                  {status === 'all' && (
                                    <Check size={12} />
                                  )}
                                  {status === 'partial' && (
                                    <Minus
                                      size={12}
                                      style={{
                                        color: 'var(--accent)',
                                      }}
                                    />
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Permission rows (collapsible) */}
                        <AnimatePresence>
                          {expandedModules.has(moduleKey) &&
                            group.permissions.map((perm, i) => (
                              <motion.tr
                                key={perm.permissionKey}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{
                                  borderBottom:
                                    '1px solid var(--border)',
                                }}
                              >
                                <td
                                  className="py-2.5 px-4 pl-10 
                                             sticky left-0 z-10"
                                  style={{
                                    backgroundColor: 'var(--surface)',
                                  }}
                                >
                                  <div>
                                    <span className="font-medium text-sm">
                                      {perm.capabilityLabel}
                                    </span>
                                    <span
                                      className="block text-[11px] 
                                                 font-mono mt-0.5"
                                      style={{
                                        color: 'var(--text-muted)',
                                      }}
                                    >
                                      {perm.permissionKey}
                                    </span>
                                  </div>
                                </td>

                                {roles.map((role) => {
                                  const allowed = hasPermission(
                                    role.key,
                                    perm.permissionKey
                                  );
                                  const changed = isChanged(
                                    role.key,
                                    perm.permissionKey
                                  );
                                  return (
                                    <td
                                      key={role.key}
                                      className="py-2.5 px-3 text-center"
                                    >
                                      <button
                                        onClick={() =>
                                          togglePermission(
                                            role.key,
                                            perm.permissionKey
                                          )
                                        }
                                        className="mx-auto w-8 h-5 
                                                   rounded-full relative 
                                                   cursor-pointer 
                                                   transition-colors"
                                        style={{
                                          backgroundColor: allowed
                                            ? 'var(--accent)'
                                            : 'var(--surface-muted, #e5e7eb)',
                                          boxShadow: changed
                                            ? '0 0 0 2px var(--warning, #f59e0b)'
                                            : 'none',
                                        }}
                                        title={`${role.label}: ${allowed ? 'Allowed' : 'Denied'}${changed ? ' (changed)' : ''}`}
                                      >
                                        <motion.span
                                          className="absolute top-0.5 
                                                     h-4 w-4 
                                                     rounded-full 
                                                     bg-white shadow-sm"
                                          animate={{
                                            left: allowed ? 15 : 2,
                                          }}
                                          transition={{
                                            type: 'spring',
                                            stiffness: 500,
                                            damping: 30,
                                          }}
                                        />
                                      </button>
                                    </td>
                                  );
                                })}
                              </motion.tr>
                            ))}
                        </AnimatePresence>
                      </>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {Object.keys(filteredGroupedModules).length === 0 && (
              <div
                className="py-16 text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <ShieldCheck
                  size={32}
                  className="mx-auto mb-3 opacity-30"
                />
                <p className="text-sm">No permissions match your filters.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════
            VIEW: BY ROLE (focused single-role view)
            ═══════════════════════════════════════════════════════ */}
        {viewMode === 'by-role' && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {/* Role selector tabs */}
            <div
              className="flex gap-1 p-1 rounded-xl border overflow-x-auto"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface)',
              }}
            >
              {roles.map((role) => {
                const active = selectedRole === role.key;
                const roleChanges = changedPermissions.filter(
                  (c) => c.role === role.key
                ).length;
                return (
                  <button
                    key={role.key}
                    onClick={() => setSelectedRole(role.key)}
                    className="px-4 py-2 rounded-lg text-xs font-medium 
                               cursor-pointer transition-all whitespace-nowrap
                               flex items-center gap-2"
                    style={{
                      backgroundColor: active
                        ? 'var(--accent)'
                        : 'transparent',
                      color: active ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {role.label}
                    {roleChanges > 0 && (
                      <span
                        className="w-4 h-4 rounded-full text-[10px] 
                                   flex items-center justify-center 
                                   font-bold"
                        style={{
                          backgroundColor: active
                            ? 'rgba(255,255,255,0.3)'
                            : 'var(--warning, #f59e0b)',
                          color: active ? 'white' : 'white',
                        }}
                      >
                        {roleChanges}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Permission groups for selected role */}
            {Object.entries(filteredGroupedModules).map(
              ([moduleKey, group]) => (
                <div
                  key={moduleKey}
                  className="border rounded-xl overflow-hidden"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--surface)',
                  }}
                >
                  {/* Module header with bulk toggle */}
                  <div
                    className="flex items-center justify-between px-4 
                               py-3 border-b"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--bg)',
                    }}
                  >
                    <button
                      onClick={() => toggleModuleExpand(moduleKey)}
                      className="flex items-center gap-2 cursor-pointer 
                                 text-xs font-semibold uppercase 
                                 tracking-wide"
                      style={{ color: 'var(--accent-text)' }}
                    >
                      {expandedModules.has(moduleKey) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      {group.label}
                      <span
                        className="font-normal normal-case 
                                   tracking-normal"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {
                          group.permissions.filter((p) =>
                            hasPermission(selectedRole, p.permissionKey)
                          ).length
                        }
                        /{group.permissions.length} enabled
                      </span>
                    </button>

                    {(() => {
                      const status = moduleStatusForRole(
                        moduleKey,
                        selectedRole
                      );
                      return (
                        <button
                          onClick={() =>
                            toggleModuleForRole(
                              moduleKey,
                              selectedRole,
                              status !== 'all'
                            )
                          }
                          className="text-xs font-medium cursor-pointer 
                                     px-2 py-1 rounded-md"
                          style={{
                            color:
                              status === 'all'
                                ? 'var(--text-muted)'
                                : 'var(--accent-text)',
                            backgroundColor:
                              status === 'all'
                                ? 'transparent'
                                : 'var(--accent-subtle)',
                          }}
                        >
                          {status === 'all'
                            ? 'Disable All'
                            : 'Enable All'}
                        </button>
                      );
                    })()}
                  </div>

                  {/* Permission list */}
                  <AnimatePresence>
                    {expandedModules.has(moduleKey) && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        {group.permissions.map((perm, i) => {
                          const allowed = hasPermission(
                            selectedRole,
                            perm.permissionKey
                          );
                          const changed = isChanged(
                            selectedRole,
                            perm.permissionKey
                          );
                          return (
                            <div
                              key={perm.permissionKey}
                              className="flex items-center justify-between 
                                         px-4 py-3 transition-colors"
                              style={{
                                borderBottom:
                                  i < group.permissions.length - 1
                                    ? '1px solid var(--border)'
                                    : 'none',
                                backgroundColor: changed
                                  ? 'color-mix(in srgb, var(--warning, #f59e0b) 6%, transparent)'
                                  : 'transparent',
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <div
                                  className="flex items-center gap-2"
                                >
                                  <span
                                    className="text-sm font-medium"
                                  >
                                    {perm.capabilityLabel}
                                  </span>
                                  {changed && (
                                    <span
                                      className="text-[10px] px-1.5 
                                                 py-0.5 rounded-full 
                                                 font-medium"
                                      style={{
                                        backgroundColor:
                                          'var(--warning, #f59e0b)',
                                        color: 'white',
                                      }}
                                    >
                                      modified
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="text-[11px] font-mono"
                                  style={{
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {perm.permissionKey}
                                </span>
                              </div>

                              <button
                                onClick={() =>
                                  togglePermission(
                                    selectedRole,
                                    perm.permissionKey
                                  )
                                }
                                className="w-10 h-6 rounded-full 
                                           relative cursor-pointer 
                                           transition-colors 
                                           flex-shrink-0"
                                style={{
                                  backgroundColor: allowed
                                    ? 'var(--accent)'
                                    : 'var(--surface-muted, #e5e7eb)',
                                }}
                              >
                                <motion.span
                                  className="absolute top-1 h-4 w-4 
                                             rounded-full bg-white 
                                             shadow-sm"
                                  animate={{
                                    left: allowed ? 20 : 3,
                                  }}
                                  transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 30,
                                  }}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            )}

            {Object.keys(filteredGroupedModules).length === 0 && (
              <div
                className="py-16 text-center border border-dashed 
                           rounded-xl"
                style={{
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border)',
                }}
              >
                <ShieldCheck
                  size={32}
                  className="mx-auto mb-3 opacity-30"
                />
                <p className="text-sm">
                  No permissions match your filters.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Footer ── */}
        <div
          className="mt-6 flex flex-wrap items-center gap-4 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: 'var(--accent)' }}
            />
            Allowed
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: 'var(--surface-muted, #e5e7eb)',
              }}
            />
            Denied
          </span>
          {hasChanges && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full border-2"
                style={{
                  borderColor: 'var(--warning, #f59e0b)',
                  backgroundColor: 'transparent',
                }}
              />
              Modified
            </span>
          )}
          <motion.button
            onClick={fetchMatrix}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 cursor-pointer ml-auto"
            style={{ color: 'var(--accent-text)' }}
          >
            <RefreshCw size={13} />
            Reload
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}