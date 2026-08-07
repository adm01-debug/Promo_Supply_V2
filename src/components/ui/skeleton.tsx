import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "text" | "circle";
}

/**
 * Atom: EliteSkeleton
 * Premium shimmer effect for loading states.
 */
function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  const variants = {
    default: "rounded-md",
    card: "rounded-xl h-64",
    text: "rounded-sm h-4 w-3/4",
    circle: "rounded-full h-12 w-12",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/40",
        variants[variant],
        className
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
}

export { Skeleton };
