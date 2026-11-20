import { decryptPunchOutSecret } from "./punchout_crypto.ts";

const KEY = "test-key-supplier-shared-secret-pso-v2-32chars-min";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function encryptForTest(plain: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(KEY));
  const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  const payload = new Uint8Array(iv.length + cipher.length);
  payload.set(iv, 0);
  payload.set(cipher, iv.length);
  return `enc::v1::aesgcm::${toBase64(payload)}`;
}

// A CI roda sem PSV2_ENCRYPTION_KEY definida; a env é fixada aqui para o teste
// de round-trip não depender de segredo externo.
Deno.env.set("PSV2_ENCRYPTION_KEY", KEY);

Deno.test({
  name: "decrypt round-trip do formato enc::v1::aesgcm::",
  fn: async () => {
    const stored = await encryptForTest("segredo-do-fornecedor");
    const out = await decryptPunchOutSecret(stored);
    if (out !== "segredo-do-fornecedor") throw new Error("round-trip falhou: " + out);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "label de outra versao retorna null (fail-open sem quebra)",
  fn: async () => {
    const out = await decryptPunchOutSecret("v1:YWJj");
    if (out !== null) throw new Error("label v1 nao deveria decriptar: " + out);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "payload invalido retorna null (nao quebra o fluxo)",
  fn: async () => {
    const out = await decryptPunchOutSecret("enc::v1::aesgcm::bm90LWEtY2lwaGVy");
    if (out !== null) throw new Error("lixo nao deveria decriptar: " + out);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});