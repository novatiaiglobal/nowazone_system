'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['admin', 'super_admin', 'content_creator']}>
      {children}
    </ProtectedRoute>
  );
}
