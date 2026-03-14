import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Fade In animation variants
export const fadeInVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

// Scale animation variants
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

// Slide animation variants
export const slideInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

// Stagger container variants
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

// Stagger item variants
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

// Button hover/tap animations
export const buttonTapVariants = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02 }
};

// Card hover animations
export const cardHoverVariants = {
  rest: { 
    scale: 1,
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)"
  },
  hover: { 
    scale: 1.02,
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    transition: { duration: 0.2 }
  }
};

// Pulse animation for notifications
export const pulseVariants: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 2
    }
  }
};

// Spring animation config
export const springConfig = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30
};

// Smooth spring config
export const smoothSpringConfig = {
  type: "spring" as const,
  stiffness: 200,
  damping: 25
};

// MotionCard component
interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  enableHover?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, className, enableHover = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
        initial="rest"
        whileHover={enableHover ? "hover" : undefined}
        variants={cardHoverVariants}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = "MotionCard";

// MotionButton wrapper
interface MotionButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={className}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={smoothSpringConfig}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
MotionButton.displayName = "MotionButton";

// FadeIn component
interface FadeInProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, className, delay = 0, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.4, ease: "easeOut", delay }
          }
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
FadeIn.displayName = "FadeIn";

// ScaleIn component
interface ScaleInProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
}

export const ScaleIn = forwardRef<HTMLDivElement, ScaleInProps>(
  ({ children, className, delay = 0, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, scale: 0.9 },
          visible: { 
            opacity: 1, 
            scale: 1,
            transition: { duration: 0.3, ease: "easeOut", delay }
          }
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
ScaleIn.displayName = "ScaleIn";

// SlideIn component
interface SlideInProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
}

export const SlideIn = forwardRef<HTMLDivElement, SlideInProps>(
  ({ children, className, direction = "left", delay = 0, ...props }, ref) => {
    const directionOffset = {
      left: { x: -30, y: 0 },
      right: { x: 30, y: 0 },
      up: { x: 0, y: -30 },
      down: { x: 0, y: 30 }
    };

    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{ opacity: 0, ...directionOffset[direction] }}
        animate={{ 
          opacity: 1, 
          x: 0, 
          y: 0,
          transition: { duration: 0.4, ease: "easeOut", delay }
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
SlideIn.displayName = "SlideIn";

// StaggerContainer for lists
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  staggerDelay?: number;
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, className, staggerDelay = 0.1, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: staggerDelay,
              delayChildren: 0.1
            }
          }
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerContainer.displayName = "StaggerContainer";

// StaggerItem for list items
interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        variants={staggerItemVariants}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerItem.displayName = "StaggerItem";

// AnimatedCounter for numbers
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (value: number) => string;
}

export const AnimatedCounter = ({ 
  value, 
  duration = 1, 
  className,
  formatFn = (v) => v.toLocaleString("pt-BR")
}: AnimatedCounterProps) => {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={value}
    >
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {formatFn(value)}
      </motion.span>
    </motion.span>
  );
};

// PageTransition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition = React.forwardRef<HTMLDivElement, PageTransitionProps>(({ children, className }, ref) => {
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
});
PageTransition.displayName = 'PageTransition';

// Floating animation for decorative elements
export const FloatingElement = ({ 
  children, 
  className,
  amplitude = 10,
  duration = 3
}: { 
  children: React.ReactNode; 
  className?: string;
  amplitude?: number;
  duration?: number;
}) => {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -amplitude, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
};

// Shimmer effect for loading
export const ShimmerEffect = ({ className }: { className?: string }) => {
  return (
    <motion.div
      className={cn("absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent", className)}
      animate={{ x: ["0%", "200%"] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
        repeatDelay: 1
      }}
    />
  );
};

// AnimatedList with AnimatePresence
import { AnimatePresence } from "framer-motion";

interface AnimatedListProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export const AnimatedList = forwardRef<HTMLDivElement, AnimatedListProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <AnimatePresence mode="popLayout">
        <motion.div
          ref={ref}
          className={className}
          initial="hidden"
          animate="visible"
          variants={staggerContainerVariants}
          {...props}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }
);
AnimatedList.displayName = "AnimatedList";

// AnimatedListItem for list items with exit animations
export const AnimatedListItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        layout
        variants={staggerItemVariants}
        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedListItem.displayName = "AnimatedListItem";

// Hover scale wrapper
interface HoverScaleProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  scale?: number;
}

export const HoverScale = forwardRef<HTMLDivElement, HoverScaleProps>(
  ({ children, className, scale = 1.02, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        whileHover={{ scale }}
        whileTap={{ scale: 0.98 }}
        transition={smoothSpringConfig}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
HoverScale.displayName = "HoverScale";

// Attention animation for important elements
export const AttentionPulse = ({ 
  children, 
  className,
  active = true
}: { 
  children: React.ReactNode; 
  className?: string;
  active?: boolean;
}) => {
  return (
    <motion.div
      className={className}
      animate={active ? {
        scale: [1, 1.02, 1],
        boxShadow: [
          "0 0 0 0 rgba(var(--primary), 0)",
          "0 0 0 8px rgba(var(--primary), 0.1)",
          "0 0 0 0 rgba(var(--primary), 0)"
        ]
      } : {}}
      transition={{
        duration: 2,
        repeat: active ? Infinity : 0,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
};

// Success check animation
export const SuccessCheck = ({ className }: { className?: string }) => {
  return (
    <motion.svg
      className={cn("w-6 h-6 text-success", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M20 6L9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </motion.svg>
  );
};

// Loading spinner with framer motion
export const LoadingSpinner = ({ 
  className,
  size = 24
}: { 
  className?: string;
  size?: number;
}) => {
  return (
    <motion.div
      className={cn("border-2 border-primary/30 border-t-primary rounded-full", className)}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
};

// Entrance animation wrapper with direction
export const EntranceAnimation = ({ 
  children, 
  className,
  direction = "up",
  delay = 0,
  duration = 0.4
}: { 
  children: React.ReactNode; 
  className?: string;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
}) => {
  const directionMap = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { x: -20, y: 0 },
    right: { x: 20, y: 0 },
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};
