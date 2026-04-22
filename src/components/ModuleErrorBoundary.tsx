import * as React from 'react';
import { ErrorBoundary, ErrorFallback } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Module-specific error messages
const moduleMessages: Record<string, { title: string; description: string }> = {
  dashboard: {
    title: 'Erro no Dashboard',
    description: 'Não foi possível carregar o painel de controle. Tente recarregar a página.',
  },
  solicitacoes: {
    title: 'Erro em Solicitações',
    description: 'Houve um problema ao carregar as solicitações. Verifique sua conexão.',
  },
  cotacoes: {
    title: 'Erro em Cotações',
    description: 'Não foi possível exibir as cotações. Tente novamente.',
  },
  pedidos: {
    title: 'Erro em Pedidos',
    description: 'Falha ao carregar pedidos. Verifique se está conectado.',
  },
  fornecedores: {
    title: 'Erro em Fornecedores',
    description: 'Problema ao carregar fornecedores. Tente recarregar.',
  },
  pagamentos: {
    title: 'Erro em Pagamentos',
    description: 'Não foi possível exibir os pagamentos. Verifique sua conexão.',
  },
  relatorios: {
    title: 'Erro em Relatórios',
    description: 'Falha ao gerar relatórios. Tente novamente mais tarde.',
  },
  default: {
    title: 'Erro no Módulo',
    description: 'Algo deu errado neste módulo. Nossa equipe foi notificada.',
  },
};

interface ModuleErrorFallbackProps {
  module: string;
  error: Error | null;
  onReset?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function ModuleErrorFallback({
  module,
  error,
  onReset,
  onGoBack,
  onGoHome,
  className,
}: ModuleErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const isDev = import.meta.env.DEV;
  const messages = moduleMessages[module] || moduleMessages["default"];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] p-8 text-center",
        "bg-gradient-to-b from-background to-muted/20 rounded-xl border border-border/50",
        className
      )}
    >
      <div className="w-16 h-16 mb-6 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>

      <h2 className="text-2xl font-bold mb-2">{messages.title}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {messages.description}
      </p>

      <div className="flex flex-wrap gap-3 mb-6 justify-center">
        {onReset && (
          <Button onClick={onReset} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        )}
        {onGoBack && (
          <Button onClick={onGoBack} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        )}
        {onGoHome && (
          <Button onClick={onGoHome} variant="ghost" className="gap-2">
            <Home className="w-4 h-4" />
            Ir para início
          </Button>
        )}
      </div>

      {isDev && error && (
        <div className="w-full max-w-2xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-muted-foreground"
          >
            {showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes (dev)'}
          </Button>

          {showDetails && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-left overflow-auto">
              <p className="font-mono text-sm text-destructive mb-2">
                {error.name}: {error.message}
              </p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {error.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Module-specific error boundary wrapper
interface ModuleErrorBoundaryProps {
  children: React.ReactNode;
  module: string;
  fallback?: React.ReactNode;
}

export function ModuleErrorBoundary({ 
  children, 
  module,
  fallback 
}: ModuleErrorBoundaryProps) {
  const navigate = useNavigate();
  const [key, setKey] = React.useState(0);

  const handleReset = React.useCallback(() => {
    setKey(prev => prev + 1);
  }, []);

  const handleGoBack = React.useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleGoHome = React.useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error(`[${module}] Error:`, error, errorInfo);
    }
    
    // In production, you could send to error tracking service
    // e.g., Sentry.captureException(error, { extra: { module, errorInfo } });
  }, [module]);

  return (
    <ErrorBoundary
      key={key}
      onError={handleError}
      onReset={handleReset}
      fallback={
        fallback || (
          <ModuleErrorFallback
            module={module}
            error={null}
            onReset={handleReset}
            onGoBack={handleGoBack}
            onGoHome={handleGoHome}
          />
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Higher-order component for wrapping pages
export function withModuleErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  module: string
) {
  return function WrappedComponent(props: P) {
    return (
      <ModuleErrorBoundary module={module}>
        <Component {...props} />
      </ModuleErrorBoundary>
    );
  };
}
