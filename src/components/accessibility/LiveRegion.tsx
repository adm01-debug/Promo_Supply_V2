import * as React from "react";

// Announcement for screen readers
interface LiveRegionProps {
  message: string;
  "aria-live"?: "polite" | "assertive";
}

export const LiveRegion = ({ message, "aria-live": ariaLive = "polite" }: LiveRegionProps) => {
  return (
    <div
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

// Hook for announcing messages to screen readers
export const useAnnounce = () => {
  const [message, setMessage] = React.useState("");

  const announce = React.useCallback((text: string, duration = 3000) => {
    setMessage(text);
    
    // Clear after duration
    const timeout = setTimeout(() => {
      setMessage("");
    }, duration);

    return () => clearTimeout(timeout);
  }, []);

  return {
    message,
    announce,
    LiveRegion: () => <LiveRegion message={message} />,
  };
};

// Component to detect and respect reduced motion preference
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
};

// High contrast mode detection
export const useHighContrast = () => {
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-contrast: more)");
    setPrefersHighContrast(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersHighContrast;
};

// Keyboard-only mode detection (show focus indicators only for keyboard users)
export const useKeyboardMode = () => {
  const [isKeyboardMode, setIsKeyboardMode] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        setIsKeyboardMode(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardMode(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return isKeyboardMode;
};
