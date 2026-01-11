/**
 * Component to show offline status
 */

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';
import { WifiOff, RefreshCw, Clock } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, hasPendingOperations } = useOfflineSync();

  if (isOnline && !hasPendingOperations) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all",
        isOnline 
          ? 'bg-kpi-warning text-kpi-warning-foreground' 
          : 'bg-destructive text-destructive-foreground'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Você está offline</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Sincronizando...</span>
        </>
      ) : (
        <>
          <Clock className="w-4 h-4" />
          <span>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
        </>
      )}
    </div>
  );
}
