import { useEffect, useState, useCallback } from 'react';
import { 
  initWebVitals, 
  getCurrentMetrics, 
  getMetricsHistory,
  clearMetricsHistory,
  sendReport,
  VitalsMetric,
  VitalsReport,
  WEB_VITALS_THRESHOLDS 
} from '@/lib/webVitals';
import { useAuth } from './useAuth';

export interface WebVitalsState {
  metrics: VitalsMetric[];
  history: VitalsReport[];
  isLoading: boolean;
}

export const useWebVitals = (options?: { autoInit?: boolean; debug?: boolean }) => {
  const [state, setState] = useState<WebVitalsState>({
    metrics: [],
    history: [],
    isLoading: true,
  });
  
  const { user } = useAuth();

  // Initialize Web Vitals monitoring
  useEffect(() => {
    if (options?.autoInit !== false) {
      initWebVitals({
        userId: user?.id,
        debug: options?.debug,
        onReport: (report) => {
          setState(prev => ({
            ...prev,
            metrics: report.metrics,
          }));
        },
      });
    }

    // Load history
    setState(prev => ({
      ...prev,
      history: getMetricsHistory(),
      isLoading: false,
    }));
  }, [user?.id, options?.autoInit, options?.debug]);

  // Refresh metrics
  const refreshMetrics = useCallback(() => {
    setState(prev => ({
      ...prev,
      metrics: getCurrentMetrics(),
      history: getMetricsHistory(),
    }));
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    clearMetricsHistory();
    setState(prev => ({
      ...prev,
      metrics: [],
      history: [],
    }));
  }, []);

  // Force send current report
  const forceReport = useCallback(() => {
    sendReport(user?.id);
    refreshMetrics();
  }, [user?.id, refreshMetrics]);

  // Get summary statistics
  const getSummary = useCallback(() => {
    const metrics = state.metrics;
    if (metrics.length === 0) return null;

    const summary: Record<string, { value: number; rating: string }> = {};
    
    metrics.forEach(metric => {
      summary[metric.name] = {
        value: metric.value,
        rating: metric.rating,
      };
    });

    return summary;
  }, [state.metrics]);

  // Check if performance is good
  const isPerformanceGood = useCallback(() => {
    return state.metrics.every(m => m.rating === 'good');
  }, [state.metrics]);

  // Get poor metrics
  const getPoorMetrics = useCallback(() => {
    return state.metrics.filter(m => m.rating === 'poor');
  }, [state.metrics]);

  return {
    ...state,
    thresholds: WEB_VITALS_THRESHOLDS,
    refreshMetrics,
    clearHistory,
    forceReport,
    getSummary,
    isPerformanceGood,
    getPoorMetrics,
  };
};

export default useWebVitals;
