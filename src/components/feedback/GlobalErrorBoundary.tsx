import React from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Ops! Algo deu errado.</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Ocorreu um erro inesperado na aplicação. Nossa equipe técnica já foi notificada.
      </p>
      
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="bg-muted p-4 rounded-lg text-left text-xs mb-8 max-w-full overflow-auto max-h-[200px] border border-border">
          {error.message}
          {"\n\n"}
          {error.stack}
        </pre>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button 
          variant="outline" 
          onClick={resetErrorBoundary}
          className="gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Tentar novamente
        </Button>
        <Button 
          variant="default" 
          onClick={() => {
            resetErrorBoundary();
            navigate("/");
          }}
          className="gap-2"
        >
          <Home className="w-4 h-4" />
          Voltar ao Início
        </Button>
      </div>
    </div>
  );
};

export const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({ children }) => {

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error: unknown, info) => {
        const err = error as Error;
        logger.error("Global Error Caught", {
          error: err?.message,
          stack: err?.stack,
          componentStack: info.componentStack,
        });
      }}
      onReset={() => {
        // Reset state here if needed
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
