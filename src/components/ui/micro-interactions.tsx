import { useState, useCallback, useRef, forwardRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// RIPPLE EFFECT
// ============================================
interface RippleProps {
  x: number;
  y: number;
  size: number;
}

interface RippleContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  color?: string;
  disabled?: boolean;
}

export const RippleContainer = forwardRef<HTMLDivElement, RippleContainerProps>(
  ({ children, className, color = "currentColor", disabled = false, ...props }, ref) => {
    const [ripples, setRipples] = useState<RippleProps[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      const newRipple = { x, y, size };
      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 600);
    }, [disabled]);

    return (
      <div
        ref={containerRef}
        className={cn("relative overflow-hidden", className)}
        onClick={handleClick}
        {...props}
      >
        {children}
        <AnimatePresence>
          {ripples.map((ripple, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: ripple.x - ripple.size / 2,
                top: ripple.y - ripple.size / 2,
                width: ripple.size,
                height: ripple.size,
                backgroundColor: color,
              }}
              initial={{ scale: 0, opacity: 0.35 }}
              animate={{ scale: 1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }
);
RippleContainer.displayName = "RippleContainer";

// ============================================
// HOVER CARD EFFECT
// ============================================
interface HoverCardEffectProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

export const HoverCardEffect = ({ children, className, intensity = 10 }: HoverCardEffectProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [intensity, -intensity]);
  const rotateY = useTransform(x, [-100, 100], [-intensity, intensity]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  }, [x, y]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      className={cn("transform-gpu", className)}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// SUCCESS CHECKMARK ANIMATION
// ============================================
interface SuccessCheckProps {
  show: boolean;
  size?: number;
  className?: string;
  onComplete?: () => void;
}

export const SuccessCheck = ({ 
  show, 
  size = 48, 
  className,
  onComplete 
}: SuccessCheckProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "flex items-center justify-center rounded-full bg-success",
            className
          )}
          style={{ width: size, height: size }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20 
          }}
          onAnimationComplete={() => onComplete?.()}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
          >
            <Check className="text-success-foreground" style={{ width: size * 0.5, height: size * 0.5 }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// ERROR SHAKE ANIMATION
// ============================================
interface ErrorShakeProps {
  trigger: boolean;
  children: React.ReactNode;
  className?: string;
  onComplete?: () => void;
}

export const ErrorShake = ({ 
  trigger, 
  children, 
  className,
  onComplete 
}: ErrorShakeProps) => {
  return (
    <motion.div
      className={className}
      animate={trigger ? {
        x: [0, -10, 10, -10, 10, -5, 5, 0],
      } : {}}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => trigger && onComplete?.()}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// PULSE DOT (for notifications)
// ============================================
interface PulseDotProps {
  show?: boolean;
  color?: "primary" | "destructive" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const PulseDot = ({ 
  show = true, 
  color = "destructive", 
  size = "md",
  className 
}: PulseDotProps) => {
  const sizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  const colorClasses = {
    primary: "bg-primary",
    destructive: "bg-destructive",
    success: "bg-success",
    warning: "bg-warning",
  };

  if (!show) return null;

  return (
    <span className={cn("relative flex", sizeClasses[size], className)}>
      <motion.span
        className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-75",
          colorClasses[color]
        )}
        animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className={cn(
        "relative inline-flex rounded-full h-full w-full",
        colorClasses[color]
      )} />
    </span>
  );
};

// ============================================
// LOADING BUTTON STATE
// ============================================
type ButtonState = "idle" | "loading" | "success" | "error";

interface AnimatedButtonProps {
  state?: ButtonState;
  children: React.ReactNode;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const AnimatedButton = ({ 
  state = "idle", 
  children, 
  className,
  loadingText = "Carregando...",
  successText = "Sucesso!",
  errorText = "Erro!",
  disabled,
  onClick
}: AnimatedButtonProps) => {
  return (
    <motion.button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium",
        "transition-colors duration-200",
        state === "idle" && "bg-primary text-primary-foreground hover:bg-primary/90",
        state === "loading" && "bg-primary/80 text-primary-foreground cursor-wait",
        state === "success" && "bg-success text-success-foreground",
        state === "error" && "bg-destructive text-destructive-foreground",
        className
      )}
      disabled={disabled || state === "loading"}
      whileHover={state === "idle" ? { scale: 1.02 } : {}}
      whileTap={state === "idle" ? { scale: 0.98 } : {}}
      animate={state === "error" ? {
        x: [0, -5, 5, -5, 5, 0],
      } : {}}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {children}
          </motion.span>
        )}
        {state === "loading" && (
          <motion.span
            key="loading"
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingText}
          </motion.span>
        )}
        {state === "success" && (
          <motion.span
            key="success"
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Check className="w-4 h-4" />
            {successText}
          </motion.span>
        )}
        {state === "error" && (
          <motion.span
            key="error"
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <X className="w-4 h-4" />
            {errorText}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// ============================================
// MAGNETIC BUTTON
// ============================================
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const MagneticButton = ({ children, className, strength = 0.3 }: MagneticButtonProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * strength);
    y.set((e.clientY - centerY) * strength);
  }, [x, y, strength]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      className={cn("inline-block", className)}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// GLOW EFFECT
// ============================================
interface GlowEffectProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  intensity?: number;
}

