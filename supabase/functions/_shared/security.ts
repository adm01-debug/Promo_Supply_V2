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
  success: (data: any, requestId?: string) => new Response(
    JSON.stringify({
      data,
      requestId,
      status: "success",
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  ),
  error: (message: string, status = 400, requestId?: string, details?: any) => new Response(
    JSON.stringify({ 
      error: message, 
      requestId, 
      details,
      status: "error",
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  ),
};

/**
 * Validates that the request has a tenant context and it matches the resource.
 * Enforces isolation in multi-tenant environments.
 */
export const validateTenant = (req: Request, resourceTenantId?: string) => {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    throw new Error('Validation error: Missing x-tenant-id header');
  }
  
  if (resourceTenantId && resourceTenantId !== tenantId) {
    throw new Error('Security error: Tenant isolation violation');
  }
  
  return tenantId;
};

