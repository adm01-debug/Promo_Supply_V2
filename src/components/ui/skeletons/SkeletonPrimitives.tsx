import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// Enhanced shimmer effect with multiple layers
export const ShimmerSkeleton = ({ 
  className, 
  variant = "default",
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "bright" | "subtle" | "glow";
}) => {
  const variantClasses = {
    default: "before:via-white/10",
    bright: "before:via-white/20",
    subtle: "before:via-white/5",
    glow: "before:via-primary/10 shadow-sm shadow-primary/5",
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:to-transparent",
        variantClasses[variant],
        className
      )} 
      {...props} 
    />
  );
};

// Pulsing skeleton for important elements
export const PulseSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "rounded-md bg-muted animate-pulse",
      "relative overflow-hidden",
      className
    )} 
    {...props} 
  />
);

// Skeleton with wave animation
export const WaveSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "relative overflow-hidden rounded-md bg-muted",
      "before:absolute before:inset-0",
      "before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent",
      "before:animate-[wave_1.5s_ease-in-out_infinite]",
      className
    )} 
    {...props} 
  />
);

// Loading indicator for skeleton states
export const SkeletonLoadingIndicator = ({ 
  message = "Carregando...",
  className 
}: { 
  message?: string;
  className?: string;
}) => (
  <motion.div 
    className={cn(
      "flex items-center gap-2 text-muted-foreground text-sm",
      className
    )}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>{message}</span>
  </motion.div>
);

// Progress skeleton with animated fill
export const ProgressSkeleton = ({ 
  progress = 0,
  className 
}: { 
  progress?: number;
  className?: string;
}) => (
  <div className={cn("h-2 rounded-full bg-muted overflow-hidden", className)}>
    <motion.div
      className="h-full bg-primary/50 rounded-full"
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    />
  </div>
);
