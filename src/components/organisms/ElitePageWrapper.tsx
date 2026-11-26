import React from 'react';
import { motion } from 'framer-motion';

interface ElitePageWrapperProps {
  children: React.ReactNode;
}

/**
 * Organism: ElitePageWrapper
 * Consistent page entrance and exit animations for elite UX.
 */
export const ElitePageWrapper: React.FC<ElitePageWrapperProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1], // Quintic out for premium feel
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};
