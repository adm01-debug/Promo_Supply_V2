import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Hook to profile component renders in development mode.
 * Logs render count and time since last render.
 */
export function useRenderProfiler(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      renderCount.current++;
      const now = performance.now();
      const duration = now - startTime.current;
      
      logger.debug(`[Profiler] ${componentName} render #${renderCount.current} took ${duration.toFixed(2)}ms`);
      
      // Update for next render
      startTime.current = performance.now();
    }
  });
}