export const GlowEffect = ({ children, className, color = "hsl(var(--primary))", intensity = 20 }: GlowEffectProps) => {
  return (
    <motion.div
      className={cn("relative", className)}
      whileHover={{
        boxShadow: `0 0 ${intensity}px ${color}`,
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// COUNT UP ANIMATION
// ============================================
interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  onComplete?: () => void;
}

export const CountUp = ({
  end,
  start = 0,
  duration = 2,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  onComplete
}: CountUpProps) => {
  const motionValue = useMotionValue(start);
  const rounded = useTransform(motionValue, (latest) => {
    return `${prefix}${latest.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${suffix}`;
  });

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onViewportEnter={() => {
        motionValue.set(start);
        import("framer-motion").then(({ animate }) => {
          animate(motionValue, end, { 
            duration,
            ease: "easeOut",
            onComplete
          });
        });
      }}
    >
      {rounded}
    </motion.span>
  );
};

// ============================================
// STAGGER CHILDREN ANIMATION
// ============================================
interface StaggerChildrenProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  animateFrom?: "bottom" | "top" | "left" | "right" | "scale";
}

export const StaggerChildren = ({
  children,
  className,
  staggerDelay = 0.05,
  animateFrom = "bottom"
}: StaggerChildrenProps) => {
  const variants = {
    hidden: {
      opacity: 0,
      y: animateFrom === "bottom" ? 20 : animateFrom === "top" ? -20 : 0,
      x: animateFrom === "left" ? -20 : animateFrom === "right" ? 20 : 0,
      scale: animateFrom === "scale" ? 0.9 : 1,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: staggerDelay }}
    >
      {Array.isArray(children) ? children.map((child, i) => (
        <motion.div key={i} variants={variants}>
          {child}
        </motion.div>
      )) : (
        <motion.div variants={variants}>
          {children}
        </motion.div>
      )}
    </motion.div>
  );
};

// ============================================
// FLOATING ANIMATION
// ============================================
interface FloatingProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
}

