import { describe, it, expect } from 'vitest';
import { security } from '../security';

vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gis, '').replace(/javascript:/gi, ''),
  },
}));

vi.mock('./logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn() },
}));

// ─── security.isDangerous ─────────────────────────────────────────────────────

describe('security.isDangerous', () => {
  it('detects <script tag', () => {
    expect(security.isDangerous('<script>alert(1)</script>')).toBe(true);
  });

  it('detects javascript: protocol', () => {
    expect(security.isDangerous('javascript:void(0)')).toBe(true);
  });

  it('detects onerror= attribute', () => {
    expect(security.isDangerous('<img onerror=alert(1)>')).toBe(true);
  });

  it('detects onload= attribute', () => {
    expect(security.isDangerous('<body onload=alert(1)>')).toBe(true);
  });

  it('detects eval( call', () => {
    expect(security.isDangerous('eval(document.cookie)')).toBe(true);
  });

  it('detects SQL INJECTION phrase', () => {
    expect(security.isDangerous('SQL INJECTION attempt')).toBe(true);
  });

  it('returns false for safe plain text', () => {
    expect(security.isDangerous('Pedido de compras número 1234')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(security.isDangerous('')).toBe(false);
  });

  it('returns false for regular HTML', () => {
    expect(security.isDangerous('<p>Hello <strong>world</strong></p>')).toBe(false);
  });

  it('returns false for a URL without javascript scheme', () => {
    expect(security.isDangerous('https://www.example.com/path?query=value')).toBe(false);
  });

  it('is case-insensitive for <SCRIPT tag', () => {
    expect(security.isDangerous('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
  });

  it('is case-insensitive for JAVASCRIPT: protocol', () => {
    expect(security.isDangerous('JAVASCRIPT:void(0)')).toBe(true);
  });

  it('detects SQL injection with extra spaces', () => {
    expect(security.isDangerous('SQL   INJECTION')).toBe(true);
  });

  it('returns a boolean', () => {
    expect(typeof security.isDangerous('text')).toBe('boolean');
  });
});

// ─── security.sanitize ────────────────────────────────────────────────────────

describe('security.sanitize', () => {
  it('returns empty string for empty input', () => {
    expect(security.sanitize('')).toBe('');
  });

  it('returns empty string for falsy input', () => {
    expect(security.sanitize('')).toBe('');
  });

  it('returns a string', () => {
    expect(typeof security.sanitize('<p>hello</p>')).toBe('string');
  });

  it('passes through safe HTML', () => {
    const result = security.sanitize('<p>Hello world</p>');
    expect(result).toContain('Hello world');
  });
});
