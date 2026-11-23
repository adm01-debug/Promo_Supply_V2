import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, buildCorsHeaders } from "../_shared/validation.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { getAuthUser } from "../_shared/security.ts";

const requestSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.any()).optional().default([]),
  context: z.record(z.any()).optional().default({}),
});

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger('guided-buying-ai', requestId);

  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: buildResponseHeaders(cors) });
    }
    const rl = await checkRateLimit({ identifier: user.id, endpoint: "guided-buying-ai", maxRequests: 30, windowSeconds: 60 });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds, cors);

    const { message, history, context } = await validateBody(req, requestSchema);



    logger.info("Guided buying request received", { messageLength: message.length });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // CRIT-C2: resolve tenant do usuário e filtrar catálogo/fornecedores por tenant_id
    // para não vazar dados de outros tenants no prompt da IA.
    const { getTenantId } = await import("../_shared/security.ts");
    const { createClient: createAuthClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const authClient = createAuthClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("authorization") ?? "" } } },
    );
    const tenantId = await getTenantId(authClient, user);
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "tenant not resolved" }), {
        status: 403,
        headers: buildResponseHeaders(cors),
      });
    }

    // Fetch catalog context scoped to this tenant only
    const { data: products } = await supabaseAdmin
      .from("produtos")
      .select("nome, descricao, codigo, unidade, preco_referencia")
      .eq("tenant_id", tenantId)
      .limit(20);

    const { data: suppliers } = await supabaseAdmin
      .from("fornecedores")
      .select("razao_social, nome_fantasia, categorias_atendidas")
      .eq("tenant_id", tenantId)
      .limit(10);

    // System prompt for Guided Buying
    const systemPrompt = `
      Você é o Assistente de Compras Inteligente do sistema Promo Supply.
      Seu objetivo é ajudar o usuário a encontrar o que precisa e guiar o processo de compra (Procurement).
      
      Contexto do Catálogo: ${JSON.stringify(products)}
      Contexto de Fornecedores: ${JSON.stringify(suppliers)}
      
      Instruções:
      1. Seja proativo e profissional.
      2. Se o usuário quiser comprar algo, verifique se temos no catálogo.
      3. Se não tivermos, sugira categorias ou fornecedores que possam atender.
      4. No final, se as informações forem suficientes, sugira criar uma "Solicitação de Compra".
      
      Formato de Resposta:
      - Responda em Markdown.
      - Se identificar uma intenção de criação de solicitação, inclua um bloco JSON especial no final:
        \`\`\`json
        { "action": "create_solicitation", "data": { "titulo": "...", "quantidade": 1, "tipo": "material" } }
        \`\`\`
    `;

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      logger.error("OPENROUTER_API_KEY não configurada");
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Guided Buying usa o mesmo gateway unificado das outras edges de IA
    // (OpenRouter, OpenAI-compatible) com circuit breaker + retry + fallback
    // determinístico quando a IA está indisponível.
    const { callAIGatewayWithFallback } = await import("../_shared/ai_gateway.ts");

    const historyMessages = (history ?? []).map((m: { role?: string; content?: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content ?? "",
    }));

    const aiResponseBody = await callAIGatewayWithFallback(
      {
        apiKey: OPENROUTER_API_KEY,
        body: {
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            { role: "user", content: message },
          ],
        },
      },
      (reason) => {
        logger.warn("guided-buying-ai: usando fallback determinístico", { reason });
        return {
          response:
            "Desculpe, o assistente de compras está temporariamente indisponível (IA offline). " +
            "Você ainda pode pesquisar itens no catálogo ou abrir uma solicitação de compra. " +
            "Recomendo aguardar alguns instantes e tentar novamente.",
        };
      },
      cors,
    );

    if (aiResponseBody.usedFallback) {
      return aiResponseBody.response;
    }

    if (!aiResponseBody.response.ok) {
      const errorText = await aiResponseBody.response.text();
      logger.error("AI Gateway error", { status: aiResponseBody.response.status, response: errorText });
      throw new Error(`AI Gateway error: ${aiResponseBody.response.status}`);
    }

    const gatewayData = await aiResponseBody.response.json();
    const content = gatewayData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    return new Response(JSON.stringify({ response: content }), {
      headers: buildResponseHeaders(cors),
    });

  } catch (error) {
    logger.error("Error in guided-buying-ai", { error: error instanceof Error ? error.message : "Unknown error" });
    return errorResponse(error, undefined, cors);
  }
});