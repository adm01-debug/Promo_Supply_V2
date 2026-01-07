import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback UI
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onReset?: () => void;
  onReload?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function ErrorFallback({
  error,
  errorInfo,
  onReset,
  onReload,
  onGoHome,
  className,
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const isDev = import.meta.env.DEV;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] p-8 text-center",
        className
      )}
    >
      <div className="w-16 h-16 mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>

      <h2 className="text-2xl font-bold mb-2">Ops! Algo deu errado</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver.
      </p>

      <div className="flex gap-3 mb-6">
        {onReset && (
          <Button onClick={onReset} variant="default">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        )}
        {onGoHome && (
          <Button onClick={onGoHome} variant="outline">
            <Home className="w-4 h-4 mr-2" />
            Ir para início
          </Button>
        )}
        {onReload && (
          <Button onClick={onReload} variant="ghost">
            Recarregar página
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
            <Bug className="w-4 h-4 mr-2" />
            {showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes (dev)'}
          </Button>

          {showDetails && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-left overflow-auto">
              <p className="font-mono text-sm text-destructive mb-2">
                {error.name}: {error.message}
              </p>
              {errorInfo && (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Wrapper with retry logic
interface RetryBoundaryProps {
  children: React.ReactNode;
  maxRetries?: number;
  onMaxRetriesReached?: () => void;
}

export function RetryBoundary({
  children,
  maxRetries = 3,
  onMaxRetriesReached,
}: RetryBoundaryProps) {
  const [retryCount, setRetryCount] = React.useState(0);
  const [key, setKey] = React.useState(0);

  const handleError = React.useCallback(() => {
    if (retryCount >= maxRetries) {
      onMaxRetriesReached?.();
    }
  }, [retryCount, maxRetries, onMaxRetriesReached]);

  const handleReset = React.useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setKey((prev) => prev + 1);
  }, []);

  return (
    <ErrorBoundary
      key={key}
      onError={handleError}
      onReset={handleReset}
      fallback={
        retryCount >= maxRetries ? (
          <ErrorFallback
            error={new Error('Número máximo de tentativas atingido')}
            errorInfo={null}
            onGoHome={() => window.location.href = '/'}
          />
        ) : undefined
      }
    >
      {children}
    </ErrorBoundary>
  );
}
