import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface EliteButtonProps extends HTMLMotionProps<"button"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}

/**
 * Atom: EliteButton
 * High-performance, tactile button with micro-interactions.
 */
export const EliteButton = React.forwardRef<HTMLButtonElement, EliteButtonProps>(
  ({ className, variant, size, children, loading, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      haptics.light();
      onClick?.(e as unknown as Parameters<NonNullable<HTMLMotionProps<"button">["onClick"]>>[0]);
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02, translateY: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        disabled={loading || props.disabled}
        className={cn(
          buttonVariants({ variant, size }),
          loading && "relative text-transparent transition-none hover:text-transparent",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}
        <span className="relative z-10 flex items-center gap-2">
          {loading ? <span>Carregando...</span> : children}
        </span>
      </motion.button>
    );
  }
);

EliteButton.displayName = "EliteButton";
