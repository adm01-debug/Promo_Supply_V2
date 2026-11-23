/**
 * process-solicitacao-neural
 *
 * Transforma texto livre (linguagem natural) em campos estruturados de uma
 * solicitacao de compra, via LLM (OpenRouter) ./ai_gateway.
 *
 * Fluxo: { input } -> LLM extrai campos -> devolve { fields: {...} } que o front
 * (NovaSolicitacaoModal.processNeuralDraft) faz merge no formData. Sem escrita
 * no banco: este edge apenas preenche o formulario.
 *
 * Mesmo padrao de auth/rate-limit/fallback do ai-supplier-suggestion (auth JWT
 * de usuario autenticado, rate limit por usuario, fallback deterministico).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildResponseHeaders } from "../_shared/http.ts";
import { EdgeLogger } from "../_shared/logger.ts";
import { validateBody, errorResponse, buildCorsHeaders } from "../_shared/validation.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rate_limit.ts";
import { callAIGatewayWithFallback } from "../_shared/ai_gateway.ts";
import { z } from "https://esm.sh/zod@3.22.4";

// Contrato de entrada: apenas o texto livre do usuario.
const NeuralDraftContract = z.object({
  input: z.string().min(3, "Descreva a necessidade (minimo 3 caracteres)").max(3000),
});

// Campos preencheveis pela IA, alinhados ao solicitacaoSchema da UI.
const campos = [
  "empresa", "vendedor", "produto", "categoriaId", "quantidade",
  "tipo", "prazoEntrega", "observacoes", "prioridade", "valorEstimado",
  "centroCusto", "costCenterId",
] as const;

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const logger = new EdgeLogger("process-solicitacao-neural", requestId);

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) throw new Error("Nao autorizado: token ausente");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Nao autorizado: token invalido");

    const rl = await checkRateLimit({ identifier: user.id, endpoint: "process-solicitacao-neural", maxRequests: 30, windowSeconds: 60 });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds, cors);

    const { input } = await validateBody(req, NeuralDraftContract, logger);

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const systemPrompt = ["Voce e um assistente de compras corporativas. Transforme a descricao", 
      "em linguagem natural do usuario em um preenchimento parcial de uma solicitacao de compra.",
      "Responda SEMPRE em JSON valido com apenas o objeto \"fields\", usando somente as chaves",
      "suportadas (omita o que nao conseguir inferir, nunca invente): " + campos.join(", ") + ".",
      "Regras de formato:",
      "- \"quantidade\" e \"valorEstimado\" sao numeros.",
      "- \"tipo\": \"PE_LISO\" | \"FAB_LISO\" | \"FAB_PERSONALIZADO\".",
      "- \"prioridade\": \"baixa\" | \"normal\" | \"alta\" | \"urgente\".",
      "- \"prazoEntrega\": data ISO (yyyy-mm-dd) se mencionada.",
      "- \"empresa\"/\"vendedor\"/\"produto\"/\"categoriaId\"/\"centroCusto\"/\"costCenterId\": preencha somente o que for claramente identificavel; nao invente ids.",
      "Exemplo: {\"fields\":{\"produto\":\"50 monitores Dell\",\"quantidade\":50,\"tipo\":\"PE_LISO\",\"observacoes\":\"Compra para o RH\"}}",
    ].join("\n");

    const userPrompt = ["Descricao do usuario: \"", input, "\". Preencha o maximo de campos", 
      "que conseguir inferir; omita o resto."].join("");

    const { response, usedFallback } = await callAIGatewayWithFallback(
      {
        apiKey: OPENROUTER_API_KEY,
        body: {
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        },
      },
      (reason) => {
        logger.warn("process-solicitacao-neural: fallback deterministico", { reason });
        const produto = input.slice(0, 200);
        return { fields: { produto, observacoes: input }, requestId };
      },
      cors,
    );

    if (usedFallback) return response;

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("AI Gateway error", { status: response.status, response: errorText });
      throw new Error("AI Gateway error: " + response.status);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let fields: Record<string, unknown> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      if (parsed && typeof parsed === "object" && "fields" in parsed) {
        fields = parsed.fields;
      } else if (parsed && typeof parsed === "object") {
        fields = parsed;
      }
    } catch (_parseError) {
      logger.error("Error parsing AI response", { error: _parseError });
      fields = { produto: input.slice(0, 200), observacoes: input };
    }

    logger.info("Neural draft generated");

    return new Response(JSON.stringify({ fields, requestId }), {
      headers: buildResponseHeaders(cors),
    });
  } catch (error: unknown) {
    return errorResponse(error, logger, cors);
  }
});