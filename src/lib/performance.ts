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
        if (!window.performance.getEntriesByName(startMark).length) return 0;
        
        window.performance.measure(name, startMark, endMark);
        const entries = window.performance.getEntriesByName(name);
        const duration = entries[entries.length - 1].duration;
        logger.info(`Performance measure [${name}]: ${duration.toFixed(2)}ms`);
        return duration;
      } catch (e) {
        // Silently fail if marks are missing
      }
    }
    return 0;
  },

  trackLCP: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          logger.info(`LCP (Largest Contentful Paint): ${lastEntry.startTime.toFixed(2)}ms`);
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        return observer;
      } catch (e) {
        logger.debug('LCP observation not supported');
      }
    }
  },

  trackCLS: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
              if (clsValue > 0.1) {
                logger.warn(`High CLS detected: ${clsValue.toFixed(4)}`);
              }
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        return observer;
      } catch (e) {
        logger.debug('CLS observation not supported');
      }
    }
  },

  trackFID: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const delay = (entry as any).processingStart - entry.startTime;
            logger.info(`FID (First Input Delay): ${delay.toFixed(2)}ms`);
          }
        });
        observer.observe({ type: 'first-input', buffered: true });
        return observer;
      } catch (e) {
        logger.debug('FID observation not supported');
      }
    }
  },

  trackFCP: () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              logger.info(`FCP (First Contentful Paint): ${entry.startTime.toFixed(2)}ms`);
            }
          }
        });
        observer.observe({ type: 'paint', buffered: true });
        return observer;
      } catch (e) {
        logger.debug('FCP observation not supported');
      }
    }
  },

  initAll: () => {
    const observers = [
      performanceMonitor.trackLCP(),
      performanceMonitor.trackCLS(),
      performanceMonitor.trackFID(),
      performanceMonitor.trackFCP()
    ].filter(Boolean);

    return () => {
      observers.forEach(o => o?.disconnect());
    };
  }
};
