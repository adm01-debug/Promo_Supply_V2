import { logger } from './logger';

/**
 * Utility for tracking application performance.
 * Following Core Web Vitals principles.
 */
export const performanceMonitor = {
  mark: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(name);
      logger.debug(`Performance mark: ${name}`);
    }
  },
  
  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        window.performance.measure(name, startMark, endMark);
        const entries = window.performance.getEntriesByName(name);
        const duration = entries[entries.length - 1].duration;
        logger.info(`Performance measure [${name}]: ${duration.toFixed(2)}ms`);
        return duration;
      } catch (e) {
        logger.warn(`Could not measure performance: ${name}`, { error: e });
      }
    }
    return 0;
  },

  trackLCP: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        logger.info(`LCP (Largest Contentful Paint): ${lastEntry.startTime.toFixed(2)}ms`);
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    }
  },

  trackCLS: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            logger.debug(`Current CLS: ${clsValue.toFixed(4)}`);
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    }
  }
};
