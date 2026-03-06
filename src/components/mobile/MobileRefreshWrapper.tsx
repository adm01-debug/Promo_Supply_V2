import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, ArrowDown, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh, useHapticFeedback } from '@/hooks/useMobileGestures';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileRefreshWrapperProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
  variant?: 'default' | 'minimal' | 'colorful';
  successMessage?: string;
}

export const MobileRefreshWrapper = React.forwardRef<HTMLDivElement, MobileRefreshWrapperProps>(function MobileRefreshWrapper({
  onRefresh,
  children,
  className,
  enabled = true,
  variant = 'default',
  successMessage = 'Atualizado!',
}, _ref) {
  const isMobile = useIsMobile();
  const haptic = useHapticFeedback();
  const [showSuccess, setShowSuccess] = React.useState(false);
  
  const handleRefresh = async () => {
    if (haptic.isSupported) {
      haptic.mediumTap();
    }
    await onRefresh();
    setShowSuccess(true);
    if (haptic.isSupported) {
      haptic.success();
    }
    setTimeout(() => setShowSuccess(false), 1500);
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

  const variantStyles = {
    default: {
      indicator: 'bg-card border-2 shadow-lg',
      activeColor: 'border-primary',
      icon: 'text-primary',
      bg: 'bg-primary/5'
    },
    minimal: {
      indicator: 'bg-background/80 backdrop-blur-sm',
      activeColor: 'ring-2 ring-primary/50',
      icon: 'text-foreground',
      bg: 'bg-transparent'
    },
    colorful: {
      indicator: 'bg-gradient-to-br from-primary/80 to-primary-glow/80 border-0',
      activeColor: 'shadow-lg shadow-primary/30',
      icon: 'text-white',
      bg: 'bg-gradient-to-b from-primary/10 to-transparent'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      {...handlers}
    >
      {/* Background effect when pulling */}
      <AnimatePresence>
        {pulling && (
          <motion.div
            className={cn("absolute inset-x-0 top-0 z-10", styles.bg)}
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: Math.max(pullDistance, 0),
              opacity: Math.min(progress * 0.5, 0.5)
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        )}
      </AnimatePresence>

      {/* Pull indicator */}
      <AnimatePresence>
        {(pulling || refreshing || showSuccess) && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex items-center justify-center z-20 pointer-events-none"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: refreshing || showSuccess ? 80 : Math.max(pullDistance, 0), 
              opacity: refreshing || showSuccess ? 1 : Math.min(progress, 1)
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className={cn(
                "relative w-14 h-14 rounded-full flex items-center justify-center",
                styles.indicator,
                progress >= 1 && styles.activeColor,
                refreshing && styles.activeColor,
                showSuccess && "bg-success border-success"
              )}
              animate={{ 
                rotate: refreshing ? 360 : progress * 180,
                scale: showSuccess ? [1, 1.2, 1] : (0.7 + Math.min(progress, 1) * 0.3),
              }}
              transition={{ 
                duration: refreshing ? 0.8 : 0.1, 
                repeat: refreshing ? Infinity : 0, 
                ease: 'linear' 
              }}
            >
              {showSuccess ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Check className={cn("w-7 h-7", variant === 'colorful' ? 'text-white' : 'text-success')} />
                </motion.div>
              ) : refreshing ? (
                <Loader2 className={cn("w-7 h-7 animate-spin", styles.icon)} />
              ) : progress >= 1 ? (
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <RefreshCw className={cn("w-7 h-7", styles.icon)} />
                </motion.div>
              ) : (
                <ArrowDown className={cn("w-7 h-7 text-muted-foreground")} />
              )}
              
              {/* Progress ring */}
              {!refreshing && !showSuccess && progress < 1 && (
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 56 56"
                >
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeDasharray={`${progress * 150.8} 150.8`}
                    strokeLinecap="round"
                    transform="rotate(-90 28 28)"
                    className="opacity-70"
                  />
                </svg>
              )}

              {/* Sparkles for colorful variant */}
              {variant === 'colorful' && progress >= 1 && !refreshing && !showSuccess && (
                <>
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                        x: [0, (i % 2 === 0 ? 1 : -1) * 30],
                        y: [0, (i < 2 ? -1 : 1) * 30]
                      }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    >
                      <Sparkles className="w-3 h-3 text-warning" />
                    </motion.div>
                  ))}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint text when pulling */}
      <AnimatePresence>
        {pulling && !refreshing && !showSuccess && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex items-end justify-center z-10 pointer-events-none pb-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: progress > 0.4 ? 1 : 0, 
              height: Math.max(pullDistance - 50, 0)
            }}
            exit={{ opacity: 0, height: 0 }}
          >
            <motion.span 
              className="text-xs text-muted-foreground font-medium px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm shadow-sm"
              animate={{ 
                scale: progress >= 1 ? [1, 1.05, 1] : 1 
              }}
              transition={{ duration: 0.2 }}
            >
              {progress >= 1 ? "✨ Solte para atualizar" : "↓ Puxe para atualizar"}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="absolute top-16 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-sm font-medium text-success bg-success/10 px-4 py-1.5 rounded-full">
              {successMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with offset when pulling */}
      <motion.div
        animate={{ 
          y: refreshing || showSuccess ? 80 : pulling ? pullDistance : 0 
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
