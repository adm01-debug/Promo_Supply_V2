/**
 * Component to show offline status
 */

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';
import { WifiOff, RefreshCw, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, hasPendingOperations } = useOfflineSync();

  if (isOnline && !hasPendingOperations) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      className={cn(
        "fixed bottom-20 md:bottom-6 left-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all backdrop-blur-xl border border-white/10",
        isOnline 
          ? 'bg-amber-500/90 text-white shadow-amber-500/20' 
          : 'bg-destructive/90 text-white shadow-destructive/20'
      )}
    >
      {!isOnline ? (
        <>
          <div className="relative">
            <WifiOff className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
          </div>
          <span>SEM CONEXÃO</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>SINCRONIZANDO</span>
        </>
      ) : (
        <>
          <Clock className="w-5 h-5 animate-bounce-gentle" />
          <span>{pendingCount} PENDENTE{pendingCount > 1 ? 'S' : ''}</span>
        </>
      )}
    </motion.div>
  );
}
