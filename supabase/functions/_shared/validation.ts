import { z } from "https://esm.sh/zod@3.22.4";
import { EdgeLogger } from "./logger.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

/**
 * Enhanced validation utility that automatically logs failures to telemetry.
 */
export async function validateBody<T>(
  req: Request, 
  schema: z.ZodSchema<T>, 
  logger?: EdgeLogger
): Promise<T> {
  let body: any;
  try {
    body = await req.json();
  } catch (error) {
    const msg = "Invalid JSON body";
    if (logger) logger.error(msg, { error: error.message });
    throw new Error(msg);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    const msg = `Validation error: ${errors}`;
    if (logger) {
      logger.warn(msg, { 
        body: logger.info ? body : '[REDACTED]', // Only log body if not in prod-like sensitivity
        validationErrors: result.error.errors 
      });
    }
    throw new Error(msg);
  }

  return result.data;
}

/**
 * Standardized error response with proper status codes and logging.
 */
export function errorResponse(error: unknown, logger?: EdgeLogger, headers = corsHeaders) {
  const message = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
  const requestId = logger?.getRequestId() || "req_" + crypto.randomUUID().slice(0, 8);
  
  let status = 500;
  let details: any = undefined;

  // Pattern matching for error categorization
  const msgLower = message.toLowerCase();
  
  if (msgLower.includes('validation error') || msgLower.includes('invalid json')) {
    status = 400;
  } else if (msgLower.includes('auth') || msgLower.includes('sessão inválida') || msgLower.includes('unauthorized')) {
    status = 401;
  } else if (msgLower.includes('security error') || msgLower.includes('isolation violation') || msgLower.includes('permission denied')) {
    status = 403;
  } else if (msgLower.includes('not found')) {
    status = 404;
  }

  // Extract validation details if available from Zod error message
  if (status === 400 && message.includes('Validation error:')) {
    details = {
      validation_error: true,
      fields: message.replace('Validation error: ', '').split(', ')
    };
  }

  if (logger && status === 500) {
    logger.error("Internal Server Error occurred", { error: message, requestId });
  }

  return new Response(JSON.stringify({ 
    error: message,
    requestId,
    status: "error",
    timestamp: new Date().toISOString(),
    details,
    code: status
  }), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/**
 * Ensures a request is using a supported HTTP method.
 */
export function validateMethod(req: Request, methods: string[]) {
  if (!methods.includes(req.method)) {
    throw new Error(`Method ${req.method} not allowed. Use: ${methods.join(', ')}`);
  }
}


