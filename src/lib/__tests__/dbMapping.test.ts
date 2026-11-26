import { describe, it, expect } from 'vitest';
import {
  nullToUndefined,
  undefinedToNull,
  nullishOr,
  nullishStr,
  nullishNum,
  nullishBool,
  nullsToUndefined,
  undefinedsToNull,
} from '../dbMapping';

describe('dbMapping', () => {
  describe('nullToUndefined', () => {
    it('converts null to undefined', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });

    it('passes through undefined', () => {
      expect(nullToUndefined(undefined)).toBeUndefined();
    });

    it('preserves non-null string values', () => {
      expect(nullToUndefined('hello')).toBe('hello');
    });

    it('preserves empty string (falsy but valid)', () => {
      expect(nullToUndefined('')).toBe('');
    });

    it('preserves zero (falsy but valid)', () => {
      expect(nullToUndefined(0)).toBe(0);
    });

    it('preserves false (falsy but valid)', () => {
      expect(nullToUndefined(false)).toBe(false);
    });

    it('preserves objects', () => {
      const obj = { a: 1 };
      expect(nullToUndefined(obj)).toBe(obj);
    });
  });

  describe('undefinedToNull', () => {
    it('converts undefined to null', () => {
      expect(undefinedToNull(undefined)).toBeNull();
    });

    it('preserves non-undefined string values', () => {
      expect(undefinedToNull('hello')).toBe('hello');
    });

    it('preserves empty string', () => {
      expect(undefinedToNull('')).toBe('');
    });

    it('preserves zero', () => {
      expect(undefinedToNull(0)).toBe(0);
    });

    it('preserves false', () => {
      expect(undefinedToNull(false)).toBe(false);
    });

    it('preserves null (null is not undefined)', () => {
      expect(undefinedToNull(null)).toBeNull();
    });
  });

  describe('nullishOr', () => {
    it('returns fallback for null', () => {
      expect(nullishOr(null, 'fallback')).toBe('fallback');
    });

    it('returns fallback for undefined', () => {
      expect(nullishOr(undefined, 'fallback')).toBe('fallback');
    });

    it('returns value when non-nullish', () => {
      expect(nullishOr('value', 'fallback')).toBe('value');
    });

    it('preserves empty string (does not substitute fallback)', () => {
      expect(nullishOr('', 'fallback')).toBe('');
    });

    it('preserves zero (does not substitute fallback)', () => {
      expect(nullishOr(0, 99)).toBe(0);
    });

    it('preserves false (does not substitute fallback)', () => {
      expect(nullishOr(false, true)).toBe(false);
    });
  });

  describe('nullishStr', () => {
    it('returns empty string for null', () => {
      expect(nullishStr(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(nullishStr(undefined)).toBe('');
    });

    it('returns custom fallback for null', () => {
      expect(nullishStr(null, 'N/A')).toBe('N/A');
    });

    it('returns the string value when non-nullish', () => {
      expect(nullishStr('hello')).toBe('hello');
    });

    it('preserves empty string (not replaced by fallback)', () => {
      expect(nullishStr('', 'fallback')).toBe('');
    });
  });

  describe('nullishNum', () => {
    it('returns 0 for null', () => {
      expect(nullishNum(null)).toBe(0);
    });

    it('returns 0 for undefined', () => {
      expect(nullishNum(undefined)).toBe(0);
    });

    it('returns custom fallback for null', () => {
      expect(nullishNum(null, -1)).toBe(-1);
    });

    it('returns the numeric value when non-nullish', () => {
      expect(nullishNum(42)).toBe(42);
    });

    it('preserves zero (not replaced by fallback)', () => {
      expect(nullishNum(0, 99)).toBe(0);
    });

    it('preserves negative numbers', () => {
      expect(nullishNum(-5)).toBe(-5);
    });
  });

  describe('nullishBool', () => {
    it('returns false for null', () => {
      expect(nullishBool(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(nullishBool(undefined)).toBe(false);
    });

    it('returns custom fallback for null', () => {
      expect(nullishBool(null, true)).toBe(true);
    });

    it('returns true when value is true', () => {
      expect(nullishBool(true)).toBe(true);
    });

    it('preserves false (not replaced by fallback)', () => {
      expect(nullishBool(false, true)).toBe(false);
    });
  });

  describe('nullsToUndefined', () => {
    it('converts null values to undefined', () => {
      const result = nullsToUndefined({ a: null, b: 'hello' });
      expect(result.a).toBeUndefined();
      expect(result.b).toBe('hello');
    });

    it('preserves non-null values', () => {
      const result = nullsToUndefined({ name: 'test', count: 42, active: false });
      expect(result.name).toBe('test');
      expect(result.count).toBe(42);
      expect(result.active).toBe(false);
    });

    it('preserves empty string (falsy but valid)', () => {
      const result = nullsToUndefined({ label: '' });
      expect(result.label).toBe('');
    });

    it('preserves zero (falsy but valid)', () => {
      const result = nullsToUndefined({ value: 0 });
      expect(result.value).toBe(0);
    });

    it('handles empty object', () => {
      const result = nullsToUndefined({});
      expect(result).toEqual({});
    });

    it('converts all null fields in a flat row', () => {
      const row = { id: '1', name: null, email: null, score: 5 };
      const result = nullsToUndefined(row);
      expect(result.id).toBe('1');
      expect(result.name).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.score).toBe(5);
    });

    it('does not mutate the original object', () => {
      const original = { a: null, b: 'test' };
      nullsToUndefined(original);
      expect(original.a).toBeNull();
    });
  });

  describe('undefinedsToNull', () => {
    it('converts undefined values to null', () => {
      const result = undefinedsToNull({ a: undefined, b: 'hello' });
      expect(result.a).toBeNull();
      expect(result.b).toBe('hello');
    });

    it('preserves non-undefined values', () => {
      const result = undefinedsToNull({ name: 'test', count: 42, active: false });
      expect(result.name).toBe('test');
      expect(result.count).toBe(42);
      expect(result.active).toBe(false);
    });

    it('preserves empty string', () => {
      const result = undefinedsToNull({ label: '' });
      expect(result.label).toBe('');
    });

    it('preserves zero', () => {
      const result = undefinedsToNull({ value: 0 });
      expect(result.value).toBe(0);
    });

    it('handles empty object', () => {
      const result = undefinedsToNull({});
      expect(result).toEqual({});
    });

    it('converts all undefined fields', () => {
      const row = { id: '1', name: undefined, email: undefined, score: 5 };
      const result = undefinedsToNull(row);
      expect(result.id).toBe('1');
      expect(result.name).toBeNull();
      expect(result.email).toBeNull();
      expect(result.score).toBe(5);
    });

    it('does not mutate the original object', () => {
      const original = { a: undefined, b: 'test' };
      undefinedsToNull(original);
      expect(original.a).toBeUndefined();
    });

    it('is the inverse of nullsToUndefined for null/undefined fields', () => {
      const row = { a: null as null | undefined, b: 'x' };
      const converted = nullsToUndefined(row as unknown as Record<string, unknown>);
      const roundTripped = undefinedsToNull(converted as Record<string, unknown>);
      expect(roundTripped.b).toBe('x');
    });
  });
});
