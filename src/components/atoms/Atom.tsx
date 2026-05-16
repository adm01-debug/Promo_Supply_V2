import * as React from "react";
import { cn } from "@/lib/utils";

export interface AtomProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
}

const Atom = React.forwardRef<HTMLElement, AtomProps>(
  ({ as: Component = "div", className, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("transition-all duration-300", className)}
        {...props}
      />
    );
  }
);
Atom.displayName = "Atom";

export { Atom };
