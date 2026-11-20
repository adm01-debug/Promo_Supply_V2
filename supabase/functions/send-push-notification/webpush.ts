/**
 * Web Push (VAPID + RFC 8291 aes128gcm) para a edge send-push-notification.
 *
 * Antes este arquivo enviava JSON puro sem header Authorization e sem
 * cifragem — não era Web Push válido. Aqui o payload é cifrado com
 * aes128gcm (RFC 8291) e a requisição autenticada com VAPID (JWT ES256).
 *
 * Notas de runtime (Deno 2.9):
 * - crypto.subtle.generateKey({name:"ECDH"}) exige usages
 *   ["deriveBits","deriveKey"]; sem eles o Deno falha na conversão.
 * - crypto.subtle.importKey("raw", <32B priv>, ECDSA) falha; a chave VAPID
 *   privada (escalar d) é importada via JWK com x/y extraídas da chave
 *   pública (raw 65 bytes), formato padrão do `web-push generate-vapid-keys`.
 * - ECDSA do WebCrypto devolve r||s (64 bytes); o JWT ES256 exige DER.
 */

type Bytes = Uint8Array<ArrayBuffer>;

export interface PushSubscriptionKeys {
  endpoint: string;
  /** Chave pública EC do cliente (base64url, 65 bytes uncompressed). */
  p256dh: string;
  /** Auth secret de 16 bytes (base64url). */
  auth: string;
}

export interface VapidKeys {
  /** Chave pública VAPID (base64url, 65 bytes) — usada no header `k=` e para x/y. */
  publicKey: string;
  /** Chave privada VAPID (base64url, escalar d de 32 bytes). */
  privateKey: string;
}

