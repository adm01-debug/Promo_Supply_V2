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
          className="fixed top-0 left-0 right-0 z-[101] h-0.5 pointer-events-none"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.8)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </motion.div>
      )}

      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[1px] bg-violet-500/30 z-[100] origin-left pointer-events-none"
        style={{ scaleX }}
      />
    </>
  );
};
