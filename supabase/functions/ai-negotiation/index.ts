import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EdgeLogger } from "../_shared/logger.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-request-id",
};

const getLogger = (req: Request) => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  return new EdgeLogger("ai-negotiation", requestId);
};

const NegotiationInputSchema = z.object({
  cotacoes: z.array(z.any()).min(1, "É necessário pelo menos uma cotação para análise"),
  solicitacao: z.object({
    id: z.string().uuid(),
    titulo: z.string(),
    valor_estimado: z.number().optional().nullable(),
    quantidade: z.number().optional().nullable(),
  }),
  historico_precos: z.array(z.any()).optional().nullable(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const logger = getLogger(req);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logger.warn("Tentativa de acesso sem Authorization header");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error("Erro na autenticação do usuário", { authError });
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const validatedData = NegotiationInputSchema.safeParse(body);

    if (!validatedData.success) {
      logger.warn("Validação de input falhou", { errors: validatedData.error.format() });
      return new Response(JSON.stringify({ 
        error: "Dados de entrada inválidos", 
        details: validatedData.error.format() 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cotacoes, solicitacao, historico_precos } = validatedData.data;
    logger.info("Iniciando análise de negociação", { 
      userId: user.id, 
      solicitacaoId: solicitacao?.id, 
      numCotacoes: cotacoes?.length 
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      logger.error("LOVABLE_API_KEY não configurada");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um estrategista de suprimentos de elite (CPO AI). Sua missão é analisar cotações e gerar um plano tático de negociação imbatível.
Forneça:
1. Análise comparativa profunda (TCO - Total Cost of Ownership)
2. Matriz de Risco vs. Oportunidade por fornecedor
3. Estratégias táticas de negociação (ancoragem, concessões, prazos)
4. Sugestão de contraproposta com "Ponto de Recuo" e "Meta Ideal"
5. Economia estimada (Savings)
6. Contexto de Mercado (Análise se o preço está acima ou abaixo da média histórica se fornecida)

Responda SEMPRE em português brasileiro. Seja assertivo, técnico e focado em lucro e eficiência operacional.`;

    const userPrompt = `Analise estas cotações para a solicitação "${solicitacao?.titulo || 'N/A'}":

${JSON.stringify(cotacoes, null, 2)}

${historico_precos ? `Histórico de preços anteriores: ${JSON.stringify(historico_precos)}` : ''}

Valor estimado pela empresa: R$ ${solicitacao?.valor_estimado || 'N/A'}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
                resumo: { type: "string", description: "Resumo tático de alto nível" },
                melhor_cotacao: { type: "string", description: "Nome do fornecedor recomendado" },
                economia_estimada: { type: "number", description: "Savings total estimado" },
                oportunidade_score: { type: "number", description: "Score de 0 a 100 da oportunidade geral" },
                contexto_mercado: { type: "string", description: "Breve análise de mercado" },
                sugestoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fornecedor: { type: "string" },
                      estrategia: { type: "string" },
                      valor_contraproposta: { type: "number" },
                      valor_ponto_recuo: { type: "number", description: "Valor máximo aceitável" },
                      argumentos: { type: "array", items: { type: "string" } },
                      risco: { type: "string", enum: ["baixo", "medio", "alto"] },
                      confianca_negociacao: { type: "number", description: "0 a 100" }
                    },
                    required: ["fornecedor", "estrategia", "argumentos"]
                  }
                },
                analise_detalhada: { type: "string", description: "Plano tático detalhado em Markdown" }
              },
              required: ["resumo", "sugestoes", "analise_detalhada", "oportunidade_score"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "negotiation_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        logger.warn("AI Gateway Rate Limit excedido");
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        logger.warn("AI Gateway Créditos Insuficientes");
        return new Response(JSON.stringify({ error: "Créditos insuficientes no AI Gateway. Contate o suporte Lovable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status >= 500) {
        logger.error("Erro interno no AI Gateway", { status: response.status });
        return new Response(JSON.stringify({ error: "O serviço de IA está temporariamente indisponível. Tente novamente." }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        analise_detalhada: data.choices?.[0]?.message?.content || ""
      };
    }

    logger.info("Análise concluída com sucesso", { requestId: logger.getRequestId() });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("Erro fatal na função ai-negotiation", { error: e.message });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
