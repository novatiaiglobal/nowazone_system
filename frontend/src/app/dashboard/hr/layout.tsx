import ProtectedRoute from '@/components/ProtectedRoute';

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['hr', 'admin', 'super_admin']}>
      {children}
    </ProtectedRoute>
  );
}
