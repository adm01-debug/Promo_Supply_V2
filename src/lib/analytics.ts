import { logger } from './logger';

/**
 * Privacy-first analytics utility.
 * Tracks user interactions and page views without collecting PII.
 */

type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

class Analytics {
  private static instance: Analytics;
  private sessionId: string;

  private constructor() {
    this.sessionId = crypto.randomUUID();
    this.init();
  }

  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Track initial page view
    this.trackPageView(window.location.pathname);

    // Track clicks on actionable elements
    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button, a');
      
      if (button) {
        this.track('user_interaction', {
          element: button.tagName.toLowerCase(),
          text: (button as HTMLElement).innerText?.substring(0, 30),
          id: button.id,
          class: button.className
        });
      }
    });

    logger.info('Analytics inicializado', { sessionId: this.sessionId });
  }

  public track(name: string, properties?: Record<string, unknown>) {
    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    // In production, we would send this to an endpoint
    // For now, we log it with a specific prefix for monitoring
    logger.info(`[ANALYTICS] ${name}`, event.properties);
  }

  public trackPageView(path: string) {
    this.track('page_view', { path });
  }

  public trackError(error: Error, metadata?: Record<string, unknown>) {
    this.track('exception', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      ...metadata
    });
  }
}

export const analytics = Analytics.getInstance();
