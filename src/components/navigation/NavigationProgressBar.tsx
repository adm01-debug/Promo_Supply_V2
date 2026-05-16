import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * High-end navigation progress bar with glow effect and scroll sync.
 */
export const NavigationProgressBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [navVisible, setNavVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    setNavVisible(true);
    setProgress(30);
    
    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setNavVisible(false);
        setProgress(0);
      }, 400);
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {/* Route Navigation Progress */}
      {navVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[1001] h-[3px] pointer-events-none"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.5)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          
          {/* Neon Glow Pulse */}
          <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-r from-transparent to-white/30 blur-sm animate-pulse" />
        </motion.div>
      )}

      {/* Scroll Progress Indicator - Ultra Minimalist */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-violet-500/50 to-fuchsia-500/50 z-[1000] origin-left pointer-events-none opacity-40"
        style={{ scaleX }}
      />
    </>
  );
};