export function b64UrlEncode(input: Bytes): string {
  let binary = "";
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64UrlDecode(input: string): Bytes {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function concatBytes(...parts: Bytes[]): Bytes {
  const len = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hmacSha256(key: Bytes, data: Bytes): Promise<Bytes> {
  const keyObj = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", keyObj, data));
}

/** HKDF-Expand do RFC 5869. */
async function hkdfExpand(prk: Bytes, info: Bytes, length: number): Promise<Bytes> {
  let output = new Uint8Array(0);
  let t = new Uint8Array(0);
  let counter = 0;
  while (output.length < length) {
    counter += 1;
    const chunk = await hmacSha256(prk, concatBytes(t, info, new Uint8Array([counter])));
    t = chunk;
    output = concatBytes(output, chunk);
  }
  return output.slice(0, length);
}

/**
 * IKM do RFC 8291 §3.3:
 *   IKM = extract(auth_secret, ecdh_secret)
 *   info = "WebPush: info" || 0x00 || ua_public || as_public
 */
async function computeIkm(
  authSecret: Bytes,
  ecdhSecret: Bytes,
  receiverPub: Bytes,
  senderPub: Bytes,
): Promise<Bytes> {
  const info = concatBytes(
    new TextEncoder().encode("WebPush: info\0"),
    receiverPub,
    senderPub,
  );
  const prk = await hmacSha256(authSecret, ecdhSecret);
  return hkdfExpand(prk, info, 32);
}

/** DER (ASN.1) a partir da assinatura ECDSA bruta r||s — formato exigido pelo JWT. */
export function rawSignatureToDer(sigRaw: Bytes): Bytes {
  const r = stripLeadingZeroes(sigRaw.slice(0, 32));
  const s = stripLeadingZeroes(sigRaw.slice(32));
  const rEnc = r[0] & 0x80 ? concatBytes(new Uint8Array([0]), r) : r;
  const sEnc = s[0] & 0x80 ? concatBytes(new Uint8Array([0]), s) : s;
  const intR = concatBytes(new Uint8Array([0x02, rEnc.length]), rEnc);
  const intS = concatBytes(new Uint8Array([0x02, sEnc.length]), sEnc);
  const seq = concatBytes(intR, intS);
  return concatBytes(new Uint8Array([0x30, seq.length]), seq);
}

function stripLeadingZeroes(bytes: Bytes): Bytes {
  let idx = 0;
  while (idx < bytes.length - 1 && bytes[idx] === 0) idx += 1;
  return bytes.slice(idx);
}

/**
 * Gera o header `Authorization: vapid` (JWT ES256 assinado com a chave
 * privada VAPID). O `VAPID_PUBLIC_KEY` (raw 65 bytes) fornece x/y da curva;
 * o `VAPID_PRIVATE_KEY` é o escalar d importado via JWK.
 */
export async function generateVapidAuth(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: "mailto:admin@sistema-compras.com",
  };

  const headerB64 = b64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = b64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const publicKeyRaw = b64UrlDecode(vapidPublicKey);
  // raw uncompressed EC point: 0x04 || x(32) || y(32)
  const x = b64UrlEncode(publicKeyRaw.slice(1, 33));
  const y = b64UrlEncode(publicKeyRaw.slice(33, 65));

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d: vapidPrivateKey },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sigRaw = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      signingKey,
      new TextEncoder().encode(unsignedToken),
    ),
  );
  const jwt = `${unsignedToken}.${b64UrlEncode(rawSignatureToDer(sigRaw))}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey,
  };
}

/**
 * Cifra o payload em aes128gcm (RFC 8291 + RFC 8188).
 * Corpo: salt(16) || rs(4) || keyid_len(1) || keyid(sender pub 65) || ciphertext+tag.
 */
export async function encryptPayload(
  receiverP256dh: string,
  receiverAuth: string,
  payloadString: string,
): Promise<Bytes> {
  // Receiver: raw public (65 bytes uncompressed) — formato do push_subscriptions.
  const receiverPubRaw = b64UrlDecode(receiverP256dh);
  const authSecret = b64UrlDecode(receiverAuth);

  const receiverPubKey = await crypto.subtle.importKey(
    "raw",
    receiverPubRaw,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );

  // Sender efêmero — usages obrigatórios no Deno (ver cabeçalho).
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits", "deriveKey"],
  );
  const senderPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderKeyPair.publicKey),
  );

  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: receiverPubKey },
      senderKeyPair.privateKey,
      256,
    ),
  );

  const ikm = await computeIkm(authSecret, ecdhSecret, receiverPubRaw, senderPubRaw);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmacSha256(salt, ikm);
  const cek = await hkdfExpand(
    prk,
    new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
    16,
  );
  const nonce = await hkdfExpand(
    prk,
    new TextEncoder().encode("Content-Encoding: nonce\0"),
    12,
  );

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, [
    "encrypt",
  ]);
  // Registro único sem padding de zeros: payload || 0x02 (delimitador do RFC 8188).
  const padded = concatBytes(new TextEncoder().encode(payloadString), new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  // rs = 4096 em big-endian (0x00 0x00 0x10 0x00).
  const recordSize = new Uint8Array([0x00, 0x00, 0x10, 0x00]);
  const header = concatBytes(
    salt,
    recordSize,
    new Uint8Array([senderPubRaw.length]),
    senderPubRaw,
  );
  return concatBytes(header, ciphertext);
}

/**
 * Envia uma notificação Web Push padrão (VAPID + aes128gcm).
 * Retorna false em qualquer falha de rede/HTTP — o chamador decide o cleanup.
 */
export async function sendWebPush(
  subscription: PushSubscriptionKeys,
  payloadString: string,
  vapid: VapidKeys,
  urgency: "normal" | "high" = "normal",
): Promise<boolean> {
  const { authorization } = await generateVapidAuth(
    subscription.endpoint,
    vapid.publicKey,
    vapid.privateKey,
  );
  const body = await encryptPayload(subscription.p256dh, subscription.auth, payloadString);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(subscription.endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Encoding": "aes128gcm",
          "Authorization": authorization,
          "TTL": "86400",
          "Urgency": urgency,
        },
        body,
      });
      if (!response.ok) {
        console.error(`Push failed para ${subscription.endpoint}: ${response.status}`);
        return false;
      }
      return true;
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error(`Erro ao enviar push para ${subscription.endpoint}:`, error);
    return false;
  }
}