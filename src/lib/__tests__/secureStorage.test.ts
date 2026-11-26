import { describe, it, expect, beforeEach } from 'vitest';
import { secureStorage } from '../secureStorage';

// ─── secureStorage ────────────────────────────────────────────────────────────

describe('secureStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ── setItem / getItem round-trip ────────────────────────────────────────────

  describe('setItem + getItem round-trip', () => {
    it('stores and retrieves a plain string', async () => {
      await secureStorage.setItem('k', 'hello');
      expect(await secureStorage.getItem('k')).toBe('hello');
    });

    it('stores an empty string and retrieves it', async () => {
      await secureStorage.setItem('k', '');
      expect(await secureStorage.getItem('k')).toBe('');
    });

    it('stores and retrieves a JSON string', async () => {
      const payload = JSON.stringify({ x: 1, y: 'two', z: true });
      await secureStorage.setItem('json', payload);
      expect(await secureStorage.getItem('json')).toBe(payload);
    });

    it('stores and retrieves a long string', async () => {
      const long = 'A'.repeat(10_000);
      await secureStorage.setItem('long', long);
      expect(await secureStorage.getItem('long')).toBe(long);
    });

    it('stores values with the enc1: prefix in localStorage', async () => {
      await secureStorage.setItem('k', 'secret');
      const raw = localStorage.getItem('k');
      expect(raw).not.toBeNull();
      expect(raw!.startsWith('enc1:')).toBe(true);
    });

    it('raw value differs from plaintext (actually encrypted)', async () => {
      await secureStorage.setItem('k', 'secret');
      const raw = localStorage.getItem('k');
      expect(raw).not.toBe('secret');
    });

    it('two setItem calls for the same key overwrite each other', async () => {
      await secureStorage.setItem('k', 'first');
      await secureStorage.setItem('k', 'second');
      expect(await secureStorage.getItem('k')).toBe('second');
    });

    it('independent keys do not interfere', async () => {
      await secureStorage.setItem('a', 'alpha');
      await secureStorage.setItem('b', 'beta');
      expect(await secureStorage.getItem('a')).toBe('alpha');
      expect(await secureStorage.getItem('b')).toBe('beta');
    });
  });

  // ── getItem edge cases ──────────────────────────────────────────────────────

  describe('getItem', () => {
    it('returns null for a missing key', async () => {
      expect(await secureStorage.getItem('no-such-key')).toBeNull();
    });

    it('returns raw value for legacy plaintext (no enc1: prefix)', async () => {
      localStorage.setItem('legacy', 'plain value');
      expect(await secureStorage.getItem('legacy')).toBe('plain value');
    });

    it('handles legacy value that looks like arbitrary text', async () => {
      localStorage.setItem('old', '{"foo":42}');
      expect(await secureStorage.getItem('old')).toBe('{"foo":42}');
    });

    it('removes key and returns null when ciphertext is corrupt', async () => {
      localStorage.setItem('bad', 'enc1:not-valid-base64-ciphertext!!');
      const result = await secureStorage.getItem('bad');
      expect(result).toBeNull();
      expect(localStorage.getItem('bad')).toBeNull();
    });

    it('removes key and returns null when enc1: payload is valid base64 but wrong key', async () => {
      // Encrypt with session key, then wipe the session key so decryption fails
      await secureStorage.setItem('rotated', 'value');
      sessionStorage.removeItem('__psv2_sk__');
      // Next call generates a new key, so decryption of old ciphertext fails
      const result = await secureStorage.getItem('rotated');
      expect(result).toBeNull();
      expect(localStorage.getItem('rotated')).toBeNull();
    });
  });

  // ── removeItem ──────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('removes a stored key', async () => {
      await secureStorage.setItem('del', 'value');
      secureStorage.removeItem('del');
      expect(await secureStorage.getItem('del')).toBeNull();
    });

    it('does not throw when key does not exist', () => {
      expect(() => secureStorage.removeItem('ghost')).not.toThrow();
    });

    it('is synchronous (no Promise returned)', () => {
      const returnValue = secureStorage.removeItem('any');
      expect(returnValue).toBeUndefined();
    });
  });

  // ── getRawItem ──────────────────────────────────────────────────────────────

  describe('getRawItem', () => {
    it('returns the raw (encrypted) localStorage value', async () => {
      await secureStorage.setItem('raw', 'hello');
      const raw = secureStorage.getRawItem('raw');
      expect(raw).not.toBeNull();
      expect(raw!.startsWith('enc1:')).toBe(true);
    });

    it('returns null for missing key', () => {
      expect(secureStorage.getRawItem('missing')).toBeNull();
    });

    it('returns raw legacy value without modification', () => {
      localStorage.setItem('legacy', 'plain');
      expect(secureStorage.getRawItem('legacy')).toBe('plain');
    });

    it('is synchronous (returns a string, not a Promise)', async () => {
      await secureStorage.setItem('sync', 'v');
      const result = secureStorage.getRawItem('sync');
      expect(typeof result).toBe('string');
    });
  });
});
