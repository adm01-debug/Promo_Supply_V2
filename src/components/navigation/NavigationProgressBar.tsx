import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Atom: NavigationProgressBar
 * Elite scroll and navigation progress indicator with spring physics.
 */
export const NavigationProgressBar: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-primary z-[100] origin-left shadow-[0_0_10px_rgba(var(--primary),0.5)]"
      style={{ scaleX }}
    />
  );
};
