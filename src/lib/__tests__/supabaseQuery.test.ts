import { describe, it, expect } from 'vitest';
import { escapeIlike } from '../supabaseQuery';

// ─── escapeIlike ──────────────────────────────────────────────────────────────

describe('escapeIlike', () => {
  it('returns empty string for empty string input', () => {
    expect(escapeIlike('')).toBe('');
  });

  it('returns empty string for null-like falsy input', () => {
    expect(escapeIlike(null as unknown as string)).toBe('');
    expect(escapeIlike(undefined as unknown as string)).toBe('');
  });

  it('returns plain string unchanged', () => {
    expect(escapeIlike('hello')).toBe('hello');
  });

  it('escapes SQL LIKE wildcard %', () => {
    expect(escapeIlike('50%off')).toBe('50\\%off');
  });

  it('escapes SQL LIKE wildcard _', () => {
    expect(escapeIlike('a_b')).toBe('a\\_b');
  });

  it('escapes PostgREST comma separator', () => {
    expect(escapeIlike('a,b')).toBe('a\\,b');
  });

  it('escapes PostgREST opening parenthesis', () => {
    expect(escapeIlike('(test')).toBe('\\(test');
  });

  it('escapes PostgREST closing parenthesis', () => {
    expect(escapeIlike('test)')).toBe('test\\)');
  });

  it('escapes both parentheses in grouping expression', () => {
    expect(escapeIlike('(foo)')).toBe('\\(foo\\)');
  });

  it('escapes asterisk', () => {
    expect(escapeIlike('a*b')).toBe('a\\*b');
  });

  it('escapes backslash', () => {
    expect(escapeIlike('a\\b')).toBe('a\\\\b');
  });

  it('trims leading and trailing whitespace', () => {
    expect(escapeIlike('  hello  ')).toBe('hello');
  });

  it('trims before checking special characters', () => {
    expect(escapeIlike('  he%llo  ')).toBe('he\\%llo');
  });

  it('caps input at default maxLength of 100 characters', () => {
    const long = 'a'.repeat(200);
    expect(escapeIlike(long).length).toBe(100);
  });

  it('respects custom maxLength', () => {
    const long = 'a'.repeat(200);
    expect(escapeIlike(long, 50).length).toBe(50);
  });

  it('applies maxLength after trim', () => {
    const padded = ' ' + 'a'.repeat(110) + ' ';
    expect(escapeIlike(padded, 100).length).toBe(100);
  });

  it('escapes multiple special characters in one string', () => {
    expect(escapeIlike('50% off (all*items)')).toBe('50\\% off \\(all\\*items\\)');
  });

  it('returns a string type', () => {
    expect(typeof escapeIlike('test')).toBe('string');
  });
});
