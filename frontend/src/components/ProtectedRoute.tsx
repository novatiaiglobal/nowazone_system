'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { getRoleHome, getUserRoles } from '@/lib/roleUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]             = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/profile');
      const userData = response.data?.data?.user || response.data?.data;

      if (userData) {
        // Role check if required
        if (requiredRole) {
          const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
          const userRoles: string[] = getUserRoles(userData);

          const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('admin');
          const hasRole = required.some((r) => userRoles.includes(r));

          if (!isSuperAdmin && !hasRole) {
            // Send them to their own module home — never to /dashboard (admin-only)
            router.replace(getRoleHome(userRoles));
            return;
          }
        }
        setIsAuthenticated(true);
      } else {
        redirectToLogin();
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        redirectToLogin();
      } else {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToLogin = () => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
      router.push('/auth/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div
            className="inline-block w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
