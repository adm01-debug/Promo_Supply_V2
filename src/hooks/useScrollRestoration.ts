import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook to manage scroll restoration.
 * Saves and restores scroll position for each route.
 *
 * Uses a ref instead of state so the scroll handler doesn't cause re-renders
 * on every scroll and the restore reads the latest map (not a stale snapshot).
 */
export const useScrollRestoration = () => {
  const location = useLocation();
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    const path = location.pathname;
    const handleScroll = () => {
      scrollPositions.current[path] = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    const savedPosition = scrollPositions.current[path];
    if (savedPosition !== undefined) {
      window.scrollTo(0, savedPosition);
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.pathname]);
};
