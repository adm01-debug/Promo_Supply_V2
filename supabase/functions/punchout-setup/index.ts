import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { catalog_id, return_url } = await req.json();
    
    // Auth check
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // Get catalog details
    const { data: catalog, error: catError } = await supabaseClient
      .from("punchout_catalogs")
      .select("*, tenants(slug)")
      .eq("id", catalog_id)
      .single();

    if (catError || !catalog) throw new Error("Catalog not found");

    const buyerCookie = crypto.randomUUID();

    // Create session
    await supabaseClient.from("punchout_sessions").insert({
      tenant_id: catalog.tenant_id,
      catalog_id,
      user_id: user.id,
      buyer_cookie: buyerCookie,
      return_url,
      status: "opened"
    });

    // Generate cXML (Simplified for MVP)
    const cxml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML payloadID="${Date.now()}@lovable.dev" timestamp="${new Date().toISOString()}">
  <Header>
    <From><Credential domain="NetworkID"><Identity>${catalog.identity}</Identity></Credential></From>
    <To><Credential domain="NetworkID"><Identity>Supplier</Identity></Credential></To>
    <Sender>
      <Credential domain="NetworkID">
        <Identity>${catalog.identity}</Identity>
        <SharedSecret>${catalog.shared_secret_encrypted}</SharedSecret>
      </Credential>
      <UserAgent>Lovable Procurement</UserAgent>
    </Sender>
  </Header>
  <Request>
    <PunchOutSetupRequest operation="create">
      <BuyerCookie>${buyerCookie}</BuyerCookie>
      <Extrinsic name="UserEmail">${user.email}</Extrinsic>
      <BrowserFormPost>
        <URL>${Deno.env.get("SUPABASE_URL")}/functions/v1/punchout-receive</URL>
      </BrowserFormPost>
    </PunchOutSetupRequest>
  </Request>
</cXML>`;

    // In a real scenario, we would POST this to catalog.setup_url and get a StartURL
    // For this simulation/MVP, we'll return a mock StartURL or the logic to handle the XML
    
    return new Response(
      JSON.stringify({ 
        message: "PunchOut session initialized", 
        buyerCookie,
        setup_xml: cxml,
        mock_redirect: catalog.setup_url + "?hook=" + buyerCookie
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