export const Floating = ({
  children,
  className,
  duration = 3,
  distance = 10
}: FloatingProps) => {
  return (
    <motion.div
      className={className}
      animate={{
        y: [-distance, distance, -distance],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// TYPING ANIMATION
// ============================================
interface TypingAnimationProps {
  text: string;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}

export const TypingAnimation = ({
  text,
  className,
  speed = 50,
  onComplete
}: TypingAnimationProps) => {
  const [displayedText, setDisplayedText] = useState("");

  useState(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(timer);
  });

  return (
    <span className={className}>
      {displayedText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        |
      </motion.span>
    </span>
  );
};

// ============================================
// BOUNCE IN ANIMATION
// ============================================
interface BounceInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const BounceIn = ({ children, delay = 0, className }: BounceInProps) => (
  <motion.div
    className={className}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{
      type: "spring",
      stiffness: 400,
      damping: 15,
      delay
    }}
  >
    {children}
  </motion.div>
);

// ============================================
// SLIDE REVEAL ANIMATION
// ============================================
interface SlideRevealProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  className?: string;
}

export const SlideReveal = ({ 
  children, 
  direction = 'up', 
  delay = 0, 
  className 
}: SlideRevealProps) => {
  const getInitial = () => {
    switch(direction) {
      case 'left': return { x: -50, opacity: 0 };
      case 'right': return { x: 50, opacity: 0 };
      case 'up': return { y: 50, opacity: 0 };
      case 'down': return { y: -50, opacity: 0 };
    }
  };

  return (
    <motion.div
      className={className}
      initial={getInitial()}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

// ============================================
// CONFETTI BURST
// ============================================
interface ConfettiBurstProps {
  show: boolean;
  count?: number;
  duration?: number;
}

export const ConfettiBurst = ({ show, count = 20, duration = 2 }: ConfettiBurstProps) => {
  if (!show) return null;

  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{ 
            backgroundColor: colors[i % colors.length],
            left: '50%',
            top: '50%',
          }}
          initial={{ 
            x: 0, 
            y: 0, 
            scale: 0, 
            opacity: 1 
          }}
          animate={{ 
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 300,
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0],
            rotate: Math.random() * 360
          }}
          transition={{ 
            duration,
            ease: "easeOut",
            delay: i * 0.02
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// HEARTBEAT ANIMATION
// ============================================
interface HeartbeatProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export const Heartbeat = ({ children, active = true, className }: HeartbeatProps) => (
  <motion.div
    className={className}
    animate={active ? {
      scale: [1, 1.05, 1, 1.05, 1],
    } : {}}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      repeatDelay: 1
    }}
  >
    {children}
  </motion.div>
);

// ============================================
// SHIMMER TEXT
// ============================================
interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ShimmerText = ({ children, className }: ShimmerTextProps) => (
  <motion.span
    className={cn(
      "inline-block bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-[length:200%_100%]",
      className
    )}
    animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
  >
    {children}
  </motion.span>
);

// ============================================
// ATTENTION PULSE
// ============================================
interface AttentionPulseProps {
  children: React.ReactNode;
  active?: boolean;
  color?: string;
  className?: string;
}

export const AttentionPulse = ({ 
  children, 
  active = true, 
  color = "hsl(var(--primary))",
  className 
}: AttentionPulseProps) => (
  <div className={cn("relative", className)}>
    {children}
    {active && (
      <motion.div
        className="absolute inset-0 rounded-inherit pointer-events-none"
        style={{ 
          boxShadow: `0 0 0 0 ${color}`,
          borderRadius: 'inherit'
        }}
        animate={{
          boxShadow: [
            `0 0 0 0 ${color}`,
            `0 0 0 8px transparent`,
          ]
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    )}
  </div>
);

// ============================================
// FLIP CARD
// ============================================
interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped?: boolean;
  className?: string;
}

export const FlipCard = ({ front, back, flipped = false, className }: FlipCardProps) => (
  <motion.div
    className={cn("relative", className)}
    style={{ perspective: 1000, transformStyle: "preserve-3d" }}
  >
    <motion.div
      className="w-full h-full"
      animate={{ rotateY: flipped ? 180 : 0 }}
      transition={{ duration: 0.6 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Front */}
      <div 
        className="absolute inset-0 backface-hidden"
        style={{ backfaceVisibility: "hidden" }}
      >
        {front}
      </div>
      {/* Back */}
      <div 
        className="absolute inset-0"
        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
      >
        {back}
      </div>
    </motion.div>
  </motion.div>
);

// ============================================
// MORPH NUMBERS
// ============================================
interface MorphNumberProps {
  value: number;
  className?: string;
  format?: (n: number) => string;
}

export const MorphNumber = ({ 
  value, 
  className,
  format = (n) => n.toLocaleString('pt-BR')
}: MorphNumberProps) => {
  const motionValue = useMotionValue(0);
  const displayValue = useTransform(motionValue, (v) => format(Math.round(v)));
  const [display, setDisplay] = useState(format(0));

  useState(() => {
    import("framer-motion").then(({ animate }) => {
      const controls = animate(motionValue, value, {
        duration: 1,
        ease: "easeOut"
      });
      const unsubscribe = motionValue.on("change", (v) => {
        setDisplay(format(Math.round(v)));
      });
      return () => {
        controls.stop();
        unsubscribe();
      };
    });
  });

  return <span className={className}>{display}</span>;
};

// ============================================
// BLUR FADE IN
// ============================================
interface BlurFadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const BlurFadeIn = ({ children, delay = 0, className }: BlurFadeInProps) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, filter: "blur(10px)" }}
    animate={{ opacity: 1, filter: "blur(0px)" }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
);

// ============================================
// GRADIENT BORDER
// ============================================
interface GradientBorderProps {
  children: React.ReactNode;
  animate?: boolean;
  className?: string;
}

export const GradientBorder = ({ children, animate = true, className }: GradientBorderProps) => (
  <div className={cn("relative p-[2px] rounded-xl overflow-hidden", className)}>
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary"
      animate={animate ? { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] } : undefined}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      style={{ backgroundSize: '200% 200%' }}
    />
    <div className="relative bg-background rounded-[10px]">
      {children}
    </div>
  </div>
);

// ============================================
// SKELETON SHIMMER
// ============================================
interface SkeletonShimmerProps {
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export const SkeletonShimmer = ({ className, rounded = 'md' }: SkeletonShimmerProps) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-muted",
        roundedClasses[rounded],
        className
      )}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};
