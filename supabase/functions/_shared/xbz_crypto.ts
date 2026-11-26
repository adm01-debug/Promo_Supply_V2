/**
 * Criptografia AES-GCM para credenciais XBZ.
 *
 * As credenciais do portal XBZ (user/senha) e o token da API /clientes nunca
 * são gravados em texto claro. A chave mestra vive apenas no secret
 * `XBZ_ENCRYPTION_KEY` e nunca sai do servidor.
 *
 * Formato do ciphertext: base64( iv(12 bytes) || ciphertext+tag ).
 */

const ENC_VERSION = "v1";

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const raw = Deno.env.get("XBZ_ENCRYPTION_KEY");
  if (!raw || raw.length < 32) {
    throw new Error("XBZ_ENCRYPTION_KEY ausente ou muito curta (mín. 32 chars)");
  }

  // Deriva 256 bits determinísticos a partir do secret textual.
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

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Cifra um valor textual. Retorna string no formato `v1:<base64>`. */
export async function encryptSecret(plain: string): Promise<string> {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("Valor a cifrar deve ser uma string não vazia");
  }
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plain);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded),
  );

  const payload = new Uint8Array(iv.length + cipher.length);
  payload.set(iv, 0);
  payload.set(cipher, iv.length);

  return `${ENC_VERSION}:${toBase64(payload)}`;
}

/** Decifra um valor gerado por `encryptSecret`. */
export async function decryptSecret(stored: string): Promise<string> {
  if (typeof stored !== "string" || !stored.includes(":")) {
    throw new Error("Credencial cifrada em formato inválido");
  }
  const [version, payloadB64] = stored.split(":", 2);
  if (version !== ENC_VERSION) {
    throw new Error(`Versão de criptografia não suportada: ${version}`);
  }

  const key = await getKey();
  const payload = fromBase64(payloadB64);
  if (payload.length <= 12) throw new Error("Credencial cifrada corrompida");

  const iv = payload.slice(0, 12);
  const cipher = payload.slice(12);

  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

/** Mascara um valor para exibição segura em UI/logs (ex.: `E01****76`). */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 3)}${"*".repeat(Math.max(4, value.length - 5))}${value.slice(-2)}`;
}
