'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MaintenanceGate from '@/components/MaintenanceGate';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ADMIN_ROLES, getRoleHome, getUserRoles } from '@/lib/roleUtils';

const COMMON_DASHBOARD_PATHS = ['/dashboard/profile', '/dashboard/notifications'];

/** Paths that belong to the Content module (content_creator home). */
const CONTENT_MODULE_PATHS = [
  '/dashboard/content',
  '/dashboard/posts',
  '/dashboard/categories',
  '/dashboard/tags',
  '/dashboard/comments',
  '/dashboard/faq',
];

/** Paths that belong to the Sales module (sales home). */
const SALES_MODULE_PATHS = [
  '/dashboard/sales',
  '/dashboard/form-submissions',
  '/dashboard/subscribers',
];

/** Paths that belong to the Finance module (finance_manager home). */
const FINANCE_MODULE_PATHS = [
  '/dashboard/finance',
  '/dashboard/finance/expenses',
  '/dashboard/finance/reports',
  '/dashboard/invoices',
];

/** Paths that belong to the SEO module (seo_manager home). */
const SEO_MODULE_PATHS = [
  '/dashboard/seo',
  '/dashboard/seo/pages',
  '/dashboard/seo/audit',
  '/dashboard/seo/redirects',
  '/dashboard/seo/keywords',
  '/dashboard/seo/sitemap',
];

/** Paths that belong to the Support module (support_executive home). */
const SUPPORT_MODULE_PATHS = [
  '/dashboard/support',
  '/dashboard/tickets',
  '/dashboard/chatbot',
];

function startsWithPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isContentModulePath(pathname: string): boolean {
  return CONTENT_MODULE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isSalesModulePath(pathname: string): boolean {
  return SALES_MODULE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isFinanceModulePath(pathname: string): boolean {
  return FINANCE_MODULE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isSeoModulePath(pathname: string): boolean {
  return SEO_MODULE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isSupportModulePath(pathname: string): boolean {
  return SUPPORT_MODULE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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
    const isSalesUser = userRoles.includes('sales') && !userRoles.some((r) => ADMIN_ROLES.has(r));
    const isFinanceUser = userRoles.includes('finance_manager') && !userRoles.some((r) => ADMIN_ROLES.has(r));
    const isSeoUser = userRoles.includes('seo_manager') && !userRoles.some((r) => ADMIN_ROLES.has(r));
    const isSupportUser = userRoles.includes('support_executive') && !userRoles.some((r) => ADMIN_ROLES.has(r));
    const isContentPath = isContentModulePath(pathname);
    const isSalesPath = isSalesModulePath(pathname);
    const isFinancePath = isFinanceModulePath(pathname);
    const isSeoPath = isSeoModulePath(pathname);
    const isSupportPath = isSupportModulePath(pathname);
    if (!isCommon && !isOwnModule && !(isContentUser && isContentPath) && !(isSalesUser && isSalesPath) && !(isFinanceUser && isFinancePath) && !(isSeoUser && isSeoPath) && !(isSupportUser && isSupportPath)) {
      router.replace(roleHome);
    }
  }, [loading, pathname, router, user]);

  return (
    <ProtectedRoute>
      <MaintenanceGate>
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </MaintenanceGate>
    </ProtectedRoute>
  );
}
