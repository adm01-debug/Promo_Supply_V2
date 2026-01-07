import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh, useHapticFeedback } from '@/hooks/useMobileGestures';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileRefreshWrapperProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}

export function MobileRefreshWrapper({
  onRefresh,
  children,
  className,
  enabled = true,
}: MobileRefreshWrapperProps) {
  const isMobile = useIsMobile();
  const haptic = useHapticFeedback();
  
  const handleRefresh = async () => {
    if (haptic.isSupported) {
      haptic.mediumTap();
    }
    await onRefresh();
    if (haptic.isSupported) {
      haptic.success();
    }
  };
  
  const { containerRef, pulling, refreshing, pullDistance, progress, handlers } =
    usePullToRefresh({ 
      onRefresh: handleRefresh, 
      enabled: enabled && isMobile,
      threshold: 70
    });

  // Only render the pull-to-refresh UI on mobile
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      {...handlers}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(pulling || refreshing) && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: refreshing ? 70 : Math.max(pullDistance, 0), 
              opacity: refreshing ? 1 : Math.min(progress, 1)
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className={cn(
                "w-12 h-12 rounded-full bg-card border-2 shadow-lg flex items-center justify-center",
                progress >= 1 ? "border-primary" : "border-border",
                refreshing && "border-primary"
              )}
              animate={{ 
                rotate: refreshing ? 360 : progress * 180,
                scale: 0.7 + Math.min(progress, 1) * 0.3,
              }}
              transition={{ 
                duration: refreshing ? 1 : 0.1, 
                repeat: refreshing ? Infinity : 0, 
                ease: 'linear' 
              }}
            >
              {refreshing ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : progress >= 1 ? (
                <RefreshCw className="w-6 h-6 text-primary" />
              ) : (
                <ArrowDown className="w-6 h-6 text-muted-foreground" />
              )}
            </motion.div>
            
            {/* Progress ring */}
            {!refreshing && progress < 1 && (
              <svg
                className="absolute w-12 h-12"
                viewBox="0 0 48 48"
              >
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeDasharray={`${progress * 125.6} 125.6`}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                  className="opacity-50"
                />
              </svg>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint text when pulling */}
      <AnimatePresence>
        {pulling && !refreshing && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex items-end justify-center z-10 pointer-events-none pb-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: progress > 0.3 ? 1 : 0, 
              height: Math.max(pullDistance - 40, 0)
            }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="text-xs text-muted-foreground font-medium">
              {progress >= 1 ? "Solte para atualizar" : "Puxe para atualizar"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with offset when pulling */}
      <motion.div
        animate={{ 
          y: refreshing ? 70 : pulling ? pullDistance : 0 
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 30,
          duration: 0.2 
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default MobileRefreshWrapper;
