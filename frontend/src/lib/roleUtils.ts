/** Ordered list: first matching role wins. */
export const ROLE_HOME_BY_PRIORITY: Array<{ role: string; home: string }> = [
  { role: 'hr',                home: '/dashboard/hr'      },
  { role: 'sales',             home: '/dashboard/sales'   },
  { role: 'support_executive', home: '/dashboard/support' },
  { role: 'content_creator',   home: '/dashboard/content' },
  { role: 'seo_manager',       home: '/dashboard/seo'     },
  { role: 'finance_manager',   home: '/dashboard/finance' },
];

export const ADMIN_ROLES = new Set(['admin', 'super_admin']);

export function getUserRoles(user: { role?: string; roles?: string[] }): string[] {
  return user.roles?.length ? user.roles : user.role ? [user.role] : [];
}

/** Returns the role-specific home path for non-admin users, or '/dashboard' for admins. */
export function getRoleHome(roles: string[]): string {
  if (roles.some((r) => ADMIN_ROLES.has(r))) return '/dashboard';
  const match = ROLE_HOME_BY_PRIORITY.find((entry) => roles.includes(entry.role));
  return match?.home ?? '/dashboard/profile';
}
