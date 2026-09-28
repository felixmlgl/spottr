/**
 * Seeded PRNG helpers so every reload produces identical demo data.
 */

export type Rng = () => number;

/** mulberry32: small, fast, good-enough 32-bit PRNG. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const uniform = (rng: Rng, min: number, max: number) => min + rng() * (max - min);

export const int = (rng: Rng, min: number, max: number) => Math.floor(uniform(rng, min, max + 1));

export const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

/** Pick a key according to relative weights. */
export function weighted<K extends string>(rng: Rng, weights: Record<K, number>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/** Standard normal sample (Box–Muller). */
export function gaussian(rng: Rng, mean = 0, sd = 1): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
