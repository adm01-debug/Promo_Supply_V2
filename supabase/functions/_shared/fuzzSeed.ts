/**
 * Seed reprodutível para testes fuzz Deno.
 *
 * Reproduzir uma falha:
 *   FUZZ_SEED=123456789 deno test --allow-net --allow-env <arquivo>
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FuzzRng {
  seed: number;
  rand: () => number;
  pick: <T>(arr: readonly T[]) => T;
  randomString: (len: number) => string;
  shuffle: <T>(arr: readonly T[]) => T[];
}

export function createFuzzRng(label: string): FuzzRng {
  const envSeed = Deno.env.get("FUZZ_SEED");
  const parsed = envSeed ? Number(envSeed) : NaN;
  const seed = Number.isFinite(parsed) ? parsed >>> 0 : Math.floor(Math.random() * 0xffffffff);
  console.info(`[fuzz:${label}] seed=${seed} (export FUZZ_SEED=${seed} para reproduzir)`);
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const randomString = (len: number) => {
    const alphabet =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \n\t🚀<>\u0000";
    let out = "";
    for (let i = 0; i < len; i++) out += alphabet[Math.floor(rand() * alphabet.length)];
    return out;
  };
  const shuffle = <T>(arr: readonly T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return { seed, rand, pick, randomString, shuffle };
}
