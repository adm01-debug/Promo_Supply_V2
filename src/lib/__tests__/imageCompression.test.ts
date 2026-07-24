import { describe, it, expect } from 'vitest';
import { formatBytes } from '../imageCompression';

// ─── formatBytes ──────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes under 1 KB as "B"', () => {
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats exactly 1 KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats 1.5 KB correctly', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats exactly 1 MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('formats exactly 1 GB', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('formats 2.5 MB', () => {
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('returns a string type', () => {
    expect(typeof formatBytes(1024)).toBe('string');
  });

  it('output always includes a unit suffix', () => {
    [0, 100, 1024, 1024 * 1024].forEach(n => {
      const result = formatBytes(n);
      expect(result.endsWith('B') || result.endsWith('KB') || result.endsWith('MB') || result.endsWith('GB')).toBe(true);
    });
  });
});
