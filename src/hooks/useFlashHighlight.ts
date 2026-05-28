import { useState, useEffect, useRef } from 'react';

/**
 * Hook to trigger a flash highlight animation when a value changes.
 * Useful for showing users that data has updated in real-time.
 */
export function useFlashHighlight<T>(value: T) {
  const [shouldFlash, setShouldFlash] = useState(false);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setShouldFlash(true);
      const resetTimer = setTimeout(() => setShouldFlash(false), 1500);
      return () => clearTimeout(resetTimer);
    }, 100);

    return () => clearTimeout(timer);
  }, [value]);

  return shouldFlash ? 'animate-flash-highlight' : '';
}
