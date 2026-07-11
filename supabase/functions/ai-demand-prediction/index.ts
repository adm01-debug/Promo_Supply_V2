import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, corsHeaders } from "../_shared/validation.ts";
import { DemandPredictionContract } from "../_shared/contracts.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";

import { callAIGateway, AIGatewayCircuitOpenError, circuitOpenResponse } from "../_shared/ai_gateway.ts";
import { retry } from "../_shared/retry.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger('ai-demand-prediction', requestId);

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

    const rl = await checkRateLimit({ identifier: user.id, endpoint: "ai-demand-prediction", maxRequests: 15, windowSeconds: 60 });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds, corsHeaders);

    const validatedData = await validateBody(req, DemandPredictionContract, logger);
    const { historicalData, category, timeframe } = validatedData;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    logger.info("Calling Lovable AI for demand prediction", { userId: user.id });

    const response = await callAIGateway({
      apiKey: LOVABLE_API_KEY,
      body: {
        model: "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("AI Gateway error", { status: response.status, response: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", requestId }), {
          status: 429,
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
    } catch (_parseError) {
      logger.error("Error parsing AI response", { error: _parseError });
      predictions = {
        predictions: [],
        seasonalPatterns: [],
        recommendations: [content],
        riskFactors: [],
        summary: content,
      };
    }

    logger.info("Demand prediction generated successfully");

    return new Response(JSON.stringify({ ...predictions, requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    if (error instanceof AIGatewayCircuitOpenError) return circuitOpenResponse(corsHeaders);
    return errorResponse(error, logger);
  }
});