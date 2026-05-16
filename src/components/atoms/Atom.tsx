import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface AtomProps extends HTMLMotionProps<"div"> {
  children?: React.ReactNode;
}

export const Atom = ({ className, children, ...props }: AtomProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("atom-container", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};
