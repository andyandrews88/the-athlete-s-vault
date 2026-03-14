import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vault-bg">
        <div className="font-mono text-sm text-vault-dim">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/home" replace />;

  return <>{children}</>;
};
