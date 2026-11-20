/**
 * Codec do shared_secret do PunchOut (formato `enc::v1::aesgcm::<base64>`).
 *
 * Espelha o encrypt de `punchout-encrypt/index.ts` (mesmo KDF SHA-256 sobre
 * PSV2_ENCRYPTION_KEY e mesmo layout AES-GCM: iv(12) || ciphertext+tag em um
 * único base64). O label `enc::v1::aesgcm::` é próprio do PunchOut e não se
 * mistura com as credenciais XBZ (`v1:<base64>` do xbz_crypto.ts).
 */

const ENC_LABEL = "enc";
const ENC_VERSION = "v1";
const KDF_ALGO = "aesgcm";
const LABEL_PREFIX = `${ENC_LABEL}::${ENC_VERSION}::${KDF_ALGO}::`;

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = Deno.env.get("PSV2_ENCRYPTION_KEY");
  if (!raw || raw.length < 32) {
    throw new Error("PSV2_ENCRYPTION_KEY ausente ou muito curta (min. 32 chars)");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  cachedKey = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKey;
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Decripta um valor gravado por `punchout-encrypt`.
 * Retorna o plaintext ou null quando o valor não está no formato esperado.
 */
export async function decryptPunchOutSecret(stored: string): Promise<string | null> {
  if (!stored.startsWith(LABEL_PREFIX)) return null;
  const payload = fromBase64(stored.slice(LABEL_PREFIX.length));
  if (payload.length <= 12) return null;
  const iv = payload.slice(0, 12);
  const cipher = payload.slice(12);
  const key = await getKey();
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}