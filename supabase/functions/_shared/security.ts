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
    throw new Error('Security error: Missing x-tenant-id header for multi-tenant isolation');
  }
  
  if (resourceTenantId && resourceTenantId !== tenantId) {
    throw new Error('Security error: Tenant isolation violation. Cross-tenant access denied.');
  }
  
  return tenantId;
};

/**
 * Extracts and validates the tenant ID from a Supabase Auth User or request header.
 */
export const getTenantId = async (supabase: any, user: any, req: Request) => {
  // Priority 1: Header (Explicitly set by client)
  let tenantId = req.headers.get('x-tenant-id');
  
  if (!tenantId && user) {
    // Priority 2: Database (Resolved from user session)
    const { data: userTenant } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .single();
    
    tenantId = userTenant?.tenant_id;
  }
  
  if (!tenantId) {
    throw new Error("Security error: Could not resolve tenant context");
  }
  
  return tenantId;
};


