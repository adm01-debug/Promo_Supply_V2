import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Share2,
  Star,
  Archive,
  Check,
  X,
  RefreshCw,
  Menu,
  Home,
  Search,
  Bell,
  User,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================
// SWIPE ACTIONS COMPONENT
// ============================================
interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
  onSwipeComplete?: (direction: 'left' | 'right') => void;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  className,
  onSwipeComplete,
}) => {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const leftOpacity = useTransform(x, [0, 100], [0, 1]);
  const rightOpacity = useTransform(x, [-100, 0], [1, 0]);
  
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold && leftActions.length > 0) {
      onSwipeComplete?.('left');
      leftActions[0]?.onClick();
    } else if (info.offset.x < -threshold && rightActions.length > 0) {
      onSwipeComplete?.('right');
      rightActions[0]?.onClick();
    }
    
    setIsDragging(false);
  }, [leftActions, rightActions, onSwipeComplete]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Left Actions Background */}
      {leftActions.length > 0 && (
        <motion.div 
          className="absolute inset-y-0 left-0 flex items-center px-4 bg-green-500"
          style={{ opacity: leftOpacity }}
        >
          {leftActions.map((action, index) => (
            <div key={index} className="flex flex-col items-center text-white">
              {action.icon}
              <span className="text-xs mt-1">{action.label}</span>
            </div>
          ))}
        </motion.div>
      )}
      
      {/* Right Actions Background */}
      {rightActions.length > 0 && (
        <motion.div 
          className="absolute inset-y-0 right-0 flex items-center px-4 bg-destructive"
          style={{ opacity: rightOpacity }}
        >
          {rightActions.map((action, index) => (
            <div key={index} className="flex flex-col items-center text-white">
              {action.icon}
              <span className="text-xs mt-1">{action.label}</span>
            </div>
          ))}
        </motion.div>
      )}
      
      {/* Swipeable Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative bg-card cursor-grab active:cursor-grabbing",
          isDragging && "z-10"
        )}
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// ============================================
// PULL TO REFRESH COMPONENT
// ============================================
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  className,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      const progress = Math.min(diff / 100, 1);
      setPullProgress(progress);
    }
  }, [refreshing]);
  
  const handleTouchEnd = useCallback(async () => {
    if (pullProgress >= 1 && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullProgress(0);
  }, [pullProgress, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center py-4 pointer-events-none"
        initial={{ y: -60 }}
        animate={{ 
          y: refreshing ? 0 : pullProgress * 60 - 60,
          opacity: refreshing ? 1 : pullProgress
        }}
      >
        <motion.div
          animate={{ rotate: refreshing ? 360 : pullProgress * 180 }}
          transition={{ 
            rotate: refreshing 
              ? { duration: 1, repeat: Infinity, ease: "linear" }
              : { duration: 0 }
          }}
        >
          <RefreshCw className={cn(
            "w-6 h-6",
            refreshing ? "text-primary" : "text-muted-foreground"
          )} />
        </motion.div>
      </motion.div>
      
      <motion.div
        animate={{ y: refreshing ? 60 : pullProgress * 60 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// ============================================
// FLOATING ACTION BUTTON
// ============================================
interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  mainIcon?: React.ReactNode;
  actions: FABAction[];
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  mainIcon = <Plus className="w-6 h-6" />,
  actions,
  position = 'bottom-right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={cn("fixed z-50", positionClasses[position], className)}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-16 right-0 flex flex-col gap-3 items-end"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {actions.map((action, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className="px-3 py-1.5 bg-card rounded-lg shadow-md text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
                <Button
                  size="icon"
                  className={cn(
                    "w-12 h-12 rounded-full shadow-lg",
                    action.color || "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  )}
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                >
                  {action.icon}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.button
        className={cn(
          "w-14 h-14 rounded-full shadow-xl",
          "bg-primary text-primary-foreground",
          "flex items-center justify-center",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        )}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        {mainIcon}
      </motion.button>
    </div>
  );
};

// ============================================
// BOTTOM SHEET COMPONENT
// ============================================
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.5, 0.9],
}) => {
  const [currentSnap, setCurrentSnap] = useState(0);
  const y = useMotionValue(0);
  
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;
    
    if (velocity > 500 || offset > 100) {
      onClose();
    } else if (velocity < -500 || offset < -100) {
      setCurrentSnap(Math.min(currentSnap + 1, snapPoints.length - 1));
    }
  }, [currentSnap, snapPoints, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-card rounded-t-2xl shadow-2xl",
              "max-h-[90vh] overflow-hidden"
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0, height: `${snapPoints[currentSnap] * 100}vh` }}
            exit={{ y: "100%" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y }}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Header */}
            {title && (
              <div className="px-6 pb-4 border-b">
                <h3 className="text-lg font-semibold">{title}</h3>
              </div>
            )}
            
            {/* Content */}
            <div className="overflow-auto h-full px-6 pb-safe">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================
