/**
 * receive-os-sync — recebe o fechamento de OS do Promo Design OU o pedido
  * aprovado do Promo Champions e abre a solicitacao de compra do material
  * correspondente.
 *
  * Chamador: `integration-dispatcher` do Promo Design ou `supply-dispatcher` do
  * Promo Champions (nao o cron).
 * Auth: HMAC-SHA256 hex do body cru em `x-webhook-signature: sha256=<hex>`,
  *       segredo em PROMO_DESIGN_WEBHOOK_SECRET ou PROMO_CHAMPIONS_WEBHOOK_SECRET
  *       (um por origem). Fail-closed: sem nenhum segredo configurado a funcao
  *       responde 503 em vez de aceitar qualquer coisa.
 *
 * Idempotencia: chave deterministica derivada do os_id. Reenvio do dispatcher
 * devolve 200 com `idempotent_replay: true` e o mesmo `solicitation_id`, sem
 * criar segunda solicitacao (que viraria segunda rodada de cotacao).
 *
 * Nota sobre `webhook_events`: usamos getIdempotentResponse/recordIdempotentResponse
 * em vez de `withIdempotency` de proposito. `withIdempotency` marca `failed` em
 * qualquer erro, inclusive erro transitorio (banco fora, timeout); aqui um
 * erro transitorio nao pode envenenar a chave, senao o retry do dispatcher
 * recebe 409 para sempre e a OS nunca chega nas compras. So gravamos a chave
 * quando a solicitacao existe de fato.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildCorsHeaders, safeErrorMessage } from "../_shared/security.ts";
import { buildResponseHeaders } from "../_shared/http.ts";
import {
  getIdempotentResponse,
  recordIdempotentResponse,
} from "../_shared/idempotency.ts";
import {
  type OsEventBody,
  type OsPayload,
  OsPayloadError,
} from "./mapping.ts";
import { createSolicitacao } from "./create-solicitacao.ts";

const SOURCE = "receive-os-sync";

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: buildResponseHeaders(cors),
  });
}

/** Comparacao em tempo constante; compara bytes para nao vazar por timing. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i += 1) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * `fill_tenant_id_from_profile()` devolve a linha intacta quando `auth.uid()`
 * e NULL, e aqui a chamada e service_role — ou seja, o trigger nao preenche
 * `tenant_id`, mas a coluna e NOT NULL. Resolvemos explicitamente:
 * payload -> tenant padrao do solicitante -> unico tenant ativo.
 */
async function resolveTenantId(
  admin: SupabaseClient,
  payload: OsPayload,
  explicit: string | null,
): Promise<string | null> {
  if (explicit) return explicit;

  const email = typeof payload.solicitante_email === "string" ? payload.solicitante_email : null;
  if (email) {
    const { data } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("email", email)
      .maybeSingle();
    if (data?.tenant_id) return data.tenant_id as string;
  }

  const { data: def } = await admin
    .from("user_tenants")
    .select("tenant_id")
    .eq("is_default", true)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (def?.tenant_id) return def.tenant_id as string;

  const { data: only } = await admin
    .from("tenants")
    .select("id")
    .eq("status", "active")
    .limit(2);
  if (only?.length === 1) return only[0].id as string;

  return null;
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, cors);
  }

  // Duas origens assinam este receptor: o Promo Design (OS fechada) e o Promo
    // Champions (orcamento que virou pedido). Segredo por origem para que a
    // rotacao de um nao derrube o outro; sem nenhum deles, fail-closed.
    const secrets = [
      Deno.env.get("PROMO_DESIGN_WEBHOOK_SECRET") ?? "",
      Deno.env.get("PROMO_CHAMPIONS_WEBHOOK_SECRET") ?? "",
    ].filter((value) => value.length > 0);
    if (secrets.length === 0) {
      console.error("nenhum webhook secret configurado: recusando o evento (fail-closed)");
    return json({ error: "webhook not configured" }, 503, cors);
  }

  // A assinatura cobre o body cru: ler uma vez e reusar, senao o hash muda.
  const bodyText = await req.text();

  const header = (req.headers.get("x-webhook-signature") ?? "").trim();
  const received = header.startsWith("sha256=") ? header.slice(7) : header;
  if (!received) {
    return json({ error: "Missing x-webhook-signature" }, 401, cors);
  }
  const expecteds = await Promise.all(secrets.map((value) => hmacHex(value, bodyText)));
    if (!expecteds.some((expected) => timingSafeEqual(received.toLowerCase(), expected))) {
    return json({ error: "Invalid signature" }, 401, cors);
  }

  let body: OsEventBody;
  try {
    body = JSON.parse(bodyText || "{}");
  } catch {
    return json({ error: "Invalid JSON" }, 400, cors);
  }

  const payload = (body.payload ?? {}) as OsPayload;
  const osId = typeof payload.os_id === "string" ? payload.os_id : "";
  if (!osId) {
    return json({ error: "payload.os_id ausente", field: "os_id" }, 422, cors);
  }

  // Chave deterministica: o mesmo fechamento de OS sempre cai na mesma chave,
  // independente de reenvio ou de o body ganhar campo novo no futuro.
  const idempotencyKey = `os:${osId}`;

  const cached = await getIdempotentResponse(SOURCE, idempotencyKey);
  if (cached && cached.status === "processed") {
    return cached.response(buildResponseHeaders(cors));
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const explicit = typeof payload.tenant_id === "string" ? payload.tenant_id : null;
    const tenantId = await resolveTenantId(admin, payload, explicit);
    if (!tenantId) {
      // 422 e nao 500: falta cadastro de tenant neste banco, nao defeito do codigo.
      // O dispatcher trata como skipped (lacuna), sem queimar tentativa.
      return json(
        { error: "tenant_id nao resolvido", reason: "nenhum tenant ativo no Promo Supply" },
        422,
        cors,
      );
    }

    const { id, numero } = await createSolicitacao(admin, payload, tenantId);

    const response = {
      ok: true,
      solicitation_id: id,
      numero,
      os_id: osId,
      event: typeof body.event === "string" ? body.event : null,
    };
    await recordIdempotentResponse(SOURCE, idempotencyKey, response);
    return json(response, 201, cors);
  } catch (err) {
    if (err instanceof OsPayloadError) {
      return json({ error: err.message, field: err.field }, 422, cors);
    }
    console.error("receive-os-sync failed:", err);
    // Nao gravamos a chave: o dispatcher precisa poder tentar de novo.
    return json({ error: safeErrorMessage(err) }, 500, cors);
  }
});