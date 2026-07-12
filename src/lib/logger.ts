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

class Logger {
  private static instance: Logger;
  private requestId: string;
  private tenantId: string | null = null;

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
      this.sendToTelemetry(entry);
    }
  }

  private async sendToTelemetry(entry: LogEntry) {
    try {
      // Lazy load supabase to avoid circular dependencies if any
      const { supabase } = await import("@/integrations/supabase/client");
      
      await supabase.functions.invoke("telemetry", {
        body: {
          level: entry.level,
          message: entry.message,
          context: entry.context,
          requestId: entry.requestId,
          tenantId: entry.tenantId,
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      });
    } catch (err) {
      // Silent fail to avoid infinite loops
       
      console.warn("Failed to send log to telemetry", err);
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
