import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    // SECURITY: Validate user authentication
    await verifyAuthUser(req);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { supplier, purchaseHistory, marketData } = await req.json();

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

Responda SEMPRE em JSON válido com a seguinte estrutura:
{
  "overallScore": 75,
  "riskLevel": "low|medium|high|critical",
  "riskFactors": [
    {
      "category": "Categoria do risco",
      "score": 80,
      "status": "healthy|warning|critical",
      "description": "Descrição detalhada",
      "recommendations": ["Recomendação 1", "Recomendação 2"]
    }
  ],
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "weaknesses": ["Ponto fraco 1", "Ponto fraco 2"],
  "actionItems": [
    {
      "priority": "high|medium|low",
      "action": "Ação recomendada",
      "deadline": "Prazo sugerido"
    }
  ],
  "summary": "Resumo executivo da análise"
}`;

    const userPrompt = `Analise o risco do seguinte fornecedor:

**Dados do Fornecedor:**
${JSON.stringify(supplier, null, 2)}

**Histórico de Compras:**
${JSON.stringify(purchaseHistory || [], null, 2)}

**Dados de Mercado:**
${JSON.stringify(marketData || {}, null, 2)}

Forneça uma análise de risco completa e acionável.`;

    console.log("Calling Lovable AI for supplier risk analysis...");

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
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
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

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(content);
      }
    } catch (_parseError) {
      console.error("Error parsing AI response:", _parseError);
      analysis = {
        overallScore: 50,
        riskLevel: "medium",
        riskFactors: [],
        strengths: [],
        weaknesses: [],
        actionItems: [],
        summary: content,
      };
    }

    console.log("Supplier risk analysis generated successfully");

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-supplier-risk:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const status = errorMessage.includes("Não autorizado") ? 401 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
