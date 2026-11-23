/**
 * Cifra o shared_secret do PunchOut com a chave mestra do servidor.
 *
 * O segredo nunca transita em texto claro no banco nem sai cifrado para o
 * browser em formato legivel. O front envia o plaintext (HTTPS) apenas no
 * instante do cadastro/ediÃ§Ã£o; a edge devolve `enc::v1::aesgcm:<payload>`
 * que Ã© o que realmente grava em `punchout_catalogs.shared_secret_encrypted`.
 *
 * Formato do payload AES-GCM: base64( iv(12) || ciphertext+tag ).
 * Mesma estrutura do codec xbz_crypto.ts, com rotulo de versao proprio para
 * o PunchOut nao se misturar com as credenciais XBZ.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildResponseHeaders } from "../_shared/http.ts";
import { stripHtml, safeErrorMessage, buildCorsHeaders } from "../_shared/security.ts";

const ENC_LABEL = "enc";
const ENC_VERSION = "v1";
const KDF_ALGO = "aesgcm";

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = Deno.env.get("PSV2_ENCRYPTION_KEY");
  if (!raw || raw.length < 32) {
    throw new Error("PSV2_ENCRYPTION_KEY ausente ou muito curta (mÃ­n. 32 chars)");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  cachedKey = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function encryptSecret(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plain);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded),
  );
  const payload = new Uint8Array(iv.length + cipher.length);
  payload.set(iv, 0);
  payload.set(cipher, iv.length);
  return `${ENC_LABEL}::${ENC_VERSION}::${KDF_ALGO}::${toBase64(payload)}`;
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: buildResponseHeaders(cors),
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: buildResponseHeaders(cors),
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(authHeader.slice("Bearer ".length));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: buildResponseHeaders(cors),
      });
    }

    // Deve estar no tenant corrente como admin ou coordinator (mesma regra da
    // policy da tabela punchout_catalogs).
    const { data: membership, error: membershipError } = await authClient
      .from("user_tenants")
      .select("tenant_id, is_default")
      .eq("user_id", user.id);

    if (membershipError || !membership || membership.length === 0) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: buildResponseHeaders(cors),
      });
    }

    const defaultTenant = membership.find((m: { is_default?: boolean }) => m.is_default)?.tenant_id as string | undefined;
    const tenantId = defaultTenant ?? (membership[0] as { tenant_id: string }).tenant_id;

    const { data: roleOk } = await authClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    const { data: roleOkCoord } = await authClient.rpc("has_role", {
      _user_id: user.id,
      _role: "coordinator",
    });

    if (!roleOk && !roleOkCoord) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: buildResponseHeaders(cors),
      });
    }

    const body = JSON.parse(await req.text());
    const plain = typeof body?.secret === "string" ? stripHtml(body.secret) : "";
    if (!plain || plain.length > 4096) {
      return new Response(
        JSON.stringify({ error: "invalid secret (required, max 4096 chars)" }),
        { status: 400, headers: buildResponseHeaders(cors) },
      );
    }

    const encrypted = await encryptSecret(plain);
    return new Response(
      JSON.stringify({ data: { encrypted, tenant_id: tenantId } }),
      { status: 200, headers: buildResponseHeaders(cors) },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: safeErrorMessage(err) }),
      { status: 500, headers: buildResponseHeaders(cors) },
    );
  }
});
