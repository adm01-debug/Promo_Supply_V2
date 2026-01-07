import { onCLS, onFCP, onINP, onLCP, onTTFB, Metric } from 'web-vitals';

export interface VitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
  path: string;
}

export interface VitalsReport {
  metrics: VitalsMetric[];
  sessionId: string;
  userId?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType?: string;
  timestamp: number;
}

// Thresholds based on Google's Web Vitals recommendations
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FCP: { good: 1800, poor: 3000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 800, poor: 1800 },
};

// Generate unique session ID
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get device type based on screen width
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Get connection type if available
const getConnectionType = (): string | undefined => {
  const nav = navigator as any;
  return nav.connection?.effectiveType || nav.connection?.type;
};

// Rate the metric value
const rateMetric = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};

// Store for collected metrics
let collectedMetrics: VitalsMetric[] = [];
let sessionId = generateSessionId();
let reportCallback: ((report: VitalsReport) => void) | null = null;
let isInitialized = false;

// Process metric and store it
const processMetric = (metric: Metric) => {
  const vitalsMetric: VitalsMetric = {
    name: metric.name,
    value: metric.value,
    rating: rateMetric(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || 'unknown',
    timestamp: Date.now(),
    path: window.location.pathname,
  };

  collectedMetrics.push(vitalsMetric);

  // Log in development
  if (import.meta.env.DEV) {
    const color = vitalsMetric.rating === 'good' ? '🟢' : 
                  vitalsMetric.rating === 'needs-improvement' ? '🟡' : '🔴';
    console.log(
      `${color} ${metric.name}: ${metric.value.toFixed(2)} (${vitalsMetric.rating})`
    );
  }

  // Trigger callback if set
  if (reportCallback) {
    reportCallback(generateReport());
  }
};

// Generate current report
const generateReport = (userId?: string): VitalsReport => {
  return {
    metrics: [...collectedMetrics],
    sessionId,
    userId,
    deviceType: getDeviceType(),
    connectionType: getConnectionType(),
    timestamp: Date.now(),
  };
};

// Initialize Web Vitals monitoring
export const initWebVitals = (options?: {
  onReport?: (report: VitalsReport) => void;
  userId?: string;
  debug?: boolean;
}) => {
  if (isInitialized) return;
  isInitialized = true;

  if (options?.onReport) {
    reportCallback = options.onReport;
  }

  // Register all vital metrics
  onCLS(processMetric);
  onFCP(processMetric);
  onINP(processMetric);
  onLCP(processMetric);
  onTTFB(processMetric);

  // Log initialization in debug mode
  if (options?.debug || import.meta.env.DEV) {
    console.log('📊 Web Vitals monitoring initialized');
    console.log(`Session ID: ${sessionId}`);
    console.log(`Device: ${getDeviceType()}`);
    console.log(`Connection: ${getConnectionType() || 'unknown'}`);
  }

  // Send report on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendReport(options?.userId);
      }
    });

    // Also send on beforeunload as fallback
    window.addEventListener('beforeunload', () => {
      sendReport(options?.userId);
    });
  }
};

// Send report to analytics endpoint
export const sendReport = async (userId?: string) => {
  if (collectedMetrics.length === 0) return;

  const report = generateReport(userId);

  // Use sendBeacon for reliability during page unload
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(report)], { type: 'application/json' });
    
    // In production, you would send to your analytics endpoint
    // navigator.sendBeacon('/api/vitals', blob);
    
    if (import.meta.env.DEV) {
      console.log('📤 Web Vitals Report:', report);
    }
  }

  // Store in localStorage as backup/history
  try {
    const history = JSON.parse(localStorage.getItem('webVitalsHistory') || '[]');
    history.push(report);
    // Keep only last 10 reports
    if (history.length > 10) history.shift();
    localStorage.setItem('webVitalsHistory', JSON.stringify(history));
  } catch (e) {
    // localStorage might be full or disabled
  }
};

// Get current metrics
export const getCurrentMetrics = (): VitalsMetric[] => [...collectedMetrics];

// Get metrics history from localStorage
export const getMetricsHistory = (): VitalsReport[] => {
  try {
    return JSON.parse(localStorage.getItem('webVitalsHistory') || '[]');
  } catch {
    return [];
  }
};

// Clear metrics history
export const clearMetricsHistory = () => {
  collectedMetrics = [];
  localStorage.removeItem('webVitalsHistory');
};

// Reset session (for SPA navigation)
export const resetSession = () => {
  collectedMetrics = [];
  sessionId = generateSessionId();
};

// Export thresholds for reference
export const WEB_VITALS_THRESHOLDS = THRESHOLDS;