// GESTURE NAVIGATION
// ============================================
interface GestureNavigationProps {
  onBack?: () => void;
  onForward?: () => void;
  children: React.ReactNode;
  className?: string;
  edgeThreshold?: number;
}

export const GestureNavigation: React.FC<GestureNavigationProps> = ({
  onBack,
  onForward,
  children,
  className,
  edgeThreshold = 20,
}) => {
  const x = useMotionValue(0);
  const [showIndicator, setShowIndicator] = useState<'left' | 'right' | null>(null);
  
  const handleDrag = useCallback((_: any, info: PanInfo) => {
    if (info.point.x < edgeThreshold && info.offset.x > 50) {
      setShowIndicator('left');
    } else if (window.innerWidth - info.point.x < edgeThreshold && info.offset.x < -50) {
      setShowIndicator('right');
    } else {
      setShowIndicator(null);
    }
  }, [edgeThreshold]);
  
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (showIndicator === 'left' && info.offset.x > 100) {
      onBack?.();
    } else if (showIndicator === 'right' && info.offset.x < -100) {
      onForward?.();
    }
    setShowIndicator(null);
  }, [showIndicator, onBack, onForward]);

  return (
    <motion.div
      className={cn("relative", className)}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{ x }}
    >
      {/* Left Edge Indicator */}
      <AnimatePresence>
        {showIndicator === 'left' && (
          <motion.div
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 10, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <ChevronLeft className="w-6 h-6 text-primary-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Right Edge Indicator */}
      <AnimatePresence>
        {showIndicator === 'right' && (
          <motion.div
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: -10, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <ChevronRight className="w-6 h-6 text-primary-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {children}
    </motion.div>
  );
};

// ============================================
// ADAPTIVE TAB BAR
// ============================================
interface TabItem {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}

interface AdaptiveTabBarProps {
  items: TabItem[];
  activeIndex: number;
  className?: string;
}

export const AdaptiveTabBar: React.FC<AdaptiveTabBarProps> = ({
  items,
  activeIndex,
  className,
}) => {
  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40",
      "bg-card/95 backdrop-blur-md border-t",
      "pb-safe",
      className
    )}>
      <div className="flex items-center justify-around py-2">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          
          return (
            <motion.button
              key={index}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg",
                "transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              onClick={item.onClick}
              whileTap={{ scale: 0.9 }}
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {item.icon}
                </motion.div>
                
                {item.badge && item.badge > 0 && (
                  <motion.span
                    className={cn(
                      "absolute -top-1 -right-1 min-w-[18px] h-[18px]",
                      "bg-destructive text-destructive-foreground",
                      "text-xs font-bold rounded-full",
                      "flex items-center justify-center px-1"
                    )}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
              </div>
              
              <motion.span
                className="text-xs font-medium"
                animate={{ 
                  opacity: isActive ? 1 : 0.7,
                  y: isActive ? 0 : 2
                }}
              >
                {item.label}
              </motion.span>
              
              {isActive && (
                <motion.div
                  className="absolute bottom-1 w-6 h-1 bg-primary rounded-full"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

// ============================================
// MOBILE CARD STACK
// ============================================
interface CardStackProps {
  cards: React.ReactNode[];
  onSwipe?: (index: number, direction: 'left' | 'right') => void;
  className?: string;
}

export const CardStack: React.FC<CardStackProps> = ({
  cards,
  onSwipe,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const handleDragEnd = useCallback((index: number, info: PanInfo) => {
    const threshold = 100;
    
    if (Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? 'right' : 'left';
      onSwipe?.(index, direction);
      setCurrentIndex(prev => prev + 1);
    }
  }, [onSwipe]);

  return (
    <div className={cn("relative h-96", className)}>
      {cards.slice(currentIndex, currentIndex + 3).map((card, i) => {
        const actualIndex = currentIndex + i;
        const isTop = i === 0;
        
        return (
          <motion.div
            key={actualIndex}
            className={cn(
              "absolute inset-0 rounded-2xl overflow-hidden",
              isTop ? "z-10" : "z-0"
            )}
            initial={{ scale: 1 - i * 0.05, y: i * 10 }}
            animate={{ scale: 1 - i * 0.05, y: i * 10 }}
            drag={isTop ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => isTop && handleDragEnd(actualIndex, info)}
            whileDrag={{ scale: 1.02, rotate: 2 }}
          >
            {card}
          </motion.div>
        );
      })}
    </div>
  );
};

// ============================================
// HAPTIC FEEDBACK HOOK
// ============================================
export const useHapticFeedback = () => {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);
  
  return {
    light: () => vibrate(10),
    medium: () => vibrate(25),
    heavy: () => vibrate(50),
    success: () => vibrate([10, 50, 10]),
    error: () => vibrate([50, 100, 50]),
    warning: () => vibrate([25, 50, 25]),
  };
};

// ============================================
// RESPONSIVE HELPER HOOK
// ============================================
export const useResponsive = () => {
  const [state, setState] = useState({
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  React.useEffect(() => {
    const handleResize = () => {
      setState({
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return state;
};
