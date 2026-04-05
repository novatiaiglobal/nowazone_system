'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ADMIN_ROLES, getUserRoles } from '@/lib/roleUtils';

interface Props {
  children: React.ReactNode;
}

export default function MaintenanceGate({ children }: Props) {
  const router = useRouter();
  const { user, loading: userLoading } = useUserProfile();
  const [maintenance, setMaintenance] = useState(false);
  const [checking, setChecking] = useState(true);

  const roles = user ? getUserRoles(user) : [];
  const isAdminUser = roles.some((r) => ADMIN_ROLES.has(r));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get<{ status: string; data?: { maintenanceMode?: boolean } }>('/maintenance-status');
        if (!cancelled) {
          setMaintenance(Boolean(res.data?.data?.maintenanceMode));
        }
      } catch {
        if (!cancelled) setMaintenance(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!checking && !userLoading && maintenance && !isAdminUser) {
      router.replace('/maintenance');
    }
  }, [checking, userLoading, maintenance, isAdminUser, router]);

  if (userLoading || checking) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto"
            style={{ borderColor: 'var(--accent)' }}
          />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!maintenance) {
    return <>{children}</>;
  }
  if (isAdminUser) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--accent)' }} />
    </div>
  );
}

