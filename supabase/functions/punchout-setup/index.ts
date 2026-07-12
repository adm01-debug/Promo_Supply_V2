import { corsHeaders } from "../_shared/security.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: buildResponseHeaders(corsHeaders),
    });
  }

  // A-10 (Onda 49): idempotência universal.
  // Reprocessos com o mesmo X-Idempotency-Key (ou mesmo body) devolvem a resposta
  // cacheada em vez de criar novas sessões punchout duplicadas.
  return await withIdempotency("punchout-setup", req, corsHeaders, async (bodyText) => {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { catalog_id, return_url } = JSON.parse(bodyText || "{}");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const { data: { user }, error: authError } = await authClient.auth.getUser(authHeader.slice("Bearer ".length));
    if (authError || !user) throw new Error("Unauthorized");

    // Get catalog details
    const { data: catalog, error: catError } = await supabaseAdmin
      .from("punchout_catalogs")
      .select("id, tenant_id, setup_url, identity, is_active, tenants(slug)")
      .eq("id", catalog_id)
      .eq("is_active", true)
      .single();

    if (catError || !catalog) throw new Error("Catalog not found");

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", catalog.tenant_id)
      .maybeSingle();

    if (membershipError || !membership) throw new Error("Unauthorized");

    const buyerCookie = crypto.randomUUID();

    // Create session
    await supabaseAdmin.from("punchout_sessions").insert({
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

    // The PunchOut shared secret must never be returned to the browser.
    return {
      status: 200,
      data: {
        message: "PunchOut session initialized",
        buyerCookie,
        setup_xml: cxml,
        mock_redirect: catalog.setup_url + "?hook=" + buyerCookie,
      },
    };
  });
});
