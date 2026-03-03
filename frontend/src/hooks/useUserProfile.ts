'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  profileImage?: { url?: string };
  phone?: string;
  jobTitle?: string;
  department?: string;
}

interface UseUserProfileReturn {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

let cachedUser: UserProfile | null = null;
let fetchPromise: Promise<UserProfile | null> | null = null;

export function useUserProfile(): UseUserProfileReturn {
  const [user, setUser] = useState<UserProfile | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    if (fetchPromise) {
      const result = await fetchPromise;
      setUser(result);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchPromise = api
      .get('/auth/profile')
      .then(({ data }) => {
        const u = data.data?.user || data.data;
        cachedUser = u || null;
        return cachedUser;
      })
      .catch(() => null)
      .finally(() => { fetchPromise = null; });

    try {
      const result = await fetchPromise;
      setUser(result);
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    cachedUser = null;
    fetchPromise = null;
    setUser(null);
    fetch();
  }, [fetch]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { user, loading, error, refetch };
}

/** Call on login/logout to ensure no stale role data persists across sessions. */
export function clearProfileCache() {
  cachedUser = null;
  fetchPromise = null;
}

export function hasRole(user: UserProfile | null, roles: string | string[]): boolean {
  if (!user) return false;
  const check = Array.isArray(roles) ? roles : [roles];
  const userRoles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
  return check.some((r) => userRoles.includes(r));
}

/**
 * Returns true when the user holds the given permission.
 * super_admin and any user with the wildcard '*' permission always pass.
 */
export function hasPermission(user: UserProfile | null, permission: string): boolean {
  if (!user) return false;
  const roles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
  if (roles.includes('super_admin')) return true;
  return !!(user.permissions?.includes('*') || user.permissions?.includes(permission));
}
