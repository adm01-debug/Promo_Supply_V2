import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import { useAuth } from '@/features/auth';
import type { AppRole } from '@/features/auth';
import { toast } from '@/lib/feedbackToast';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole | AppRole[];
}

const AccessDenied = ({ to }: { to: string }) => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    toast.warning('Acesso restrito. Você não tem permissão para acessar esta área.', { id: 'access-denied' });
  }, [location.pathname]);
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <IllustratedEmptyState
        type="custom"
        icon={ShieldOff}
        title="Acesso restrito"
        description="Seu perfil não tem permissão para ver este conteúdo. Se você precisa deste acesso, fale com um administrador da sua empresa."
        action={{ label: "Ir para o dashboard", onClick: () => navigate(to, { replace: true }) }}
        secondaryAction={{ label: "Voltar", onClick: () => navigate(-1) }}
        className="max-w-xl w-full"
      />
    </div>
  );
};

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

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
    // QA-043: guarda a rota de origem para o login devolver o usuario ao lugar
    // onde ele estava. Vai no state do router, nao em localStorage - morre com
    // a navegacao e nao vaza entre contas na mesma maquina.
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <AccessDenied to="/compras" />;
  }

  return <>{children}</>;
};
