import { useEffect } from 'react';
import { performanceMonitor } from '@/lib/performance';

/**
 * Hook to initialize performance monitoring for Core Web Vitals
 * and other application metrics.
 */
export function usePerformanceMonitor() {
  useEffect(() => {
    // Start monitoring Core Web Vitals
    const cleanup = performanceMonitor.initAll();

    // Mark application mount
    performanceMonitor.mark('app-mount');

    return () => {
      // Mark application unmount
      performanceMonitor.mark('app-unmount');
      performanceMonitor.measure('app-session-lifetime', 'app-mount', 'app-unmount');
      
      cleanup();
    };
  }, []);
}
