import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';

/**
 * Full-page loader shown during lazy-load Suspense boundaries.
 * Uses the brand logo with a subtle pulse + progress bar for perceived speed.
 */
export const PageLoader = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <div ref={ref} data-page-loader className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Brand icon with pulse */}
        <motion.div
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Package className="h-6 w-6 text-primary-foreground" />
        </motion.div>

        {/* Progress bar */}
        <div className="w-32 h-1 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>

        <p className="text-xs text-muted-foreground font-medium">Carregando módulo...</p>
      </motion.div>
    </div>
  );
});
PageLoader.displayName = 'PageLoader';
