/**
 * Centralized logging utility for Edge Functions.
 * Enforces JSON structured logging for observability and persistence.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeTruncate } from "./logLevel.ts";

const MAX_LOG_MESSAGE_LEN = 45000;
const MAX_ERR_MESSAGE_LEN = 500;
// QA 049: profundidade maxima da redacao de contexto (protege contra ciclo).
const MAX_SANITIZE_DEPTH = 8;
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'auth', 'cvv', 'authorization'];

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
    return this.redactValue(context, 0) as Record<string, unknown>;
  }

  /**
   * QA 049 (EDGA-09): a redacao precisa descer nos objetos e arrays aninhados.
   * Antes, `sanitizeContext` so olhava as chaves de primeiro nivel, entao
   * `{ body: { senha: "..." } }` ia inteiro para `telemetry_logs`.
   *
   * Valores que nao sao objeto simples (Date, Error, Map, typed array...) sao
   * devolvidos como estao; reconstrui-los viraria `{}` e perderia o diagnostico.
   */
  private redactValue(value: unknown, depth: number): unknown {
    if (depth >= MAX_SANITIZE_DEPTH) return '[TRUNCATED]';
    if (Array.isArray(value)) return value.map((item) => this.redactValue(item, depth + 1));
    if (!this.isPlainObject(value)) return value;

    const sanitized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      sanitized[key] = this.isSensitiveKey(key) ? '[REDACTED]' : this.redactValue(item, depth + 1);
    }
    return sanitized;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  private isSensitiveKey(key: string): boolean {
    return SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s));
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
