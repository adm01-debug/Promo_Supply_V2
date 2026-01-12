import React from 'react';
import { motion, AnimatePresence, Variants, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, X, AlertTriangle, Info, Loader2 } from 'lucide-react';

// ==================== ANIMATION VARIANTS ====================

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

export const fadeInScale: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 30 }
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 }
};

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

// ==================== INTERACTIVE BUTTON ====================

interface InteractiveButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  children,
  variant = 'default',
  loading,
  success,
  error,
  className,
  disabled,
  onClick,
  type = 'button',
}) => {
  const variantStyles = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    success: 'bg-green-600 text-white hover:bg-green-700',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600'
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        className
      )}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={disabled || loading}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processando...</span>
          </motion.span>
        ) : success ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <Check className="w-4 h-4" />
            </motion.div>
            <span>Sucesso!</span>
          </motion.span>
        ) : error ? (
          <motion.span
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <X className="w-4 h-4" />
            </motion.div>
            <span>Erro!</span>
          </motion.span>
        ) : (
          <motion.span
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// ==================== ANIMATED CARD ====================

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  delay = 0,
  hover = true,
  onClick
}) => {
  return (
    <motion.div
      className={cn(
        "bg-card text-card-foreground rounded-xl border border-border shadow-sm",
        hover && "cursor-pointer",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay,
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      whileHover={hover ? { 
        y: -4, 
        boxShadow: "0 12px 40px -12px hsl(var(--primary) / 0.15)",
        borderColor: "hsl(var(--primary) / 0.3)"
      } : undefined}
      whileTap={hover ? { scale: 0.99 } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

// ==================== STAGGER LIST ====================

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerList: React.FC<StaggerListProps> = ({ children, className }) => {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={staggerItem}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// ==================== RIPPLE EFFECT ====================

interface RippleButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const RippleButton: React.FC<RippleButtonProps> = ({ children, className, onClick }) => {
  const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);

    onClick?.(e);
  };

  return (
    <button
      className={cn(
        "relative overflow-hidden",
        className
      )}
      onClick={handleClick}
    >
      {children}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full pointer-events-none"
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{ width: 200, height: 200, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            left: ripple.x - 100,
            top: ripple.y - 100,
          }}
        />
      ))}
    </button>
  );
};

// ==================== MAGNETIC HOVER ====================

interface MagneticHoverProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const MagneticHover: React.FC<MagneticHoverProps> = ({ 
  children, 
  className,
  strength = 0.3 
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    x.set((e.clientX - centerX) * strength);
    y.set((e.clientY - centerY) * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={cn("inline-block", className)}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
};

// ==================== PULSE INDICATOR ====================

interface PulseIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'loading';
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const PulseIndicator: React.FC<PulseIndicatorProps> = ({
  status,
  size = 'md',
  showPulse = true
}) => {
  const colors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    loading: 'bg-primary'
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span className="relative inline-flex">
      <span className={cn("rounded-full", colors[status], sizes[size])} />
      {showPulse && (
        <motion.span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            colors[status]
          )}
          animate={{ scale: [1, 1.5, 1.5], opacity: [0.75, 0.25, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </span>
  );
};

// ==================== ANIMATED NUMBER ====================

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1,
  format = (v) => Math.round(v).toString(),
  className
}) => {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: duration * 1000 });
  const display = useTransform(springValue, (v) => format(v));
  const [displayValue, setDisplayValue] = React.useState(format(0));

  React.useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  React.useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return () => unsubscribe();
  }, [display]);

  return (
    <motion.span className={className}>
      {displayValue}
    </motion.span>
  );
};

// ==================== TOAST FEEDBACK ====================

interface FeedbackToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  visible: boolean;
  onClose?: () => void;
}

export const FeedbackToast: React.FC<FeedbackToastProps> = ({
  type,
  message,
  visible,
  onClose
}) => {
  const config = {
    success: { icon: Check, bg: 'bg-green-500', text: 'text-white' },
    error: { icon: X, bg: 'bg-red-500', text: 'text-white' },
    warning: { icon: AlertTriangle, bg: 'bg-yellow-500', text: 'text-white' },
    info: { icon: Info, bg: 'bg-blue-500', text: 'text-white' }
  };

  const { icon: Icon, bg, text } = config[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg",
            bg, text
          )}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
          <span className="font-medium">{message}</span>
          {onClose && (
            <button onClick={onClose} className="ml-2 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ==================== SHIMMER LOADING ====================

interface ShimmerProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Shimmer: React.FC<ShimmerProps> = ({ className, width = "100%", height = "1rem" }) => {
  return (
    <motion.div
      className={cn("rounded bg-muted overflow-hidden", className)}
      style={{ width, height }}
    >
      <motion.div
        className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
};

// ==================== CONFETTI CELEBRATION ====================

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
}

export const ConfettiCelebration: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  const [pieces, setPieces] = React.useState<ConfettiPiece[]>([]);

  React.useEffect(() => {
    if (trigger) {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.3
      }));
      setPieces(newPieces);
      
      setTimeout(() => setPieces([]), 3000);
    }
  }, [trigger]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute w-2 h-2 rounded-full"
            style={{ 
              left: `${piece.x}%`, 
              top: -10,
              backgroundColor: piece.color 
            }}
            initial={{ y: 0, opacity: 1, rotate: 0 }}
            animate={{ 
              y: window.innerHeight + 100, 
              opacity: 0,
              rotate: Math.random() * 360 * (Math.random() > 0.5 ? 1 : -1)
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 2 + Math.random(),
              delay: piece.delay,
              ease: "easeIn"
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ==================== HOVER CARD EFFECT ====================

interface HoverCardEffectProps {
  children: React.ReactNode;
  className?: string;
}

export const HoverCardEffect: React.FC<HoverCardEffectProps> = ({ children, className }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      className={cn("perspective-1000", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
        transformStyle: "preserve-3d"
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
};

// ==================== PROGRESS BAR ====================

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  value,
  max = 100,
  className,
  showLabel = false,
  color = 'primary'
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  return (
    <div className={cn("relative", className)}>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        />
      </div>
      {showLabel && (
        <motion.span
          className="absolute -top-6 text-xs font-medium text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, left: `${percentage}%` }}
          style={{ transform: 'translateX(-50%)' }}
        >
          {Math.round(percentage)}%
        </motion.span>
      )}
    </div>
  );
};

// ==================== SKELETON LOADER ====================

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangular',
  width = '100%',
  height,
  className,
  lines = 1
}) => {
  const getHeight = () => {
    if (height) return height;
    switch (variant) {
      case 'text': return '1rem';
      case 'circular': return width;
      default: return '3rem';
    }
  };

  const getRadius = () => {
    switch (variant) {
      case 'circular': return '50%';
      case 'text': return '0.25rem';
      default: return '0.5rem';
    }
  };

  if (lines > 1 && variant === 'text') {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className="bg-muted overflow-hidden"
            style={{
              width: i === lines - 1 ? '60%' : width,
              height: getHeight(),
              borderRadius: getRadius()
            }}
          >
            <motion.div
              className="h-full w-full bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: i * 0.1 }}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={cn("bg-muted overflow-hidden", className)}
      style={{
        width,
        height: getHeight(),
        borderRadius: getRadius()
      }}
    >
      <motion.div
        className="h-full w-full bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
};
