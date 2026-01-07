import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode } from "react";

interface PageTransitionWrapperProps {
  children: ReactNode;
}

// Different transition variants for variety
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      when: "beforeChildren" as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

// Slide variant for navigation-like transitions
const slideVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 100 : -100,
  }),
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -100 : 100,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

// Fade variant for subtle transitions
const fadeVariants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const,
    },
  },
};

// Scale variant for modal-like pages
const scaleVariants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.34, 1.56, 0.64, 1] as const, // Slight spring
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: "easeOut" as const,
    },
  },
};

export const PageTransitionWrapper = ({ children }: PageTransitionWrapperProps) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Alternative transitions for different contexts
export const SlideTransition = ({ children }: PageTransitionWrapperProps) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" custom={1} initial={false}>
      <motion.div
        key={location.pathname}
        custom={1}
        variants={slideVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export const FadeTransition = ({ children }: PageTransitionWrapperProps) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={fadeVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export const ScaleTransition = ({ children }: PageTransitionWrapperProps) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={scaleVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Hook to get transition based on route type
export const usePageTransition = () => {
  const location = useLocation();
  
  // Determine transition type based on route
  const getTransitionType = (): "slide" | "fade" | "scale" | "default" => {
    const path = location.pathname;
    
    // Modal-like pages (details, forms)
    if (path.includes("/cotacao/") || path.includes("/gerar-ordem")) {
      return "scale";
    }
    
    // Dashboard pages
    if (path === "/" || path === "/compras" || path.includes("dashboard")) {
      return "fade";
    }
    
    // Default for most navigation
    return "default";
  };

  return { transitionType: getTransitionType(), location };
};

export default PageTransitionWrapper;
