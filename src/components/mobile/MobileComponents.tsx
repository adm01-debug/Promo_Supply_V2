import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/useMobileGestures';

interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}

export function PullToRefreshContainer({
  onRefresh,
  children,
  className,
  enabled = true,
}: PullToRefreshContainerProps) {
  const { containerRef, pulling, refreshing, pullDistance, progress, handlers } =
    usePullToRefresh({ onRefresh, enabled });

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
            className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: refreshing ? 60 : pullDistance, 
              opacity: refreshing ? 1 : progress 
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className={cn(
                "w-10 h-10 rounded-full bg-card border shadow-lg flex items-center justify-center",
                refreshing && "animate-spin"
              )}
              animate={{ 
                rotate: refreshing ? 360 : progress * 180,
                scale: 0.8 + progress * 0.4,
              }}
              transition={{ duration: refreshing ? 1 : 0.1, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
            >
              {refreshing ? (
                <Loader2 className="w-5 h-5 text-primary" />
              ) : (
                <RefreshCw className="w-5 h-5 text-muted-foreground" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with offset when pulling */}
      <motion.div
        animate={{ y: refreshing ? 60 : pullDistance }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Swipeable row for list items
interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  leftActionColor?: string;
  rightActionColor?: string;
  className?: string;
}

export function SwipeableRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  leftActionColor = 'bg-destructive',
  rightActionColor = 'bg-[hsl(var(--success))]',
  className,
}: SwipeableRowProps) {
  const [offset, setOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const startX = React.useRef(0);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    const deltaX = e.touches[0].clientX - startX.current;
    const maxOffset = 100;
    
    // Apply resistance
    const resistance = 0.5;
    const boundedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX * resistance));
    setOffset(boundedOffset);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    if (offset < -threshold && onSwipeLeft) {
      onSwipeLeft();
    } else if (offset > threshold && onSwipeRight) {
      onSwipeRight();
    }
    
    setOffset(0);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Left action (revealed on swipe right) */}
      {leftAction && (
        <div 
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-start px-4',
            rightActionColor
          )}
          style={{ width: Math.abs(Math.max(0, offset)) }}
        >
          {offset > threshold / 2 && leftAction}
        </div>
      )}
      
      {/* Right action (revealed on swipe left) */}
      {rightAction && (
        <div 
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-end px-4',
            leftActionColor
          )}
          style={{ width: Math.abs(Math.min(0, offset)) }}
        >
          {offset < -threshold / 2 && rightAction}
        </div>
      )}
      
      {/* Content */}
      <motion.div
        className="relative bg-card"
        animate={{ x: offset }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Mobile bottom sheet
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  title,
  snapPoints = [0.5, 0.9] 
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = React.useState(0);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-xl"
            initial={{ y: '100%' }}
            animate={{ y: 0, height: `${snapPoints[currentSnap] * 100}vh` }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              } else if (info.offset.y < -50 && currentSnap < snapPoints.length - 1) {
                setCurrentSnap(currentSnap + 1);
              } else if (info.offset.y > 50 && currentSnap > 0) {
                setCurrentSnap(currentSnap - 1);
              }
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Title */}
            {title && (
              <div className="px-4 pb-3 border-b">
                <h3 className="font-semibold text-lg">{title}</h3>
              </div>
            )}
            
            {/* Content */}
            <div className="overflow-auto p-4" style={{ maxHeight: 'calc(100% - 60px)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Floating action button
interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  className?: string;
}

export function FloatingActionButton({ onClick, icon, label, className }: FloatingActionButtonProps) {
  return (
    <motion.button
      className={cn(
        "fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg",
        "flex items-center justify-center",
        "md:hidden", // Only show on mobile
        className
      )}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      aria-label={label}
    >
      {icon}
    </motion.button>
  );
}

// Mobile card with touch feedback
interface TouchCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function TouchCard({ children, onClick, className }: TouchCardProps) {
  return (
    <motion.div
      className={cn(
        "bg-card rounded-lg border p-4 cursor-pointer",
        "active:bg-muted/50 transition-colors",
        className
      )}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
