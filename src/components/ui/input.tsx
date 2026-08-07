import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-2 text-base ring-offset-violet-500 file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:border-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-300 backdrop-blur-md text-white font-medium hover:bg-white/[0.04] hover:border-white/20",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 aria-[invalid=true]:animate-shake",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
