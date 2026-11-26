/**
 * Seed reprodutível para testes fuzz/property.
 *
 * Uso:
 *   const { seed, rand, pick, randomString } = createFuzzRng("logger-frontend");
 *   console.info(`[fuzz] seed=${seed}`);
 *
 * Para reproduzir uma falha, exporte FUZZ_SEED antes de rodar:
 *   FUZZ_SEED=123456789 bunx vitest run src/lib/__tests__/logger.fuzz.test.ts
 */

/** Mulberry32 — PRNG determinístico, rápido, 32 bits. */
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

function readEnvSeed(): number | null {
  // Node / Vitest
  const nodeEnv =
    typeof process !== "undefined" && process?.env ? process.env.FUZZ_SEED : undefined;
  if (nodeEnv) {
    const n = Number(nodeEnv);
    if (Number.isFinite(n)) return n >>> 0;
  }
  // Deno
  const denoGlobal = (globalThis as { Deno?: { env?: { get(k: string): string | undefined } } }).Deno;
  const denoEnv = denoGlobal?.env?.get?.("FUZZ_SEED");
  if (denoEnv) {
    const n = Number(denoEnv);
    if (Number.isFinite(n)) return n >>> 0;
  }
  return null;
}

export interface FuzzRng {
  seed: number;
  rand: () => number;
  randInt: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  randomString: (len: number) => string;
  shuffle: <T>(arr: readonly T[]) => T[];
}

/**
 * Cria um RNG reprodutível. Se FUZZ_SEED estiver definido no ambiente,
 * usa esse valor; caso contrário gera um seed aleatório e loga no console
 * para que a falha possa ser reexecutada.
 */
export function createFuzzRng(label: string): FuzzRng {
  const envSeed = readEnvSeed();
  const seed = envSeed ?? Math.floor(Math.random() * 0xffffffff);
  // Log determinístico — grava sempre. É a "impressão digital" para reproduzir.
  // eslint-disable-next-line no-console
  console.info(`[fuzz:${label}] seed=${seed} (export FUZZ_SEED=${seed} para reproduzir)`);
  const rand = mulberry32(seed);
  const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
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
  return { seed, rand, randInt, pick, randomString, shuffle };
}
