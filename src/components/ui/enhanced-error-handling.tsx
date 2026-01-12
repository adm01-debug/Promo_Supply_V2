import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Home, 
  ArrowLeft,
  WifiOff,
  ServerCrash,
  FileQuestion,
  Lock,
  Clock,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Bug
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================
// ERROR TYPES
// ============================================
type ErrorType = 
  | 'generic' 
  | 'network' 
  | 'server' 
  | 'notFound' 
  | 'unauthorized' 
  | 'timeout' 
  | 'validation';

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const errorConfigs: Record<ErrorType, ErrorConfig> = {
  generic: {
    icon: <AlertTriangle className="w-12 h-12" />,
    title: "Algo deu errado",
    description: "Ocorreu um erro inesperado. Por favor, tente novamente.",
    color: "text-amber-500",
  },
  network: {
    icon: <WifiOff className="w-12 h-12" />,
    title: "Sem conexão",
    description: "Verifique sua conexão com a internet e tente novamente.",
    color: "text-orange-500",
  },
  server: {
    icon: <ServerCrash className="w-12 h-12" />,
    title: "Erro no servidor",
    description: "Nossos servidores estão com problemas. Tente novamente em alguns minutos.",
    color: "text-red-500",
  },
  notFound: {
    icon: <FileQuestion className="w-12 h-12" />,
    title: "Não encontrado",
    description: "O recurso que você está procurando não existe ou foi removido.",
    color: "text-purple-500",
  },
  unauthorized: {
    icon: <Lock className="w-12 h-12" />,
    title: "Acesso negado",
    description: "Você não tem permissão para acessar este recurso.",
    color: "text-red-600",
  },
  timeout: {
    icon: <Clock className="w-12 h-12" />,
    title: "Tempo esgotado",
    description: "A operação demorou muito. Por favor, tente novamente.",
    color: "text-yellow-500",
  },
  validation: {
    icon: <XCircle className="w-12 h-12" />,
    title: "Dados inválidos",
    description: "Verifique os dados informados e tente novamente.",
    color: "text-rose-500",
  },
};

// ============================================
// ENHANCED ERROR PAGE
// ============================================
interface EnhancedErrorPageProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  error?: Error;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  showDetails?: boolean;
  showSupport?: boolean;
}

