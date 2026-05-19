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
  const message = error instanceof Error ? error.message : "Internal Server Error";
  const status = message.startsWith('Validation error') || message === 'Invalid JSON body' ? 400 : 500;
  
  if (logger && status === 500) {
    logger.error("Internal Server Error occurred", { error: message });
  }

  return new Response(JSON.stringify({ 
    error: message,
    requestId: logger?.getRequestId(),
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
