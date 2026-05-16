import { z } from "https://esm.sh/zod@3.22.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

export async function validateBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new Error('Invalid JSON body');
  }
}

export function errorResponse(error: unknown, headers = corsHeaders) {
  const message = error instanceof Error ? error.message : "Internal Server Error";
  const status = message.startsWith('Validation error') ? 400 : 500;
  
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
