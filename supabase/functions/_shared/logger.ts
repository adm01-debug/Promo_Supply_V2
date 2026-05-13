/**
 * Centralized logging utility for Edge Functions.
 * Enforces JSON structured logging for observability.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, unknown>;
  requestId?: string;
  functionName?: string;
}

export class EdgeLogger {
  private requestId: string;
  private functionName: string;

  constructor(functionName: string, requestId?: string) {
    this.functionName = functionName;
    this.requestId = requestId || crypto.randomUUID();
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      message,
      level,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      functionName: this.functionName,
      context: this.sanitizeContext(context),
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'cvv', 'authorization'];
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
}
