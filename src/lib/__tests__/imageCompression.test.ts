import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatBytes, supportsWebP } from '../imageCompression';

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

  it('boundary: 1023 B stays in bytes range', () => {
    const result = formatBytes(1023);
    expect(result).toContain('B');
    expect(result).not.toContain('KB');
  });

  it('boundary: 1025 B rounds to KB', () => {
    const result = formatBytes(1025);
    expect(result).toContain('KB');
  });

  it('formats fractional bytes under 1 KB as integer B', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats large value close to 1 GB', () => {
    const almostGb = 1024 * 1024 * 1024 - 1;
    const result = formatBytes(almostGb);
    expect(result).toContain('MB');
  });

  it('result for 1 MB is shorter than result for 1 GB', () => {
    expect(formatBytes(1024 * 1024).length).toBeLessThanOrEqual(formatBytes(1024 * 1024 * 1024).length);
  });

  it('always contains a space between number and unit', () => {
    [1, 1024, 1024 * 1024, 1024 * 1024 * 1024].forEach(n => {
      expect(formatBytes(n)).toMatch(/^\d+(\.\d+)? [BKMG]/);
    });
  });
});

// ─── supportsWebP ─────────────────────────────────────────────────────────────

describe('supportsWebP', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toDataURLSpy: any;

  beforeEach(() => {
    toDataURLSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL');
  });

  afterEach(() => {
    toDataURLSpy.mockRestore();
  });

  it('returns false when canvas produces non-webp data URL', () => {
    toDataURLSpy.mockReturnValue('data:image/png;base64,abc');
    expect(supportsWebP()).toBe(false);
  });

  it('returns true when canvas produces a webp data URL', () => {
    toDataURLSpy.mockReturnValue('data:image/webp;base64,abc');
    expect(supportsWebP()).toBe(true);
  });

  it('returns a boolean in all cases', () => {
    toDataURLSpy.mockReturnValue('data:image/png;base64,abc');
    expect(typeof supportsWebP()).toBe('boolean');
  });

  it('does not throw when toDataURL returns a valid string', () => {
    toDataURLSpy.mockReturnValue('data:image/png;base64,abc');
    expect(() => supportsWebP()).not.toThrow();
  });

  it('calling multiple times returns consistent results', () => {
    toDataURLSpy.mockReturnValue('data:image/webp;base64,abc');
    expect(supportsWebP()).toBe(supportsWebP());
  });
});
