import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "./card";

interface InteractiveCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverScale?: boolean;
  hoverShadow?: boolean;
}

export const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ children, className, hoverScale = true, hoverShadow = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverScale ? { y: -6, scale: 1.02 } : {}}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "transition-all duration-300 ease-out",
          hoverShadow && "hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/20",
          className
        )}
        {...props}
      >
        <Card className="h-full border-border/50 bg-card/50 backdrop-blur-md transition-colors hover:bg-card/80">
          {children}
        </Card>
      </motion.div>
    );
  }
);

InteractiveCard.displayName = "InteractiveCard";
