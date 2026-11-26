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
  isSubscriptionGone,
  sendPushToSubscription,
  sendWebPush,
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

/**
 * Sobe um servidor local que responde `status` em toda requisição e conta as
 * tentativas. Usado para reproduzir a indisponibilidade do provedor de push.
 */
function servidorDePush(status: number): { url: string; tentativas: () => number; parar: () => Promise<void> } {
  let tentativas = 0;
  const server = Deno.serve({ port: 0, onListen: () => {} }, () => {
    tentativas += 1;
    return new Response(null, { status });
  });
  return {
    url: `http://127.0.0.1:${server.addr.port}/push`,
    tentativas: () => tentativas,
    parar: () => server.shutdown(),
  };
}

const SUBSCRIPTION = { endpoint: "", p256dh: RECEIVER_P256DH, auth: RECEIVER_AUTH };
const VAPID = { publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE };
const PAYLOAD = { title: "titulo", body: "corpo" };

Deno.test({
  name: "INT-04: 503 do provedor preserva a inscricao (nao e endpoint morto)",
  fn: async () => {
    const srv = servidorDePush(503);
    try {
      const res = await sendPushToSubscription({ ...SUBSCRIPTION, endpoint: srv.url }, PAYLOAD, VAPID);
      assertEquals(res.ok, false);
      assertEquals(res.status, 503, "o status HTTP precisa subir para o chamador");
      assertEquals(srv.tentativas(), 3, "429/5xx reenta com backoff (1 + 2 retries)");
      assertEquals(
        isSubscriptionGone(res.status),
        false,
        "503 nao pode autorizar a purga da inscricao",
      );
    } finally {
      await srv.parar();
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "INT-04: 404 do provedor e terminal e nao gera retry",
  fn: async () => {
    const srv = servidorDePush(404);
    try {
      const res = await sendPushToSubscription({ ...SUBSCRIPTION, endpoint: srv.url }, PAYLOAD, VAPID);
      assertEquals(res.ok, false);
      assertEquals(res.status, 404);
      assertEquals(srv.tentativas(), 1, "endpoint morto nao melhora com retry");
      assertEquals(isSubscriptionGone(res.status), true, "404 autoriza a purga da inscricao");
    } finally {
      await srv.parar();
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "INT-04: 200 devolve ok e nao reenta",
  fn: async () => {
    const srv = servidorDePush(200);
    try {
      const res = await sendPushToSubscription({ ...SUBSCRIPTION, endpoint: srv.url }, PAYLOAD, VAPID);
      assertEquals(res.ok, true);
      assertEquals(res.status, 200);
      assertEquals(srv.tentativas(), 1);
    } finally {
      await srv.parar();
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "INT-04: sem resposta HTTP o envio nao e tratado como endpoint morto",
  fn: async () => {
    // Porta fechada: o fetch falha e sendWebPush devolve status 0.
    const res = await sendWebPush(
      { ...SUBSCRIPTION, endpoint: "http://127.0.0.1:1/push" },
      JSON.stringify(PAYLOAD),
      VAPID,
    );
    assertEquals(res.ok, false);
    assertEquals(res.status, 0, "timeout/erro de rede nao traz status HTTP");
    assertEquals(isSubscriptionGone(res.status), false, "falha de rede nao autoriza a purga");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "INT-04: o index so purga a inscricao sob isSubscriptionGone (RFC 8030 §5)",
  fn: () => {
    const fonte = Deno.readTextFileSync(new URL("./index.ts", import.meta.url));

    const guarda = fonte.indexOf("if (!isSubscriptionGone(resultado.status))");
    assert(guarda >= 0, "o index precisa decidir a purga pelo status, nao por um booleano");

    const del = fonte.indexOf(".delete()");
    assert(del > guarda, "o delete de push_subscriptions precisa estar depois do guard de status");

    assert(
      !fonte.includes("if (!success)"),
      "o envio nao pode mais ser consumido como booleano sem status",
    );
  },
});

Deno.test({
  name: "INT-04: so 404/410 contam como inscricao morta (RFC 8030 §5)",
  fn: () => {
    assertEquals(isSubscriptionGone(404), true);
    assertEquals(isSubscriptionGone(410), true);
    for (const status of [200, 201, 400, 401, 403, 408, 429, 500, 502, 503, 0]) {
      assertEquals(isSubscriptionGone(status), false, `status ${status} nao pode purgar a inscricao`);
    }
  },
});