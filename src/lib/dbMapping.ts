/**
 * DB row → domain object mapping helpers.
 *
 * The Postgres/Supabase generated row types use `field: T | null` for every
 * nullable column. The rest of the codebase prefers the idiomatic TypeScript
 * convention of `field?: T` (i.e. `T | undefined`). Sprinkling
 * `value ?? undefined` and `value || ''` at every callsite is fragile:
 * `||` collapses falsy-but-valid values like `0` and `''`, and `??` is easy
 * to forget — leaving `null` to leak into domain types and break
 * `strictNullChecks` downstream.
 *
 * This module centralises that conversion. Adapters at the DB boundary
 * should funnel every nullable column through these helpers; no other
 * layer needs to know that the DB uses `null` as its absence marker.
 *
 * Conventions:
 *   • Absence marker in the DB           → `null`
 *   • Absence marker in domain objects   → `undefined` (matches `field?: T`)
 *   • Absence marker we send back to DB  → `null` (use `undefinedToNull`)
 *
 * None of these helpers ever return `null` from a non-null input or
 * `undefined` from a non-undefined input. They are pure, total, and safe to
 * inline at hot paths.
 */

/** Convert a DB-style nullable value to a domain-style optional value. */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/** Inverse of `nullToUndefined`, for write paths back to the DB. */
export function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Coerce a nullable value to a default. Unlike `value || fallback`, this
 * only substitutes the fallback when the input is `null`/`undefined` —
 * `0`, `''`, and `false` are preserved as legitimate values.
 */
export function nullishOr<T>(value: T | null | undefined, fallback: T): T {
  return value === null || value === undefined ? fallback : value;
}

/** Convenience wrappers for the two most common primitive coercions. */
export const nullishStr = (value: string | null | undefined, fallback = ''): string =>
  nullishOr(value, fallback);

export const nullishNum = (value: number | null | undefined, fallback = 0): number =>
  nullishOr(value, fallback);

export const nullishBool = (value: boolean | null | undefined, fallback = false): boolean =>
  nullishOr(value, fallback);

/**
 * Map every `null` in a flat object to `undefined`, leaving other values
 * untouched. The return type strips `null` from each value union, so
 * callers can pass the result straight into a domain type that uses
 * `field?: T` rather than `field: T | null`.
 *
 * Only top-level keys are normalised — nested objects/arrays are returned
 * by reference. That's intentional: deep walks would defeat the point of
 * keeping this helper cheap and predictable, and DB rows are flat.
 */
export type NullsToUndefined<T> = {
  [K in keyof T]: Exclude<T[K], null> | (null extends T[K] ? undefined : never);
};

export function nullsToUndefined<T extends Record<string, unknown>>(
  row: T,
): NullsToUndefined<T> {
  const out: Record<string, unknown> = {};
  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key];
      out[key] = value === null ? undefined : value;
    }
  }
  return out as NullsToUndefined<T>;
}

/**
 * Symmetric helper for write paths: turn every `undefined` in a flat
 * object into `null` so it round-trips through Supabase without dropping
 * keys (Supabase treats `undefined` as "leave column unchanged" on
 * update, which is rarely what callers mean).
 */
export type UndefinedsToNull<T> = {
  [K in keyof T]: Exclude<T[K], undefined> | (undefined extends T[K] ? null : never);
};

export function undefinedsToNull<T extends Record<string, unknown>>(
  row: T,
): UndefinedsToNull<T> {
  const out: Record<string, unknown> = {};
  for (const key in row) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key];
      out[key] = value === undefined ? null : value;
    }
  }
  return out as UndefinedsToNull<T>;
}
