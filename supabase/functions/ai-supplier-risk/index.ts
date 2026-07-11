import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";

const getLogger = (req: Request) => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  return new EdgeLogger("ai-supplier-risk", requestId);
};


async function verifyAuthUser(req: Request): Promise<string> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Não autorizado: token ausente");
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw new Error("Não autorizado: token inválido");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Não autorizado: token inválido");
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const logger = getLogger(req);
    // SECURITY: Validate user authentication
    const userId = await verifyAuthUser(req);
    // M-05: rate-limit por usuário (AI = custo de token elevado).
    const rl = await checkRateLimit({ identifier: userId, endpoint: "ai-supplier-risk", maxRequests: 20, windowSeconds: 60 });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds, corsHeaders);
    logger.info("Iniciando análise de risco de fornecedor", { userId });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      logger.error("LOVABLE_API_KEY não configurada");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { supplier, purchaseHistory, marketData } = await req.json();
    logger.info("Dados recebidos para análise", { 
      supplierId: supplier?.id, 
      historyCount: purchaseHistory?.length 
    });

    const systemPrompt = `Você é um especialista em análise de risco de fornecedores corporativos.
Analise dados do fornecedor, histórico de compras e informações de mercado para gerar uma avaliação de risco completa.

Considere os seguintes fatores de risco:
1. Saúde financeira
2. Histórico de entregas
3. Qualidade dos produtos/serviços
4. Dependência (concentração de compras)
5. Compliance e regularidade fiscal
6. Capacidade operacional
7. Riscos de mercado
8. Sustentabilidade e ESG

Responda SEMPRE em JSON válido com a estrutura solicitada.`;

    const userPrompt = `Analise o risco do seguinte fornecedor:

**Dados do Fornecedor:**
${JSON.stringify(supplier, null, 2)}

**Histórico de Compras:**
${JSON.stringify(purchaseHistory || [], null, 2)}

**Dados de Mercado:**
${JSON.stringify(marketData || {}, null, 2)}

Forneça uma análise de risco completa e acionável.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Erro no AI Gateway", { status: response.status, response: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      logger.error("Resposta da IA vazia");
      throw new Error("No content in AI response");
    }

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (_parseError) {
      logger.error("Erro ao fazer parse do JSON da IA", { content });
      analysis = {
        overallScore: 50,
        riskLevel: "medium",
        summary: content,
      };
    }

    logger.info("Análise de risco concluída", { requestId: logger.getRequestId() });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error("Erro fatal na função ai-supplier-risk", { error: error.message });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const status = errorMessage.includes("Não autorizado") ? 401 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
