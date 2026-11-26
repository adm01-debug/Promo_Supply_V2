import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { forwardRef, useEffect, useState } from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

type SonnerRef = HTMLDivElement;

const toasterClassNames = {
  toast:
    "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
  description: "group-[.toast]:text-muted-foreground",
  actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
  cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
};

const Toaster = forwardRef<SonnerRef, ToasterProps>(({ ...props }, ref) => {
  const [mounted, setMounted] = useState(false);
  const { theme = "system" } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sonner
      ref={ref}
      theme={mounted ? (theme as ToasterProps["theme"]) : "system"}
      className="toaster group"
      toastOptions={{ classNames: toasterClassNames }}
      {...props}
    />
  );
});

Toaster.displayName = "Toaster";

export { Toaster, toast };
