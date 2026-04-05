'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getRoleHome, getUserRoles } from '@/lib/roleUtils';

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => {
        const user = data?.data?.user || data?.data;
        if (user) {
          router.replace(getRoleHome(getUserRoles(user)));
        } else {
          router.replace('/auth/login');
        }
      })
      .catch(() => {
        router.replace('/auth/login');
      });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div
        className="inline-block w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
