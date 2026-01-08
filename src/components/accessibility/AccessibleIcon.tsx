import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AccessibleIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: LucideIcon;
  label: string;
  size?: number;
  decorative?: boolean;
}

export const AccessibleIcon = ({
  icon: Icon,
  label,
  size = 20,
  decorative = false,
  className,
  ...props
}: AccessibleIconProps) => {
  if (decorative) {
    return (
      <span className={cn("inline-flex", className)} {...props}>
        <Icon size={size} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex", className)}
      {...props}
    >
      <Icon size={size} aria-hidden="true" />
    </span>
  );
};

// Icon button with proper accessibility
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: number;
}

export const IconButton = ({
  icon: Icon,
  label,
  size = 20,
  className,
  ...props
}: IconButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-lg p-2",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-muted/50 transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      <Icon size={size} aria-hidden="true" />
    </button>
  );
};
