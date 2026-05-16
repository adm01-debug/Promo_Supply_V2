import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook to manage scroll restoration.
 * Saves and restores scroll position for each route.
 */
export const useScrollRestoration = () => {
  const location = useLocation();
  const [scrollPositions, setScrollPositions] = useState<Record<string, number>>({});

  useEffect(() => {
    // Save current position before unmounting or location change
    const handleScroll = () => {
      setScrollPositions(prev => ({
        ...prev,
        [location.pathname]: window.scrollY
      }));
    };

    window.addEventListener("scroll", handleScroll);
    
    // Restore position for current path
    const savedPosition = scrollPositions[location.pathname];
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
