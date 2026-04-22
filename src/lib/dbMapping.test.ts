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
} from './dbMapping';

describe('nullToUndefined', () => {
  it('converts null to undefined', () => {
    expect(nullToUndefined(null)).toBeUndefined();
  });
  it('passes undefined through', () => {
    expect(nullToUndefined(undefined)).toBeUndefined();
  });
  it('preserves falsy-but-valid values', () => {
    expect(nullToUndefined(0)).toBe(0);
    expect(nullToUndefined('')).toBe('');
    expect(nullToUndefined(false)).toBe(false);
  });
  it('preserves truthy values', () => {
    expect(nullToUndefined('hello')).toBe('hello');
    expect(nullToUndefined(42)).toBe(42);
  });
});

describe('undefinedToNull', () => {
  it('converts undefined to null', () => {
    expect(undefinedToNull(undefined)).toBeNull();
  });
  it('preserves null', () => {
    // null is a legitimate non-undefined value.
    expect(undefinedToNull(null as unknown as undefined)).toBeNull();
  });
  it('preserves falsy-but-valid values', () => {
    expect(undefinedToNull(0)).toBe(0);
    expect(undefinedToNull('')).toBe('');
    expect(undefinedToNull(false)).toBe(false);
  });
});

describe('nullishOr', () => {
  it('substitutes the fallback for null and undefined only', () => {
    expect(nullishOr(null, 'fallback')).toBe('fallback');
    expect(nullishOr(undefined, 'fallback')).toBe('fallback');
  });
  it('does NOT collapse falsy-but-valid values (the || trap)', () => {
    expect(nullishOr(0, 99)).toBe(0);
    expect(nullishOr('', 'x')).toBe('');
    expect(nullishOr(false, true)).toBe(false);
  });
});

describe('typed convenience wrappers', () => {
  it('nullishStr defaults to empty string', () => {
    expect(nullishStr(null)).toBe('');
    expect(nullishStr(undefined)).toBe('');
    expect(nullishStr('hi')).toBe('hi');
    expect(nullishStr('', 'fb')).toBe('');
  });
  it('nullishNum defaults to 0', () => {
    expect(nullishNum(null)).toBe(0);
    expect(nullishNum(undefined)).toBe(0);
    expect(nullishNum(0)).toBe(0);
    expect(nullishNum(7)).toBe(7);
  });
  it('nullishBool defaults to false', () => {
    expect(nullishBool(null)).toBe(false);
    expect(nullishBool(undefined)).toBe(false);
    expect(nullishBool(false)).toBe(false);
    expect(nullishBool(true)).toBe(true);
  });
});

describe('nullsToUndefined', () => {
  it('replaces all top-level nulls with undefined', () => {
    const row = { a: 1, b: null, c: 'x', d: null, e: 0 };
    const out = nullsToUndefined(row);
    expect(out).toEqual({ a: 1, b: undefined, c: 'x', d: undefined, e: 0 });
  });
  it('leaves nested objects/arrays by reference (no deep walk)', () => {
    const nested = { inner: null };
    const arr = [null, 1];
    const out = nullsToUndefined({ nested, arr });
    expect(out.nested).toBe(nested);
    expect(out.nested.inner).toBeNull();
    expect(out.arr).toBe(arr);
    expect(out.arr[0]).toBeNull();
  });
  it('does not mutate the input', () => {
    const row = { a: null, b: 1 };
    nullsToUndefined(row);
    expect(row.a).toBeNull();
  });
});

describe('undefinedsToNull', () => {
  it('replaces all top-level undefineds with null', () => {
    const row = { a: 1, b: undefined, c: 'x', d: undefined };
    const out = undefinedsToNull(row);
    expect(out).toEqual({ a: 1, b: null, c: 'x', d: null });
  });
  it('preserves explicit nulls', () => {
    const row = { a: null, b: undefined };
    expect(undefinedsToNull(row)).toEqual({ a: null, b: null });
  });
});

describe('round-trip invariants', () => {
  it('nullToUndefined → undefinedToNull recovers null inputs', () => {
    expect(undefinedToNull(nullToUndefined(null))).toBeNull();
  });
  it('undefinedToNull → nullToUndefined recovers undefined inputs', () => {
    expect(nullToUndefined(undefinedToNull(undefined))).toBeUndefined();
  });
});
