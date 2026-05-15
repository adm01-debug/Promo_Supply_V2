/**
 * Centralized security utilities for Edge Functions.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validates if the request has a valid authorization header.
 */
export const validateAuth = (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }
  return authHeader;
};

/**
 * Standard response helpers for edge functions.
 */
export const responses = {
  success: (data: any) => new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  ),
  error: (message: string, status = 400) => new Response(
    JSON.stringify({ error: message }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  ),
};
