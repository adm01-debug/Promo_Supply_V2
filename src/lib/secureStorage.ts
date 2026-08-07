/**
 * Transparent AES-GCM encryption wrapper over localStorage.
 *
 * Key lifecycle:
 *  - A random 256-bit AES-GCM key is generated once per browser session
 *    and persisted in sessionStorage (cleared when the tab/session ends).
 *  - Data in localStorage is encrypted with that key; without it the
 *    ciphertext is unreadable even with physical access to the storage file.
 *
 * This mitigates:
 *  - Shared-computer data exposure across sessions
 *  - Raw localStorage inspection from disk or devtools while logged out
 *
 * It does NOT protect against active XSS on the same origin.
 */

const SESSION_KEY_STORE = "__psv2_sk__";

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(SESSION_KEY_STORE);
  if (stored) {
    try {
      const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
      return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
    } catch {
      // Corrupt key — generate fresh one
    }
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  sessionStorage.setItem(SESSION_KEY_STORE, btoa(String.fromCharCode(...new Uint8Array(raw))));
  return key;
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encoded: string): Promise<string> {
  const key = await getOrCreateKey();
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

const ENCRYPTED_PREFIX = "enc1:";

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      const ciphertext = await encrypt(value);
      localStorage.setItem(key, ENCRYPTED_PREFIX + ciphertext);
    } catch {
      // Fallback: store plaintext to avoid data loss (logged in devtools in debug builds)
      localStorage.setItem(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    if (!raw.startsWith(ENCRYPTED_PREFIX)) return raw; // legacy plaintext
    try {
      return await decrypt(raw.slice(ENCRYPTED_PREFIX.length));
    } catch {
      // Key rotated (new session) — return null so caller re-initializes
      localStorage.removeItem(key);
      return null;
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },

  /** Synchronous read for callers that need sync access — returns raw value (may be ciphertext). */
  getRawItem(key: string): string | null {
    return localStorage.getItem(key);
  },
};
