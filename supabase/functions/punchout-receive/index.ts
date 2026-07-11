import { corsHeaders } from "../_shared/security.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { deriveIdempotencyKey, getIdempotentResponse, recordIdempotentResponse } from "../_shared/idempotency.ts";

const SOURCE = "punchout";

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

  // M-05: rate limit por IP (webhooks anônimos).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit({
    identifier: ip,
    endpoint: `webhook:${SOURCE}`,
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds, corsHeaders);

  const bodyText = await req.text();
  const idempotencyKey = await deriveIdempotencyKey(req, bodyText);

  // M-05: se já processamos este evento, retorna a resposta anterior.
  const cached = await getIdempotentResponse(SOURCE, idempotencyKey);
  if (cached) return cached.response(corsHeaders);

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

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

    const mockCart = {
      items: [
        { name: "Item From PunchOut", quantity: 1, price: 100, currency: "BRL" },
      ],
    };

    const { data: solicitation, error: solError } = await supabaseClient
      .from("solicitacoes")
      .insert({
        tenant_id: session.tenant_id,
        requester_id: session.user_id,
        status: "rascunho",
        observacoes: "Importado via PunchOut",
        items: mockCart.items,
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
        closed_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    const redirectLocation = `${session.return_url}?solicitation_id=${solicitation.id}`;

    // Registra a resposta processada para idempotência (payload cacheado é o location).
    await recordIdempotentResponse(SOURCE, idempotencyKey, {
      solicitation_id: solicitation.id,
      redirect: redirectLocation,
    });

    return new Response(null, {
      status: 303,
      headers: { ...corsHeaders, Location: redirectLocation },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PunchOut receive failed";
    await recordIdempotentResponse(SOURCE, idempotencyKey, null, { status: "failed", errorMessage: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
