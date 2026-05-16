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
        whileHover={hoverScale ? { y: -4, scale: 1.01 } : {}}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "transition-shadow duration-300",
          hoverShadow && "hover:shadow-xl hover:shadow-primary/5",
          className
        )}
        {...props}
      >
        <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
          {children}
        </Card>
      </motion.div>
    );
  }
);

InteractiveCard.displayName = "InteractiveCard";
