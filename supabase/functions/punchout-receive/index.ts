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
      .single();

    if (sessionError || !session) throw new Error("Session not found");

    // Session must be open. Reject reused or expired cookies so a stolen one
    // can't reopen completed sessions to inject more solicitations.
    if (session.status !== "open") {
      return new Response(JSON.stringify({ error: "Session not open" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Session expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
