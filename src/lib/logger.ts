/**
 * Centralized logging utility for the frontend.
 * Enforces structured logging and prevents sensitive data leak.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
  tenantId?: string;
}

const TELEMETRY_BATCH_INTERVAL_MS = 5_000;
const TELEMETRY_MAX_BATCH = 20;
const TELEMETRY_RATE_WINDOW_MS = 60_000;
const TELEMETRY_RATE_LIMIT = 60;

class Logger {
  private static instance: Logger;
  private requestId: string;
  private tenantId: string | null = null;
  private telemetryQueue: LogEntry[] = [];
  private telemetryFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private telemetryCallsInWindow = 0;
  private telemetryWindowStart = 0;

  private constructor() {
    this.requestId = crypto.randomUUID();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private async log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    // In production, we don't log 'debug'
    if (level === 'debug' && import.meta.env.PROD) return;

    const entry: LogEntry = {
      message,
      level,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      tenantId: this.tenantId || undefined,
      context: this.sanitizeContext(context),
    };

    const output = JSON.stringify(entry);

    // Console output for development and debugging
    switch (level) {
      case 'error':
        // console.error(output);
        break;
      case 'warn':
        // console.warn(output);
        break;
      default:
         
        // console.info(output);
    }

    // Persist to telemetry for critical levels or in production
    if (level === 'error' || level === 'warn' || import.meta.env.PROD) {
      this.enqueueTelemetry(entry);
    }
  }

  private enqueueTelemetry(entry: LogEntry) {
    const now = Date.now();
    if (now - this.telemetryWindowStart > TELEMETRY_RATE_WINDOW_MS) {
      this.telemetryWindowStart = now;
      this.telemetryCallsInWindow = 0;
    }
    if (this.telemetryCallsInWindow >= TELEMETRY_RATE_LIMIT) return;

    this.telemetryQueue.push(entry);

    if (this.telemetryQueue.length >= TELEMETRY_MAX_BATCH) {
      this.flushTelemetry();
      return;
    }

    if (!this.telemetryFlushTimer) {
      this.telemetryFlushTimer = setTimeout(() => this.flushTelemetry(), TELEMETRY_BATCH_INTERVAL_MS);
    }
  }

  private flushTelemetry() {
    if (this.telemetryFlushTimer) {
      clearTimeout(this.telemetryFlushTimer);
      this.telemetryFlushTimer = null;
    }
    const batch = this.telemetryQueue.splice(0, TELEMETRY_MAX_BATCH);
    if (batch.length === 0) return;
    this.telemetryCallsInWindow++;
    this.sendBatchToTelemetry(batch);
  }

  private async sendBatchToTelemetry(entries: LogEntry[]) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.functions.invoke("telemetry", {
        body: {
          batch: entries.map(e => ({
            level: e.level,
            message: e.message,
            context: e.context,
            requestId: e.requestId,
            tenantId: e.tenantId,
            url: window.location.href,
            userAgent: navigator.userAgent,
          })),
        },
      });
    } catch (err) {
      // Silent fail to avoid infinite loops
      console.warn("Failed to send log batch to telemetry", err);
    }
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'cvv'];
    const sanitized = { ...context };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  public info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  public error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  public debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  public getRequestId() {
    return this.requestId;
  }

  public setTenantId(id: string | null) {
    this.tenantId = id;
  }
}

export const logger = Logger.getInstance();
