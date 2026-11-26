import { cn } from "@/lib/utils";

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** If true, shows content on focus (useful for skip links) */
  showOnFocus?: boolean;
}

export const VisuallyHidden = ({
  children,
  className,
  showOnFocus = false,
  ...props
}: VisuallyHiddenProps) => {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "[clip:rect(0,0,0,0)]",
        showOnFocus && [
          "focus-within:static focus-within:w-auto focus-within:h-auto",
          "focus-within:m-0 focus-within:overflow-visible",
          "focus-within:whitespace-normal focus-within:[clip:auto]",
        ],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// Announce content to screen readers
export const LiveRegion = ({
  children,
  mode = "polite",
  className,
  ...props
}: {
  children: React.ReactNode;
  mode?: "polite" | "assertive";
} & React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      role="status"
      aria-live={mode}
      aria-atomic="true"
      className={cn("sr-only", className)}
      {...props}
    >
      {children}
    </div>
  );
};
