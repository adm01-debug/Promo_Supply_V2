import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FiscalActionSchema = z.object({
  action: z.enum(["send", "cancel", "query", "manifest"]),
  type: z.enum(["NFe", "NFSe", "CTe", "MDFe"]),
  document_id: z.string().uuid().optional(),
  payload: z.record(z.any()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const body = await req.json();
    const parsed = FiscalActionSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.format() }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { action, type, document_id, payload } = parsed.data;

    // Simulate integration with Focus NFe / SEFAZ
    // In production, this would call Focus NFe API or SEFAZ directly
    console.log(`Processing ${action} for ${type} document ${document_id}`);

    // Create log entry in fiscal_events
    // We use service role to ensure the event is logged even if RLS is tight
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Resolve tenant_id for the user
    const { data: userTenant } = await supabaseAdmin
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .single();

    const tenant_id = userTenant?.tenant_id;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "Tenant context not found" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("fiscal_events")
      .insert({
        tenant_id,
        document_id,
        type,
        action,
        status: "pending",
        request_payload: payload,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Placeholder for actual API call
    // const response = await fetch('https://api.focusnfe.com.br/v2/nfe', { ... });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${type} ${action} initiated`,
      event_id: event.id 
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
