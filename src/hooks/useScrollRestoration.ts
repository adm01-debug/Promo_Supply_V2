import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

export function useScrollRestoration() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Save scroll position of the page we're leaving
    const prevPath = prevPathRef.current;
    if (prevPath !== location.pathname) {
      scrollPositions.set(prevPath, window.scrollY);
    }
    prevPathRef.current = location.pathname;

    // Restore scroll position for the new page (or scroll to top)
    const saved = scrollPositions.get(location.pathname);
    requestAnimationFrame(() => {
      window.scrollTo(0, saved ?? 0);
    });
  }, [location.pathname]);
}
