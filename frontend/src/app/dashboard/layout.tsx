'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ADMIN_ROLES, getRoleHome, getUserRoles } from '@/lib/roleUtils';

const COMMON_DASHBOARD_PATHS = ['/dashboard/profile', '/dashboard/notifications'];

/** Paths that belong to the Content module (content_creator home). */
const CONTENT_MODULE_PATHS = [
  '/dashboard/content',
  '/dashboard/posts',
  '/dashboard/pages',
  '/dashboard/categories',
  '/dashboard/tags',
  '/dashboard/comments',
  '/dashboard/faq',
];

function startsWithPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isContentModulePath(pathname: string): boolean {
  return CONTENT_MODULE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useUserProfile();

  useEffect(() => {
    if (loading || !user) return;

    const userRoles = getUserRoles(user);
    const isAdminUser = userRoles.some((role) => ADMIN_ROLES.has(role));
    if (isAdminUser) return;

    const roleHome = getRoleHome(userRoles);

    // `/dashboard` is admin-only.
    if (pathname === '/dashboard') {
      router.replace(roleHome);
      return;
    }

    // Non-admin users can access only their module namespace + common pages.
    const isCommon = COMMON_DASHBOARD_PATHS.some((path) => startsWithPath(pathname, path));
    const isOwnModule = startsWithPath(pathname, roleHome);
    const isContentUser = userRoles.includes('content_creator') && !userRoles.some((r) => ADMIN_ROLES.has(r));
    const isContentPath = isContentModulePath(pathname);
    if (!isCommon && !isOwnModule && !(isContentUser && isContentPath)) {
      router.replace(roleHome);
    }
  }, [loading, pathname, router, user]);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
