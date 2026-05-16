import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button as ShadcnButton } from '@/components/ui/button';
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
  ({ className, variant, size, children, loading, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      haptics.light();
      if (props.onClick) props.onClick(e);
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02, translateY: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        className={cn("relative overflow-hidden", className)}
        {...(props as any)}
      >
        <ShadcnButton
          variant={variant}
          size={size}
          className="w-full h-full pointer-events-none"
          disabled={loading || props.disabled}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              />
              <span>Carregando...</span>
            </div>
          ) : (
            children
          )}
        </ShadcnButton>
        
        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full pointer-events-none"
          initial={false}
          whileHover={{ x: ['100%', '-100%'] }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </motion.button>
    );
  }
);

EliteButton.displayName = "EliteButton";
