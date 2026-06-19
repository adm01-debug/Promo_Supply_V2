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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // PunchOut suppliers usually send data as form-data or raw XML
    const bodyText = await req.text();
    
    // Simple parser for BuyerCookie and items (In production use fast-xml-parser)
    const buyerCookieMatch = bodyText.match(/<BuyerCookie>(.*?)<\/BuyerCookie>/);
    const buyerCookie = buyerCookieMatch ? buyerCookieMatch[1] : null;

    if (!buyerCookie) throw new Error("BuyerCookie missing in response");

    const { data: session, error: sessionError } = await supabaseClient
      .from("punchout_sessions")
      .select("*")
      .eq("buyer_cookie", buyerCookie)
      .eq("status", "opened")
      .is("closed_at", null)
      .single();

    if (sessionError || !session) throw new Error("Session not found");

    const createdAt = new Date(session.created_at).getTime();
    const isExpired = !Number.isFinite(createdAt) || Date.now() - createdAt > 30 * 60 * 1000;
    if (isExpired) throw new Error("Session expired");

    // Mock cart parsing (In production, iterate over ItemIn elements)
    const mockCart = {
      items: [
        { name: "Item From PunchOut", quantity: 1, price: 100, currency: "BRL" }
      ]
    };

    // Update session and create draft solicitation
    const { data: solicitation, error: solError } = await supabaseClient
      .from("solicitacoes")
      .insert({
        tenant_id: session.tenant_id,
        requester_id: session.user_id,
        status: "rascunho",
        observacoes: "Importado via PunchOut",
        items: mockCart.items
      })
      .select()
      .single();

    if (solError) throw new Error("Error creating solicitation: " + solError.message);

    await supabaseClient
      .from("punchout_sessions")
      .update({
        status: "completed",
        cart_payload: mockCart,
        created_solicitacao_id: solicitation.id,
        closed_at: new Date().toISOString()
      })
      .eq("id", session.id);

    // Redirect user back to the application
    return new Response(null, {
      status: 303,
      headers: {
        ...corsHeaders,
        "Location": `${session.return_url}?solicitation_id=${solicitation.id}`,
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PunchOut receive failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
