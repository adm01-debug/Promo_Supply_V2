/**
 * Centralized logging utility for Edge Functions.
 * Enforces JSON structured logging for observability and persistence.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeTruncate } from "./logLevel.ts";

const MAX_LOG_MESSAGE_LEN = 45000;
const MAX_ERR_MESSAGE_LEN = 500;

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, unknown>;
  requestId?: string;
  functionName?: string;
  userId?: string;
}

export class EdgeLogger {
  private requestId: string;
  private functionName: string;

  constructor(functionName: string, requestId?: string) {
    this.functionName = functionName;
    this.requestId = requestId || crypto.randomUUID();
  }

  private async log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      message: typeof message === "string" ? safeTruncate(message, MAX_LOG_MESSAGE_LEN) : String(message),
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

    // Persist critical logs to database if credentials are available
    if (level === 'error' || level === 'warn') {
      await this.persistLog(entry);
    }
  }

  private async persistLog(entry: LogEntry) {
    if (!supabaseUrl || !supabaseServiceKey) return;

    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from("telemetry_logs").insert({
        level: entry.level,
        message: `[${entry.functionName}] ${entry.message}`,
        context: entry.context,
        request_id: entry.requestId,
        url: `edge-function://${entry.functionName}`,
      });
    } catch (err: unknown) {
      // Silent fail for logging errors to avoid recursion
      const raw = err instanceof Error ? err.message : String(err);
      console.error("Failed to persist log to telemetry_logs:", safeTruncate(raw, MAX_ERR_MESSAGE_LEN));
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