export const EnhancedErrorPage: React.FC<EnhancedErrorPageProps> = ({
  type = 'generic',
  title,
  description,
  error,
  onRetry,
  onGoBack,
  onGoHome,
  showDetails = false,
  showSupport = true,
}) => {
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const config = errorConfigs[type];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  const copyError = useCallback(() => {
    if (error) {
      const errorText = `Error: ${error.message}\n\nStack: ${error.stack}`;
      navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [error]);

  return (
    <motion.div
      className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated Icon */}
      <motion.div
        className={cn("mb-6", config.color)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <motion.div
          animate={{ 
            y: [0, -10, 0],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          {config.icon}
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h1
        className="text-2xl md:text-3xl font-bold text-foreground mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {displayTitle}
      </motion.h1>

      {/* Description */}
      <motion.p
        className="text-muted-foreground max-w-md mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {displayDescription}
      </motion.p>

      {/* Actions */}
      <motion.div
        className="flex flex-wrap gap-3 justify-center mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </Button>
        )}
        
        {onGoBack && (
          <Button variant="outline" onClick={onGoBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        )}
        
        {onGoHome && (
          <Button variant="outline" onClick={onGoHome} className="gap-2">
            <Home className="w-4 h-4" />
            Ir para Início
          </Button>
        )}
      </motion.div>

      {/* Error Details (Development) */}
      {showDetails && error && (
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            className={cn(
              "flex items-center gap-2 mx-auto px-4 py-2",
              "text-sm text-muted-foreground hover:text-foreground",
              "transition-colors duration-200"
            )}
          >
            <Bug className="w-4 h-4" />
            Detalhes do Erro
            {showErrorDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {showErrorDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 bg-muted rounded-lg text-left relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyError}
                    className="absolute top-2 right-2"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <p className="font-mono text-sm text-destructive mb-2">
                    {error.message}
                  </p>
                  
                  {error.stack && (
                    <pre className="font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Support Link */}
      {showSupport && (
        <motion.div
          className="mt-8 pt-8 border-t w-full max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-sm text-muted-foreground mb-3">
            Precisa de ajuda?
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="ghost" size="sm" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              Central de Ajuda
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Contatar Suporte
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ============================================
// INLINE ERROR MESSAGE
// ============================================
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  onRetry,
  className,
}) => {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 p-4 rounded-lg",
        "bg-destructive/10 border border-destructive/20",
        className
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
    >
      <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
      <p className="text-sm text-destructive flex-1">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="text-destructive hover:text-destructive"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  );
};

// ============================================
// FORM FIELD ERROR
// ============================================
interface FieldErrorProps {
  message: string;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  message,
  className,
}) => {
  return (
    <motion.p
      className={cn(
        "text-sm text-destructive mt-1.5 flex items-center gap-1",
        className
      )}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      {message}
    </motion.p>
  );
};

// ============================================
// ERROR TOAST
// ============================================
interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
  autoHideDuration?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  onDismiss,
  onRetry,
  autoHideDuration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            "fixed bottom-4 right-4 z-50",
            "flex items-center gap-3 p-4 rounded-xl shadow-lg",
            "bg-destructive text-destructive-foreground",
            "max-w-md"
          )}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
        >
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm flex-1">{message}</p>
          
          {onRetry && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRetry}
              className="gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          )}
          
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="p-1 hover:bg-destructive-foreground/10 rounded"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// RETRY WITH BACKOFF
// ============================================
interface RetryWithBackoffProps {
  children: React.ReactNode;
  onRetry: () => Promise<void>;
  maxRetries?: number;
  baseDelay?: number;
  className?: string;
}

export const RetryWithBackoff: React.FC<RetryWithBackoffProps> = ({
  children,
  onRetry,
  maxRetries = 3,
  baseDelay = 1000,
  className,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) return;

    const delay = baseDelay * Math.pow(2, retryCount);
    setCountdown(Math.ceil(delay / 1000));

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    await new Promise(resolve => setTimeout(resolve, delay));

    setIsRetrying(true);
    try {
      await onRetry();
      setHasError(false);
      setRetryCount(0);
    } catch {
      setRetryCount(prev => prev + 1);
      setHasError(true);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, baseDelay, onRetry]);

  if (!hasError) {
    return <>{children}</>;
  }

  return (
    <div className={cn("p-4 rounded-lg bg-muted", className)}>
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <p className="text-sm">
          {retryCount >= maxRetries
            ? "Número máximo de tentativas atingido"
            : `Tentativa ${retryCount + 1} de ${maxRetries}`}
        </p>
      </div>

      {retryCount < maxRetries && (
        <Button
          onClick={handleRetry}
          disabled={isRetrying || countdown > 0}
          className="gap-2"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Tentando...
            </>
          ) : countdown > 0 ? (
            `Aguarde ${countdown}s`
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </>
          )}
        </Button>
      )}
    </div>
  );
};

// ============================================
// ERROR SUMMARY
// ============================================
interface ErrorSummaryProps {
  errors: Record<string, string>;
  title?: string;
  className?: string;
}

export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  errors,
  title = "Por favor, corrija os seguintes erros:",
  className,
}) => {
  const errorList = Object.entries(errors).filter(([_, value]) => value);

  if (errorList.length === 0) return null;

  return (
    <motion.div
      role="alert"
      aria-live="polite"
      className={cn(
        "p-4 rounded-lg bg-destructive/10 border border-destructive/20",
        className
      )}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="flex items-start gap-3">
        <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-destructive mb-2">{title}</p>
          <ul className="list-disc list-inside space-y-1">
            {errorList.map(([field, message]) => (
              <li key={field} className="text-sm text-destructive/80">
                <span className="font-medium">{field}:</span> {message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};
