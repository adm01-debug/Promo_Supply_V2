import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function NavigationProgressBar() {
  const [isNavigating, setIsNavigating] = useState(false);

  // Listen for Suspense-based loading via a simple route-change detector
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver(() => {
      // Detect when PageLoader is mounted (Suspense fallback)
      const loader = document.querySelector('[data-page-loader]');
      if (loader) {
        setIsNavigating(true);
      } else {
        timeout = setTimeout(() => setIsNavigating(false), 300);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[60] h-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: '90%' }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NavigationProgressBar;
