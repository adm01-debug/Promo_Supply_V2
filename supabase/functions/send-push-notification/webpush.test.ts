// Deno tests for the Web Push module (VAPID + RFC 8291 aes128gcm).
import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  b64UrlDecode,
  b64UrlEncode,
  encryptPayload,
  generateVapidAuth,
} from "./webpush.ts";

type Bytes = Uint8Array<ArrayBuffer>;

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/dQw4w9WgXcQ";

function concatBytes(...parts: Bytes[]): Bytes {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function derToRawSig(der: Bytes): Bytes {
  // ECPrivateKey signature DER: 30 len 02 len r 02 len s. Retorna r||s 64 bytes.
  if (der[0] !== 0x30) throw new Error("DER invalido");
  let pos = 2;
  const readInt = (): Bytes => {
    if (der[pos] !== 0x02) throw new Error("DER: esperava integer");
    const len = der[pos + 1];
    const body = der.slice(pos + 2, pos + 2 + len);
    pos += 2 + len;
    return body.length === 32 ? body : body.length === 33 && body[0] === 0 ? body.slice(1) : body;
  };
  const r = readInt();
  const s = readInt();
  const out = new Uint8Array(64);
  out.set(r, 32 - r.length);
  out.set(s, 64 - s.length);
  return out;
}
async function hmac(key: Bytes, data: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
async function hkdfExpand(prk: Bytes, info: Bytes, len: number): Promise<Bytes> {
  let out: Bytes = new Uint8Array(0); let t: Bytes = new Uint8Array(0); let n = 0;
  while (out.length < len) {
    n += 1;
    const c = new Uint8Array([n]);
    t = await hmac(prk, concatBytes(t, info, c));
    out = concatBytes(out, t);
  }
  return out.slice(0, len);
}

const vapidKp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const vapidJwk = await crypto.subtle.exportKey("jwk", vapidKp.privateKey);
const vapidPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", vapidKp.publicKey));
const VAPID_PUBLIC = b64UrlEncode(vapidPubRaw);
const VAPID_PRIVATE = vapidJwk.d!;

const recvKp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits", "deriveKey"]);
const recvPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", recvKp.publicKey));
const recvJwk = await crypto.subtle.exportKey("jwk", recvKp.privateKey);
const RECEIVER_P256DH = b64UrlEncode(recvPubRaw);
const RECEIVER_AUTH = b64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));

Deno.test({
  name: "generateVapidAuth devolve Authorization valido (JWT ES256 de 3 partes)",
  fn: async () => {
    const { authorization, cryptoKey } = await generateVapidAuth(ENDPOINT, VAPID_PUBLIC, VAPID_PRIVATE);
    assert(authorization.startsWith("vapid t="), "deve prefixar com vapid t=");
    const jwt = authorization.slice("vapid t=".length).split(",")[0].trim();
    const parts = jwt.split(".");
    assertEquals(parts.length, 3, "JWT deve ter header.payload.signature");
    const header = JSON.parse(new TextDecoder().decode(b64UrlDecode(parts[0])));
    assertEquals(header.alg, "ES256");
    const payload = JSON.parse(new TextDecoder().decode(b64UrlDecode(parts[1])));
    assertEquals(payload.aud, new URL(ENDPOINT).origin);
    assert(payload.exp > Math.floor(Date.now() / 1000), "exp deve ser futuro");
    assertEquals(payload.sub, "mailto:admin@sistema-compras.com");
    assertEquals(cryptoKey, VAPID_PUBLIC);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "JWT VAPID verifica com WebCrypto a partir da chave publica",
  fn: async () => {
    const { authorization } = await generateVapidAuth(ENDPOINT, VAPID_PUBLIC, VAPID_PRIVATE);
    const jwt = authorization.slice("vapid t=".length).split(",")[0].trim();
    const [h, p, s] = jwt.split(".");
    const pub = b64UrlDecode(VAPID_PUBLIC);
    const x = b64UrlEncode(pub.slice(1, 33));
    const y = b64UrlEncode(pub.slice(33, 65));
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", x, y },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      derToRawSig(b64UrlDecode(s)),
      new TextEncoder().encode(`${h}.${p}`),
    );
    assert(ok, "assinatura ES256 deve ser valida");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "encryptPayload produz corpo aes128gcm decriptavel de volta",
  fn: async () => {
    const body = await encryptPayload(RECEIVER_P256DH, RECEIVER_AUTH, JSON.stringify({ ok: true }));
    const keyidLen = body[20];
    assert(body.length > 21 + keyidLen + 16, "deve ter header + ciphertext + tag");
    const header = body.slice(0, 21 + keyidLen);
    const ct = body.slice(21 + keyidLen);

    const salt = header.slice(0, 16);
    const senderPub = header.slice(21, 21 + keyidLen);
    const recvPub = b64UrlDecode(RECEIVER_P256DH);
    const authSecret = b64UrlDecode(RECEIVER_AUTH);

    const recvPriv = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", d: recvJwk.d, x: recvJwk.x, y: recvJwk.y },
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    );
    const senderPubKey = await crypto.subtle.importKey("raw", senderPub, { name: "ECDH", namedCurve: "P-256" }, true, []);
    const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: senderPubKey }, recvPriv, 256));
    const info = concatBytes(new TextEncoder().encode("WebPush: info\0"), recvPub, senderPub);
    const ikm = await hkdfExpand(await hmac(authSecret, ecdh), info, 32);
    const prk = await hmac(salt, ikm);
    const key = await hkdfExpand(prk, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdfExpand(prk, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);
    const aes = await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["decrypt"]);
    const padded = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aes, ct));
    assertEquals(padded[padded.length - 1], 0x02, "ultimo byte e o marcador de registro");
    const plain = new TextDecoder().decode(padded.subarray(0, padded.length - 1));
    assertEquals(plain, JSON.stringify({ ok: true }));
  },
  sanitizeOps: false,
  sanitizeResources: false,
});