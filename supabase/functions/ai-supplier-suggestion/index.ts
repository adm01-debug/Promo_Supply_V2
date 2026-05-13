import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
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
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const logger = new EdgeLogger('ai-supplier-suggestion', requestId);

    // SECURITY: Validate user authentication
    await verifyAuthUser(req);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { productDescription, category, quantity, budget, purchaseHistory, suppliers } = await req.json();

    const systemPrompt = `Você é um assistente especialista em compras corporativas e gestão de fornecedores.
Seu objetivo é analisar o histórico de compras, fornecedores disponíveis e a necessidade atual para recomendar os melhores fornecedores.

Considere os seguintes critérios para sua análise:
1. Histórico de entregas no prazo
2. Qualidade dos produtos/serviços anteriores
3. Preços praticados
4. Tempo de relacionamento
5. Capacidade de atendimento
6. Condições de pagamento

Responda SEMPRE em JSON válido com a seguinte estrutura:
{
  "recommendations": [
    {
      "supplierId": "id do fornecedor",
      "supplierName": "nome do fornecedor",
      "score": 85,
      "reasons": ["razão 1", "razão 2"],
      "estimatedPrice": 1000.00,
      "deliveryTime": "5-7 dias úteis",
      "riskLevel": "low|medium|high",
      "negotiationTips": ["dica 1", "dica 2"]
    }
  ],
  "marketInsights": "Análise breve do mercado para este tipo de produto",
  "alternativeSuggestions": ["sugestão alternativa 1", "sugestão alternativa 2"]
}`;

    const userPrompt = `Analise a seguinte solicitação de compra e recomende os melhores fornecedores:

**Produto/Serviço Solicitado:**
${productDescription}

**Categoria:** ${category || "Não especificada"}
**Quantidade:** ${quantity || "A definir"}
**Orçamento Estimado:** ${budget ? `R$ ${budget.toLocaleString('pt-BR')}` : "Não definido"}

**Histórico de Compras Recentes:**
${purchaseHistory ? JSON.stringify(purchaseHistory, null, 2) : "Nenhum histórico disponível"}

**Fornecedores Cadastrados:**
${suppliers ? JSON.stringify(suppliers, null, 2) : "Nenhum fornecedor cadastrado"}

Por favor, analise e forneça suas recomendações.`;

    logger.info("Calling Lovable AI for supplier suggestions");

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
      logger.error("AI Gateway error", { status: response.status, response: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    let suggestions;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = JSON.parse(content);
      }
    } catch (_parseError) {
      logger.error("Error parsing AI response", { error: _parseError });
      suggestions = {
        recommendations: [],
        marketInsights: content,
        alternativeSuggestions: [],
      };
    }

    logger.info("AI suggestions generated successfully");

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (typeof logger !== 'undefined') {
      logger.error("Error in ai-supplier-suggestion", { error: errorMessage });
    } else {
      console.error("Error in ai-supplier-suggestion:", error);
    }
    const status = errorMessage.includes("Não autorizado") ? 401 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
