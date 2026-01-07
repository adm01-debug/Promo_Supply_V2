import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineDetection, useOfflineQueue } from '@/hooks/useOffline';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showOnline?: boolean;
}

export function OfflineIndicator({ className, showOnline = false }: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOfflineDetection();
  const { queueLength } = useOfflineQueue();

  // Don't show if online and showOnline is false
  if (isOnline && !showOnline && !wasOffline) return null;

  return (
    <AnimatePresence>
      {(!isOnline || wasOffline) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium",
            isOnline 
              ? "bg-green-500 text-white" 
              : "bg-yellow-500 text-yellow-900",
            className
          )}
        >
          <div className="flex items-center justify-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Conexão restaurada! Sincronizando...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>
                  Você está offline
                  {queueLength > 0 && ` (${queueLength} ações pendentes)`}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Offline overlay for critical features
interface OfflineOverlayProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireOnline?: boolean;
}

export function OfflineOverlay({ 
  children, 
  fallback,
  requireOnline = false 
}: OfflineOverlayProps) {
  const { isOnline } = useOfflineDetection();

  if (!isOnline && requireOnline) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none blur-sm">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          {fallback || (
            <div className="text-center p-6">
              <CloudOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Funcionalidade indisponível</h3>
              <p className="text-sm text-muted-foreground">
                Esta ação requer conexão com a internet.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Sync status component
interface SyncStatusProps {
  lastSync?: Date;
  onSync?: () => void;
  isSyncing?: boolean;
  className?: string;
}

export function SyncStatus({ 
  lastSync, 
  onSync, 
  isSyncing,
  className 
}: SyncStatusProps) {
  const { isOnline } = useOfflineDetection();
  const { queueLength } = useOfflineQueue();

  const formatLastSync = () => {
    if (!lastSync) return 'Nunca sincronizado';
    
    const diff = Date.now() - lastSync.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes} min atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    return lastSync.toLocaleDateString('pt-BR');
  };

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <div className="flex items-center gap-1.5">
        {isOnline ? (
          <span className="w-2 h-2 rounded-full bg-green-500" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
        )}
        <span className="text-muted-foreground">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      <span className="text-muted-foreground">•</span>
      
      <span className="text-muted-foreground">
        {formatLastSync()}
      </span>

      {queueLength > 0 && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className="text-yellow-600">
            {queueLength} pendente{queueLength !== 1 && 's'}
          </span>
        </>
      )}

      {onSync && isOnline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          className="h-6 px-2"
        >
          <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}
