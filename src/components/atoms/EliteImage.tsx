import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface EliteImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

/**
 * Atom: EliteImage
 * Premium image loader with shimmer skeleton and fade-in transition.
 */
export const EliteImage: React.FC<EliteImageProps> = ({ 
  src, 
  alt, 
  className, 
  containerClassName,
  ...props 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      <AnimatePresence mode="wait">
        {!loaded && !error && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10"
          >
            <Skeleton className="w-full h-full rounded-inherit" />
          </motion.div>
        )}
      </AnimatePresence>

      <img
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-700 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
          Erro ao carregar
        </div>
      )}
    </div>
  );
};
