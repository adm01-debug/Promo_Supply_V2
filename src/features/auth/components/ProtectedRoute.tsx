import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth';
import type { AppRole } from '@/features/auth';
import { toast } from '@/lib/feedbackToast';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole | AppRole[];
}

const AccessDenied = ({ to }: { to: string }) => {
  const location = useLocation();
  useEffect(() => {
    toast.warning('Acesso restrito. Você não tem permissão para acessar esta área.', { id: 'access-denied' });
  }, [location.pathname]);
  return <Navigate to={to} replace />;
};

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <AccessDenied to="/compras" />;
  }

  return <>{children}</>;
};
