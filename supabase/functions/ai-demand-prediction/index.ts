import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { historicalData, category, timeframe } = await req.json();

    const systemPrompt = `Você é um especialista em análise de demanda e previsão de compras corporativas.
Seu objetivo é analisar dados históricos de compras e prever a demanda futura.

Use técnicas de análise de tendências, sazonalidade e padrões de consumo.

Responda SEMPRE em JSON válido com a seguinte estrutura:
{
  "predictions": [
    {
      "month": "Janeiro 2025",
      "predictedValue": 50000,
      "predictedQuantity": 150,
      "confidence": 85,
      "trend": "up|down|stable"
    }
  ],
  "seasonalPatterns": [
    {
      "period": "Q1",
      "description": "Descrição do padrão",
      "impact": "high|medium|low"
    }
  ],
  "recommendations": [
    "Recomendação 1",
    "Recomendação 2"
  ],
  "riskFactors": [
    {
      "factor": "Nome do risco",
      "probability": "high|medium|low",
      "mitigation": "Ação de mitigação"
    }
  ],
  "summary": "Resumo executivo da análise"
}`;

    const userPrompt = `Analise os seguintes dados históricos de compras e gere previsões de demanda:

**Categoria:** ${category || "Geral"}
**Período de Previsão:** ${timeframe || "Próximos 6 meses"}

**Dados Históricos:**
${JSON.stringify(historicalData, null, 2)}

Por favor, analise os padrões e forneça previsões detalhadas.`;

    console.log("Calling Lovable AI for demand prediction...");

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

    let predictions;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0]);
      } else {
        predictions = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      predictions = {
        predictions: [],
        seasonalPatterns: [],
        recommendations: [content],
        riskFactors: [],
        summary: content,
      };
    }

    console.log("Demand prediction generated successfully");

    return new Response(JSON.stringify(predictions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-demand-prediction:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
