import { corsHeaders, getAuthUser } from "../_shared/security.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/logger.ts";
import { callAIGateway, AIGatewayCircuitOpenError } from "../_shared/ai_gateway.ts";
import {
  extractionUnavailable,
  faltamCamposObrigatorios,
  normalizeExtraction,
  parseGatewayContent,
  SYSTEM_PROMPT,
} from "./extraction.ts";

/** Limite de 10 MB por documento — PDF/imagem de NF-e não passa disso. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MODEL = "google/gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const logger = new EdgeLogger('process-invoice-idp', requestId);

  try {
    // SECURITY: require authenticated user before touching service-role storage.
    const { user } = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado: token ausente ou inválido" }), {
        status: 401,
        headers: buildResponseHeaders(corsHeaders),
      });
    }

    const { filePath } = await req.json();
    if (!filePath || typeof filePath !== "string") throw new Error("filePath is required");

    // Prevent path traversal: filePath must be a relative path without ..
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return new Response(JSON.stringify({ error: "filePath inválido" }), {
        status: 400,
        headers: buildResponseHeaders(corsHeaders),
      });
    }

    // QA-023: Ensure the requested path belongs to this user; rejects cross-user access.
    // Upload path is always "uploads/{user_id}/{filename}" (see DocumentosFiscais.tsx).
    const expectedPrefix = `uploads/${user.id}/`;
    if (!filePath.startsWith(expectedPrefix)) {
      return new Response(JSON.stringify({ error: "Acesso negado: arquivo nao pertence ao usuario" }), {
        status: 403,
        headers: buildResponseHeaders(corsHeaders),
      });
    }

    logger.info("Iniciando processamento de nota fiscal", { filePath, userId: user.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("fiscal-documents")
      .download(filePath);

    if (downloadError) {
      logger.error("Erro ao baixar arquivo do storage", { error: downloadError, filePath });
      throw downloadError;
    }

    if (fileData.size > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: "Arquivo maior que 10 MB" }), {
        status: 413,
        headers: buildResponseHeaders(corsHeaders),
      });
    }

    logger.info("Arquivo baixado, enviando ao gateway de IA", { byteLength: fileData.size });

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      // Sem gateway não há extração: devolve contrato vazio e deixa o front
      // gravar como pendente de revisão, em vez de fabricar uma nota.
      logger.error("OPENROUTER_API_KEY não configurada");
      return new Response(JSON.stringify(extractionUnavailable()), {
        status: 503,
        headers: buildResponseHeaders(corsHeaders),
      });
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const mimeType = fileData.type && fileData.type !== "application/octet-stream"
      ? fileData.type
      : inferMimeType(filePath);
    const base64 = encodeBase64(bytes);
    const documento = buildDocumentPart(mimeType, base64);

    let content: string;
    try {
      const response = await callAIGateway({
        apiKey,
        timeoutMs: 45_000,
        body: {
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extraia os dados desta nota fiscal. Responda apenas o JSON.",
                },
                documento,
              ],
            },
          ],
        },
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        logger.error("Falha no gateway de IA", { status: response.status, detail: detail.slice(0, 200) });
        throw new Error(`ai_gateway_${response.status}`);
      }

      const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
      content = payload.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error("resposta_vazia_da_ia");
    } catch (err) {
      if (err instanceof AIGatewayCircuitOpenError) {
        logger.warn("Circuit breaker do gateway aberto — devolvendo extração indisponível");
      } else {
        logger.error("Extração por IA falhou", { error: (err as Error).message });
      }
      return new Response(JSON.stringify(extractionUnavailable()), {
        status: 503,
        headers: buildResponseHeaders(corsHeaders),
      });
    }

    const extracted = normalizeExtraction(parseGatewayContent(content));
    const obrigatoriosFaltando = faltamCamposObrigatorios(extracted);

    logger.info("Extração concluída", {
      camposAusentes: extracted.campos_ausentes,
      obrigatoriosFaltando,
    });

    return new Response(JSON.stringify({
      ...extracted,
      requer_revisao: obrigatoriosFaltando.length > 0,
      requestId: logger.getRequestId(),
    }), {
      headers: buildResponseHeaders(corsHeaders),
    });

  } catch (error) {
    logger.error("Erro fatal no processamento IDP", { error: (error as Error).message });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: buildResponseHeaders(corsHeaders),
    });
  }
});

/** PDF vai como `file`, imagens como `image_url` — é o formato aceito pelo gateway. */
function buildDocumentPart(mimeType: string, base64: string): Record<string, unknown> {
  if (mimeType === "application/pdf") {
    return {
      type: "file",
      file: { filename: "nota-fiscal.pdf", file_data: `data:application/pdf;base64,${base64}` },
    };
  }
  return { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } };
}

function inferMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
