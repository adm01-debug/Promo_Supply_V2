import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { usePageTransition } from "./usePageTransition";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  const { pathname } = useLocation();
  const motionProps = usePageTransition();

  return (
    <motion.div
      key={pathname}
      className={className}
      style={{ willChange: "transform, opacity" }}
      initial={motionProps.initial}
      animate={motionProps.animate}
      exit={motionProps.exit}
      transition={motionProps.transition}
    >
      {children}
    </motion.div>
  );
};
