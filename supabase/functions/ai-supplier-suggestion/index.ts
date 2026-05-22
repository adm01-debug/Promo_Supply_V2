import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { SupplierSuggestionContract } from "../_shared/contracts.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger('ai-supplier-suggestion', requestId);

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado: token ausente");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Não autorizado: token inválido");

    const validatedData = await validateBody(req, SupplierSuggestionContract, logger);
    const { productDescription, category, quantity, budget, purchaseHistory, suppliers } = validatedData;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um assistente especialista em compras corporativas e gestão de fornecedores.
Seu objetivo é analisar o histórico de compras, fornecedores disponíveis e a necessidade atual para recomendar os melhores fornecedores.

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

    logger.info("Calling Lovable AI for supplier suggestions", { userId: user.id });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("AI Gateway error", { status: response.status, response: errorText });
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

    return new Response(JSON.stringify({ ...suggestions, requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return errorResponse(error, logger);
  }
});