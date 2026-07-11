import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { NegotiationContract } from "../_shared/contracts.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";


import { callAIGateway, AIGatewayCircuitOpenError, circuitOpenResponse } from "../_shared/ai_gateway.ts";
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger("ai-negotiation", requestId);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Validation error: Authorization header missing");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(new Error("Sessão inválida"), logger);
    }

    // M-05: rate-limit — IA custa tokens; 20 req/min por usuário.
    const rl = await checkRateLimit({
      identifier: user.id,
      endpoint: "ai-negotiation",
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds, corsHeaders);

    // Standardized validation with auto-telemetry
    const validatedData = await validateBody(req, NegotiationContract, logger);
    const { cotacoes, solicitacao, historico_precos } = validatedData;

    logger.info("Iniciando análise de negociação", { 
      userId: user.id, 
      solicitacaoId: solicitacao?.id, 
      numCotacoes: cotacoes?.length 
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      logger.error("LOVABLE_API_KEY não configurada");
      throw new Error("Critical: AI Gateway Credentials missing");
    }

    const systemPrompt = `Você é um estrategista de suprimentos de elite (CPO AI). Sua missão é analisar cotações e gerar um plano tático de negociação imbatível.
Forneça structured analysis focused on ROI and TCO. Responda em português brasileiro.`;

    const userPrompt = `Analise estas cotações para a solicitação "${solicitacao?.titulo || 'N/A'}":
${JSON.stringify(cotacoes, null, 2)}
${historico_precos ? `Histórico de preços anteriores: ${JSON.stringify(historico_precos)}` : ''}
Valor estimado pela empresa: R$ ${solicitacao?.valor_estimado || 'N/A'}`;

    const response = await callAIGateway({
      apiKey: LOVABLE_API_KEY!,
      body: {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "negotiation_analysis",
            description: "Return structured negotiation analysis",
            parameters: {
              type: "object",
              properties: {
                resumo: { type: "string" },
                melhor_cotacao: { type: "string" },
                economia_estimada: { type: "number" },
                oportunidade_score: { type: "number" },
                contexto_mercado: { type: "string" },
                sugestoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fornecedor: { type: "string" },
                      estrategia: { type: "string" },
                      valor_contraproposta: { type: "number" },
                      valor_ponto_recuo: { type: "number" },
                      argumentos: { type: "array", items: { type: "string" } },
                      risco: { type: "string", enum: ["baixo", "medio", "alto"] },
                    },
                    required: ["fornecedor", "estrategia", "argumentos"]
                  }
                },
                analise_detalhada: { type: "string" }
              },
              required: ["resumo", "sugestoes", "analise_detalhada", "oportunidade_score"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "negotiation_analysis" } },
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse(new Error("Validation error: Limite de requisições excedido. Tente novamente em alguns minutos."), logger);

      }
      const t = await response.text();
      logger.error("Erro no AI Gateway", { status: response.status, response: t });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      analysis = {
        resumo: data.choices?.[0]?.message?.content || "Análise não disponível",
        sugestoes: [],
        analise_detalhada: data.choices?.[0]?.message?.content || "",
        oportunidade_score: 0
      };
    }

    logger.info("Análise concluída com sucesso", { requestId });

    return new Response(JSON.stringify({ 
      data: analysis, 
      requestId,
      status: "success",
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    if (e instanceof AIGatewayCircuitOpenError) return circuitOpenResponse(corsHeaders);
    return errorResponse(e, logger);
  }
});
