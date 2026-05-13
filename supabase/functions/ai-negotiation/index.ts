import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EdgeLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logger = new EdgeLogger("ai-negotiation");


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cotacoes, solicitacao, historico_precos } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um especialista em negociação de compras corporativas. Analise as cotações recebidas e forneça:
1. Análise comparativa detalhada
2. Pontos fortes e fracos de cada proposta
3. Estratégias de negociação específicas para cada fornecedor
4. Sugestão de contraproposta com valores
5. Economia estimada se as sugestões forem aplicadas

Responda SEMPRE em português brasileiro. Seja específico com números e percentuais.`;

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
                resumo: { type: "string", description: "Resumo executivo da análise" },
                melhor_cotacao: { type: "string", description: "ID ou nome do fornecedor com melhor cotação" },
                economia_estimada: { type: "number", description: "Economia estimada em reais" },
                sugestoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      fornecedor: { type: "string" },
                      estrategia: { type: "string" },
                      valor_contraproposta: { type: "number" },
                      argumentos: { type: "array", items: { type: "string" } },
                      risco: { type: "string", enum: ["baixo", "medio", "alto"] }
                    },
                    required: ["fornecedor", "estrategia", "argumentos"]
                  }
                },
                analise_detalhada: { type: "string", description: "Análise detalhada em markdown" }
              },
              required: ["resumo", "sugestoes", "analise_detalhada"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "negotiation_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
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

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-negotiation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
