import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.split(" ")[1];
    
    // In a production environment, we would validate the scim_token_hash from sso_configurations.
    // For now, we use a service role client to manage users.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const resourceType = pathParts[1]; // e.g., 'Users' or 'Groups'
    const resourceId = pathParts[2];

    // Simple SCIM 2.0 Router
    if (resourceType === "Users") {
      if (req.method === "GET") {
        if (resourceId) {
          // Get single user
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(resourceId);
          if (error) throw error;
          return new Response(JSON.stringify(mapSupabaseUserToSCIM(data.user)), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          // List users
          const { data, error } = await supabaseAdmin.auth.admin.listUsers();
          if (error) throw error;
          return new Response(JSON.stringify({
            schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            totalResults: data.users.length,
            Resources: data.users.map(mapSupabaseUserToSCIM),
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (req.method === "POST") {
        const body = await req.json();
        const email = body.emails?.[0]?.value;
        const displayName = body.displayName || body.name?.formatted;

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: displayName },
        });

        if (error) throw error;
        
        return new Response(JSON.stringify(mapSupabaseUserToSCIM(data.user)), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (req.method === "DELETE" && resourceId) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(resourceId);
        if (error) throw error;
        return new Response(null, { status: 204, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: "Method not supported" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("SCIM Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapSupabaseUserToSCIM(user: any) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email,
    displayName: user.user_metadata?.full_name || user.email,
    emails: [{ value: user.email, primary: true }],
    active: true,
    meta: {
      resourceType: "User",
      created: user.created_at,
      lastModified: user.updated_at,
    },
  };
}
